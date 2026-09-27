import type { Draw } from '../engine';
import {
  CATEGORIES,
  HUE,
  INK,
  additive,
  dot,
  dotGrid,
  easeInOut,
  glow,
  label,
  lerp,
  random,
  rgba,
  span,
  spectrum,
  wash,
} from '../kit';

const SIZES = [5, 8, 8, 8, 4];

interface Net {
  nodes: { x: number; y: number; value: number }[][];
  edges: { from: [number, number]; to: [number, number]; weight: number; seed: number }[];
}

/** One fixed network: node activations and weights from a seed. */
function build(seed: number) {
  const next = random(seed);
  const values = SIZES.map((size) => Array.from({ length: size }, () => 0.15 + next() * 0.85));
  const edges: Net['edges'] = [];
  for (let layer = 0; layer < SIZES.length - 1; layer++)
    for (let a = 0; a < SIZES[layer]; a++)
      for (let b = 0; b < SIZES[layer + 1]; b++)
        edges.push({
          from: [layer, a],
          to: [layer + 1, b],
          weight: (next() * 2 - 1) * (next() < 0.35 ? 1 : 0.35),
          seed: next(),
        });
  return { values, edges };
}

function layout(w: number, h: number, values: number[][], left = 0.12, right = 0.88): Net['nodes'] {
  const span = Math.min(h * 0.7, 440);
  return SIZES.map((size, layer) =>
    Array.from({ length: size }, (_, index) => ({
      x: w * lerp(left, right, layer / (SIZES.length - 1)),
      y: h * 0.5 - span / 2 + ((index + 0.5) * span) / size,
      value: values[layer][index],
    })),
  );
}

function backdrop(ctx: CanvasRenderingContext2D, w: number, h: number, hue: number) {
  ctx.fillStyle = INK.void;
  ctx.fillRect(0, 0, w, h);
  dotGrid(ctx, w, h, 30, INK.silver, 0.04);
  wash(ctx, w * 0.5, h * 0.5, Math.max(w, h) * 0.6, spectrum(hue), 0.12);
}

/** Where a travelling front is, for a layer: 0 before it, 1 once passed. */
const reached = (front: number, layer: number) =>
  easeInOut(span(front, layer / SIZES.length, (layer + 0.8) / SIZES.length));

/**
 * A forward pass: numbers enter on the left, every layer combines and bends
 * them, and scores come out on the right. Then the network turns out to be one
 * slice of something much deeper.
 */
