# Editorial artwork

The Horizons collection adds another 28 original long-form articles and 28 individually
generated covers. See [Horizons collection record](EDITORIAL-HORIZONS.md) for article
word counts, responsive assets, primary-source policy, and all final image prompts.

The 28 September 2026 collection adds 16 original long-form guides and 16 individually
generated covers. See [Frontiers collection record](EDITORIAL-FRONTIERS.md) for article
word counts, responsive asset paths, sources policy, and final image prompts.

The 27 September 2026 collection adds 20 separately generated article covers and responsive
derivatives. See [Systems collection artwork](EDITORIAL-SYSTEMS-ASSETS.md) for the final
prompt set, file locations, and integration details. The earlier assets below are preserved.

Created with the built-in image_gen tool on 17 September 2026, then resized and encoded as WebP with cwebp. No OpenAI API key or production generation endpoint was used. These are original AI-generated concept illustrations, not photographs of real events.

Project assets: `public/editorial/{benchmarks,context,engineering}.webp` (1200px) and matching `-small.webp` variants (640px). Cards use responsive srcset, fixed aspect ratios and lazy loading. The owner requested removal of the visible article captions; provenance remains recorded here.

Final prompts:

## benchmarks

Use case: stylized-concept. Asset: wide 16:9 editorial cover for Artificials AI research article, no text or logos. A cinematic macro photograph-like 3D silver computational sculpture: five polished titanium towers of differing heights connected by impossibly fine luminous threads, suspended above a charcoal laboratory plane. Graphite black and cool silver palette, subtle white light, realistic brushed metal texture, architectural composition, tasteful high-end technology magazine art, strong subject readable as small thumbnail, no actual chart values or invented UI. 1536 by 1024 landscape.

## context

Use case: stylized-concept. Asset: wide editorial cover for Artificials article about model context and knowledge, no text or logos. A sculptural spiral of thin translucent smoked-glass sheets surrounding a glowing silver orb, sophisticated abstract memory architecture in a dark studio. Photoreal 3D materials, soft volumetric white light, silver and black palette with extremely faint cold blue reflections. Single coherent sculptural scene, precise close-up details, high-end technology magazine photography aesthetic, readable thumbnail. 1536 by 1024 landscape.

## engineering

Use case: stylized-concept. Asset: wide editorial cover for Artificials software engineering and AI application article, no text, no logos, no letters. An exploded architectural assembly of brushed aluminum layers and glass circuit tiles floating above a small cylindrical database-like metal core, elegant isometric composition in a charcoal studio. Fine glowing white connecting lines, tactile photoreal 3D rendering, monochrome black and silver with restrained cold highlights. Clean premium technology magazine editorial image, full composition legible small. 1536 by 1024 landscape.

## Homepage hero banner

Mode: built-in image_gen, new image, 17 September 2026. Final files: `public/editorial/hero-banner.webp` (1920px, about 64KB) and `public/editorial/hero-banner-small.webp` (960px, about 21KB). The image is decorative behind real HTML text, with a dark contrast overlay. Replace both responsive versions to change the banner; preserve a wide composition with empty space on the left. There is no embedded text or logo.

Final prompt:

Use case: stylized-concept. Asset type: ultra-wide homepage hero background for Artificials, an elegant black and silver AI technology publication. Create a cinematic photorealistic 3D scene of a vast dark silver celestial sphere with fine etched computational topology, an illuminated thin orbital ring, and sparse fine stars in a deep charcoal space. Wide 2.4:1 composition, sphere occupies the right half with its lower edge softly disappearing in mist. Left half is very dark atmospheric negative space designed for large white heading text layered on top in HTML. Quiet, restrained, high-end scientific art direction, brushed silver surface, subtle white rim light, depth, a faint horizontal light horizon, no bright blue or purple. Keep some sculptural texture behind the left area but readable as an understated background. No text, letters, logos, labels, watermark, charts, or UI. Landscape 2400x1024.

## Engraved planet and mobile composition

Mode: built-in image_gen, edit/reframe of the original homepage hero, 17 September 2026. The former replacements are `public/editorial/hero-engraved.webp` (1920px, 67,354 bytes), `public/editorial/hero-engraved-small.webp` (960px, 26,674 bytes), `public/editorial/hero-mobile.webp` (768px, 65,702 bytes), and `public/editorial/hero-mobile-small.webp` (480px, 29,046 bytes). The original unlettered assets above remain as source references. Both edited scenes embed the ARTIFICIALS.NET inscription into the silver planet. The HTML heading, buttons, and navigation remain real accessible text.

