import { mix, segment, signalFrame } from '../../lib/signal-journey';

type Point = { x: number; y: number };
const WORDS = ['Why', 'does', 'the', 'Moon', 'shine', '?'];
const rgba = (alpha: number) => `rgba(221,229,244,${Math.max(0, Math.min(1, alpha))})`;
const band = (p: number, a: number, b: number, c: number, d: number) =>
  segment(p, a, b) * (1 - segment(p, c, d));
const orbit = (i: number, radius: number, rotation = 0): Point => ({
  x: 400 + Math.cos((i / 6) * Math.PI * 2 - Math.PI / 2 + rotation) * radius,
  y: 305 + Math.sin((i / 6) * Math.PI * 2 - Math.PI / 2 + rotation) * radius * 0.78,
});
const lerpPoint = (a: Point, b: Point, t: number): Point => ({
  x: mix(a.x, b.x, t),
  y: mix(a.y, b.y, t),
});
function tokenPosition(stage: number, i: number): Point {
  if (stage === 0) return { x: [150, 254, 346, 452, 566, 662][i], y: 305 };
  if (stage === 1) return orbit(i, 240);
  if (stage === 2) return { x: 160 + i * 96, y: 305 };
  if (stage === 3) return orbit(i, 245, 0.28);
  return { x: 400, y: 305 };
}
function particlePosition(stage: number, i: number): Point {
  const a = i * 2.399963;
  if (stage === 0) return { x: 400 + Math.cos(a) * 300, y: 305 + Math.sin(a) * 210 };
  if (stage === 1) {
    const p = orbit(i % 6, 240);
    return { x: p.x + Math.cos(a) * 32, y: p.y + Math.sin(a) * 32 };
  }
  if (stage === 2) return { x: 140 + (i % 6) * 105, y: 153 + Math.floor(i / 6) * 24 };
  if (stage === 3) return { x: 400 + Math.cos(a) * 230, y: 305 + Math.sin(a) * 185 };
  if (stage === 4)
    return {
      x: 400 + Math.cos(a) * ((i % 5) * 28 + 25),
      y: 305 + Math.sin(a) * ((i % 5) * 28 + 25),
    };
  if (stage === 5) return { x: 215 + Math.floor(i / 4) * 17, y: 200 + (i % 4) * 74 };
  if (stage === 6) return { x: 170 + (i % 14) * 35, y: 260 + Math.floor(i / 14) * 21 };
  return { x: 400 + Math.cos(a) * 88, y: 415 + Math.sin(a) * 88 };
}

