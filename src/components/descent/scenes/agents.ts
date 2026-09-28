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
  textWidth,
  rgba,
  roundRect,
  span,
  spectrum,
  wash,
} from '../kit';

/**
 * Agents: a model that can call tools. The question goes in, the model asks a
 * tool for what it lacks, the result joins its context, and the answer comes
 * back. A tool runs only with the permission it has been given.
 */
export function createAgents(): Draw {
  return (ctx, { w, h, p, t }) => {
    ctx.fillStyle = INK.void;
    ctx.fillRect(0, 0, w, h);
    dotGrid(ctx, w, h, 30, INK.silver, 0.04);
    wash(ctx, w * 0.5, h * 0.5, Math.max(w, h) * 0.6, spectrum(0.3), 0.12);

    const wide = w >= 620;
    const you = { x: w * (wide ? 0.12 : 0.16), y: h * 0.5 };
    const model = { x: w * 0.45, y: h * 0.5 };
    const modelR = Math.min(52, w * 0.075);
    // The tools keep to the right edge; the lock sits halfway to them.
    const toolW = Math.min(120, w * 0.27);
    const toolX = wide ? w * 0.82 : w - 12 - toolW / 2;
    const tools = ['Search', 'Calculator', 'Code', 'Files'].map((name, index) => ({
      name,
      x: toolX,
      y: h * 0.5 + (index - 1.5) * Math.min(h * 0.17, 90),
    }));
    const gate = {
      x: wide ? lerp(model.x, toolX, 0.45) : (model.x + modelR + toolX - toolW / 2) / 2,
      y: h * 0.5,
    };

    const ask = easeInOut(span(p, 0, 0.14));
    const call = easeInOut(span(p, 0.16, 0.31));
    const back = easeInOut(span(p, 0.5, 0.64));
    const answer = easeInOut(span(p, 0.72, 0.9));

    // The links: you to the model, the model to each tool through the gate.
    ctx.strokeStyle = rgba(INK.silver, 0.22);
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(you.x, you.y);
    ctx.lineTo(model.x, model.y);
    for (const tool of tools) {
      ctx.moveTo(gate.x, gate.y);
      ctx.lineTo(tool.x - toolW / 2, tool.y);
    }
    ctx.moveTo(model.x, model.y);
    ctx.lineTo(gate.x, gate.y);
    ctx.stroke();

    const node = (
      x: number,
      y: number,
      radius: number,
      color: string,
      name: string,
      lit: number,
    ) => {
      additive(ctx, () => glow(ctx, x, y, radius * 2.6, color, 0.2 + lit * 0.6));
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fillStyle = rgba(INK.panel, 1);
      ctx.fill();
      ctx.strokeStyle = rgba(color, 0.6 + lit * 0.4);
      ctx.lineWidth = 1.6;
      ctx.stroke();
      label(ctx, name, x, y, {
        size: 13.5,
        weight: 650,
        face: 'display',
        color: INK.white,
        align: 'center',
      });
    };
    const thinking = Math.max(
      Math.sin(span(p, 0.18, 0.32) * Math.PI),
      Math.sin(span(p, 0.62, 0.74) * Math.PI),
    );
    node(
      you.x,
      you.y,
      Math.min(34, w * 0.05),
      CATEGORIES[2],
      'You',
      Math.max(ask < 1 ? 1 - ask : 0, answer),
    );
    node(
      model.x,
      model.y,
      modelR,
      CATEGORIES[1],
      'Model',
      thinking * (0.7 + 0.3 * Math.sin(t * 6)),
    );

    // Tools: the one being used lights up.
    tools.forEach((tool, index) => {
      const used =
        index === 0 ? Math.max(Math.sin(call * Math.PI * 0.5), 1 - back) * (call > 0 ? 1 : 0) : 0;
      roundRect(ctx, tool.x - toolW / 2, tool.y - 20, toolW, 40, 12);
      ctx.fillStyle = rgba(INK.panel, 1);
      ctx.fill();
      ctx.strokeStyle = rgba(CATEGORIES[0], 0.4 + used * 0.6);
      ctx.lineWidth = 1.3;
      ctx.stroke();
      if (used > 0) additive(ctx, () => glow(ctx, tool.x, tool.y, 70, CATEGORIES[0], used * 0.5));
      label(ctx, tool.name, tool.x, tool.y, { size: 13, color: INK.white, align: 'center' });
    });

    // The gate: a lock that opens for a permitted call.
    const open = call > 0.3 ? 1 : 0;
    const lockColor = open ? HUE.green : INK.silver;
    roundRect(ctx, gate.x - 11, gate.y - 4, 22, 18, 4);
    ctx.fillStyle = rgba(INK.panel, 1);
    ctx.fill();
    ctx.strokeStyle = rgba(lockColor, 0.9);
    ctx.lineWidth = 1.6;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(gate.x + (open ? 8 : 0), gate.y - 5, 7, Math.PI, 0);
    ctx.stroke();
    label(ctx, open ? 'permitted' : 'permission', gate.x, gate.y + 32, {
      size: 11.5,
      color: INK.silver,
      align: 'center',
      backing: INK.void,
    });

    // The packets: question in, tool call out, result back, answer home.
    const packet = (
      x1: number,
      y1: number,
      x2: number,
      y2: number,
      progress: number,
      color: string,
      text: string,
    ) => {
      if (progress <= 0 || progress >= 1) return;
      const x = lerp(x1, x2, progress);
      const y = lerp(y1, y2, progress);
      additive(ctx, () => glow(ctx, x, y, 22, color, 0.9));
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(x, y, 4.5, 0, Math.PI * 2);
      ctx.fill();
      // The packet's words ride above it, kept inside the picture.
      const half = textWidth(ctx, text, 12, 500, 'mono') / 2;
      label(ctx, text, Math.min(w - 8 - half, Math.max(8 + half, x)), y - 22, {
        size: 12,
        face: 'mono',
        color: INK.white,
        align: 'center',
        backing: INK.void,
      });
    };
    const search = tools[0];
    packet(you.x, you.y, model.x, model.y, ask, CATEGORIES[2], 'why is the sky blue?');
    packet(
      model.x,
      model.y,
      search.x - toolW / 2,
      search.y,
      call,
      CATEGORIES[1],
      wide ? 'search("sky colour physics")' : 'search(…)',
    );
    packet(
      search.x - toolW / 2,
      search.y,
      model.x,
      model.y,
      back,
      CATEGORIES[0],
      'result + source',
    );
    packet(model.x, model.y, you.x, you.y, answer, CATEGORIES[1], 'answer, with its source');

    // The context: what the model is working with, growing as results arrive.
    const lines = [
      ask >= 1 ? 'your question' : '',
      back >= 1 ? 'search result' : '',
      answer >= 1 ? 'answer' : '',
    ].filter(Boolean);
    // As wide as its longest line, under the model, clear of the tools.
    const boxW =
      Math.max(
        ...['context', 'your question', 'search result'].map((text) => textWidth(ctx, text, 12.5)),
      ) + 26;
    const boxX = Math.max(8, Math.min(model.x - boxW / 2, toolX - toolW / 2 - 10 - boxW));
    const boxY = model.y + Math.min(h * 0.16, 90);
    if (lines.length) {
      roundRect(ctx, boxX, boxY, boxW, 26 + lines.length * 20, 10);
      ctx.fillStyle = rgba(INK.panel, 0.95);
      ctx.fill();
      ctx.strokeStyle = rgba(CATEGORIES[1], 0.4);
      ctx.stroke();
      label(ctx, 'context', boxX + 12, boxY + 14, { size: 11.5, color: INK.muted });
      lines.forEach((text, index) =>
        label(ctx, text, boxX + 12, boxY + 34 + index * 20, { size: 12.5, color: INK.white }),
      );
    }
  };
}
