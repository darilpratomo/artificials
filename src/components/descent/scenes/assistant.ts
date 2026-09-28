import type { Draw } from '../engine';
import {
  HUE,
  INK,
  additive,
  dotGrid,
  glow,
  label,
  lines,
  rgba,
  roundRect,
  span,
  spectrum,
  textWidth,
  wash,
  wrap,
} from '../kit';

export const PROMPT = 'Why is the sky blue?';
/** How a base model might carry on, as if the question began a web page. Illustrative. */
export const CONTINUATION = [
  'Why is the grass green?',
  'Why is the sea salty?',
  'Why do cats purr?',
  '25 questions children ask, answered',
];
/** Example answers written by people, for supervised fine-tuning. Illustrative. */
export const DEMONSTRATIONS: [question: string, answer: string][] = [
  ['What makes a rainbow?', 'Sunlight bends and splits into colours inside raindrops.'],
  ['How far away is the Moon?', 'About 384,000 km, on average.'],
  ['Say “thank you” in Indonesian.', 'Terima kasih.'],
];
/** Two answers a person compares, and the reward model's scores for them. Illustrative. */
export const CHOICES: [answer: string, reward: number][] = [
  [
    'Air molecules scatter blue light more than red, so blue reaches us from all over the sky.',
    0.92,
  ],
  ['Because it reflects the ocean.', 0.11],
];
export const ANSWER_TUNED = 'Air molecules scatter blue light more than red.';

interface Part {
  text: string;
  size: number;
  weight?: number;
  color: string;
}

/**
 * From predictor to assistant: a base model continues the page; people's
 * example answers train it; people's choices train a reward model; and the
 * tuned model answers the question.
 */
