import type { Draw } from '../engine';
import {
  INK,
  additive,
  easeInOut,
  gaussian,
  glow,
  label,
  lerp,
  random,
  rgba,
  roundRect,
  span,
  spectrum,
  wash,
} from '../kit';

const IW = 160;
const IH = 100;
const COLS = 8;
const ROWS = 5;
const FRAMES = 24;

/** A small evening landscape, painted once: the picture both halves of the chapter use. */
function paint() {
  const canvas = document.createElement('canvas');
  canvas.width = IW;
  canvas.height = IH;
  const ctx = canvas.getContext('2d')!;
  const sky = ctx.createLinearGradient(0, 0, 0, IH * 0.62);
  sky.addColorStop(0, '#1d2a6b');
  sky.addColorStop(0.55, '#5b4fb8');
  sky.addColorStop(1, '#f07a3a');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, IW, IH * 0.62);
  const sun = ctx.createRadialGradient(IW * 0.62, IH * 0.5, 0, IW * 0.62, IH * 0.5, 22);
  sun.addColorStop(0, '#fff3c4');
  sun.addColorStop(0.35, '#f5b942');
  sun.addColorStop(1, 'rgba(245,185,66,0)');
  ctx.fillStyle = sun;
  ctx.fillRect(0, 0, IW, IH);
  const ridge = (base: number, height: number, color: string, seed: number) => {
    const next = random(seed);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, IH * 0.62);
    for (let x = 0; x <= IW; x += 8) ctx.lineTo(x, IH * base - next() * height);
    ctx.lineTo(IW, IH * 0.62);
    ctx.closePath();
    ctx.fill();
  };
  ridge(0.5, 16, '#3a2c6e', 3);
  ridge(0.58, 12, '#21194a', 7);
  // The lake: the sky again, darker and upside down.
  ctx.save();
  ctx.translate(0, IH * 1.24);
  ctx.scale(1, -1);
  ctx.globalAlpha = 0.55;
  ctx.drawImage(canvas, 0, 0, IW, IH * 0.62, 0, 0, IW, IH * 0.62);
  ctx.restore();
  ctx.fillStyle = 'rgba(8,10,30,0.35)';
  ctx.fillRect(0, IH * 0.62, IW, IH * 0.38);
  return canvas;
}

/**
 * Beyond text: a picture is cut into patches that become tokens, as vision
 * models read images; and a picture comes out of noise step by step, as
 * diffusion models draw them. The steps shown are the picture noised by the
 * diffusion formula, run backwards.
 */