export function createForward(): Draw {
  const { values, edges } = build(9);
  return (ctx, { w, h, p, t }) => {
    backdrop(ctx, w, h, 0.22);
    const front = easeInOut(span(p, 0.1, 0.7));
    const deep = easeInOut(span(p, 0.74, 1));
    const nodes = layout(w, h, values, lerp(0.12, 0.2, deep), lerp(0.88, 0.8, deep));

    // Deeper: more slices of the same shape, fading into the distance.
    if (deep > 0) {
      for (let copy = 4; copy >= 1; copy--) {
        const offset = copy * 22 * deep;
        const alpha = deep * (0.5 - copy * 0.09);
        for (const edge of edges) {
          if (edge.seed > 0.3) continue;
          const a = nodes[edge.from[0]][edge.from[1]];
          const b = nodes[edge.to[0]][edge.to[1]];
          ctx.strokeStyle = rgba(spectrum(0.22 + copy * 0.05), alpha * 0.35);
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(a.x + offset, a.y - offset);
          ctx.lineTo(b.x + offset, b.y - offset);
          ctx.stroke();
        }
        for (const layer of nodes)
          for (const node of layer)
            dot(ctx, node.x + offset, node.y - offset, 3, spectrum(0.22 + copy * 0.05), alpha);
      }
    }

    for (const edge of edges) {
      const a = nodes[edge.from[0]][edge.from[1]];
      const b = nodes[edge.to[0]][edge.to[1]];
      const lit = reached(front, edge.from[0] + 0.6);
      const strong = Math.abs(edge.weight);
      const color = edge.weight >= 0 ? CATEGORIES[0] : CATEGORIES[3];
      ctx.strokeStyle = rgba(lit > 0.05 ? color : INK.silver, 0.06 + strong * (0.1 + lit * 0.45));
      ctx.lineWidth = 0.6 + strong * lit * 1.8;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
      // Signals keep running along the strong links the front has passed.
      if (lit > 0.5 && strong > 0.5) {
        const phase = (t * 0.55 + edge.seed * 5) % 1;
        additive(ctx, () =>
          glow(
            ctx,
            lerp(a.x, b.x, phase),
            lerp(a.y, b.y, phase),
            5,
            color,
            lit * 0.8 * Math.sin(phase * Math.PI),
          ),
        );
      }
    }
    nodes.forEach((layer, index) => {
      // The inputs are there from the start; every later layer waits for the wave.
      const lit = index === 0 ? 0.55 + 0.45 * span(p, 0, 0.1) : reached(front, index);
      for (const node of layer) {
        const color = spectrum(0.18 + index * 0.06);
        additive(ctx, () => glow(ctx, node.x, node.y, 22, color, lit * node.value * 0.8));
        ctx.beginPath();
        ctx.arc(node.x, node.y, 7, 0, Math.PI * 2);
        ctx.fillStyle = rgba(INK.panel, 1);
        ctx.fill();
        ctx.strokeStyle = rgba(lit > 0.05 ? color : INK.silver, 0.35 + lit * 0.6);
        ctx.lineWidth = 1.5;
        ctx.stroke();
        dot(ctx, node.x, node.y, 4.2 * lit * node.value, '#ffffff', lit);
      }
    });
    const tag = (text: string, x: number, alpha: number) =>
      label(ctx, text, x, h * 0.5 + Math.min(h * 0.35, 220) + 24, {
        size: 12,
        color: INK.muted,
        align: 'center',
        alpha: alpha * (1 - deep),
      });
    tag('numbers in', nodes[0][0].x, 1);
    tag('hidden layers', nodes[2][0].x, span(front, 0.2, 0.5));
    tag('scores out', nodes[4][0].x, span(front, 0.8, 1));
    if (deep > 0.3)
      label(
        ctx,
        'Each layer’s output is the next one’s input, dozens of times over.',
        w / 2,
        h - 30,
        {
          size: 13,
          color: INK.silver,
          align: 'center',
          alpha: span(deep, 0.3, 1),
        },
      );
  };
}

/**
 * Backpropagation: the output is compared with the right answer, and the
 * error flows backwards, telling every weight which way to move.
 */
