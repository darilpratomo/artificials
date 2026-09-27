import type { Draw } from '../engine';
import {
  CATEGORIES,
  HUE,
  INK,
  additive,
  dotGrid,
  easeInOut,
  glow,
  label,
  lerp,
  rgba,
  roundRect,
  span,
  spectrum,
  textWidth,
  wash,
} from '../kit';

/** A fluent, confident, wrong answer: a common misconception, with high probabilities. */
export const WRONG: [text: string, probability: number, wrong?: true][] = [
  ['The', 0.62],
  [' sky', 0.91],
  [' is', 0.88],
  [' blue', 0.95],
  [' because', 0.84],
  [' it', 0.47, true],
  [' reflects', 0.58, true],
  [' the', 0.9, true],
  [' ocean', 0.71, true],
  ['.', 0.93],
];

/**
 * What AI is not: probability is not truth. A fluent answer can be confidently
 * wrong; checking it against a source shows where.
 */
export function createLimits(): Draw {
  return (ctx, { w, h, p, t }) => {
    ctx.fillStyle = INK.void;
    ctx.fillRect(0, 0, w, h);
    dotGrid(ctx, w, h, 30, INK.silver, 0.04);
    wash(ctx, w * 0.5, h * 0.45, Math.max(w, h) * 0.6, spectrum(0.12), 0.12);

    // The answer is there from the start; the doubt, the check and the reader follow.
    const write = 1;
    const doubt = easeInOut(span(p, 0.16, 0.31));
    const check = easeInOut(span(p, 0.46, 0.64));
    const you = easeInOut(span(p, 0.76, 0.94));

    const size = Math.max(15, Math.min(28, w / 26));
    const shown = Math.floor(write * WRONG.length + 1e-6);
    const widths = WRONG.map(([text]) => textWidth(ctx, text, size, 600, 'display'));
    // The sentence wraps onto two lines when the screen is narrow.
    const maxW = w * 0.88;
    const lines: number[][] = [[]];
    let lineWidth = 0;
    WRONG.forEach((_, index) => {
      if (lineWidth + widths[index] > maxW && lines[lines.length - 1].length) {
        lines.push([]);
        lineWidth = 0;
      }
      lines[lines.length - 1].push(index);
      lineWidth += widths[index];
    });
    const top = h * 0.2;
    const lineH = size * 3.2;
    const positions: { x: number; y: number }[] = [];
    lines.forEach((line, row) => {
      const width = line.reduce((sum, index) => sum + widths[index], 0);
      let x = w / 2 - width / 2;
      for (const index of line) {
        positions[index] = { x, y: top + row * lineH };
        x += widths[index];
      }
    });

    WRONG.forEach(([text, probability, wrong], index) => {
      if (index >= shown && write < 1) return;
      const { x, y } = positions[index];
      const flagged = wrong ? Math.max(doubt * 0.6, check) : 0;
      const struck = wrong ? check : 0;
      label(ctx, text, x, y, {
        size,
        weight: 600,
        face: 'display',
        color: INK.white,
        alpha: 1 - struck * 0.55,
      });
      // Under each token, how likely the model found it.
      const barW = widths[index] - (text.startsWith(' ') ? size * 0.3 : 0);
      const barX = x + (text.startsWith(' ') ? size * 0.3 : 0);
      ctx.fillStyle = rgba(INK.silver, 0.15);
      ctx.fillRect(barX, y + size * 0.8, barW, 4);
      ctx.fillStyle = rgba(flagged > 0.3 ? HUE.red : CATEGORIES[1], 0.9);
      ctx.fillRect(barX, y + size * 0.8, barW * probability, 4);
      if (wrong && struck > 0) {
        ctx.strokeStyle = rgba(HUE.red, 0.9 * struck);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + widths[index] * struck, y);
        ctx.stroke();
      }
      if (wrong && flagged > 0)
        additive(ctx, () =>
          glow(ctx, x + widths[index] / 2, y, widths[index], HUE.red, flagged * 0.18),
        );
    });
    label(ctx, 'fluent, likely, and wrong', w / 2, top - size * 1.5, {
      size: 13,
      color: INK.silver,
      align: 'center',
      alpha: doubt,
    });

    // A source says otherwise, and the answer is corrected.
    const cardY = top + lines.length * lineH + 20;
    if (check > 0) {
      const cardW = Math.min(w * 0.84, 520);
      const x = w / 2 - cardW / 2;
      const y = lerp(cardY + 40, cardY, check);
      roundRect(ctx, x, y, cardW, 86, 14);
      ctx.fillStyle = rgba(INK.panel, 0.95 * check);
      ctx.fill();
      ctx.strokeStyle = rgba(HUE.green, 0.7 * check);
      ctx.lineWidth = 1.3;
      ctx.stroke();
      label(ctx, 'NASA Space Place', x + 16, y + 20, {
        size: 12,
        weight: 650,
        color: INK.silver,
        alpha: check,
      });
      label(ctx, 'Sunlight scatters off the gases in the air,', x + 16, y + 44, {
        size: 14,
        color: INK.white,
        alpha: check,
      });
      label(ctx, 'and blue light scatters more than red.', x + 16, y + 66, {
        size: 14,
        color: INK.white,
        alpha: check,
      });
    }
    // The last check is yours.
    if (you > 0) {
      const y = cardY + 130;
      const items = [
        'Where does this claim come from?',
        'Does a source actually say it?',
        'Would I bet on it?',
      ];
      items.forEach((text, index) => {
        const reveal = easeInOut(span(you, index * 0.2, 0.5 + index * 0.2));
        const x = w / 2 - Math.min(w * 0.4, 220);
        ctx.strokeStyle = rgba(CATEGORIES[2], 0.9 * reveal);
        ctx.lineWidth = 1.5;
        roundRect(ctx, x, y + index * 30 - 8, 16, 16, 4);
        ctx.stroke();
        if (reveal > 0.8) {
          ctx.beginPath();
          ctx.moveTo(x + 4, y + index * 30);
          ctx.lineTo(x + 7, y + index * 30 + 4);
          ctx.lineTo(x + 13, y + index * 30 - 4);
          ctx.stroke();
        }
        label(ctx, text, x + 28, y + index * 30, { size: 13.5, color: INK.white, alpha: reveal });
      });
      additive(ctx, () =>
        glow(ctx, w / 2, y + 30, 160, CATEGORIES[2], you * (0.12 + 0.04 * Math.sin(t * 2))),
      );
    }
  };
}
