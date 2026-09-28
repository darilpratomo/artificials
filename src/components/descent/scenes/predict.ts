import type { Draw } from '../engine';
import { sample, softmax } from '../../../lib/descent-math';
import {
  CATEGORIES,
  HUE,
  INK,
  additive,
  dotGrid,
  easeInOut,
  easeOut,
  glow,
  label,
  lerp,
  lines,
  random,
  rgba,
  roundRect,
  span,
  spectrum,
  textWidth,
  wash,
} from '../kit';

/** Candidates for the first word of the answer, with illustrative scores. */
export const CANDIDATES: [string, number][] = [
  [' Air', 3.1],
  [' Because', 2.6],
  [' The', 2.4],
  [' Sunlight', 2.2],
  [' Light', 1.6],
  [' It', 1.2],
  [' Blue', 0.9],
  [' When', 0.5],
];
/** The answer the model goes on to write, one token at a time. */
export const ANSWER = [
  ' Air',
  ' molecules',
  ' scatter',
  ' blue',
  ' light',
  ' more',
  ' than',
  ' red',
  '.',
];
/** A fixed draw, so the same word is chosen every time the page is read. */
export const DRAW = 0.21;

/**
 * The next token: scores become probabilities, one token is drawn, it joins
 * the text, and the loop runs again until the answer is written.
 */
