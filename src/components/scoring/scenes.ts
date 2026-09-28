import type { Scoring, ScoringRow } from '../../../shared/scoring';
import { standardError } from '../../../shared/scoring';
import { makerColor } from '../../../shared/makers';
import { clamp, type Draw } from '../descent/engine';
import { backdrop, intervalRows, legend, note, withinLeader, type Entry } from '../descent/charts';
import {
  HUE,
  INK,
  TRIAD,
  additive,
  easeInOut,
  glow,
  label,
  lerp,
  mixHex,
  random,
  rgba,
  roundRect,
  span,
  spectrum,
  textWidth,
  wash,
  wrap,
} from '../descent/kit';
import {
  ACCURACY,
  CORRECT,
  MODELS,
  QUESTION,
  QUESTIONS,
  TESTS,
  answers,
  interval,
  logistic,
  reruns,
} from './model';

/** Larger pictures get larger type, up to a third larger. */
const grow = (w: number, h: number) => Math.max(1, Math.min(1.3, Math.min(w, h) / 560));

/** A tick mark, as a checked answer shows it. */
function tick(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  color: string,
  alpha: number,
) {
  ctx.strokeStyle = rgba(color, alpha);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x - size * 0.5, y);
  ctx.lineTo(x - size * 0.1, y + size * 0.4);
  ctx.lineTo(x + size * 0.6, y - size * 0.45);
  ctx.stroke();
}

/** A rounded card, filled and outlined. */
function card(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  stroke: string,
  alpha: number,
  radius = 12,
) {
  roundRect(ctx, x, y, width, height, radius);
  ctx.fillStyle = rgba(INK.panel, 0.95 * alpha);
  ctx.fill();
  ctx.strokeStyle = rgba(stroke, 0.7 * alpha);
  ctx.lineWidth = 1.2;
  ctx.stroke();
}

/** Real results as rows with their ranges: a model's name, its maker's colour and its score. */
const rowsOf = (
  rows: ScoringRow[],
  range: (row: ScoringRow) => readonly [number, number] | undefined,
) =>
  rows.map((row) => {
    const bounds = range(row);
    return {
      name: row.name,
      color: makerColor(row.makerId),
      score: row.score,
      ...(bounds ? { low: bounds[0], high: bounds[1] } : {}),
    };
  });
const makersOf = (rows: ScoringRow[]): Entry[] =>
  [...new Map(rows.map((row) => [row.makerId, row.maker]))].map(([id, maker]) => ({
    color: makerColor(id),
    text: maker,
  }));

/** One question: read, weighed, answered and checked against the key. */
export function createQuestion(): Draw {
  return (ctx, { w, h, p }) => {
    backdrop(ctx, w, h, 0.05);
    // Four steps: the question, the model's probabilities, its answer, the grade.
    const weighed = easeInOut(span(p, 0.08, 0.3));
    const picked = easeInOut(span(p, 0.42, 0.62));
    const graded = easeInOut(span(p, 0.74, 0.94));
    const k = grow(w, h);
    const size = 13 * k;
    const width = Math.min(w - 28, 520 * k);
    const x = (w - width) / 2;
    const question = wrap(ctx, QUESTION.text, width - 28, 15 * k, 600);
    const leading = Math.round(15 * k * 1.35);
    const rowH = Math.round(size * 2.3);
    const head = 30;
    const cardH = head + question.length * leading + 10 + QUESTION.options.length * rowH + 8;
    const replyH = Math.round(34 * k);
    const top = Math.max(16, (h - 50 - cardH - 12 - replyH) / 2);
    card(ctx, x, top, width, cardH, INK.silver, 1, 14);
    label(ctx, 'An example question, written for this page', x + 14, top + 16, {
      size: 11.5,
      weight: 600,
      color: INK.muted,
    });
    question.forEach((line, index) =>
      label(ctx, line, x + 14, top + head + leading / 2 + index * leading, {
        size: 15 * k,
        weight: 600,
        color: INK.white,
      }),
    );
    const optionsTop = top + head + question.length * leading + 10;
    QUESTION.options.forEach(([letter, text], index) => {
      const y = optionsTop + index * rowH;
      const chosen = index === QUESTION.answer;
      const stroke = chosen ? mixHex(HUE.violet, HUE.green, graded) : INK.silver;
      roundRect(ctx, x + 10, y, width - 20, rowH - 6, 8);
      ctx.strokeStyle = rgba(stroke, chosen ? 0.25 + 0.7 * picked : 0.2);
      ctx.lineWidth = chosen ? 1.5 : 1;
      ctx.stroke();
      const middle = y + (rowH - 6) / 2;
      label(ctx, letter, x + 26, middle, {
        size,
        weight: 650,
        face: 'mono',
        color: INK.white,
        align: 'center',
      });
      label(ctx, text, x + 44, middle, { size, color: INK.silver });
      // The model's probability for each letter: a meter along the option's lower edge, and the number.
      const probability = QUESTION.probabilities[index];
      ctx.fillStyle = rgba(HUE.violet, 0.9 * weighed);
      ctx.fillRect(x + 14, y + rowH - 10, (width - 28) * probability * weighed, 2.5);
      label(ctx, `${Math.round(probability * 100)}%`, x + width - 22, middle, {
        size: 12 * k,
        face: 'mono',
        color: INK.white,
        align: 'right',
        alpha: weighed,
      });
    });
    // The answer, then its grade.
    const replyY = top + cardH + 12;
    const answer = `The model answers ${QUESTION.options[QUESTION.answer][0]}`;
    const verdict = 'Right: 1 point';
    const text = graded > 0.5 ? verdict : answer;
    const replyW = textWidth(ctx, text, 13 * k, 600) + 40;
    const shown = graded > 0.5 ? graded : picked;
    if (shown > 0.01) {
      card(
        ctx,
        w / 2 - replyW / 2,
        replyY,
        replyW,
        replyH,
        graded > 0.5 ? HUE.green : HUE.violet,
        shown,
        replyH / 2,
      );
      if (graded > 0.5)
        tick(ctx, w / 2 - replyW / 2 + 18, replyY + replyH / 2, 10, HUE.green, graded);
      label(ctx, text, w / 2 + (graded > 0.5 ? 8 : 0), replyY + replyH / 2, {
        size: 13 * k,
        weight: 600,
        color: INK.white,
        align: 'center',
        alpha: shown,
      });
    }
    note(ctx, w, h, 'Four choices, one right answer', 1 - span(p, 0.08, 0.2));
    note(
      ctx,
      w,
      h,
      'The model gives each letter a probability (illustrative)',
      span(p, 0.2, 0.3) * (1 - span(p, 0.42, 0.5)),
    );
    note(ctx, w, h, 'It answers with a letter', span(p, 0.52, 0.62) * (1 - span(p, 0.74, 0.82)));
    note(ctx, w, h, 'Checked against the answer key', span(p, 0.86, 0.94));
  };
}

