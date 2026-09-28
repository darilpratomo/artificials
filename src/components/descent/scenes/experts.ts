import type { Draw } from '../engine';
import {
  INK,
  HUE,
  additive,
  curvePoint,
  dotGrid,
  easeInOut,
  glow,
  label,
  lines,
  rgba,
  roundRect,
  span,
  spectrum,
  textWidth,
  wash,
} from '../kit';
import { PIECES } from './tokens';

/** Experts in each layer, and how many each token is sent to, as in Mixtral 8x7B. */
export const EXPERTS = 8;
export const CHOSEN = 2;
/** Illustrative router scores for the token " blue", one for each expert. */
export const BLUE_SCORES = [0.4, 1.1, 0.2, 0.7, 2.3, 0.1, 0.5, 1.9];
/** Illustrative pairs of experts for each token of the question, in order. */
export const ROUTES: [number, number][] = [
  [0, 5],
  [2, 5],
  [2, 6],
  [1, 3],
  [4, 7],
  [3, 6],
];
/** All parameters and those used for each token, in billions, as each model's paper gives them. */
export const EXPERT_MODELS = [
  { name: 'Mixtral 8x7B', total: 47, active: 13 },
  { name: 'DeepSeek-V3', total: 671, active: 37 },
] as const;

/**
 * The two experts with the highest scores, each with its share of the token:
 * a softmax over just those two scores, as Mixtral combines its experts.
 */
export function topTwo(scores: readonly number[]) {
  const order = scores.map((score, index) => [score, index] as const).sort((a, b) => b[0] - a[0]);
  const [[best, first], [next, second]] = order;
  const share = 1 / (1 + Math.exp(next - best));
  return [
    [first, share],
    [second, 1 - share],
  ] as const;
}

/**
 * A mixture of experts: one feed-forward block splits into eight smaller
 * experts behind a router, each token is sent to two of them, and the counts
 * show how much of the model each token actually uses.
 */