This earlier framing is retained here for provenance. The current logo-bearing scene and full-width mobile composition are documented below.

Final desktop edit prompt:

Use case: text-localization. Edit the supplied Artificials homepage banner. Preserve its dark silver celestial sphere, computational engraving, thin orbital ring, lighting, stars, atmosphere, landscape framing and empty left half exactly. Add the exact uppercase inscription "ARTIFICIALS.NET" engraved into the planet's metal surface, on the upper-front facing hemisphere above the diagonal ring. It should look physically carved, recessed metallic lettering following the spherical curvature with subtle silver highlights and shadow, understated yet clearly legible at desktop website size. One line, moderately large but tasteful, not bright white flat overlay, no extra words or logos. Spell exactly A R T I F I C I A L S . N E T. Keep the original wide aspect ratio and all other visual content.

Final portrait edit prompt:

Use case: compositing. Adapt the supplied silver planet banner into a dedicated portrait mobile hero background, 1024x1536. Preserve the same cinematic charcoal and silver material, fine computational engravings, single thin orbital ring, sparse stars and mist. Reframe and zoom OUT: show the entire planet with comfortable margins, planet diameter approximately 72 percent of image width, centered horizontally, centered around 72 percent of the image height. Upper 42 percent should be deep dark nearly black atmospheric negative space for real HTML heading text, no text there. Add exact uppercase inscription "ARTIFICIALS.NET" physically engraved in a single curved line on the upper-facing portion of the sphere, subtle but readable silver recessed lettering, not overlay text. Spell exactly A R T I F I C I A L S . N E T. Fade lower edge to black, retain orbital ring within portrait bounds. No additional objects, logos, UI, or extra text.

## Social profile icons