export function createBackward(): Draw {
  const { values, edges } = build(9);
  // The right answer for the output layer, against what the network gave.
  const target = [0.08, 0.92, 0.12, 0.05];
  return (ctx, { w, h, p, t }) => {
    backdrop(ctx, w, h, 0.5);
    const nodes = layout(w, h, values, 0.1, 0.78);
    // The comparison is the starting point; the error then flows back and the weights move.
    const compare = 1;
    const back = easeInOut(span(p, 0.08, 0.32));
    const nudge = span(p, 0.42, 0.64);
    const cycle = span(p, 0.84, 1);
    // At the end, forward and backward passes alternate, as training does.
    const loop = cycle > 0 ? (t * 0.25) % 1 : 0;
    const loopForward = cycle > 0 && loop < 0.5;
    const backFront = cycle > 0 ? (loopForward ? 0 : (loop - 0.5) * 2) : back;
    const forwardFront = cycle > 0 && loopForward ? loop * 2 : 1;

    for (const edge of edges) {
      const a = nodes[edge.from[0]][edge.from[1]];
      const b = nodes[edge.to[0]][edge.to[1]];
      // The error reaches later layers first.
      const hit = span(
        backFront,
        1 - (edge.to[0] + 0.2) / SIZES.length,
        1 - (edge.from[0] + 0.1) / SIZES.length,
      );
      const strong = Math.abs(edge.weight);
      const change = Math.sin(edge.seed * 40) * 0.5;
      const width = 0.6 + strong * 1.6 + change * nudge * 1.4 * (cycle > 0 ? 1 : 1);
      ctx.strokeStyle = rgba(
        hit > 0.05 ? CATEGORIES[3] : INK.silver,
        0.08 + strong * 0.2 + hit * 0.45,
      );
      ctx.lineWidth = Math.max(0.4, width);
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
      if (hit > 0.2 && hit < 1 && strong > 0.4) {
        const phase = 1 - hit;
        additive(ctx, () =>
          glow(
            ctx,
            lerp(a.x, b.x, phase),
            lerp(a.y, b.y, phase),
            6,
            CATEGORIES[3],
            0.9 * Math.sin(hit * Math.PI),
          ),
        );
      }
      if (loopForward && strong > 0.5) {
        const phase = forwardFront * SIZES.length - edge.from[0];
        if (phase > 0 && phase < 1)
          additive(ctx, () =>
            glow(ctx, lerp(a.x, b.x, phase), lerp(a.y, b.y, phase), 5, CATEGORIES[0], 0.8),
          );
      }
    }
    nodes.forEach((layer, index) => {
      const hit = span(backFront, 1 - (index + 0.6) / SIZES.length, 1 - index / SIZES.length);
      for (const node of layer) {
        ctx.beginPath();
        ctx.arc(node.x, node.y, 7, 0, Math.PI * 2);
        ctx.fillStyle = rgba(INK.panel, 1);
        ctx.fill();
        ctx.strokeStyle = rgba(hit > 0.05 ? CATEGORIES[3] : spectrum(0.3), 0.5 + hit * 0.5);
        ctx.lineWidth = 1.5;
        ctx.stroke();
        dot(ctx, node.x, node.y, 3.5 * node.value, '#ffffff', 0.8);
        if (hit > 0)
          additive(ctx, () =>
            glow(ctx, node.x, node.y, 20, CATEGORIES[3], hit * Math.sin(hit * Math.PI) * 0.8),
          );
      }
    });

    // Predicted against right: bars beside the outputs.
    const out = nodes[SIZES.length - 1];
    const barX = out[0].x + 26;
    const barW = Math.min(w * 0.14, 120);
    out.forEach((node, index) => {
      const predicted = values[SIZES.length - 1][index] * 0.8;
      const right = target[index];
      ctx.fillStyle = rgba(INK.silver, 0.18);
      ctx.fillRect(barX, node.y - 9, barW, 6);
      ctx.fillStyle = rgba(HUE.cyan, 0.9);
      ctx.fillRect(barX, node.y - 9, barW * predicted, 6);
      ctx.fillStyle = rgba(HUE.amber, 0.9 * compare);
      ctx.fillRect(barX, node.y + 1, barW * right * compare, 6);
      if (compare > 0.5 && Math.abs(predicted - right) > 0.2)
        additive(ctx, () =>
          glow(
            ctx,
            barX + barW * Math.max(predicted, right) + 8,
            node.y - 2,
            10,
            CATEGORIES[3],
            span(compare, 0.5, 1),
          ),
        );
    });
    // A key, with the words in plain ink beside each colour.
    const key = (x: number, color: string, text: string) => {
      ctx.fillStyle = rgba(color, compare);
      ctx.fillRect(x, out[0].y - 34, 8, 8);
      label(ctx, text, x + 13, out[0].y - 30, { size: 11.5, color: INK.silver, alpha: compare });
    };
    key(barX, HUE.cyan, 'model');
    key(barX + 62, HUE.amber, 'right answer');
    if (nudge > 0 || cycle > 0)
      label(
        ctx,
        cycle > 0
          ? loopForward
            ? 'forward: make a prediction'
            : 'backward: share out the blame'
          : 'every weight moves a little, in the direction that shrinks the error',
        w / 2,
        h - 30,
        { size: 13, color: INK.silver, align: 'center', alpha: Math.max(nudge, cycle) },
      );
  };
}