export function createPredict(): Draw {
  const noise = random(12);
  const spectrumBars = Array.from({ length: 180 }, () => 0.1 + noise() * noise() * 0.9);
  return (ctx, { w, h, p, t, input, reserve }) => {
    ctx.fillStyle = INK.void;
    ctx.fillRect(0, 0, w, h);
    dotGrid(ctx, w, h, 30, INK.silver, 0.04);
    wash(ctx, w * 0.5, h * 0.5, Math.max(w, h) * 0.6, spectrum(0.36), 0.12);

    const temperature = input.temperature ?? 1;
    const probabilities = softmax(
      CANDIDATES.map(([, score]) => score),
      temperature,
    );
    const zoomIn = easeInOut(span(p, 0.08, 0.3));
    const pick = easeInOut(span(p, 0.44, 0.62));
    const write = span(p, 0.7, 0.98);
    const chosen = sample(probabilities, DRAW);

    // The text so far, and the answer growing at the end of it.
    const written = Math.floor(lerp(pick > 0.95 ? 1 : 0, ANSWER.length, write) + 1e-6);
    const size = Math.max(14, Math.min(24, w / 30));
    const leading = size * 1.4;
    const maxW = w * 0.9;
    // Long answers wrap: the question's words one by one, then token by token.
    const wrapped = (pieces: string[]) => {
      const rows: string[] = [];
      let row = '';
      for (const piece of pieces.flatMap((word, index) =>
        index === 0 ? word.split(/(?= )/) : [word],
      )) {
        if (row && textWidth(ctx, row + piece, size, 600, 'display') > maxW) {
          rows.push(row);
          row = piece.trimStart();
        } else row += piece;
      }
      return [...rows, row];
    };
    const words = [
      'Why is the sky blue?',
      ...ANSWER.slice(0, written).map((token, index) =>
        index === 0 && pick > 0.95 ? CANDIDATES[chosen][0] : token,
      ),
    ];
    const rows = wrapped(words);
    const textY = h < 520 ? 22 : h * 0.1;
    rows.forEach((row, index) => {
      label(ctx, row, w / 2, textY + index * leading, {
        size,
        weight: 600,
        face: 'display',
        color: INK.white,
        align: 'center',
      });
    });
    const caretX = w / 2 + textWidth(ctx, rows[rows.length - 1], size, 600, 'display') / 2 + 4;
    const caretY = textY + (rows.length - 1) * leading;
    if (Math.sin(t * 5) > 0 || write >= 1) {
      ctx.fillStyle = rgba(HUE.violet, 0.9);
      ctx.fillRect(caretX, caretY - size * 0.55, 2, size * 1.1);
    }

    // The chart keeps clear of the whole answer, however many lines it will take,
    // and stops above the note that sits just over the slider.
    const answerRows = wrapped(['Why is the sky blue?', ...ANSWER]).length;
    const chartTop = textY + (answerRows - 1) * leading + size * 0.6 + 16;
    const noteY = h - reserve - 12;
    const chartBottom = noteY - 22;
    const note = (text: string, alpha: number) =>
      alpha > 0 &&
      lines(ctx, text, w / 2, noteY, w - 32, {
        size: 12.5,
        color: INK.silver,
        align: 'center',
        alpha,
        from: 'bottom',
      });

    // A score for every token in the vocabulary, before zooming in on the best.
    if (zoomIn < 1) {
      const bw = (w * 0.86) / spectrumBars.length;
      spectrumBars.forEach((value, index) => {
        const x = w * 0.07 + index * bw;
        const height = value * (chartBottom - chartTop) * 0.7;
        ctx.fillStyle = rgba(
          spectrum(0.3 + (index / spectrumBars.length) * 0.2),
          (0.55 - zoomIn * 0.55) * (index % 23 === 5 ? 1.6 : 1),
        );
        ctx.fillRect(x, chartBottom - height, Math.max(1, bw - 1), height);
      });
      note('one score for each of the vocabulary’s tokens', 1 - span(zoomIn, 0, 0.5));
    }

    // The best candidates, as probabilities.
    // On a short picture, the six likeliest candidates, each with room to read;
    // the draw still uses them all.
    const count = (chartBottom - chartTop) / CANDIDATES.length < 17 ? 6 : CANDIDATES.length;
    const rowH = Math.min(38, (chartBottom - chartTop) / count);
    if (zoomIn > 0) {
      // While the rest of the answer is written, the first choice steps back.
      ctx.save();
      ctx.globalAlpha = 1 - 0.72 * span(write, 0, 0.15);
      const narrow = w < 560;
      const labelW = narrow ? 86 : 118;
      const left = w * (narrow ? 0.06 : 0.12) + labelW;
      const barMax = w * (narrow ? 0.62 : 0.6) - labelW;
      // Type follows the rows down on a short picture, so lines never touch.
      const wordSize = Math.min(14, rowH * 0.8);
      CANDIDATES.slice(0, count).forEach(([word], index) => {
        const y = chartTop + index * rowH + rowH / 2;
        const value = probabilities[index] * easeOut(zoomIn);
        const isChosen = index === chosen && pick > 0;
        label(ctx, word.trim(), left - 14, y, {
          size: wordSize,
          weight: isChosen ? 650 : 500,
          face: 'display',
          color: isChosen ? INK.white : INK.silver,
          align: 'right',
          alpha: zoomIn,
        });
        roundRect(
          ctx,
          left,
          y - rowH * 0.24,
          Math.max(3, barMax * value),
          rowH * 0.48,
          rowH * 0.12,
        );
        ctx.fillStyle = rgba(CATEGORIES[1], 0.35 + (isChosen ? 0.6 * pick : 0.35));
        ctx.fill();
        if (isChosen) {
          ctx.strokeStyle = rgba('#ffffff', 0.9 * pick);
          ctx.lineWidth = 1.5;
          ctx.stroke();
          additive(ctx, () =>
            glow(
              ctx,
              left + barMax * value,
              y,
              26,
              HUE.violet,
              pick * (0.6 + 0.3 * Math.sin(t * 3)),
            ),
          );
        }
        label(
          ctx,
          `${(probabilities[index] * 100).toFixed(1)}%`,
          left + Math.max(3, barMax * value) + 10,
          y,
          {
            size: Math.min(12.5, rowH * 0.75),
            face: 'mono',
            color: INK.silver,
            alpha: zoomIn,
          },
        );
      });
      ctx.restore();
    }
    // The draw: a fixed random number, walked along the probabilities in order.
    if (pick > 0)
      note(
        `random draw ${DRAW.toFixed(2)} lands on “${CANDIDATES[chosen][0].trim()}”`,
        pick * (1 - span(write, 0, 0.12)),
      );
    // The chosen word flies up to join the text.
    if (pick > 0.4 && pick < 1 && written === 0) {
      const y = lerp(chartTop + chosen * rowH + rowH / 2, textY, easeInOut(span(pick, 0.4, 1)));
      const textW = textWidth(ctx, words.join(''), size, 600, 'display');
      label(ctx, CANDIDATES[chosen][0].trim(), w / 2 + textW / 2 + 30, y, {
        size,
        weight: 650,
        face: 'display',
        color: INK.white,
        alpha: span(pick, 0.4, 0.6),
      });
    }
    // Then again, and again: each new token is added and the loop runs once more.
    if (write > 0)
      note(
        `token ${Math.min(ANSWER.length, written)} of ${ANSWER.length}: each new token goes back in as input`,
        span(write, 0.12, 0.3),
      );
  };
}
