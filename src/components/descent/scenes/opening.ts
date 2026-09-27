import type { Draw } from '../engine';
import { INK, additive, glow, project, random, rgba, spectrum, wash, type Vec3 } from '../kit';

/**
 * A tunnel of connected points that the camera flies into as the reader
 * scrolls: near points are the cool colours of language, far ones the warm
 * colours of hardware, and signals run along the links.
 */
export function createOpening(): Draw {
  const next = random(20260927);
  const DEPTH = 42;
  const nodes = Array.from({ length: 230 }, () => {
    const angle = next() * Math.PI * 2;
    const radius = 4.2 + next() * 7.5;
    return {
      angle,
      radius,
      z: next() * DEPTH,
      size: 0.6 + next() * 1.4,
      twinkle: next() * Math.PI * 2,
    };
  });
  // Each point links to its nearest neighbours, measured once.
  const position = (index: number): Vec3 => {
    const node = nodes[index];
    return [Math.cos(node.angle) * node.radius, Math.sin(node.angle) * node.radius, node.z];
  };
  const links: [number, number, number][] = [];
  nodes.forEach((_, a) => {
    const pa = position(a);
    const near = nodes
      .map((__, b) => {
        const pb = position(b);
        return [b, Math.hypot(pa[0] - pb[0], pa[1] - pb[1], (pa[2] - pb[2]) * 0.8)] as const;
      })
      .filter(([b]) => b > a)
      .sort((x, y) => x[1] - y[1])
      .slice(0, 2);
    for (const [b, distance] of near) if (distance < 7) links.push([a, b, next()]);
  });

  return (ctx, { w, h, p, t }) => {
    const cx = w / 2;
    const cy = h * 0.5;
    const focal = Math.min(w, h) * 0.95;
    // Scrolling flies in; time adds a slow drift so the tunnel is never still.
    const camera = p * DEPTH * 0.85 + t * 0.35;
    const spin = t * 0.025 + p * 0.6;
    const warp = p * p;

    ctx.fillStyle = INK.void;
    ctx.fillRect(0, 0, w, h);
    wash(ctx, cx, cy, Math.max(w, h) * 0.55, spectrum(0.15 + warp * 0.5), 0.16 + warp * 0.22);

    const placed = nodes.map((node) => {
      const depth = (((node.z - camera) % DEPTH) + DEPTH) % DEPTH;
      const angle = node.angle + spin;
      const point = project(
        [Math.cos(angle) * node.radius, Math.sin(angle) * node.radius, 0],
        cx,
        cy,
        focal,
        depth + 0.8,
      );
      // Points fade in from the distance and out as they pass the camera.
      const alpha = Math.min(1, depth / 3) * Math.min(1, (DEPTH - depth) / (DEPTH * 0.55));
      return { ...point, depth, alpha, color: spectrum(0.05 + (depth / DEPTH) * 0.9) };
    });

    additive(ctx, () => {
      // Links, grouped by depth so each group is one stroke.
      const BANDS = 8;
      const bands: number[][] = Array.from({ length: BANDS }, () => []);
      for (const [a, b, seed] of links) {
        const pa = placed[a];
        const pb = placed[b];
        // Links that would cross the tunnel's seam are left out.
        if (Math.abs(pa.depth - pb.depth) > DEPTH / 3) continue;
        const alpha = Math.min(pa.alpha, pb.alpha);
        if (alpha < 0.03) continue;
        bands[Math.min(BANDS - 1, Math.floor((pa.depth / DEPTH) * BANDS))].push(
          pa.x,
          pa.y,
          pb.x,
          pb.y,
        );
        // A signal runs along some links.
        if (seed < 0.3) {
          const phase = (t * (0.18 + seed * 0.5) + seed * 7) % 1;
          glow(
            ctx,
            pa.x + (pb.x - pa.x) * phase,
            pa.y + (pb.y - pa.y) * phase,
            2 + pa.scale * 0.35,
            pa.color,
            alpha * 0.77,
          );
        }
      }
      ctx.lineWidth = 1;
      bands.forEach((segments, band) => {
        if (!segments.length) return;
        const depth = ((band + 0.5) / BANDS) * DEPTH;
        const alpha = Math.min(1, depth / 3) * Math.min(1, (DEPTH - depth) / (DEPTH * 0.55));
        ctx.strokeStyle = rgba(spectrum(0.05 + ((band + 0.5) / BANDS) * 0.9), alpha * 0.32);
        ctx.beginPath();
        for (let k = 0; k < segments.length; k += 4) {
          ctx.moveTo(segments[k], segments[k + 1]);
          ctx.lineTo(segments[k + 2], segments[k + 3]);
        }
        ctx.stroke();
      });
      placed.forEach((point, index) => {
        if (point.alpha < 0.01) return;
        const node = nodes[index];
        const twinkle = 0.75 + 0.25 * Math.sin(t * 1.6 + node.twinkle);
        const radius = Math.min(26, node.size * point.scale * 0.11);
        // Speed draws each point out into a streak towards the edges.
        if (warp > 0.02) {
          const tail = 1 + warp * 1.6;
          ctx.strokeStyle = rgba(point.color, point.alpha * 0.55);
          ctx.lineWidth = Math.max(0.6, radius * 0.7);
          ctx.beginPath();
          ctx.moveTo(point.x, point.y);
          ctx.lineTo(cx + (point.x - cx) / tail, cy + (point.y - cy) / tail);
          ctx.stroke();
        }
        // The halo is capped: a point passing the camera would otherwise fill the screen.
        glow(
          ctx,
          point.x,
          point.y,
          Math.min(70, radius * 5),
          point.color,
          point.alpha * 0.55 * twinkle,
        );
        const core = Math.max(1, radius * 1.1);
        ctx.fillStyle = rgba('#ffffff', point.alpha * 0.9 * twinkle);
        ctx.fillRect(point.x - core / 2, point.y - core / 2, core, core);
      });
      // The way in: a light at the vanishing point that grows as the reader descends.
      glow(ctx, cx, cy, Math.min(w, h) * (0.08 + warp * 0.5), '#dfe8ff', 0.25 + warp * 0.55);
    });
  };
}