export function createAssistant(): Draw {
  return (ctx, { w, h, p, t }) => {
    ctx.fillStyle = INK.void;
    ctx.fillRect(0, 0, w, h);
    dotGrid(ctx, w, h, 30, INK.silver, 0.04);
    wash(ctx, w * 0.5, h * 0.45, Math.max(w, h) * 0.6, spectrum(0.46), 0.12);

    // One part at a time, each complete at its step.
    const base = 1 - span(p, 0.06, 0.16);
    const shown = span(p, 0.18, 0.28) * (1 - span(p, 0.4, 0.5));
    const ranked = span(p, 0.52, 0.62) * (1 - span(p, 0.73, 0.83));
    const tuned = span(p, 0.85, 0.95);
    const wide = w >= 620;
    // Larger pictures get larger type, so the conversation fills them.
    const k = Math.max(1, Math.min(1.35, Math.min(w, h) / 560));
    const margin = wide ? Math.max(24, (w - 560 * k) / 2) : 14;
    const inner = w - margin * 2;
    const floor = h - 50;

    /** A card of wrapped text; returns its height. Measures only when `alpha` is 0. */
    const card = (
      x: number,
      y: number,
      width: number,
      parts: Part[],
      stroke: string,
      alpha: number,
      extra = 0,
      right = 0,
    ) => {
      const pad = 11;
      const rows = parts.map((part) => ({
        part,
        rows: wrap(ctx, part.text, width - pad * 2 - right, part.size, part.weight),
      }));
      const height =
        pad * 2 +
        extra +
        rows.reduce((sum, { part, rows }) => sum + rows.length * Math.round(part.size * 1.4), 0) +
        (rows.length - 1) * 3;
      if (alpha <= 0.01) return height;
      roundRect(ctx, x, y, width, height, 12);
      ctx.fillStyle = rgba(INK.panel, 0.95 * alpha);
      ctx.fill();
      ctx.strokeStyle = rgba(stroke, 0.8 * alpha);
      ctx.lineWidth = 1.2;
      ctx.stroke();
      let cy = y + pad;
      for (const { part, rows: text } of rows) {
        const leading = Math.round(part.size * 1.4);
        for (const row of text) {
          label(ctx, row, x + pad, cy + leading / 2, {
            size: part.size,
            weight: part.weight,
            color: part.color,
            alpha,
          });
          cy += leading;
        }
        cy += 3;
      }
      return height;
    };
    const note = (text: string, alpha: number) => {
      if (alpha > 0.01)
        lines(ctx, text, w / 2, h - 16, w - 32, {
          size: 12.5 * k,
          color: INK.silver,
          align: 'center',
          alpha,
          from: 'bottom',
        });
    };
    // The question, from the reader, on the right.
    const promptAlpha = Math.max(base, ranked, tuned);
    const promptSize = 14 * k;
    const promptW = Math.min(textWidth(ctx, PROMPT, promptSize, 600) + 26, inner);
    const promptH = card(
      0,
      0,
      promptW,
      [{ text: PROMPT, size: promptSize, weight: 600, color: INK.white }],
      INK.silver,
      0,
    );
    // The tallest part, the two answers under the question, is centred; the rest share its top.
    const choice = (index: number, alpha: number, y = 0) =>
      card(
        margin,
        y,
        inner,
        [{ text: CHOICES[index][0], size: 13 * k, color: INK.white }],
        index === 0 ? HUE.green : INK.muted,
        alpha,
        22,
        index === 0 ? 22 : 0,
      );
    const tallest = promptH + 12 + choice(0, 0) + 10 + choice(1, 0);
    const top = Math.max(22, (floor - tallest) / 2);
    if (promptAlpha > 0.01)
      card(
        w - margin - promptW,
        top,
        promptW,
        [{ text: PROMPT, size: promptSize, weight: 600, color: INK.white }],
        INK.silver,
        promptAlpha,
      );
    const below = top + promptH + 12;

    // A base model carries on as if the question began a web page.
    if (base > 0.01) {
      const width = Math.min(inner, 440);
      card(
        margin,
        below,
        width,
        [
          { text: 'base model', size: 11.5 * k, weight: 600, color: INK.muted },
          ...CONTINUATION.map((text) => ({ text, size: 13 * k, color: INK.silver })),
        ],
        INK.muted,
        base,
      );
    }

    // People write example answers; the model is trained on them.
    if (shown > 0.01) {
      const node = { x: w - margin - 26, r: 22 };
      const width = Math.min(inner - node.r * 2 - 30, 420);
      const parts = ([question, answer]: [string, string]): Part[] => [
        { text: question, size: 12.5 * k, weight: 600, color: INK.white },
        { text: answer, size: 12.5 * k, color: INK.silver },
      ];
      label(ctx, 'written by people', margin, top + 6, {
        size: 11.5 * k,
        weight: 600,
        color: INK.muted,
        alpha: shown,
      });
      let y = top + 20;
      const placed: { y: number; height: number }[] = [];
      for (const example of DEMONSTRATIONS) {
        const height = card(0, 0, width, parts(example), INK.silver, 0);
        if (y + height > floor) break;
        placed.push({ y, height });
        y += height + 10;
      }
      placed.forEach(({ y }, index) =>
        card(margin, y, width, parts(DEMONSTRATIONS[index]), HUE.cyan, shown),
      );
      const middle = (top + 20 + y - 10) / 2;
      ctx.beginPath();
      ctx.arc(node.x, middle, node.r, 0, Math.PI * 2);
      ctx.fillStyle = rgba(INK.panel, shown);
      ctx.fill();
      ctx.strokeStyle = rgba(HUE.violet, 0.9 * shown);
      ctx.lineWidth = 1.5;
      ctx.stroke();
      label(ctx, 'model', node.x, middle + node.r + 14, {
        size: 11.5 * k,
        color: INK.silver,
        align: 'center',
        alpha: shown,
      });
      // Each example flows into the model.
      additive(ctx, () => {
        placed.forEach(({ y, height }, index) => {
          const phase = (t * 0.5 + index / placed.length) % 1;
          const x = margin + width + (node.x - node.r - margin - width) * phase;
          const cy = y + height / 2 + (middle - y - height / 2) * phase;
          glow(ctx, x, cy, 9, HUE.cyan, shown * Math.sin(phase * Math.PI));
        });
        glow(
          ctx,
          node.x,
          middle,
          node.r * 2.4,
          HUE.violet,
          shown * (0.35 + 0.15 * Math.sin(t * 3)),
        );
      });
    }

    // People pick the better of two answers; a reward model learns to score them.
    if (ranked > 0.01) {
      const width = inner;
      let y = below;
      CHOICES.forEach(([, reward], index) => {
        const height = choice(index, ranked, y);
        // The reward model's score, drawn inside the card under its answer.
        const barY = y + height - 11 - 8;
        const barX = margin + 11;
        const text = `reward ${reward.toFixed(2)}`;
        const barW = width - 22 - textWidth(ctx, text, 11.5 * k, 500, 'mono') - 12;
        ctx.fillStyle = rgba(INK.silver, 0.12 * ranked);
        ctx.fillRect(barX, barY, barW, 6);
        ctx.fillStyle = rgba(index === 0 ? HUE.green : INK.silver, 0.9 * ranked);
        ctx.fillRect(barX, barY, barW * reward, 6);
        label(ctx, text, margin + width - 11, barY + 3, {
          size: 11.5 * k,
          face: 'mono',
          color: INK.silver,
          align: 'right',
          alpha: ranked,
        });
        if (index === 0) {
          // The person's pick: a tick in the corner of the better answer.
          const cx = margin + width - 16;
          const cy = y + 14;
          ctx.strokeStyle = rgba(HUE.green, ranked);
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(cx - 5, cy);
          ctx.lineTo(cx - 1, cy + 4);
          ctx.lineTo(cx + 6, cy - 4);
          ctx.stroke();
        }
        y += height + 10;
      });
    }

    // Tuned, the model answers the question.
    if (tuned > 0.01) {
      const width = Math.min(inner, textWidth(ctx, ANSWER_TUNED, 14 * k, 500) + 26);
      label(ctx, 'tuned model', margin, below + 6, {
        size: 11.5 * k,
        weight: 600,
        color: INK.muted,
        alpha: tuned,
      });
      card(
        margin,
        below + 18,
        width,
        [{ text: ANSWER_TUNED, size: 14 * k, color: INK.white }],
        HUE.green,
        tuned,
      );
    }

    note('a base model continues the page (illustrative)', base);
    note('people write example answers, and the model is trained on them', shown);
    note(
      'people pick the better answer; a reward model learns to score answers the same way (illustrative)',
      ranked,
    );
    note('tuned with people’s feedback, it answers the question', tuned);
  };
}