`public/social/x.svg` and `public/social/instagram.svg` are official white glyphs from the [X brand toolkit](https://about.x.com/en/who-we-are/brand-toolkit) and [Instagram brand resources](https://about.meta.com/brand/resources/instagram/instagram-brand/). They replace the hand-drawn X mark and visible social labels. Screen-reader link names remain. `public/social/NOTICE.txt` records archive provenance.

## Owner-supplied identity and logo planet (18 September 2026)

The original transparent logo supplied by the owner is preserved at `assets/brand/logo-original.png`. It was not redrawn. Header/footer glyphs are cropped and resized WebP derivatives at `public/brand/artificials-mark-small.webp` (192px) and `public/brand/artificials-mark.webp` (512px); `public/brand/artificials-mark.png` is the 256px browser icon. The shared Brand component uses real text "Artificials" in locally hosted Sora, with no trailing dot. Sora is distributed under the SIL Open Font License recorded in `public/brand/OFL-Sora.txt`. The large footer lettering is replaced by a compact, low-opacity rendering of the supplied mark.

Current hero files: `public/editorial/hero-brand.webp` (1920px), `hero-brand-small.webp` (960px), `hero-brand-mobile.webp` (1024px) and `hero-brand-mobile-small.webp` (640px). These supersede the text-inscribed scene above. Mode: built-in image_gen **edit**, using the previous planet banner as the edit target and the owner's logo as the insert reference. Images were encoded/resized with cwebp. The domain lettering is removed; one silver logo is embedded into each planet. Mobile images cover the entire hero width without a capped-width picture or side mask. CSS controls composition below 761px.

Final desktop prompt:

Use case: compositing / precise-object-edit. Image 1 is the EDIT TARGET: the existing ultra-wide silver planet homepage banner. Image 2 is the EXACT BRAND MARK to insert: the silver liquid-metal interwoven A supplied by the owner. Preserve the planet, orbital ring, etched computational lines, stars, smoke, lighting, empty dark left half, monochrome palette and the original landscape composition of image 1. Remove the entire engraved text ARTIFICIALS.NET cleanly, restore the surface underneath, and replace only that inscription with ONE small embossed/engraved version of the exact A mark from image 2 on the upper-front hemisphere. Keep the exact distinctive ribbon silhouette, openings and overlapping arms of that A logo; do not draw a generic triangular A. Integrate it as a subtle silver bas-relief sculpture bonded to the curved metal planet, with matching perspective, lighting and physically recessed shadows. Logo occupies about 22 percent of the visible planet diameter and remains legible. No words, domain text, labels, watermark or additional marks anywhere. Keep the planet scene otherwise unchanged. Wide aspect ratio about 2.34:1.

Final mobile prompt:

Use case: compositing / precise-object-edit. Image 1 is the EDIT TARGET: the existing portrait mobile silver planet hero. Image 2 is the EXACT BRAND MARK to insert: owner's silver flowing interwoven A. Preserve the silver planet, thin diagonal ring, brushed computational surface, dark stars, clouds and portrait scene. Remove ALL engraved ARTIFICIALS.NET lettering and restore the sphere's metal surface. Replace the removed inscription with ONE subtle physically integrated silver embossed version of the exact A mark from image 2 on the upper-front planet hemisphere. Preserve its distinctive liquid-metal ribbon silhouette, cutouts and interwoven arms precisely, not a generic A. Logo width about 23 percent of planet diameter. Mobile framing: 1024x1536 portrait, sphere centered horizontally, diameter about 68 percent of canvas width, sphere center at 74 percent canvas height; upper 45 percent very dark usable text space. Texture/clouds must continue naturally all the way to BOTH side edges and the bottom, with no solid black sidebars, no vignette fading to black at side edges, no inset portrait frame, no border. The same complete orbital planet remains recognizable, logo above the ring. No words, domain, letter strings, other logos or UI. The inserted A mark is the ONLY logo.

## Pixel identity planet (22 September 2026)

The identity and A-mark assets described above are historical; the current owner-supplied reference is `public/brand/artificials-logo-large.png`. The current hero uses the pixel robot-head identity, replacing the former A on both planets. Generated in built-in image_gen edit mode, then resized and encoded with cwebp at quality 82. HTML text and the existing responsive cover layout remain unchanged.

Final assets: `public/editorial/hero-brand-pixel.webp` (1920×820), `hero-brand-pixel-small.webp` (960×410), `hero-brand-mobile-pixel.webp` (1024×1536), and `hero-brand-mobile-pixel-small.webp` (640×960). Versioned filenames prevent the former branding from persisting in browser caches. Home selects the portrait variants at widths up to 760px.

Desktop prompt: Replace ONLY the old metallic cursive A emblem on the upper front of the supplied planet with the exact pixel-art helmet/robot-head silhouette from the supplied new logo. Preserve its stepped square geometry, horizontal dark visor and symmetrical face details. Render subtle silver metal inlaid into the planet, with shallow bevels matching the lighting and spherical perspective, in the same location and footprint. Remove the A completely. Preserve the panoramic composition, planet on the right, dark left negative space for HTML, rings, clouds, rocks, stars and lighting. No lettering, watermark or new objects.

Mobile prompt: Edit only the supplied portrait planet at 1024×1536. Replace the old A with the supplied pixel robot head. Use the approved desktop edit as a reference for silver treatment only, not composition. Preserve the exact stepped silhouette, visor and details as shallow silver inlay in the same footprint; no flat white sticker or black square. Remove the A completely. Preserve the full-bleed portrait composition, generous dark starry upper half for HTML, lower centered planet, rings, dust, rocks and monochrome palette. No sidebars, text or watermark.

## Four-part pixel mark planet (24 September 2026)

The owner replaced the helmet mark with a new 40×35 pixel matrix (`src/components/logo-matrix.ts`).
The hero now uses `hero-brand-orbit.webp` (1920×820), `hero-brand-orbit-small.webp` (960×410),
`hero-brand-mobile-orbit.webp` (1024×1536) and `hero-brand-mobile-orbit-small.webp` (640×960).
They are built by `python3 scripts/build-hero-logo.py` with ImageMagick and cwebp (quality 82), not
with an image generator, so they can be rebuilt whenever the matrix changes.

- Desktop starts from the clean original planet, `hero-banner.webp`, with no earlier mark.
- The portrait scene has no clean original. The helmet is filled in from its surroundings (a
  normalised blur of the nearby surface with fine grain), then the new mark is set on top.
- The mark is drawn from the matrix as a shallow silver inlay: a screened silver fill, a bevel lit
  from the upper right like the planet itself, and a soft contact shadow. Placement, size and
  foreshortening match the helmet's measured footprint (centre 1390,216 at 190px wide on desktop;
  505,712 at 176px wide on the portrait; vertical scale 0.58 and 0.61 for the sphere's curvature).

The earlier `hero-brand-pixel*` files were removed. Favicon and brand downloads come from the same
matrix through `node scripts/build-logo.mjs`.

## Home hero without artwork (26 September 2026)

The home hero no longer shows the planet: the owner chose a data-led hero with a live board of
the top models (see "Home dashboard" in `docs/DATA.md`). Since then, link previews are data
cards drawn at build time (see "Link previews" in `docs/SEO.md`), so no page uses the planet
files. They are kept so the scene can return from `scripts/build-hero-logo.py` without
regenerating it.