/** Hundreds of questions: one test, answered, counted, and set against chance and the best score. */
export function createHundreds(scoring: Scoring): Draw {
  const right = answers();
  const best = scoring.gpqa.rows[0];
  const chance = scoring.gpqa.chance;
  const cols = 18;
  const rows = Math.ceil(QUESTIONS / cols);
  return (ctx, { w, h, p, t }) => {
    backdrop(ctx, w, h, 0.15);
    // Four steps: the empty test, answered, the score, the best score today.
    const answered = easeInOut(span(p, 0.06, 0.3));
    const scored = easeInOut(span(p, 0.42, 0.62));
    const ceiling = easeInOut(span(p, 0.74, 0.94));
    const k = grow(w, h);
    const barRows = 3;
    const barH = Math.round(22 * k);
    const titleH = 26;
    const room = h - 50 - titleH - barRows * barH - 24;
    const cell = Math.min(Math.min(w - 32, 620) / cols, room / rows, 30);
    const gridW = cell * cols;
    const left = (w - gridW) / 2;
    const top = Math.max(16, (h - 50 - (titleH + rows * cell + 16 + barRows * barH)) / 2);
    const gridTop = top + titleH;
    const done = Math.floor(answered * QUESTIONS);
    const rightSoFar = right.slice(0, done).filter(Boolean).length;
    // The header runs across the grid, or across the picture when the grid is too narrow for it.
    const title = `GPQA Diamond: ${QUESTIONS} questions`;
    const counter = `${CORRECT} of ${QUESTIONS} right`;
    const fits =
      textWidth(ctx, title, 13 * k, 600) + textWidth(ctx, counter, 12 * k, 500, 'mono') + 24 <=
      gridW;
    const headLeft = fits ? left : 16;
    const headRight = fits ? left + gridW : w - 16;
    label(ctx, title, headLeft, top + 8, {
      size: 13 * k,
      weight: 600,
      color: INK.white,
    });
    if (answered > 0)
      label(ctx, `${rightSoFar} of ${done} right`, headRight, top + 8, {
        size: 12 * k,
        face: 'mono',
        color: INK.silver,
        align: 'right',
      });
    for (let index = 0; index < QUESTIONS; index++) {
      const x = left + (index % cols) * cell;
      const y = gridTop + Math.floor(index / cols) * cell;
      if (index < done) {
        ctx.fillStyle = rgba(right[index] ? HUE.green : HUE.red, 0.8);
        ctx.fillRect(x + 1.5, y + 1.5, cell - 3, cell - 3);
      } else {
        ctx.strokeStyle = rgba(INK.silver, 0.22);
        ctx.lineWidth = 1;
        ctx.strokeRect(x + 1.5, y + 1.5, cell - 3, cell - 3);
      }
    }
    if (answered > 0 && answered < 1)
      additive(ctx, () =>
        glow(
          ctx,
          left + (done % cols) * cell + cell / 2,
          gridTop + Math.floor(done / cols) * cell + cell / 2,
          cell * 1.4,
          '#ffffff',
          0.5 + 0.2 * Math.sin(t * 6),
        ),
      );
    // The score, beside what guessing gets and what the best model gets today.
    const barsTop = gridTop + rows * cell + 16;
    const bars: [string, number, string, number][] = [
      ['This model', (CORRECT / QUESTIONS) * 100, HUE.violet, scored],
      ['Guessing', chance, INK.muted, scored],
      ['Best today', best.score, HUE.cyan, ceiling],
    ];
    const names = Math.max(...bars.map(([name]) => textWidth(ctx, name, 12 * k, 600))) + 12;
    const barLeft = left + names;
    const barW = gridW - names - textWidth(ctx, '100.0%', 12 * k, 500, 'mono') - 12;
    bars.forEach(([name, value, color, alpha], index) => {
      if (alpha <= 0.01) return;
      const y = barsTop + index * barH + barH / 2;
      label(ctx, name, left, y, { size: 12 * k, weight: 600, color: INK.silver, alpha });
      ctx.fillStyle = rgba(INK.silver, 0.1 * alpha);
      ctx.fillRect(barLeft, y - 4, barW, 8);
      ctx.fillStyle = rgba(color, 0.9 * alpha);
      ctx.fillRect(barLeft, y - 4, (barW * value * alpha) / 100, 8);
      label(ctx, `${value.toFixed(1)}%`, left + gridW, y, {
        size: 12 * k,
        face: 'mono',
        color: INK.white,
        align: 'right',
        alpha,
      });
    });
    note(ctx, w, h, 'One test: hard science questions, four choices each', 1 - span(p, 0.06, 0.18));
    note(
      ctx,
      w,
      h,
      'Each question answered: right or wrong (illustrative)',
      span(p, 0.2, 0.3) * (1 - span(p, 0.42, 0.5)),
    );
    note(
      ctx,
      w,
      h,
      `${CORRECT} of ${QUESTIONS} right: ${((CORRECT / QUESTIONS) * 100).toFixed(1)}%, against ${chance}% for guessing`,
      span(p, 0.52, 0.62) * (1 - span(p, 0.74, 0.82)),
    );
    note(
      ctx,
      w,
      h,
      `Best today: ${best.name}, ${best.score.toFixed(1)}% (Epoch AI)`,
      span(p, 0.86, 0.94),
    );
  };
}

