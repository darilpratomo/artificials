import type { Draw } from '../engine';
import {
  INK,
  additive,
  dotGrid,
  easeInOut,
  easeOut,
  glow,
  lerp,
  label,
  rgba,
  roundRect,
  span,
  spectrum,
  textWidth,
  wash,
} from '../kit';

/** The pieces of the question, with numbers standing in for a vocabulary's. */
export const PIECES: [text: string, id: number][] = [
  ['Why', 10445],
  [' is', 374],
  [' the', 279],
  [' sky', 13180],
  [' blue', 6437],
  ['?', 30],
];
/** A slice of a vocabulary around the pieces, as a tokenizer would look them up. */
const VOCABULARY: [string, number][] = [
  [' sk', 1940],
  [' ski', 29838],
  [' sky', 13180],
  [' skies', 67635],
  [' blu', 26344],
  [' blue', 6437],
  [' bluer', 88254],
  [' the', 279],
  [' is', 374],
  ['Why', 10445],
  ['?', 30],
  [' why', 3249],
];

/**
 * Words become numbers: the question is cut into pieces, each piece is looked
 * up in a vocabulary, and the numbers line up for the model.
 */
export function createTokens(): Draw {
  return (ctx, { w, h, p, t }) => {
    ctx.fillStyle = INK.void;
    ctx.fillRect(0, 0, w, h);
    dotGrid(ctx, w, h, 28, INK.silver, 0.05);
    wash(ctx, w * 0.5, h * 0.45, Math.max(w, h) * 0.6, spectrum(0.08), 0.12);

    const wide = w >= 620;
    const cut = easeInOut(span(p, 0.06, 0.31));
    const lookup = easeInOut(span(p, 0.4, 0.62));
    const line = easeInOut(span(p, 0.72, 0.94));
    // On wide screens the words move left to make room for the vocabulary.
    const panel = wide ? lookup * (1 - line) : 0;

    // The words take the size that fits once they are cut apart, and shrink to
    // share the width with the vocabulary.
    const unit =
      PIECES.reduce((sum, [text]) => sum + textWidth(ctx, text, 100, 600, 'display') / 100, 0) +
      PIECES.length * 0.44 +
      (PIECES.length - 1) * 0.36;
    const full = Math.min(58, (w * 0.88) / unit);
    const size = Math.max(14, lerp(full, Math.min(full, (w * 0.54) / unit), panel));
    const gap = size * 0.36 * cut;
    const pad = size * 0.22 * cut;
    const widths = PIECES.map(([text]) => textWidth(ctx, text, size, 600, 'display'));
    const total =
      widths.reduce((sum, width) => sum + width + pad * 2, 0) + gap * (PIECES.length - 1);
    const centreX = lerp(w / 2, w * 0.325, panel);
    const baseY = h * lerp(0.44, 0.4, lookup);
    let x = centreX - total / 2;

    // The vocabulary: a column of entries sliding past, the pieces lit as they are found.
    if (wide && panel > 0.01) {
      const px = w * 0.64;
      const pw = w * 0.32;
      const rowH = Math.max(26, size * 0.62);
      const top = h * 0.16;
      const bottom = h * 0.84;
      ctx.save();
      ctx.beginPath();
      ctx.rect(px, top, pw, bottom - top);
      ctx.clip();
      ctx.fillStyle = rgba(INK.panel, 0.85 * panel);
      ctx.fillRect(px, top, pw, bottom - top);
      const scroll = (1 - lookup) * rowH * 4;
      VOCABULARY.forEach(([text, id], row) => {
        const y = top + 18 + row * rowH - scroll;
        const found = PIECES.findIndex(([piece]) => piece === text);
        const lit = found >= 0 ? span(lookup, found / 8, found / 8 + 0.4) : 0;
        if (lit > 0) {
          ctx.fillStyle = rgba(spectrum(found / 6), 0.16 * lit * panel);
          ctx.fillRect(px + 4, y - rowH / 2 + 3, pw - 8, rowH - 6);
        }
        label(ctx, text.replace(' ', '·'), px + 16, y, {
          size: size * 0.34,
          face: 'mono',
          color: lit > 0.5 ? INK.white : INK.muted,
          alpha: panel,
        });
        label(ctx, String(id), px + pw - 16, y, {
          size: size * 0.34,
          face: 'mono',
          align: 'right',
          color: lit > 0.5 ? INK.white : INK.faint,
          alpha: panel,
        });
      });
      ctx.restore();
      label(ctx, 'Vocabulary', px, top - 14, { size: 12, color: INK.muted, alpha: panel });
    }

    const chips = PIECES.map(([text, id], index) => {
      const width = widths[index] + pad * 2;
      const chip = { text, id, x, width, index };
      x += width + gap;
      return chip;
    });

    // Each chip keeps its place until the numbers line up, then moves into the row.
    const idSize = size * 0.42;
    const row = PIECES.map(([, id]) => `${id}`);
    const rowText = `[${row.join(', ')}]`;
    const rowWidth = textWidth(ctx, rowText, idSize * 1.25, 500, 'mono');
    let rowX = w / 2 - rowWidth / 2 + textWidth(ctx, '[', idSize * 1.25, 500, 'mono');
    // The numbers drop into their own row, below the words they came from.
    const rowY = h * 0.66;

    for (const chip of chips) {
      const color = spectrum(chip.index / 6);
      const chipH = size * 1.35 + idSize * 1.6 * lookup;
      const top = baseY - size * 0.68;
      // The words give way as their numbers leave for the row.
      const fade = 1 - easeOut(span(line, 0, 0.55));
      // The cut: a beam of light where the tokenizer divides the words.
      if (cut > 0 && cut < 1 && chip.index > 0) {
        const beam = Math.sin(cut * Math.PI);
        additive(ctx, () => {
          const bx = chip.x - gap / 2;
          ctx.fillStyle = rgba(color, 0.55 * beam);
          ctx.fillRect(bx - 1, top - size * 0.6, 2, chipH + size * 1.2);
          glow(ctx, bx, baseY, size * 0.9, color, 0.35 * beam);
        });
      }
      if (fade > 0.01) {
        if (cut > 0.02) {
          roundRect(ctx, chip.x, top, chip.width, chipH, size * 0.22);
          ctx.fillStyle = rgba(color, 0.1 * cut * fade);
          ctx.fill();
          ctx.strokeStyle = rgba(color, 0.7 * cut * fade);
          ctx.lineWidth = 1.2;
          ctx.stroke();
        }
        // A leading space is part of the piece; the tokenizer marks it.
        const spaced = chip.text.startsWith(' ');
        const shown = spaced ? chip.text.slice(1) : chip.text;
        const offset = spaced ? textWidth(ctx, ' ', size, 600, 'display') : 0;
        if (spaced && cut > 0.3)
          label(ctx, '·', chip.x + pad + offset * 0.35, baseY - size * 0.02, {
            size,
            weight: 700,
            color,
            alpha: span(cut, 0.3, 1) * fade,
            face: 'display',
            align: 'center',
          });
        label(ctx, shown, chip.x + pad + offset, baseY, {
          size,
          weight: 600,
          face: 'display',
          color: INK.white,
          alpha: fade,
        });
        if (lookup > 0.02)
          label(ctx, `${chip.id}`, chip.x + chip.width / 2, baseY + size * 0.55 + idSize * 0.7, {
            size: idSize,
            face: 'mono',
            color: INK.silver,
            align: 'center',
            alpha: lookup * fade,
          });
      }
      // The numbers travel into one row: the input the model receives.
      if (line > 0) {
        const text = `${chip.id}`;
        const target = rowX + textWidth(ctx, text, idSize * 1.25, 500, 'mono') / 2;
        rowX += textWidth(ctx, `${text}, `, idSize * 1.25, 500, 'mono');
        const move = easeOut(span(line, chip.index * 0.06, 0.5 + chip.index * 0.06));
        const fromX = chip.x + chip.width / 2;
        const fromY = baseY + size * 0.55 + idSize * 0.7;
        label(ctx, text, lerp(fromX, target, move), lerp(fromY, rowY, move), {
          size: lerp(idSize, idSize * 1.25, move),
          face: 'mono',
          color: INK.white,
          align: 'center',
          alpha: Math.min(1, line * 3),
        });
      }
    }

    if (line > 0.4) {
      const alpha = span(line, 0.4, 0.8);
      const left = w / 2 - rowWidth / 2;
      label(ctx, '[', left, rowY, { size: idSize * 1.25, face: 'mono', color: INK.muted, alpha });
      label(ctx, ']', left + rowWidth, rowY, {
        size: idSize * 1.25,
        face: 'mono',
        color: INK.muted,
        align: 'right',
        alpha,
      });
      // Commas between the numbers.
      let cx = left + textWidth(ctx, '[', idSize * 1.25, 500, 'mono');
      row.forEach((text, index) => {
        cx += textWidth(ctx, text, idSize * 1.25, 500, 'mono');
        if (index < row.length - 1)
          label(ctx, ',', cx, rowY, { size: idSize * 1.25, face: 'mono', color: INK.muted, alpha });
        cx += textWidth(ctx, ', ', idSize * 1.25, 500, 'mono');
      });
      // They flow on, into the model below.
      additive(ctx, () => {
        for (let i = 0; i < 18; i++) {
          const phase = (t * 0.45 + i / 18) % 1;
          const x = left + (((i * 37) % 100) / 100) * rowWidth;
          const y = rowY + idSize * 1.2 + phase * (h - rowY - idSize * 1.2);
          glow(ctx, x, y, 3.5, spectrum((i % 6) / 6), alpha * (1 - phase) * 0.9);
        }
      });
      label(ctx, 'What the model receives', w / 2, rowY - idSize * 1.8, {
        size: 13,
        color: INK.muted,
        align: 'center',
        alpha,
      });
    }

    // Before the cut, the question sits in a box with a blinking caret.
    const typed = 1 - cut;
    if (typed > 0.01) {
      const left = chips[0].x;
      const right = chips[chips.length - 1].x + chips[chips.length - 1].width;
      roundRect(
        ctx,
        left - size * 0.5,
        baseY - size * 0.95,
        right - left + size,
        size * 1.9,
        size * 0.3,
      );
      ctx.strokeStyle = rgba(INK.silver, 0.18 * typed);
      ctx.lineWidth = 1;
      ctx.stroke();
      const blink = Math.sin(t * 5) > 0 ? 1 : 0.15;
      ctx.fillStyle = rgba(spectrum(0.1), typed * blink);
      ctx.fillRect(right + size * 0.08, baseY - size * 0.5, Math.max(2, size * 0.05), size);
    }
    if (lookup > 0.02 && line < 0.98)
      label(ctx, 'Illustrative numbers: each tokenizer has its own.', w / 2, h - 28, {
        size: 12,
        color: INK.muted,
        align: 'center',
        alpha: lookup * (1 - line),
      });
  };
}