export function createBeyond(): Draw {
  let prepared: { image: HTMLCanvasElement; frames: HTMLCanvasElement[]; means: string[] } | null =
    null;
  const prepare = () => {
    if (prepared) return prepared;
    const image = paint();
    const pixels = image.getContext('2d')!.getImageData(0, 0, IW, IH).data;
    const next = random(2020);
    const noise = Float32Array.from({ length: IW * IH * 3 }, () => gaussian(next));
    // x_t = √ᾱ·x₀ + √(1−ᾱ)·ε, with a cosine schedule for ᾱ.
    const frames = Array.from({ length: FRAMES }, (_, k) => {
      const s = k / (FRAMES - 1);
      const alphaBar = Math.cos(((s + 0.008) / 1.008) * (Math.PI / 2)) ** 2;
      const a = Math.sqrt(alphaBar);
      const b = Math.sqrt(1 - alphaBar);
      const frame = document.createElement('canvas');
      frame.width = IW;
      frame.height = IH;
      const context = frame.getContext('2d')!;
      const data = context.createImageData(IW, IH);
      for (let i = 0; i < IW * IH; i++)
        for (let c = 0; c < 3; c++) {
          const x0 = (pixels[i * 4 + c] / 255) * 2 - 1;
          const x = a * x0 + b * noise[i * 3 + c] * 0.9;
          data.data[i * 4 + c] = Math.max(0, Math.min(255, ((x + 1) / 2) * 255));
        }
      for (let i = 0; i < IW * IH; i++) data.data[i * 4 + 3] = 255;
      context.putImageData(data, 0, 0);
      return frame;
    });
    // Each patch's average colour, for the tokens it becomes.
    const means: string[] = [];
    const pw = IW / COLS;
    const ph = IH / ROWS;
    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c < COLS; c++) {
        let [red, green, blue, n] = [0, 0, 0, 0];
        for (let y = Math.floor(r * ph); y < (r + 1) * ph; y++)
          for (let x = Math.floor(c * pw); x < (c + 1) * pw; x++) {
            const i = (y * IW + x) * 4;
            red += pixels[i];
            green += pixels[i + 1];
            blue += pixels[i + 2];
            n += 1;
          }
        means.push(`rgb(${Math.round(red / n)},${Math.round(green / n)},${Math.round(blue / n)})`);
      }
    prepared = { image, frames, means };
    return prepared;
  };

  return (ctx, { w, h, p, t }) => {
    ctx.fillStyle = INK.void;
    ctx.fillRect(0, 0, w, h);
    wash(ctx, w * 0.5, h * 0.45, Math.max(w, h) * 0.6, spectrum(0.5), 0.12);
    const { image, frames, means } = prepare();

    const cut = easeInOut(span(p, 0.03, 0.12));
    const fly = easeInOut(span(p, 0.12, 0.31));
    const noiseIn = easeInOut(span(p, 0.5, 0.62));
    const denoise = easeInOut(span(p, 0.68, 0.98));

    const width = Math.min(w * 0.72, (h * 0.52 * IW) / IH);
    const height = (width * IH) / IW;
    const x0 = w / 2 - width / 2;
    const y0 = h * 0.12;
    const pw = width / COLS;
    const ph = height / ROWS;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'medium';

    if (p < 0.5) {
      // Seeing: the picture cut into patches, each flying down to become a token.
      const tokenSize = Math.min((w * 0.9) / (COLS * ROWS * 0.5), 22);
      const perRow = Math.floor((w * 0.9) / (tokenSize + 4));
      const rowsOfTokens = Math.ceil((COLS * ROWS) / perRow);
      // Near the bottom, but ending clear of the note under them.
      const tokenTop = Math.min(
        h * 0.78 - (rowsOfTokens - 1) * (tokenSize + 4) * 0.5,
        h - 44 - rowsOfTokens * (tokenSize + 4),
      );
      const tokensLeft = w / 2 - (Math.min(perRow, COLS * ROWS) * (tokenSize + 4)) / 2;
      for (let r = 0; r < ROWS; r++)
        for (let c = 0; c < COLS; c++) {
          const index = r * COLS + c;
          const go = easeInOut(
            span(fly, (index / (COLS * ROWS)) * 0.6, (index / (COLS * ROWS)) * 0.6 + 0.4),
          );
          const sx = x0 + c * pw;
          const sy = y0 + r * ph;
          const tx = tokensLeft + (index % perRow) * (tokenSize + 4);
          const ty = tokenTop + Math.floor(index / perRow) * (tokenSize + 4);
          const spread = cut * 4;
          const x = lerp(sx + (c - COLS / 2) * spread * 0.5, tx, go);
          const y = lerp(sy + (r - ROWS / 2) * spread * 0.5, ty, go);
          const size = lerp(pw, tokenSize, go);
          const sizeY = lerp(ph, tokenSize, go);
          ctx.save();
          roundRect(ctx, x, y, size, sizeY, lerp(0, 5, go));
          ctx.clip();
          if (go < 0.98)
            ctx.drawImage(
              image,
              (c * IW) / COLS,
              (r * IH) / ROWS,
              IW / COLS,
              IH / ROWS,
              x,
              y,
              size,
              sizeY,
            );
          ctx.fillStyle = means[index];
          ctx.globalAlpha = go;
          ctx.fillRect(x, y, size, sizeY);
          ctx.restore();
          if (cut > 0.05) {
            ctx.strokeStyle = rgba('#ffffff', 0.35 * cut);
            ctx.lineWidth = 1;
            roundRect(ctx, x, y, size, sizeY, lerp(0, 5, go));
            ctx.stroke();
          }
        }
      label(ctx, `${COLS * ROWS} patches, each read like a token`, w / 2, h - 22, {
        size: 13,
        color: INK.white,
        align: 'center',
        alpha: fly,
      });
      return;
    }

    // Drawing: noise first, then the picture coming out of it, step by step.
    const level = (1 - denoise) * (FRAMES - 1);
    const a = Math.floor(level);
    const mix = level - a;
    ctx.globalAlpha = noiseIn;
    ctx.drawImage(frames[Math.min(FRAMES - 1, a)], x0, y0, width, height);
    if (mix > 0 && a + 1 < FRAMES) {
      ctx.globalAlpha = noiseIn * mix;
      ctx.drawImage(frames[a + 1], x0, y0, width, height);
    }
    ctx.globalAlpha = 1;
    ctx.strokeStyle = rgba(INK.silver, 0.25);
    ctx.strokeRect(x0, y0, width, height);
    const step = Math.round((1 - denoise) * 50);
    label(ctx, `denoising step ${50 - step} of 50`, w / 2, y0 + height + 28, {
      size: 13,
      face: 'mono',
      color: INK.white,
      align: 'center',
      alpha: noiseIn,
    });
    // A timeline of the steps, filling as the picture clears.
    const barW = Math.min(width, 360);
    ctx.fillStyle = rgba(INK.silver, 0.15);
    ctx.fillRect(w / 2 - barW / 2, y0 + height + 46, barW, 4);
    ctx.fillStyle = rgba(spectrum(0.55), 0.9);
    ctx.fillRect(w / 2 - barW / 2, y0 + height + 46, barW * denoise, 4);
    if (denoise > 0.95)
      additive(ctx, () =>
        glow(
          ctx,
          x0 + width * 0.62,
          y0 + height * 0.5,
          width * 0.2,
          '#f5b942',
          0.25 + 0.1 * Math.sin(t * 2),
        ),
      );
    label(ctx, 'Illustration: one picture’s noised versions, in reverse', w / 2, h - 22, {
      size: 12,
      color: INK.muted,
      align: 'center',
      alpha: noiseIn,
    });
  };
}
