import type { Draw } from '../engine';
import {
  CATEGORIES,
  HUE,
  INK,
  additive,
  arrowHead,
  crowd,
  dotGrid,
  easeInOut,
  gaussian,
  glow,
  label,
  lerp,
  project,
  random,
  rgba,
  rotateX,
  rotateY,
  span,
  spectrum,
  textWidth,
  wash,
  type Vec3,
} from '../kit';
import { PIECES } from './tokens';

interface Word {
  text: string;
  at: Vec3;
  /** The question's own tokens are bright; the rest are the neighbourhood. */
  ours?: number;
}

/**
 * Tokens become vectors, and vectors become places: words with related uses
 * end up near each other, and some directions carry meaning of their own.
 */
export function createMeaning(): Draw {
  const next = random(4096);
  const around = (centre: Vec3, spread: number): Vec3 => [
    centre[0] + gaussian(next) * spread,
    centre[1] + gaussian(next) * spread,
    centre[2] + gaussian(next) * spread,
  ];
  const clusters: { centre: Vec3; words: string[] }[] = [
    { centre: [-0.55, -0.32, 0.22], words: ['sky', 'cloud', 'air', 'rain', 'sun', 'wind'] },
    { centre: [0.52, -0.3, -0.22], words: ['blue', 'red', 'green', 'violet', 'yellow'] },
    { centre: [0.08, 0.52, 0.42], words: ['Why', 'is', 'the', 'what', 'how', 'of'] },
    { centre: [0.62, 0.4, -0.5], words: ['?', '!', '.'] },
  ];
  const words: Word[] = [];
  for (const { centre, words: list } of clusters)
    for (const text of list) words.push({ text, at: around(centre, 0.1) });
  // The question's pieces, in order, find their places among them.
  PIECES.forEach(([piece], index) => {
    const word = words.find((entry) => entry.text === piece.trim());
    if (word) word.ours = index;
  });
  // A small neighbourhood where one direction means "female" and another "royal".
  const man: Vec3 = [-0.62, 0.3, -0.5];
  const gender: Vec3 = [0.3, 0.03, 0.15];
  const royal: Vec3 = [0.06, -0.34, 0.08];
  const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
  const analogy = {
    man,
    woman: add(man, gender),
    king: add(man, royal),
    queen: add(add(man, royal), gender),
  };
  for (const [text, at] of Object.entries(analogy)) words.push({ text, at });
  // The neighbours of "sky" and "blue", which the third step joins to them.
  const distance = (a: Vec3, b: Vec3) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
  const neighbours = new Set(
    ['sky', 'blue'].flatMap((centre) => {
      const from = words.find((word) => word.text === centre)!;
      return words
        .filter((word) => word !== from && distance(word.at, from.at) <= 0.34)
        .map((word) => word.text);
    }),
  );
  // The question's three small words sit close together. Each keeps a side of
  // its own, from left to right as the first step shows them, so all three
  // stay readable and none jumps as the space turns.
  const trio = ['Why', 'is', 'the'].map((text) => words.find((word) => word.text === text)!);
  const across = trio.map((word) => rotateX(rotateY(word.at, 0.53), 0.28)[0]);
  const sides = new Map<Word, 'left' | 'below' | 'right'>();
  (['left', 'below', 'right'] as const).forEach((side, rank) =>
    sides.set(trio[[0, 1, 2].sort((a, b) => across[a] - across[b])[rank]], side),
  );
  // Unlabelled points: the rest of a vocabulary of many thousands.
  const dust = Array.from({ length: 170 }, () => {
    const cluster = clusters[Math.floor(next() * clusters.length)];
    return next() < 0.55 ? around(cluster.centre, 0.2) : around([0, 0, 0], 0.55);
  });
  // Each of our tokens as a column of numbers, from a fixed seed.
  const columns = PIECES.map((_, index) => {
    const values = random(77 + index * 31);
    return Array.from({ length: 14 }, () => gaussian(values) * 0.55);
  });

  return (ctx, { w, h, p, t }) => {
    ctx.fillStyle = INK.void;
    ctx.fillRect(0, 0, w, h);
    dotGrid(ctx, w, h, 30, INK.silver, 0.04);
    wash(ctx, w * 0.5, h * 0.5, Math.max(w, h) * 0.6, spectrum(0.14), 0.14);

    const fly = easeInOut(span(p, 0.05, 0.3));
    const space = span(p, 0.1, 0.31);
    const near = easeInOut(span(p, 0.42, 0.64));
    const arrows = easeInOut(span(p, 0.74, 0.96));
    const cx = w * 0.5;
    const cy = h * 0.5;
    // Small enough that the nearest words, enlarged by perspective, stay in the picture.
    const radius = Math.min(w, h) * 0.42;
    const focal = radius * 3.2;
    // Type a little smaller on a small picture, never below 11px.
    const scale = Math.max(0.8, Math.min(1, Math.min(w, h) / 600));
    // The space sways gently, and turns as the reader scrolls; at the end it
    // settles to face the parallelogram.
    const turn = Math.sin(t * 0.11) * 0.3 * (1 - arrows * 0.7) + p * 1.6 - arrows * 0.9;
    const tilt = 0.28 + arrows * 0.1;
    const place = (point: Vec3) => {
      const rotated = rotateX(rotateY(point, turn), tilt);
      return project(
        [rotated[0] * radius, rotated[1] * radius, rotated[2] * radius],
        cx,
        cy,
        focal,
        focal,
      );
    };

    // The rest of the vocabulary, as dust.
    if (space > 0)
      additive(ctx, () => {
        for (const point of dust) {
          const at = place(point);
          const depth = at.scale;
          glow(ctx, at.x, at.y, 3 + depth * 3, spectrum(0.12), space * 0.35 * depth);
        }
      });

    const placed = words.map((word) => ({ word, at: place(word.at) }));
    placed.sort((a, b) => b.at.depth - a.at.depth);

    // Neighbours of "sky" and "blue", joined.
    if (near > 0) {
      for (const centre of ['sky', 'blue']) {
        const from = placed.find(({ word }) => word.text === centre)!;
        for (const other of placed) {
          if (other === from || other.word.text === centre) continue;
          if (distance(from.word.at, other.word.at) > 0.34) continue;
          ctx.strokeStyle = rgba(centre === 'sky' ? CATEGORIES[0] : CATEGORIES[1], 0.35 * near);
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(from.at.x, from.at.y);
          ctx.lineTo(other.at.x, other.at.y);
          ctx.stroke();
        }
      }
    }

    // The sum, once written, keeps its place at the bottom.
    const sumSize = Math.min(18, w / 26);
    const sumY = h - 34;
    const room = crowd(w, h);
    if (arrows > 0) {
      const half = textWidth(ctx, 'king − man + woman ≈ queen', sumSize, 600, 'display') / 2;
      room.keep({ x0: w / 2 - half, y0: sumY - sumSize, x1: w / 2 + half, y1: sumY + sumSize });
    }
    // At the end, the four words of the analogy come forward and the rest step back.
    const showing = (word: Word) => {
      const ours = word.ours !== undefined;
      const inAnalogy = word.text in analogy;
      return (
        (ours ? space : inAnalogy ? Math.max(near * 0.5, arrows) : space * 0.9) *
        (inAnalogy ? 1 : 1 - arrows * 0.55)
      );
    };
    // Labels find room in order of importance: the analogy at the end, then the
    // question's words, then the neighbours being joined, nearer words first.
    const importance = (word: Word) =>
      (word.text in analogy ? 3 * arrows : 0) +
      (word.ours !== undefined ? 2 : 0) +
      (neighbours.has(word.text) ? near : 0);
    const labels = new Map<
      Word,
      { size: number; room: number; x: number; y: number; align: CanvasTextAlign }
    >();
    [...placed]
      .sort((a, b) => importance(b.word) - importance(a.word) || b.at.scale - a.at.scale)
      .forEach(({ word, at }) => {
        const show = showing(word);
        if (show <= 0.01) return;
        const ours = word.ours !== undefined;
        const base = ours ? 17 : word.text in analogy ? lerp(13, 16, arrows) : 13;
        const size = Math.max(11, Math.round(base * Math.min(1.25, at.scale) * scale));
        const width = textWidth(ctx, word.text, size, ours ? 650 : 500, 'display');
        const gap = 8 * at.scale;
        const side = sides.get(word) ?? 'right';
        const x = side === 'left' ? at.x - gap : side === 'below' ? at.x : at.x + gap;
        const y = side === 'below' ? at.y + gap + size * 0.76 : at.y - gap;
        const align = side === 'left' ? 'right' : side === 'below' ? 'center' : 'left';
        const x0 = align === 'right' ? x - width : align === 'center' ? x - width / 2 : x;
        const box = { x0, y0: y - size * 0.76, x1: x0 + width, y1: y + size * 0.24 };
        labels.set(word, { size, room: room.place(box, show), x, y, align });
      });

    for (const { word, at } of placed) {
      const ours = word.ours !== undefined;
      const inAnalogy = word.text in analogy;
      const show = showing(word);
      if (show <= 0.01) continue;
      const color = ours ? spectrum(word.ours! / 6) : inAnalogy ? HUE.amber : INK.silver;
      additive(ctx, () =>
        glow(ctx, at.x, at.y, (ours ? 16 : 9) * at.scale, color, show * (ours ? 0.9 : 0.45)),
      );
      ctx.fillStyle = rgba(ours ? '#ffffff' : color, show * (ours ? 1 : 0.8));
      ctx.beginPath();
      ctx.arc(at.x, at.y, (ours ? 3.2 : 2.2) * at.scale, 0, Math.PI * 2);
      ctx.fill();
      const { size, room: clear, x, y, align } = labels.get(word)!;
      label(ctx, word.text, x, y, {
        size,
        align,
        weight: ours ? 650 : 500,
        color: ours ? INK.white : INK.silver,
        alpha: show * (ours ? 1 : 0.75) * Math.min(1, at.scale) * clear,
        face: 'display',
        baseline: 'alphabetic',
      });
    }

    // Directions that mean something: the same step turns man into woman and king into queen.
    if (arrows > 0) {
      const at = (key: keyof typeof analogy) => place(analogy[key]);
      const pairs: [keyof typeof analogy, keyof typeof analogy, string][] = [
        ['man', 'woman', HUE.amber],
        ['king', 'queen', HUE.amber],
        ['man', 'king', CATEGORIES[1]],
        ['woman', 'queen', CATEGORIES[1]],
      ];
      pairs.forEach(([from, to, color], index) => {
        const grow = easeInOut(span(arrows, index * 0.12, 0.55 + index * 0.12));
        if (grow <= 0) return;
        const a = at(from);
        const b = at(to);
        const x = lerp(a.x, b.x, grow);
        const y = lerp(a.y, b.y, grow);
        ctx.strokeStyle = rgba(color, 0.9);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(x, y);
        ctx.stroke();
        if (grow > 0.9) arrowHead(ctx, x, y, Math.atan2(b.y - a.y, b.x - a.x), 9, color);
      });
      label(ctx, 'king − man + woman ≈ queen', w / 2, sumY, {
        size: sumSize,
        weight: 600,
        face: 'display',
        color: INK.white,
        align: 'center',
        alpha: span(arrows, 0.5, 1),
      });
    }

    // First, each token is a column of numbers, before it becomes a point.
    if (fly < 1) {
      const count = columns.length;
      const colW = Math.min(46, (w * 0.8) / count);
      const cellH = Math.min(16, (h * 0.5) / columns[0].length);
      const left = w / 2 - (colW * count) / 2;
      const top = h * 0.5 - (cellH * columns[0].length) / 2;
      columns.forEach((values, column) => {
        const word = placed.find(({ word: entry }) => entry.ours === column);
        const target = word ? word.at : { x: w / 2, y: h / 2 };
        const color = spectrum(column / 6);
        const x0 = left + column * colW + colW / 2;
        label(ctx, PIECES[column][0].trim(), x0, top - 18, {
          size: 13,
          weight: 600,
          face: 'display',
          color: INK.white,
          align: 'center',
          alpha: 1 - fly * 2,
        });
        values.forEach((value, row) => {
          const stagger = easeInOut(span(fly, row * 0.02, 0.7 + row * 0.02));
          const x = lerp(x0, target.x, stagger);
          const y = lerp(top + row * cellH + cellH / 2, target.y, stagger);
          const size = lerp(colW * 0.72, 3, stagger);
          const cell = value >= 0 ? CATEGORIES[0] : CATEGORIES[3];
          ctx.fillStyle = rgba(
            cell,
            (0.25 + Math.min(0.75, Math.abs(value))) * (1 - stagger * 0.6),
          );
          ctx.fillRect(
            x - size / 2,
            y - lerp(cellH * 0.4, 1.5, stagger),
            size,
            lerp(cellH * 0.8, 3, stagger),
          );
          if (column === 0 && row < 6 && fly < 0.05)
            label(ctx, value.toFixed(2), x0 - colW / 2 - 8, top + row * cellH + cellH / 2, {
              size: 10.5,
              face: 'mono',
              color: INK.muted,
              align: 'right',
            });
        });
        additive(ctx, () => glow(ctx, target.x, target.y, 14, color, span(fly, 0.6, 1)));
      });
      if (fly < 0.1)
        label(ctx, 'Illustrative values: real vectors have thousands of numbers.', w / 2, h - 28, {
          size: 12,
          color: INK.muted,
          align: 'center',
          alpha: 1 - fly * 10,
        });
    }
  };
}