export function createExperts(): Draw {
  const blue = topTwo(BLUE_SCORES);
  const highest = Math.max(...BLUE_SCORES);
  return (ctx, { w, h, p, t }) => {
    ctx.fillStyle = INK.void;
    ctx.fillRect(0, 0, w, h);
    dotGrid(ctx, w, h, 30, INK.silver, 0.04);
    wash(ctx, w * 0.5, h * 0.5, Math.max(w, h) * 0.6, spectrum(0.8), 0.12);

    const split = easeInOut(span(p, 0.08, 0.3));
    const route = easeInOut(span(p, 0.42, 0.62));
    const count = easeInOut(span(p, 0.72, 0.94));
    // The flow leaves before the counts arrive.
    const flow = 1 - span(count, 0, 0.45);
    const tally = span(count, 0.55, 1);
    const wide = w >= 620;

    // One line under the picture says what it shows, one at a time.
    const note = (text: string, alpha: number) => {
      if (alpha > 0.01)
        lines(ctx, text, w / 2, h - 16, w - 32, {
          size: 12.5,
          color: INK.silver,
          align: 'center',
          alpha,
          from: 'bottom',
        });
    };

    if (flow > 0.01) {
      ctx.save();
      ctx.globalAlpha = flow;
      const top = 32;
      const bottom = h - 54;
      const column = bottom - top;
      const middle = (top + bottom) / 2;
      const gap = split * Math.max(4, Math.min(10, column * 0.025));
      const eh = (column - gap * (EXPERTS - 1)) / EXPERTS;
      const ew = Math.min(150, w * 0.26);
      const ex = w * (wide ? 0.54 : 0.56) - ew / 2;
      const expertY = (index: number) => top + index * (eh + gap);

      // The question's tokens, as chips on the left: " blue" alone, then all six.
      const chipSize = Math.max(11, Math.min(14, w / 34));
      const chipH = chipSize * 1.8;
      const left = wide ? w * 0.06 : 10;
      const widths = PIECES.map(([text]) => textWidth(ctx, text.trim(), chipSize, 600) + 16);
      const chipsRight = left + Math.max(...widths);
      const spacing = Math.min(chipH + 10, column / PIECES.length);
      const chipY = (index: number) =>
        index === 4 ? middle + (index - 2.5) * spacing * route : middle + (index - 2.5) * spacing;
      const router = { x: (chipsRight + ex) / 2, y: middle };
      const join = { x: ex + ew + (w - 12 - ex - ew) * 0.45, y: middle };
      // One token at a time follows its pair while all six are shown.
      const active = route > 0.5 ? Math.floor(t / 1.1) % PIECES.length : 4;
      const pairs = route > 0.5 ? ROUTES[active] : [blue[0][0], blue[1][0]];
      const color = spectrum(active / 6);

      // The routes: token to router, router to each chosen expert, expert to the join.
      const curve = (x1: number, y1: number, x2: number, y2: number) => {
        const mx = (x1 + x2) / 2;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.bezierCurveTo(mx, y1, mx, y2, x2, y2);
        ctx.stroke();
      };
      ctx.lineWidth = 1.4;
      PIECES.forEach((_, index) => {
        const shown = index === 4 ? 1 : route;
        const mine = index === active;
        if (shown <= 0.01) return;
        const alpha = (mine ? 0.85 : 0.18) * shown;
        ctx.strokeStyle = rgba(spectrum(index / 6), alpha);
        curve(left + widths[index], chipY(index), router.x, router.y);
        // Before the split every token goes through the one block.
        if (split < 0.5) return;
        const chosen = index === 4 && route < 0.5 ? pairs : ROUTES[index];
        for (const expert of chosen) {
          const y = expertY(expert) + eh / 2;
          ctx.strokeStyle = rgba(spectrum(index / 6), alpha * span(split, 0.5, 1));
          curve(router.x, router.y, ex, y);
          if (mine) curve(ex + ew, y, join.x, join.y);
        }
      });
      if (split < 0.5) {
        ctx.strokeStyle = rgba(color, 0.85 * (1 - split * 2));
        curve(router.x, router.y, ex, middle);
        curve(ex + ew, middle, join.x, join.y);
      }
      ctx.strokeStyle = rgba(color, 0.85);
      ctx.beginPath();
      ctx.moveTo(join.x, join.y);
      ctx.lineTo(w - 12, join.y);
      ctx.stroke();

      // The block, and the experts it becomes.
      roundRect(ctx, ex, top, ew, column, 10);
      ctx.fillStyle = rgba(INK.panel, 1 - split);
      ctx.fill();
      ctx.strokeStyle = rgba(INK.silver, 0.45 * (1 - split));
      ctx.stroke();
      if (split < 1) {
        // Every weight of the one block works on the token passing through.
        const cols = 10;
        const rows = 16;
        const pulse = (t * 0.6) % 1;
        for (let r = 0; r < rows; r++)
          for (let c = 0; c < cols; c++) {
            const near = 1 - Math.min(1, Math.abs(c / (cols - 1) - pulse) * 4);
            ctx.fillStyle = rgba(HUE.amber, (0.18 + 0.5 * near) * (1 - split));
            ctx.fillRect(
              ex + 8 + (c * (ew - 16)) / cols,
              top + 8 + (r * (column - 16)) / rows,
              (ew - 16) / cols - 2,
              (column - 16) / rows - 2,
            );
          }
      }
      const numberSize = Math.max(9, Math.min(12, eh * 0.48));
      for (let index = 0; index < EXPERTS; index++) {
        const y = expertY(index);
        const lit = pairs.includes(index) ? 1 : 0;
        roundRect(ctx, ex, y, ew, eh, Math.min(8, eh / 3));
        ctx.fillStyle = rgba(INK.panel, split);
        ctx.fill();
        ctx.fillStyle = rgba(color, 0.32 * lit * split);
        ctx.fill();
        ctx.strokeStyle = rgba(lit ? color : INK.silver, (lit ? 0.95 : 0.35) * split);
        ctx.stroke();
        if (split < 0.5) continue;
        const shown = span(split, 0.5, 1);
        label(ctx, `${index + 1}`, ex + 10, y + eh / 2, {
          size: numberSize,
          face: 'mono',
          color: INK.silver,
          alpha: shown,
        });
        // With one token: the router's score for each expert, and the chosen two's shares.
        const single = shown * (1 - route);
        if (single > 0.01) {
          const barX = ex + 26;
          const barW = ew - 26 - 40;
          ctx.fillStyle = rgba(lit ? color : INK.silver, (lit ? 0.9 : 0.3) * single);
          ctx.fillRect(barX, y + eh / 2 - 2, Math.max(2, (barW * BLUE_SCORES[index]) / highest), 4);
          const share = blue.find(([expert]) => expert === index)?.[1];
          if (share !== undefined)
            label(ctx, `${Math.round(share * 100)}%`, ex + ew - 8, y + eh / 2, {
              size: numberSize,
              face: 'mono',
              color: INK.white,
              align: 'right',
              alpha: single,
            });
        }
      }
      label(ctx, 'one feed-forward block', ex + ew / 2, top - 14, {
        size: 12,
        color: INK.silver,
        align: 'center',
        alpha: 1 - span(split, 0, 0.5),
      });
      label(ctx, `${EXPERTS} experts`, ex + ew / 2, top - 14, {
        size: 12,
        color: INK.silver,
        align: 'center',
        alpha: span(split, 0.5, 1),
      });

      // The router, the join and the chips.
      ctx.fillStyle = rgba(INK.panel, 1);
      ctx.beginPath();
      ctx.moveTo(router.x, router.y - 9);
      ctx.lineTo(router.x + 9, router.y);
      ctx.lineTo(router.x, router.y + 9);
      ctx.lineTo(router.x - 9, router.y);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = rgba(HUE.violet, 0.95);
      ctx.stroke();
      label(ctx, 'router', router.x, router.y + 22, {
        size: 11.5,
        color: INK.silver,
        align: 'center',
        alpha: span(split, 0.5, 1),
        backing: INK.void,
      });
      ctx.beginPath();
      ctx.arc(join.x, join.y, 9, 0, Math.PI * 2);
      ctx.fillStyle = rgba(INK.panel, 1);
      ctx.fill();
      ctx.strokeStyle = rgba(color, 0.9);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(join.x - 4, join.y);
      ctx.lineTo(join.x + 4, join.y);
      ctx.moveTo(join.x, join.y - 4);
      ctx.lineTo(join.x, join.y + 4);
      ctx.stroke();
      PIECES.forEach(([text], index) => {
        const shown = index === 4 ? 1 : route;
        if (shown <= 0.01) return;
        const y = chipY(index);
        const mine = index === active;
        roundRect(ctx, left, y - chipH / 2, widths[index], chipH, chipH * 0.3);
        ctx.fillStyle = rgba(INK.panel, shown);
        ctx.fill();
        ctx.strokeStyle = rgba(spectrum(index / 6), (mine ? 0.95 : 0.45) * shown);
        ctx.stroke();
        label(ctx, text.trim(), left + widths[index] / 2, y, {
          size: chipSize,
          weight: 600,
          color: INK.white,
          align: 'center',
          alpha: shown * (mine ? 1 : 0.7),
        });
      });

      // A pulse runs along the active token's way through.
      const phase = (t * 0.7) % 1;
      additive(ctx, () => {
        const from = { x: left + widths[active], y: chipY(active) };
        if (phase < 0.35) {
          const [x, y] = curvePoint(
            from.x,
            from.y,
            router.x,
            from.y,
            router.x,
            router.y,
            phase / 0.35,
          );
          glow(ctx, x, y, 12, color, 0.9);
        } else if (phase < 0.7) {
          const k = (phase - 0.35) / 0.35;
          for (const expert of split < 0.5 ? [-1] : pairs) {
            const y2 = expert < 0 ? middle : expertY(expert) + eh / 2;
            const [x, y] = curvePoint(router.x, router.y, ex, router.y, ex, y2, k);
            glow(ctx, x, y, 12, color, 0.9);
          }
        } else {
          const k = (phase - 0.7) / 0.3;
          glow(ctx, join.x + (w - 12 - join.x) * k, join.y, 12, color, 0.9);
        }
      });
      ctx.restore();
    }
    note('one block: every weight works on every token', flow * (1 - span(split, 0.25, 0.5)));
    note(
      'a router scores 8 experts and sends the token to the best 2 (illustrative scores)',
      flow * span(split, 0.5, 0.75) * (1 - span(route, 0.25, 0.5)),
    );
    note('each token takes its own pair (illustrative routes)', flow * span(route, 0.5, 0.75));

    // All of the model in memory, and the part each token uses.
    if (tally > 0.01) {
      ctx.save();
      ctx.globalAlpha = tally;
      // Larger pictures get larger type.
      const k = Math.max(1, Math.min(1.35, Math.min(w, h) / 560));
      const margin = Math.max(16, w * 0.08);
      const width = w - margin * 2;
      const rowH = 84 * k;
      const start = (h - 50 - rowH * EXPERT_MODELS.length) / 2 + 14;
      EXPERT_MODELS.forEach((model, index) => {
        const y = start + index * rowH;
        label(ctx, model.name, margin, y, {
          size: 15 * k,
          weight: 650,
          face: 'display',
          color: INK.white,
        });
        const barY = y + 16 * k;
        roundRect(ctx, margin, barY, width, 16 * k, 5);
        ctx.fillStyle = rgba(INK.silver, 0.1);
        ctx.fill();
        ctx.strokeStyle = rgba(INK.silver, 0.35);
        ctx.stroke();
        const grow = easeInOut(span(tally, 0.2 + index * 0.25, 0.7 + index * 0.25));
        roundRect(
          ctx,
          margin,
          barY,
          Math.max(4, ((width * model.active) / model.total) * grow),
          16 * k,
          5,
        );
        ctx.fillStyle = rgba(HUE.amber, 0.85);
        ctx.fill();
        label(ctx, `${model.active}B used for each token`, margin, barY + 32 * k, {
          size: 12.5 * k,
          color: INK.white,
        });
        label(ctx, `${model.total}B in memory`, margin + width, barY + 32 * k, {
          size: 12.5 * k,
          color: INK.silver,
          align: 'right',
        });
      });
      ctx.restore();
    }
    note('Every expert stays in memory; each token visits only a few.', tally);
  };
}