/** Canvas is decorative; the identical teaching narrative is accessible HTML. */
export function drawSignal(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  progress: number,
) {
  const { position: p, from, to, blend } = signalFrame(progress);
  ctx.clearRect(0, 0, width, height);
  const scale = Math.min(width / 800, height / (height < 260 ? 500 : 620));
  ctx.save();
  ctx.translate(width / 2, height / 2);
  ctx.scale(scale, scale);
  ctx.translate(-400, -310);
  const path = (points: Point[], color: string, lineWidth = 1, close = false) => {
    ctx.beginPath();
    points.forEach((point, i) => (i ? ctx.lineTo(point.x, point.y) : ctx.moveTo(point.x, point.y)));
    if (close) ctx.closePath();
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
  };
  const text = (
    value: string,
    x: number,
    y: number,
    size: number,
    color: string,
    align: CanvasTextAlign = 'center',
  ) => {
    // The small diagram labels also appear in readable HTML on phones.
    if (size < 18 && scale < 0.5) return;
    ctx.font = `${size >= 28 ? '500' : '400'} ${size}px ${size < 18 ? 'monospace' : 'Arial, sans-serif'}`;
    ctx.textAlign = align;
    ctx.textBaseline = 'middle';
    ctx.fillStyle = color;
    ctx.fillText(value, x, y);
  };
  const round = (
    x: number,
    y: number,
    w: number,
    h: number,
    r: number,
    fill: string,
    stroke: string,
  ) => {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 1;
    ctx.stroke();
  };
  const halo = ctx.createRadialGradient(400, 300, 10, 400, 300, 340);
  halo.addColorStop(0, '#aabedb12');
  halo.addColorStop(0.45, '#aabedb08');
  halo.addColorStop(1, '#aabedb00');
  ctx.fillStyle = halo;
  ctx.fillRect(0, 0, 800, 620);
  // A single instrument changes shape across the entire timeline. No timer or random seed.
  for (let ring = 0; ring < 3; ring++) {
    ctx.save();
    ctx.translate(400, 305);
    ctx.rotate(-0.2 + p * 0.13 + ring * 0.55);
    ctx.beginPath();
    ctx.ellipse(0, 0, 270 + ring * 27, 135 + ring * 42, 0, 0, Math.PI * 2);
    ctx.strokeStyle = rgba(0.055 + Math.sin(p * 0.65) ** 2 * 0.04);
    ctx.setLineDash(ring === 1 ? [2, 9] : []);
    ctx.stroke();
    ctx.restore();
  }
  for (let i = 0; i < 84; i++) {
    const point = lerpPoint(particlePosition(from, i), particlePosition(to, i), blend);
    const arc = Math.sin(blend * Math.PI) * 18;
    point.x += Math.sin(i * 1.8) * arc;
    point.y += Math.cos(i * 1.6) * arc;
    ctx.beginPath();
    ctx.arc(point.x, point.y, i % 9 === 0 ? 2.2 : 1.1, 0, Math.PI * 2);
    ctx.fillStyle = rgba(0.12 + (i % 7) * 0.04);
    ctx.fill();
  }
  const tokenAlpha = 1 - segment(p, 3.3, 3.9);
  const tokens = WORDS.map((_, i) =>
    lerpPoint(tokenPosition(Math.min(from, 4), i), tokenPosition(Math.min(to, 4), i), blend),
  );
  const attention = band(p, 2.4, 2.95, 3.55, 4.05);
  if (attention > 0.001) {
    const origin = tokens[5];
    for (let i = 0; i < 5; i++) {
      const end = tokens[i];
      const amount = segment(p, 2.45 + i * 0.05, 3.05 + i * 0.07);
      ctx.beginPath();
      ctx.moveTo(origin.x, origin.y);
      ctx.quadraticCurveTo(400 + (i - 2) * 25, 305, end.x, end.y);
      ctx.setLineDash([700]);
      ctx.lineDashOffset = 700 * (1 - amount);
      ctx.strokeStyle = rgba(attention * (i === 3 ? 0.8 : 0.23));
      ctx.lineWidth = i === 3 ? 2 : 1;
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.lineDashOffset = 0;
      const t = segment(p, 2.7, 3.5);
      const x = (1 - t) ** 2 * origin.x + 2 * (1 - t) * t * (400 + (i - 2) * 25) + t * t * end.x;
      const y = (1 - t) ** 2 * origin.y + 2 * (1 - t) * t * 305 + t * t * end.y;
      ctx.beginPath();
      ctx.arc(x, y, i === 3 ? 4 : 2, 0, Math.PI * 2);
      ctx.fillStyle = rgba(attention);
      ctx.fill();
    }
  }
  const layerAlpha = band(p, 3.45, 3.95, 4.5, 5.05);
  if (layerAlpha > 0.001) {
    const angle = -0.58 + (p - 3.45) * 0.65;
    const project = (x: number, y: number, z: number): Point => {
      const xx = x * Math.cos(angle) + z * Math.sin(angle),
        zz = -x * Math.sin(angle) + z * Math.cos(angle);
      const yy = y * 0.75 - zz * 0.66,
        depth = y * 0.66 + zz * 0.75,
        perspective = 780 / (780 + depth);
      return { x: 400 + xx * perspective, y: 305 + yy * perspective };
    };
    for (let layer = 4; layer >= 0; layer--) {
      const spread = 24 + segment(p, 3.5, 4.25) * 46;
      const z = (layer - 2) * spread;
      const corners = [
        project(-155, -155, z),
        project(155, -155, z),
        project(155, 155, z),
        project(-155, 155, z),
      ];
      ctx.beginPath();
      corners.forEach((q, i) => (i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y)));
      ctx.closePath();
      const g = ctx.createLinearGradient(corners[0].x, corners[0].y, corners[2].x, corners[2].y);
      g.addColorStop(0, rgba(layerAlpha * 0.13));
      g.addColorStop(1, rgba(layerAlpha * 0.015));
      ctx.fillStyle = g;
      ctx.fill();
      path(corners, rgba(layerAlpha * 0.42), 1, true);
      for (let k = -2; k <= 2; k++) {
        path([project(k * 52, -155, z), project(k * 52, 155, z)], rgba(layerAlpha * 0.06));
        path([project(-155, k * 52, z), project(155, k * 52, z)], rgba(layerAlpha * 0.06));
        for (let j = -2; j <= 2; j++) {
          const q = project(k * 52, j * 52, z);
          ctx.beginPath();
          ctx.arc(q.x, q.y, 1.6, 0, Math.PI * 2);
          ctx.fillStyle = rgba(layerAlpha * 0.48);
          ctx.fill();
        }
      }
      if (layer < 4)
        for (const c of [-1, 1])
          path(
            [project(c * 155, c * 155, z), project(c * 155, c * 155, z + spread)],
            rgba(layerAlpha * 0.15),
          );
    }
    const beam = project(0, 0, mix(-230, 230, segment(p, 3.8, 4.5)));
    ctx.beginPath();
    ctx.arc(beam.x, beam.y, 7, 0, Math.PI * 2);
    ctx.fillStyle = rgba(layerAlpha);
    ctx.shadowColor = '#cfddfb';
    ctx.shadowBlur = 24;
    ctx.fill();
    ctx.shadowBlur = 0;
    text('REPEATED TRANSFORMATION', 400, 554, 14, rgba(layerAlpha * 0.7));
  }
  if (tokenAlpha > 0.001) {
    ctx.save();
    ctx.globalAlpha = tokenAlpha;
    const split = segment(p, 0.1, 0.85),
      vector = band(p, 1.35, 1.95, 2.15, 2.8);
    round(86, 256, 625, 98, 49, rgba((1 - split) * 0.022), rgba((1 - split) * 0.18));
    tokens.forEach((point, i) => {
      const h = mix(60, 230, vector),
        w = mix(i === 5 ? 43 : 94, 76, vector);
      round(
        point.x - w / 2,
        point.y - h / 2,
        w,
        h,
        10,
        rgba(split * 0.07),
        rgba(split * (i === 5 && attention > 0.1 ? 0.85 : 0.32)),
      );
      if (vector > 0.01) {
        for (let j = 0; j < 9; j++) {
          const v = Math.sin(i * 3.7 + j * 2.3) * 0.4 + 0.5;
          round(
            point.x - 24,
            point.y - 65 + j * 17,
            48 * v,
            6,
            2,
            rgba(vector * (0.17 + v * 0.65)),
            'transparent',
          );
        }
      }
      text(WORDS[i], point.x, point.y - vector * 94, mix(29, 24, vector), rgba(0.96));
      text(String(i + 1).padStart(2, '0'), point.x, point.y + h / 2 - 12, 11, rgba(split * 0.45));
    });
    text(
      p < 0.7
        ? 'WHY DOES THE MOON SHINE?'
        : p < 2.5
          ? 'ONE PROMPT / SIX ILLUSTRATIVE PIECES'
          : 'AVAILABLE CONTEXT / FINAL PROMPT POSITION',
      400,
      556,
      13,
      rgba(0.53),
    );
    ctx.restore();
  }
  const probabilities = band(p, 4.55, 5, 5.35, 5.9);
  if (probabilities > 0.001) {
    ctx.save();
    ctx.globalAlpha = probabilities;
    text('POSSIBLE NEXT TOKENS', 400, 128, 15, rgba(0.64));
    ['The', 'It', 'Moonlight', 'Because'].forEach((word, i) => {
      const y = 212 + i * 76;
      const value = [0.46, 0.28, 0.17, 0.09][i];
      const length = value * 340 * segment(p, 4.55 + i * 0.04, 5.05 + i * 0.04);
      text(word, 195, y, 23, rgba(i === 0 ? 0.96 : 0.7), 'right');
      round(222, y - 14, 340, 28, 4, rgba(0.035), 'transparent');
      const gradient = ctx.createLinearGradient(222, y, 562, y);
      gradient.addColorStop(0, '#67768f');
      gradient.addColorStop(1, '#e0e9fa');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.roundRect(222, y - 14, length, 28, 4);
      ctx.fill();
      text(`${Math.round(value * 100)}%`, 598, y, 24, rgba(0.85), 'left');
      if (i === 0) {
        const chosen = segment(p, 5.1, 5.5);
        ctx.beginPath();
        ctx.arc(222 + length, y, 6, 0, Math.PI * 2);
        ctx.fillStyle = rgba(chosen);
        ctx.fill();
      }
    });
    text('INVENTED SCORES / FOUR CANDIDATES ONLY', 400, 555, 12, rgba(0.55));
    ctx.restore();
  }
  const answer = segment(p, 5.45, 5.95),
    verified = segment(p, 6.35, 7);
  if (answer > 0.001) {
    const y = mix(228, 174, verified);
    round(76, y - 65, 648, 210, 20, rgba(answer * 0.035), rgba(answer * 0.22));
    ctx.font = '500 36px Arial, sans-serif';
    const words: [string, number, number][] = [];
    [
      ['The', 'Moon', 'shines', 'because'],
      ['it', 'reflects', 'sunlight.'],
    ].forEach((line, row) => {
      const widths = line.map((word) => ctx.measureText(word).width);
      let x = 400 - (widths.reduce((sum, w) => sum + w, 0) + (line.length - 1) * 11) / 2;
      line.forEach((word, i) => {
        words.push([word, x, row * 58]);
        x += widths[i] + 11;
      });
    });
    words.forEach(([word, x, dy], i) => {
      const visible = segment(p, 5.5 + i * 0.105, 5.66 + i * 0.105);
      text(word, x, y + dy + mix(20, 0, visible), 36, rgba(visible), 'left');
    });
    text(
      verified > 0.5 ? 'CLAIM / CHECKED AGAINST A SOURCE' : 'OUTPUT / APPEND A TOKEN, THEN REPEAT',
      400,
      y - 32,
      13,
      rgba(answer * 0.55),
    );
    if (verified > 0.001) {
      const sun = { x: 150, y: 435 },
        moon = { x: 415, y: 435 },
        eye = { x: 658, y: 435 };
      ctx.save();
      ctx.globalAlpha = verified;
      for (let i = -2; i <= 2; i++)
        path(
          [
            { x: sun.x + 25, y: sun.y + i * 14 },
            { x: mix(sun.x + 25, moon.x - 47, verified), y: moon.y + i * 9 },
          ],
          rgba(0.23),
          1,
        );
      path(
        [
          { x: moon.x + 50, y: moon.y },
          { x: mix(moon.x + 50, eye.x - 15, verified), y: eye.y },
        ],
        rgba(0.65),
        1.5,
      );
      ctx.beginPath();
      ctx.arc(sun.x, sun.y, 25, 0, Math.PI * 2);
      ctx.fillStyle = rgba(0.86);
      ctx.fill();
      const moonlight = ctx.createLinearGradient(365, 410, 470, 445);
      moonlight.addColorStop(0, '#f2f5fb');
      moonlight.addColorStop(0.48, '#737e90');
      moonlight.addColorStop(1, '#151a23');
      ctx.beginPath();
      ctx.arc(moon.x, moon.y, 51, 0, Math.PI * 2);
      ctx.fillStyle = moonlight;
      ctx.fill();
      ctx.strokeStyle = rgba(0.35);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(eye.x, eye.y, 8, 0, Math.PI * 2);
      ctx.fillStyle = rgba(0.8);
      ctx.fill();
      text('SUNLIGHT', 150, 510, 14, rgba(0.68));
      text('REFLECTION', 415, 510, 14, rgba(0.68));
      text('OBSERVER', 658, 510, 14, rgba(0.68));
      ctx.restore();
    }
  }
  ctx.restore();
}
