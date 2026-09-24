"""
Embeds the pixel logo into the homepage planet artwork as a shallow silver
inlay, using ImageMagick. The logo comes from src/components/logo-matrix.ts,
so the artwork can be rebuilt whenever the mark changes.

    python3 scripts/build-hero-logo.py

Desktop starts from the clean, unmarked planet (public/editorial/hero-banner.webp).
The portrait scene has no clean original, so the previous mark is first filled
in from its surroundings, then the new mark is set in the same place. The
placement, size and foreshortening match the previous mark, measured from the
earlier files.
"""
import os
import re
import subprocess
import tempfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
EDITORIAL = os.path.join(ROOT, 'public', 'editorial')


def run(*args):
    subprocess.run(['magick', *map(str, args)], check=True)


def matrix():
    source = open(os.path.join(ROOT, 'src', 'components', 'logo-matrix.ts')).read()
    rows = re.findall(r"'([01]+)'", source[source.index('LOGO_MATRIX = [') :])
    assert rows and all(len(row) == len(rows[0]) for row in rows)
    return rows


def logo_mask(tmp, width, height):
    """White mark on black, antialiased, at the requested footprint."""
    rows = matrix()
    pbm = os.path.join(tmp, 'mark.pbm')
    with open(pbm, 'w') as handle:
        handle.write(f'P1\n{len(rows[0])} {len(rows)}\n')
        for row in rows:
            handle.write(' '.join(row) + '\n')
    out = os.path.join(tmp, f'mask-{width}x{height}.png')
    # PBM stores 1 as black, so negate. Scale up as crisp blocks first, then
    # down to the footprint so the edges are smooth but the steps stay visible.
    run(pbm, '-negate', '-filter', 'point', '-resize', '1600%', '-filter', 'Lanczos',
        '-resize', f'{width}x{height}!', '-colorspace', 'gray', out)
    return out


def inlay(tmp, image, out, cx, cy, width, squash, pad=24):
    """Sets the mark into `image` centred on (cx, cy) as a raised silver inlay."""
    rows = matrix()
    height = round(width * len(rows) / len(rows[0]) * squash)
    mask = logo_mask(tmp, width, height)
    rw, rh = width + pad * 2, height + pad * 2
    rx, ry = round(cx - width / 2) - pad, round(cy - height / 2) - pad
    region = os.path.join(tmp, 'region.png')
    full = os.path.join(tmp, 'mask-full.png')
    run(image, '-crop', f'{rw}x{rh}+{rx}+{ry}', '+repage', region)
    run('-size', f'{rw}x{rh}', 'xc:black', mask, '-geometry', f'+{pad}+{pad}', '-composite', full)
    # Silver fill: screen a mid grey over the surface inside the mark.
    silver = os.path.join(tmp, 'silver.png')
    run(region, '(', '-size', f'{rw}x{rh}', 'xc:gray(30%)', ')', '-compose', 'screen',
        '-composite', silver)
    filled = os.path.join(tmp, 'filled.png')
    run(region, silver, full, '-compose', 'over', '-composite', filled)
    # Bevel: light from the upper right, like the planet's own lighting. The
    # shaded map is re-centred so flat areas are exactly neutral for Overlay.
    bevel = os.path.join(tmp, 'bevel.png')
    run(full, '-blur', '0x1.3', '-shade', '45x35', '-evaluate', 'subtract', '7.36%', bevel)
    beveled = os.path.join(tmp, 'beveled.png')
    run(filled, bevel, '-compose', 'overlay', '-composite', beveled)
    # A soft contact shadow below and left of the raised mark.
    shadow = os.path.join(tmp, 'shadow.png')
    run(full, '-blur', '0x2.5', '-roll', '-2+3', '(', full, '-negate', ')', '-compose', 'multiply',
        '-composite', '-evaluate', 'multiply', '0.55', '-negate', shadow)
    shaded = os.path.join(tmp, 'shaded.png')
    run(beveled, shadow, '-compose', 'multiply', '-composite', shaded)
    run(image, shaded, '-geometry', f'+{rx}+{ry}', '-compose', 'over', '-composite', out)


def fill_in(tmp, image, out, cx, cy, rx, ry, pad=60):
    """Covers the previous mark with the surrounding surface: a smooth fill from
    the edges (normalised blur) plus a little fine grain so it is not plastic."""
    left, top = round(cx - rx) - pad, round(cy - ry) - pad
    w, h = round(rx * 2) + pad * 2, round(ry * 2) + pad * 2
    crop = os.path.join(tmp, 'hole-crop.png')
    hole = os.path.join(tmp, 'hole.png')
    keep = os.path.join(tmp, 'keep.png')
    run(image, '-crop', f'{w}x{h}+{left}+{top}', '+repage', crop)
    run('-size', f'{w}x{h}', 'xc:black', '-fill', 'white', '-draw',
        f'ellipse {w / 2},{h / 2} {rx},{ry} 0,360', hole)
    run(hole, '-negate', keep)
    numerator = os.path.join(tmp, 'num.png')
    denominator = os.path.join(tmp, 'den.png')
    run(crop, keep, '-compose', 'multiply', '-composite', '-blur', '0x22', numerator)
    run(keep, '-blur', '0x22', denominator)
    smooth = os.path.join(tmp, 'smooth.png')
    run(numerator, denominator, '-compose', 'divide_src', '-composite', smooth)
    grain = os.path.join(tmp, 'grain.png')
    run(smooth, '+noise', 'Gaussian', '-attenuate', '0.35', grain)
    soft = os.path.join(tmp, 'hole-soft.png')
    run(hole, '-morphology', 'Dilate', 'Disk:6', '-blur', '0x7', soft)
    patched = os.path.join(tmp, 'patched.png')
    run(crop, grain, soft, '-compose', 'over', '-composite', patched)
    run(image, patched, '-geometry', f'+{left}+{top}', '-compose', 'over', '-composite', out)


def encode(source, name, width, height):
    png = os.path.join(tempfile.gettempdir(), f'{name}.png')
    run(source, '-resize', f'{width}x{height}!', '-strip', png)
    subprocess.run(['cwebp', '-quiet', '-q', '82', png, '-o', os.path.join(EDITORIAL, f'{name}.webp')],
                   check=True)


def main():
    with tempfile.TemporaryDirectory() as tmp:
        # Desktop: the clean original planet, cropped to the current 1920x820 frame.
        base = os.path.join(tmp, 'desktop-base.png')
        run(os.path.join(EDITORIAL, 'hero-banner.webp'), '-crop', '1920x820+0+0', '+repage', base)
        desktop = os.path.join(tmp, 'desktop.png')
        inlay(tmp, base, desktop, cx=1390, cy=216, width=190, squash=0.58)
        encode(desktop, 'hero-brand-orbit', 1920, 820)
        encode(desktop, 'hero-brand-orbit-small', 960, 410)

        # Portrait: fill in the previous mark, then set the new one.
        portrait = os.path.join(tmp, 'portrait-base.png')
        run(os.path.join(EDITORIAL, 'hero-brand-mobile-pixel.webp'), portrait)
        cleared = os.path.join(tmp, 'portrait-cleared.png')
        fill_in(tmp, portrait, cleared, cx=505, cy=710, rx=104, ry=66)
        mobile = os.path.join(tmp, 'portrait.png')
        inlay(tmp, cleared, mobile, cx=505, cy=712, width=176, squash=0.61)
        encode(mobile, 'hero-brand-mobile-orbit', 1024, 1536)
        encode(mobile, 'hero-brand-mobile-orbit-small', 640, 960)


if __name__ == '__main__':
    main()