/** How sure a score is: other tests of the same kind, the spread they make, and real error bars. */
export function createNoise(scoring: Scoring): Draw {
  const scores = reruns(14);
  const mean = ACCURACY * 100;
  const se = standardError(ACCURACY, QUESTIONS);
  const [low, high] = interval(mean, se);
  const rows = rowsOf(scoring.gpqa.rows, (row) =>
    row.stderr !== undefined ? interval(row.score, row.stderr) : undefined,
  );
  const entries = makersOf(scoring.gpqa.rows);
  const close = withinLeader(rows);
  return (ctx, { w, h, p }) => {
    backdrop(ctx, w, h, 0.3);
    // Three steps: other tests' scores, the curve they follow, real results.
    const curve = easeInOut(span(p, 0.08, 0.44));
    const real = easeInOut(span(p, 0.62, 0.94));
    const simulated = 1 - span(p, 0.52, 0.66);
    const k = grow(w, h);
    if (simulated > 0.01) {
      ctx.save();
      ctx.globalAlpha = simulated;
      const left = w * 0.08;
      const right = w * 0.92;
      const from = 68;
      const to = 92;
      const x = (value: number) => left + ((value - from) / (to - from)) * (right - left);
      const base = h - 90;
      const peak = Math.min(h * 0.45, 220);
      // The number line.
      ctx.strokeStyle = rgba(INK.silver, 0.3);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(left, base);
      ctx.lineTo(right, base);
      ctx.stroke();
      for (let value = 70; value <= 90; value += 5)
        label(ctx, `${value}%`, x(value), base + 16, {
          size: 10.5,
          face: 'mono',
          color: INK.muted,
          align: 'center',
        });
      // The bell the scores follow, and the middle 95% of it.
      if (curve > 0.01) {
        const density = (value: number) => Math.exp(-0.5 * ((value - mean) / se) ** 2);
        ctx.fillStyle = rgba(HUE.cyan, 0.14 * curve);
        ctx.beginPath();
        ctx.moveTo(x(low), base);
        for (let value = low; value <= high; value += 0.2)
          ctx.lineTo(x(value), base - peak * density(value) * curve);
        ctx.lineTo(x(high), base);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = rgba(HUE.cyan, 0.9 * curve);
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let value = from; value <= to; value += 0.2) {
          const y = base - peak * density(value) * curve;
          if (value === from) ctx.moveTo(x(value), y);
          else ctx.lineTo(x(value), y);
        }
        ctx.stroke();
        const text = `95% of tests: ${low.toFixed(1)}% to ${high.toFixed(1)}%`;
        label(ctx, text, x(mean), base - peak * curve - 16, {
          size: 12 * k,
          weight: 600,
          color: INK.white,
          align: 'center',
          alpha: curve,
          backing: INK.void,
        });
      }
      // Each other test's score: a dot, stacked where scores round to the same point.
      const stacks = new Map<number, number>();
      scores.forEach((score) => {
        const bin = Math.round(score);
        const level = stacks.get(bin) ?? 0;
        stacks.set(bin, level + 1);
        ctx.fillStyle = rgba(HUE.violet, 0.95);
        ctx.beginPath();
        ctx.arc(x(score), base - 8 - level * 12, 4.5, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.restore();
    }
    if (real > 0.01) {
      const key = legend(ctx, entries, 16, 18, w - 32, real);
      intervalRows(
        ctx,
        w,
        rows,
        { top: 18 + key + 8, bottom: h - 70 },
        { ranges: real, alpha: real },
        (value) => `${value}%`,
      );
    }
    note(
      ctx,
      w,
      h,
      `${scores.length} other tests of the same kind give ${scores.length} slightly different scores (simulated)`,
      1 - span(p, 0.08, 0.2),
    );
    note(
      ctx,
      w,
      h,
      `Standard error: about ${se.toFixed(1)} points either way`,
      span(p, 0.3, 0.44) * (1 - span(p, 0.52, 0.6)),
    );
    note(
      ctx,
      w,
      h,
      `Real GPQA Diamond results with 95% ranges: ${close} reach into the leader’s`,
      span(p, 0.84, 0.94),
    );
  };
}

const KINDS = ['Multiple choice', 'An exact answer', 'Working code', 'People’s votes'];

/** Not every test is a quiz: a letter, a number, a patch that passes tests, a person's vote. */
export function createKinds(): Draw {
  return (ctx, { w, h, p, t }) => {
    backdrop(ctx, w, h, 0.45);
    // Four steps, one kind of test each; one leaves before the next arrives.
    const parts = [
      1 - span(p, 0.08, 0.18),
      span(p, 0.2, 0.3) * (1 - span(p, 0.42, 0.52)),
      span(p, 0.54, 0.64) * (1 - span(p, 0.76, 0.86)),
      span(p, 0.88, 0.96),
    ];
    const k = grow(w, h);
    const width = Math.min(w - 28, 480 * k);
    const x = (w - width) / 2;
    const size = 13 * k;
    const panelH = Math.min(h - 90, 250 * k);
    const top = Math.max(16, (h - 50 - panelH) / 2);
    parts.forEach((alpha, index) => {
      if (alpha <= 0.01) return;
      ctx.save();
      ctx.globalAlpha = alpha;
      card(ctx, x, top, width, panelH, INK.silver, 1, 14);
      label(ctx, KINDS[index], x + 16, top + 20, { size: 12 * k, weight: 650, color: INK.muted });
      const inner = {
        left: x + 16,
        right: x + width - 16,
        top: top + 38,
        bottom: top + panelH - 14,
      };
      const middle = (inner.top + inner.bottom) / 2;
      if (index === 0) {
        // Four letters; the right one is checked against the key.
        const chip = Math.min(52 * k, (inner.right - inner.left - 36) / 4);
        const row = chip * 4 + 12 * 3;
        ['A', 'B', 'C', 'D'].forEach((letter, n) => {
          const cx = (inner.left + inner.right) / 2 - row / 2 + n * (chip + 12);
          const lit = n === 1;
          roundRect(ctx, cx, middle - chip / 2, chip, chip, 10);
          ctx.fillStyle = rgba(lit ? HUE.green : INK.panel, lit ? 0.25 : 1);
          ctx.fill();
          ctx.strokeStyle = rgba(lit ? HUE.green : INK.silver, lit ? 0.9 : 0.3);
          ctx.stroke();
          label(ctx, letter, cx + chip / 2, middle, {
            size: 16 * k,
            weight: 700,
            face: 'mono',
            color: INK.white,
            align: 'center',
          });
        });
        label(ctx, 'Key: B', (inner.left + inner.right) / 2, inner.bottom - 12, {
          size,
          face: 'mono',
          color: INK.silver,
          align: 'center',
        });
      } else if (index === 1) {
        // A sum with one right answer, checked for an exact match.
        label(ctx, 'What is 1 + 3 + 5 + … + 39?', inner.left, inner.top + 14, {
          size,
          weight: 600,
          color: INK.white,
        });
        label(ctx, 'twenty odd numbers: 20 × 20', inner.left, inner.top + 14 + 24 * k, {
          size: 12 * k,
          face: 'mono',
          color: INK.silver,
        });
        const boxW = 90 * k;
        const boxH = 40 * k;
        const bx = (inner.left + inner.right) / 2 - boxW / 2;
        const by = inner.bottom - boxH - 26;
        roundRect(ctx, bx, by, boxW, boxH, 10);
        ctx.fillStyle = rgba(HUE.green, 0.18);
        ctx.fill();
        ctx.strokeStyle = rgba(HUE.green, 0.9);
        ctx.stroke();
        label(ctx, '400', bx + boxW / 2, by + boxH / 2, {
          size: 18 * k,
          weight: 700,
          face: 'mono',
          color: INK.white,
          align: 'center',
        });
        label(ctx, 'Key: 400', (inner.left + inner.right) / 2, inner.bottom - 10, {
          size: 12 * k,
          face: 'mono',
          color: INK.silver,
          align: 'center',
        });
      } else if (index === 2) {
        // A fix to a real project, run against the project's own tests.
        const lineH = 20 * k;
        const code: [string, string][] = [
          ['dates.py', INK.muted],
          ['- return text.split("/")', HUE.red],
          ['+ return parse_date(text)', HUE.green],
        ];
        code.forEach(([line, color], n) =>
          label(ctx, line, inner.left, inner.top + 12 + n * lineH, {
            size: 12.5 * k,
            face: 'mono',
            color: n ? INK.white : INK.muted,
          }),
        );
        code.slice(1).forEach(([, color], n) => {
          ctx.fillStyle = rgba(color, 0.9);
          ctx.fillRect(inner.left - 8, inner.top + 12 + (n + 1) * lineH - 7, 3, 14);
        });
        const tests = 12;
        const cell = Math.min(22 * k, (inner.right - inner.left) / tests - 4);
        const rowY = inner.bottom - cell - 26;
        // Every test passes; a light runs along them as they are checked.
        const run = (t * 0.6) % 1;
        for (let n = 0; n < tests; n++) {
          const cx = inner.left + n * (cell + 4);
          ctx.fillStyle = rgba(HUE.green, 0.8);
          ctx.fillRect(cx, rowY, cell, cell);
        }
        additive(ctx, () =>
          glow(
            ctx,
            inner.left + run * tests * (cell + 4),
            rowY + cell / 2,
            cell * 1.2,
            '#ffffff',
            0.5,
          ),
        );
        label(ctx, 'The project’s tests: all must pass', inner.left, inner.bottom - 10, {
          size: 12 * k,
          color: INK.silver,
        });
      } else {
        // Two anonymous answers; a person picks one.
        const gap = 12;
        const cardW = (inner.right - inner.left - gap) / 2;
        const cardH = Math.min(90 * k, inner.bottom - inner.top - 34);
        ['Answer A', 'Answer B'].forEach((name, n) => {
          const cx = inner.left + n * (cardW + gap);
          roundRect(ctx, cx, inner.top + 4, cardW, cardH, 10);
          ctx.fillStyle = rgba(INK.panel, 1);
          ctx.fill();
          ctx.strokeStyle = rgba(n === 0 ? HUE.green : INK.silver, n === 0 ? 0.9 : 0.3);
          ctx.stroke();
          label(ctx, name, cx + 12, inner.top + 22, {
            size: 12 * k,
            weight: 650,
            color: INK.white,
          });
          for (let line = 0; line < 3; line++) {
            ctx.fillStyle = rgba(INK.silver, 0.18);
            ctx.fillRect(
              cx + 12,
              inner.top + 38 + line * 11 * k,
              (cardW - 24) * (line === 2 ? 0.6 : 1),
              4,
            );
          }
          if (n === 0) tick(ctx, cx + cardW - 20, inner.top + 22, 10, HUE.green, 1);
        });
        label(
          ctx,
          'A person votes: A is better',
          (inner.left + inner.right) / 2,
          inner.bottom - 10,
          { size: 12 * k, color: INK.silver, align: 'center' },
        );
      }
      ctx.restore();
    });
    note(ctx, w, h, 'Multiple choice: the letter must match the key', parts[0]);
    note(
      ctx,
      w,
      h,
      'An exact answer: the final number must match (AIME answers are 0 to 999)',
      parts[1],
    );
    note(ctx, w, h, 'Code: a fix to a real project must pass its tests (SWE-bench)', parts[2]);
    note(ctx, w, h, 'Votes: people compare two anonymous answers (Arena)', parts[3]);
  };
}

/** Votes become ratings: pairwise votes, the scores that explain them, and Arena's real ranges. */
export function createVotes(scoring: Scoring): Draw {
  const next = random(21);
  const nodes = 8;
  // Illustrative ratings for eight anonymous models, strongest first.
  const ratings = Array.from({ length: nodes }, (_, index) => 1300 - index * 28 - next() * 14);
  const rows = rowsOf(scoring.arena.rows, (row) =>
    row.low !== undefined && row.high !== undefined ? [row.low, row.high] : undefined,
  );
  const entries = makersOf(scoring.arena.rows);
  const close = withinLeader(rows);
  return (ctx, { w, h, p, t }) => {
    backdrop(ctx, w, h, 0.6);
    // Three steps: the votes, the ratings they give, Arena's real results.
    const ladder = easeInOut(span(p, 0.08, 0.44));
    const real = easeInOut(span(p, 0.62, 0.94));
    const shown = 1 - span(p, 0.52, 0.66);
    const k = grow(w, h);
    if (shown > 0.01) {
      ctx.save();
      ctx.globalAlpha = shown;
      const cx = w / 2;
      const cy = (h - 50) / 2 + 8;
      const radius = Math.min(w, h - 60) * 0.34;
      const spacing = Math.min(30 * k, (h - 110) / nodes);
      const at = (index: number) => {
        const angle = -Math.PI / 2 + (index / nodes) * Math.PI * 2;
        const circle = [cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius];
        const line = [cx - 40 * k, cy - (spacing * (nodes - 1)) / 2 + index * spacing];
        return [lerp(circle[0], line[0], ladder), lerp(circle[1], line[1], ladder)] as const;
      };
      // Votes: a pair meets, the winner takes a point.
      const battle = Math.floor(t * 1.4);
      for (let n = 0; n < 5; n++) {
        const seed = battle - n;
        const a = Math.abs(seed * 7) % nodes;
        const b = (a + 1 + (Math.abs(seed * 3) % (nodes - 1))) % nodes;
        const [ax, ay] = at(a);
        const [bx, by] = at(b);
        ctx.strokeStyle = rgba(INK.silver, (0.4 - n * 0.07) * (1 - ladder));
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(ax, ay);
        ctx.lineTo(bx, by);
        ctx.stroke();
        if (n === 0) {
          const winner = ratings[a] > ratings[b] ? [ax, ay] : [bx, by];
          additive(ctx, () => glow(ctx, winner[0], winner[1], 22, HUE.amber, 0.8 * (1 - ladder)));
        }
      }
      for (let index = 0; index < nodes; index++) {
        const [x, y] = at(index);
        ctx.beginPath();
        ctx.arc(x, y, 11 * k, 0, Math.PI * 2);
        ctx.fillStyle = rgba(INK.panel, 1);
        ctx.fill();
        ctx.strokeStyle = rgba(spectrum(index / nodes), 0.9);
        ctx.lineWidth = 1.5;
        ctx.stroke();
        label(ctx, String.fromCharCode(65 + index), x, y, {
          size: 11 * k,
          weight: 700,
          color: INK.white,
          align: 'center',
        });
        if (ladder > 0.5)
          label(ctx, `${Math.round(ratings[index])}`, x + 22 * k, y, {
            size: 12 * k,
            face: 'mono',
            color: INK.white,
            alpha: span(ladder, 0.5, 1),
          });
      }
      ctx.restore();
    }
    if (real > 0.01) {
      const key = legend(ctx, entries, 16, 18, w - 32, real);
      intervalRows(
        ctx,
        w,
        rows,
        { top: 18 + key + 8, bottom: h - 70 },
        { ranges: real, alpha: real },
        (value) => `${Math.round(value)}`,
      );
    }
    note(ctx, w, h, 'Each vote: one anonymous model beats another', 1 - span(p, 0.08, 0.2));
    note(
      ctx,
      w,
      h,
      'Ratings that best explain every vote (illustrative)',
      span(p, 0.3, 0.44) * (1 - span(p, 0.52, 0.6)),
    );
    note(
      ctx,
      w,
      h,
      `Arena’s text leaders with 95% ranges: ${close} reach into the leader’s`,
      span(p, 0.84, 0.94),
    );
  };
}

/** When a test leaks: its questions reach the training data, and scores rise without skill. */
export function createLeaks(): Draw {
  const next = random(31);
  const docs = Array.from({ length: 26 }, () => ({
    x: next(),
    speed: 0.05 + next() * 0.05,
    offset: next(),
  }));
  return (ctx, { w, h, p, t }) => {
    backdrop(ctx, w, h, 0.72);
    // Four steps: apart, the leak, the inflated score, the defences.
    const leak = easeInOut(span(p, 0.08, 0.3));
    const scene = 1 - span(p, 0.42, 0.52);
    const scores = span(p, 0.54, 0.62) * (1 - span(p, 0.76, 0.84));
    const defences = span(p, 0.86, 0.94);
    const k = grow(w, h);
    const floor = h - 56;
    if (scene > 0.01) {
      ctx.save();
      ctx.globalAlpha = scene;
      // Training data: documents flowing down into a model.
      const streamLeft = w * 0.06;
      const streamW = w * 0.4;
      label(ctx, 'Training data', streamLeft, 22, { size: 12 * k, weight: 650, color: INK.silver });
      const docW = Math.min(34, streamW / 6);
      for (const doc of docs) {
        const y = 40 + ((t * doc.speed + doc.offset) % 1) * (floor - 90);
        ctx.fillStyle = rgba(INK.silver, 0.22);
        ctx.fillRect(streamLeft + doc.x * (streamW - docW), y, docW, docW * 1.25);
      }
      const model = { x: streamLeft + streamW / 2, y: floor - 20 };
      ctx.beginPath();
      ctx.arc(model.x, model.y, 16, 0, Math.PI * 2);
      ctx.fillStyle = rgba(INK.panel, 1);
      ctx.fill();
      ctx.strokeStyle = rgba(HUE.violet, 0.9);
      ctx.lineWidth = 1.5;
      ctx.stroke();
      label(ctx, 'model', model.x + 24, model.y, { size: 11.5, color: INK.silver });
      // The test: questions kept apart, behind a lock.
      const boxX = w * 0.56;
      const boxW = w * 0.38;
      const boxY = 40;
      const boxH = Math.min(floor - 110, 200);
      roundRect(ctx, boxX, boxY, boxW, boxH, 12);
      ctx.strokeStyle = rgba(HUE.amber, 0.7);
      ctx.lineWidth = 1.3;
      ctx.stroke();
      label(ctx, 'The test', boxX, 22, { size: 12 * k, weight: 650, color: INK.silver });
      const cols = 3;
      const cardW = (boxW - 16 * (cols + 1)) / cols;
      const cardH = Math.min(cardW * 0.7, (boxH - 16 * 3) / 2);
      for (let n = 0; n < 6; n++) {
        const cx = boxX + 16 + (n % cols) * (cardW + 16);
        const cy = boxY + 16 + Math.floor(n / cols) * (cardH + 16);
        const leaked = n === 4;
        ctx.fillStyle = rgba(
          leaked ? mixHex(INK.silver, HUE.red, leak) : INK.silver,
          leaked ? 0.3 + 0.4 * leak : 0.22,
        );
        ctx.fillRect(cx, cy, cardW, cardH);
        if (leaked && leak > 0.01) {
          // A copy of it drifts into the training data.
          const tx = lerp(cx, streamLeft + streamW * 0.55, leak);
          const ty = lerp(cy, (floor - 40) * 0.55, leak);
          ctx.fillStyle = rgba(HUE.red, 0.7);
          ctx.fillRect(tx, ty, docW, docW * 1.25);
          additive(ctx, () =>
            glow(ctx, tx + docW / 2, ty + docW * 0.6, docW * 1.6, HUE.red, 0.6 * leak),
          );
        }
      }
      ctx.restore();
    }
    if (scores > 0.01) {
      ctx.save();
      ctx.globalAlpha = scores;
      const bars: [string, number, string][] = [
        ['Leaked questions', 92, HUE.red],
        ['New questions', 71, HUE.violet],
      ];
      const width = Math.min(w - 32, 460 * k);
      const x = (w - width) / 2;
      const top = (floor - 110) / 2;
      bars.forEach(([name, value, color], n) => {
        const y = top + n * 56 * k;
        label(ctx, name, x, y, { size: 12.5 * k, weight: 600, color: INK.silver });
        ctx.fillStyle = rgba(INK.silver, 0.1);
        ctx.fillRect(x, y + 14, width - 60, 12);
        ctx.fillStyle = rgba(color, 0.85);
        ctx.fillRect(x, y + 14, ((width - 60) * value) / 100, 12);
        label(ctx, `${value}%`, x + width, y + 20, {
          size: 12.5 * k,
          face: 'mono',
          color: INK.white,
          align: 'right',
        });
      });
      ctx.restore();
    }
    if (defences > 0.01) {
      const items = [
        'New questions every month',
        'A private set, never published',
        'Search training data for copies',
      ];
      const width = Math.min(w - 32, 420 * k);
      const x = (w - width) / 2;
      const rowH = 34 * k;
      const top = (floor - rowH * items.length) / 2 + 10;
      items.forEach((item, n) => {
        const y = top + n * rowH;
        const reveal = easeInOut(span(defences, n * 0.15, 0.55 + n * 0.15));
        roundRect(ctx, x, y - 9, 18, 18, 4);
        ctx.strokeStyle = rgba(HUE.green, 0.9 * reveal);
        ctx.lineWidth = 1.5;
        ctx.stroke();
        if (reveal > 0.6) tick(ctx, x + 9, y, 9, HUE.green, reveal);
        label(ctx, item, x + 30, y, { size: 13 * k, color: INK.white, alpha: reveal });
      });
    }
    note(ctx, w, h, 'Training data and the test are meant to stay apart', 1 - span(p, 0.08, 0.18));
    note(
      ctx,
      w,
      h,
      'A copy of a test question turns up on the web, then in training data',
      span(p, 0.2, 0.3) * (1 - span(p, 0.42, 0.5)),
    );
    note(
      ctx,
      w,
      h,
      'Scores on leaked questions can rise without more skill (illustrative)',
      span(p, 0.54, 0.62) * (1 - span(p, 0.76, 0.84)),
    );
    note(ctx, w, h, 'How tests keep their questions fresh', defences);
  };
}

/** Many tests, one scale: easy and hard tests, the curves that join them, and the real index. */
export function createScale(scoring: Scoring): Draw {
  const rows = rowsOf(scoring.index.rows, (row) =>
    row.low !== undefined && row.high !== undefined ? [row.low, row.high] : undefined,
  );
  const entries = makersOf(scoring.index.rows);
  const modelKey: Entry[] = MODELS.map((model, index) => ({
    color: TRIAD[index],
    text: model.name,
  }));
  const shade = (index: number) => mixHex(INK.silver, HUE.amber, 0.3 + 0.35 * index);
  return (ctx, { w, h, p }) => {
    backdrop(ctx, w, h, 0.85);
    // Three steps: three tests, one scale for all of them, the real index.
    // The bars leave before the curves arrive.
    const turn = easeInOut(span(p, 0.08, 0.44));
    const curves = span(turn, 0.55, 1);
    const real = easeInOut(span(p, 0.62, 0.94));
    const shown = 1 - span(p, 0.52, 0.66);
    const k = grow(w, h);
    if (shown > 0.01) {
      ctx.save();
      ctx.globalAlpha = shown;
      const key = legend(ctx, modelKey, 16, 18, w - 32, 1);
      const top = 18 + key + 14;
      const bottom = h - 84;
      const left = 24;
      const right = w - 24;
      // The tests as grouped bars, which give way to the curves.
      const bars = 1 - span(turn, 0, 0.45);
      if (bars > 0.01) {
        const group = (right - left) / TESTS.length;
        const barW = Math.min(34 * k, (group - 24) / MODELS.length - 6);
        TESTS.forEach((test, n) => {
          const gx = left + n * group + group / 2 - (barW + 6) * 1.5;
          MODELS.forEach((model, m) => {
            const value = logistic(model.capability, test.difficulty) * 100;
            const x = gx + m * (barW + 6);
            const height = ((bottom - top - 24) * value) / 100;
            ctx.fillStyle = rgba(TRIAD[m], 0.85 * bars);
            ctx.fillRect(x, bottom - height, barW, height);
            if (barW > 20 * k)
              label(ctx, value.toFixed(0), x + barW / 2, bottom - height - 10, {
                size: 10.5 * k,
                face: 'mono',
                color: INK.white,
                align: 'center',
                alpha: bars,
              });
          });
          label(ctx, test.name, left + n * group + group / 2, bottom + 16, {
            size: 12 * k,
            color: INK.silver,
            align: 'center',
            alpha: bars,
          });
        });
      }
      // One scale: each test a curve by its difficulty, each model a line by its capability.
      if (curves > 0.01) {
        const from = 95;
        const to = 185;
        const x = (value: number) => left + ((value - from) / (to - from)) * (right - left);
        const y = (chance: number) => bottom - chance * (bottom - top - 10);
        TESTS.forEach((test, n) => {
          ctx.strokeStyle = rgba(shade(n), 0.9 * curves);
          ctx.lineWidth = 2;
          ctx.beginPath();
          for (let value = from; value <= to; value += 1) {
            const py = y(logistic(value, test.difficulty));
            if (value === from) ctx.moveTo(x(value), py);
            else ctx.lineTo(x(value), py);
          }
          ctx.stroke();
          label(ctx, test.name, x(test.difficulty) + 8, y(0.5) - 10 - n * 2, {
            size: 11.5 * k,
            color: INK.silver,
            alpha: curves,
            backing: INK.void,
          });
        });
        MODELS.forEach((model, m) => {
          ctx.strokeStyle = rgba(TRIAD[m], 0.8 * curves);
          ctx.lineWidth = 1.5;
          ctx.setLineDash([4, 4]);
          ctx.beginPath();
          ctx.moveTo(x(model.capability), top);
          ctx.lineTo(x(model.capability), bottom);
          ctx.stroke();
          ctx.setLineDash([]);
          TESTS.forEach((test) => {
            ctx.fillStyle = rgba(TRIAD[m], curves);
            ctx.beginPath();
            ctx.arc(
              x(model.capability),
              y(logistic(model.capability, test.difficulty)),
              4,
              0,
              Math.PI * 2,
            );
            ctx.fill();
          });
        });
        ctx.strokeStyle = rgba(INK.silver, 0.3 * curves);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(left, bottom);
        ctx.lineTo(right, bottom);
        ctx.stroke();
        label(ctx, 'capability', right, bottom + 16, {
          size: 11.5,
          color: INK.muted,
          align: 'right',
          alpha: curves,
        });
      }
      ctx.restore();
    }
    if (real > 0.01) {
      const key = legend(ctx, entries, 16, 18, w - 32, real);
      intervalRows(
        ctx,
        w,
        rows,
        { top: 18 + key + 8, bottom: h - 70 },
        { ranges: real, alpha: real },
      );
    }
    note(
      ctx,
      w,
      h,
      'An easy test cannot tell the best apart; a hard one cannot tell the rest apart (illustrative)',
      1 - span(p, 0.08, 0.2),
    );
    note(
      ctx,
      w,
      h,
      'One scale: each test gets a difficulty, each model a capability (illustrative)',
      span(p, 0.3, 0.44) * (1 - span(p, 0.52, 0.6)),
    );
    note(
      ctx,
      w,
      h,
      'The Epoch Capabilities Index: the leaders, with their 95% ranges',
      span(p, 0.84, 0.94),
    );
  };
}

/** The opening: a wall of questions, graded in waves. */
export function createScoringOpening(): Draw {
  const next = random(41);
  const cells = Array.from({ length: 4000 }, () => ({ right: next() < 0.78, phase: next() }));
  return (ctx, { w, h, p, t }) => {
    ctx.fillStyle = INK.void;
    ctx.fillRect(0, 0, w, h);
    const size = w < 620 ? 18 : 24;
    const cols = Math.ceil(w / size);
    const rows = Math.ceil(h / size);
    // A diagonal front sweeps across; scrolling moves it on.
    const front = ((t * 0.08 + p * 0.6) % 1.4) - 0.2;
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++) {
        const cell = cells[(r * cols + c) % cells.length];
        const position = (c / cols + r / rows) / 2;
        const graded = clamp((front - position) * 6);
        const fade = 1 - clamp((front - position - 0.35) * 3);
        const base = 0.06 + 0.04 * Math.sin(t + cell.phase * 6);
        ctx.fillStyle =
          graded > 0
            ? rgba(cell.right ? HUE.green : HUE.red, (0.12 + 0.5 * graded) * fade + base)
            : rgba(INK.silver, base);
        ctx.fillRect(c * size + 3, r * size + 3, size - 6, size - 6);
      }
    wash(ctx, w * 0.5, h * 0.35, Math.max(w, h) * 0.45, INK.void, 0.6);
  };
}

/** The close: a quiet leaderboard whose ranges breathe. */
export function createScoringFinale(): Draw {
  const next = random(51);
  const rows = Array.from({ length: 7 }, (_, index) => ({
    score: 0.9 - index * 0.07 - next() * 0.03,
    range: 0.04 + next() * 0.05,
  }));
  return (ctx, { w, h, t }) => {
    ctx.fillStyle = INK.void;
    ctx.fillRect(0, 0, w, h);
    const wide = w >= 900;
    const left = wide ? w * 0.56 : 20;
    const right = wide ? w * 0.94 : w - 20;
    const alpha = wide ? 1 : 0.28;
    const rowH = Math.min(44, h * 0.07);
    const top = h * 0.5 - (rowH * rows.length) / 2;
    rows.forEach((row, index) => {
      const y = top + index * rowH;
      const breathe = 1 + 0.15 * Math.sin(t * 1.2 + index);
      const x = left + (right - left) * row.score;
      const half = (right - left) * row.range * breathe;
      ctx.strokeStyle = rgba(spectrum(index / 8), 0.7 * alpha);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x - half, y);
      ctx.lineTo(x + half, y);
      ctx.stroke();
      additive(ctx, () => glow(ctx, x, y, 14, spectrum(index / 8), 0.7 * alpha));
      ctx.fillStyle = rgba('#ffffff', 0.9 * alpha);
      ctx.beginPath();
      ctx.arc(x, y, 3.5, 0, Math.PI * 2);
      ctx.fill();
    });
  };
}
