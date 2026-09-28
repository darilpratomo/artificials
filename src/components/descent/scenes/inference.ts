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
  lines,
  rgba,
  roundRect,
  span,
  spectrum,
  textWidth,
  wash,
} from '../kit';
import { ANSWER } from './predict';
import { PIECES } from './tokens';

/**
 * Serving a question: the whole prompt is read at once, then the answer is
 * written one token per step, each step keeping a little more in the KV cache;
 * a busy GPU interleaves many people's requests.
 */
export function createInference(): Draw {
  return (ctx, { w, h, p, t }) => {
    ctx.fillStyle = INK.void;
    ctx.fillRect(0, 0, w, h);
    dotGrid(ctx, w, h, 30, INK.silver, 0.04);
    wash(ctx, w * 0.5, h * 0.5, Math.max(w, h) * 0.6, spectrum(0.82), 0.12);

    // The prompt has arrived when the chapter opens; prefill follows.
    const arrive = 1;
    const prefill = easeInOut(span(p, 0.14, 0.31));
    const decode = span(p, 0.4, 0.66);
    const batch = easeInOut(span(p, 0.72, 0.9));
    const wide = w >= 620;

    const left = w * 0.08;
    const right = w * 0.94;
    // On a narrow picture the parts stack, centred: the tokens and the time
    // axis, what each phase does, then the cache and its key.
    const laneY = wide ? h * 0.34 : Math.max(34, (h - 236) / 2 + 14);
    const prefillY = laneY + 76;
    const decodeY = wide ? prefillY : prefillY + 19;
    const cacheY = wide ? h * 0.62 : decodeY + 44;
    const prompt = PIECES.length;
    const answer = ANSWER.length;
    const slot = (right - left) / (prompt + answer + 2);

    // The single request leaves before the busy GPU arrives.
    const single = 1 - span(batch, 0, 0.45);
    const many = span(batch, 0.55, 1);
    if (single > 0.01) {
      ctx.save();
      ctx.globalAlpha = single;
      // The time axis: prefill, then one step per new token.
      ctx.strokeStyle = rgba(INK.silver, 0.25);
      ctx.beginPath();
      ctx.moveTo(left, laneY + 40);
      ctx.lineTo(right, laneY + 40);
      ctx.stroke();
      label(ctx, 'time', right, laneY + 58, { size: 11.5, color: INK.muted, align: 'right' });

      // The prompt's tokens, read together in one pass.
      PIECES.forEach(([text], index) => {
        const x = left + index * slot;
        const y = lerp(laneY - 90, laneY, arrive);
        roundRect(ctx, x + 2, y - 14, slot - 4, 28, 6);
        ctx.fillStyle = rgba(INK.panel, 1);
        ctx.fill();
        ctx.strokeStyle = rgba(spectrum(index / 6), 0.7);
        ctx.stroke();
        if (wide)
          label(ctx, text.trim(), x + slot / 2, y, {
            size: 12,
            color: INK.white,
            align: 'center',
            alpha: arrive,
          });
      });
      if (prefill > 0) {
        const x = left;
        const width = prompt * slot;
        const flash = Math.sin(prefill * Math.PI);
        additive(ctx, () => glow(ctx, x + width / 2, laneY, width * 0.7, HUE.amber, flash * 0.6));
        ctx.fillStyle = rgba(HUE.amber, 0.15 + 0.4 * flash);
        ctx.fillRect(x, laneY + 30, width * prefill, 10);
        label(ctx, 'prefill: the whole prompt in one pass', x, prefillY, {
          size: 12.5,
          color: INK.silver,
          alpha: Math.min(1, prefill * 3),
        });
      }
      // Then one token per step, each step a narrow pulse.
      const made = Math.floor(decode * answer + 1e-6);
      for (let index = 0; index < answer; index++) {
        const x = left + (prompt + 1 + index) * slot;
        const done = index < made ? 1 : index === made ? (decode * answer) % 1 : 0;
        if (done <= 0) continue;
        ctx.fillStyle = rgba(HUE.cyan, 0.35 + 0.5 * done);
        ctx.fillRect(x + slot * 0.3, laneY + 30, slot * 0.4, 10);
        const y = laneY - 14;
        roundRect(ctx, x + 2, y, slot - 4, 28, 6);
        ctx.fillStyle = rgba(CATEGORIES[0], 0.18 * done);
        ctx.fill();
        ctx.strokeStyle = rgba(CATEGORIES[0], 0.8 * done);
        ctx.stroke();
        const text = ANSWER[index].trim();
        if (wide && textWidth(ctx, text, 11, 500) < slot - 6)
          label(ctx, text, x + slot / 2, y + 14, {
            size: 11,
            color: INK.white,
            align: 'center',
            alpha: done,
          });
      }
      if (decode > 0)
        label(
          ctx,
          'decode: one token per step',
          wide ? left + (prompt + 1) * slot : left,
          decodeY,
          {
            size: 12.5,
            color: INK.silver,
            alpha: Math.min(1, decode * 4),
          },
        );

      // The KV cache: what each token leaves behind so it is not recomputed.
      const blocks = Math.round(prompt * prefill) + made;
      const blockW = Math.min(slot * 0.9, 44);
      label(ctx, `KV cache: ${blocks} token${blocks === 1 ? '' : 's'} kept`, left, cacheY - 22, {
        size: 12.5,
        color: INK.silver,
        alpha: prefill,
      });
      for (let index = 0; index < blocks; index++) {
        const x = left + index * (blockW + 4);
        for (const [row, color] of [
          [0, CATEGORIES[1]],
          [1, CATEGORIES[2]],
        ] as const) {
          roundRect(ctx, x, cacheY + row * 26, blockW, 22, 4);
          ctx.fillStyle = rgba(color, 0.4);
          ctx.fill();
          ctx.strokeStyle = rgba(color, 0.9);
          ctx.stroke();
        }
      }
      if (prefill > 0.5) {
        ctx.fillStyle = rgba(CATEGORIES[1], 1);
        ctx.fillRect(left, cacheY + 64, 8, 8);
        label(ctx, 'keys', left + 13, cacheY + 68, { size: 11.5, color: INK.silver });
        ctx.fillStyle = rgba(CATEGORIES[2], 1);
        ctx.fillRect(left + 60, cacheY + 64, 8, 8);
        label(ctx, 'values', left + 73, cacheY + 68, { size: 11.5, color: INK.silver });
      }
      ctx.restore();
    }

    // Many people at once: requests interleave on one GPU and join as others finish.
    if (many > 0) {
      const batch = many;
      // Room on the left for each request's name.
      const left = w * (wide ? 0.2 : 0.1);
      const rows = 4;
      const rowH = Math.min(52, h * 0.12);
      const top = wide ? h * 0.22 : Math.max(20, (h - rows * rowH - 70) / 2);
      const steps = 22;
      const stepW = (right - left) / steps;
      // Each request's start and length, in steps.
      const requests = [
        [0, 14],
        [2, 9],
        [5, 15],
        [8, 11],
      ];
      const now = ((t * 3) % (steps + 6)) - 2;
      for (let row = 0; row < rows; row++) {
        const [start, length] = requests[row];
        const y = top + row * rowH;
        ctx.fillStyle = rgba(CATEGORIES[row], batch);
        ctx.fillRect(left - 16, y + rowH / 2 - 4, 8, 8);
        if (wide)
          label(ctx, `request ${row + 1}`, left - 24, y + rowH / 2, {
            size: 11.5,
            color: INK.silver,
            align: 'right',
            alpha: batch,
          });
        for (let step = 0; step < steps; step++) {
          const active = step >= start && step < start + length;
          if (!active) continue;
          const x = left + step * stepW;
          const reached = step < now;
          ctx.fillStyle = rgba(
            CATEGORIES[row],
            batch * (step === start ? 0.75 : reached ? 0.55 : 0.12),
          );
          ctx.fillRect(x + 1, y + rowH * 0.2, (step === start ? stepW * 1 : stepW) - 2, rowH * 0.6);
        }
      }
      // The GPU's current step touches every active request.
      const x = left + Math.max(0, Math.min(steps, now)) * stepW;
      additive(ctx, () => glow(ctx, x, top + (rows * rowH) / 2, rowH * 2, '#ffffff', 0.18 * batch));
      ctx.strokeStyle = rgba('#ffffff', 0.7 * batch);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x, top - 10);
      ctx.lineTo(x, top + rows * rowH + 10);
      ctx.stroke();
      lines(
        ctx,
        'each step moves every active request on by one token',
        w / 2,
        top + rows * rowH + 34,
        w - 32,
        {
          size: 13,
          color: INK.white,
          align: 'center',
          alpha: batch,
        },
      );
    }
  };
}
