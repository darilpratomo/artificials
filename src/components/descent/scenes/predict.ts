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
  return (ctx, { w, h, p, t, input }) => {
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
    const words = [
      'Why is the sky blue?',
      ...ANSWER.slice(0, written).map((token, index) =>
        index === 0 && pick > 0.95 ? CANDIDATES[chosen][0] : token,
      ),
    ];
    const text = words.join('');
    const size = Math.max(14, Math.min(24, w / 30));
    const textW = textWidth(ctx, text, size, 600, 'display');
    const maxW = w * 0.9;
    // Long answers wrap onto a second line.
    const lines: string[] = [];
    if (textW <= maxW) lines.push(text);
    else {
      let lineText = '';
      for (const piece of words.flatMap((word, index) =>
        index === 0 ? word.split(/(?= )/) : [word],
      )) {
        if (textWidth(ctx, lineText + piece, size, 600, 'display') > maxW && lineText) {
          lines.push(lineText);
          lineText = piece.trimStart();
        } else lineText += piece;
      }
      lines.push(lineText);
    }
    lines.forEach((lineText, index) => {
      label(ctx, lineText, w / 2, h * 0.1 + index * size * 1.4, {
        size,
        weight: 600,
        face: 'display',
        color: INK.white,
        align: 'center',
      });
    });
    const caretLine = lines[lines.length - 1];
    const caretX = w / 2 + textWidth(ctx, caretLine, size, 600, 'display') / 2 + 4;
    const caretY = h * 0.1 + (lines.length - 1) * size * 1.4;
    if (Math.sin(t * 5) > 0 || write >= 1) {
      ctx.fillStyle = rgba(HUE.violet, 0.9);
      ctx.fillRect(caretX, caretY - size * 0.55, 2, size * 1.1);
    }

    // A score for every token in the vocabulary, before zooming in on the best.
    const chartTop = h * 0.26;
    // The slider sits over the bottom of the picture; the chart stops above it.
    const chartBottom = Math.min(h * 0.84, h - 104);
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
      label(ctx, 'one score for each of the vocabulary’s tokens', w / 2, chartBottom + 22, {
        size: 12,
        color: INK.muted,
        align: 'center',
        alpha: 1 - zoomIn,
      });
    }

    // The best candidates, as probabilities.
    if (zoomIn > 0) {
      // While the rest of the answer is written, the first choice steps back.
      ctx.save();
      ctx.globalAlpha = 1 - 0.72 * span(write, 0, 0.15);
      const narrow = w < 560;
      const labelW = narrow ? 86 : 118;
      const left = w * (narrow ? 0.06 : 0.12) + labelW;
      const barMax = w * (narrow ? 0.62 : 0.6) - labelW;
      const rowH = Math.min(38, (chartBottom - chartTop) / CANDIDATES.length);
      CANDIDATES.forEach(([word], index) => {
        const y = chartTop + index * rowH + rowH / 2;
        const value = probabilities[index] * easeOut(zoomIn);
        const isChosen = index === chosen && pick > 0;
        label(ctx, word.trim(), left - 14, y, {
          size: 14,
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
            size: 12.5,
            face: 'mono',
            color: INK.silver,
            alpha: zoomIn,
          },
        );
      });
      // The draw: a fixed random number, walked along the probabilities in order.
      if (pick > 0) {
        const x = w * 0.5;
        label(
          ctx,
          `random draw ${DRAW.toFixed(2)} lands on “${CANDIDATES[chosen][0].trim()}”`,
          x,
          chartBottom + 26,
          {
            size: 12.5,
            color: INK.silver,
            align: 'center',
            alpha: pick,
          },
        );
      }
      ctx.restore();
    }
    // The chosen word flies up to join the text.
    if (pick > 0.4 && pick < 1 && written === 0) {
      const from = CANDIDATES.findIndex((_, index) => index === chosen);
      const y = lerp(chartTop + from * 38, h * 0.1, easeInOut(span(pick, 0.4, 1)));
      label(ctx, CANDIDATES[chosen][0].trim(), w / 2 + textW / 2 + 30, y, {
        size,
        weight: 650,
        face: 'display',
        color: INK.white,
        alpha: span(pick, 0.4, 0.6),
      });
    }
    // Then again, and again: each new token is added and the loop runs once more.
    if (write > 0) {
      label(
        ctx,
        `token ${Math.min(ANSWER.length, written)} of ${ANSWER.length}: each new token goes back in as input`,
        w / 2,
        h - 26,
        {
          size: 12.5,
          color: INK.silver,
          align: 'center',
          alpha: span(write, 0, 0.2),
        },
      );
    }
  };
}
