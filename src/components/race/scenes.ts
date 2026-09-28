import type { Race, RaceRecord } from '../../../shared/race';
import { makerColor } from '../../../shared/makers';
import { clamp, type Draw } from '../descent/engine';
import {
  CATEGORIES,
  HUE,
  INK,
  additive,
  easeInOut,
  easeOut,
  glow,
  label,
  lerp,
  mixHex,
  rgba,
  span,
  spectrum,
  textWidth,
  wash,
} from '../descent/kit';
import { backdrop, intervalRows, legend, note, withinLeader, type Entry } from '../descent/charts';
import { axes, day, dollars, frame, month, plot, ticks, timeSpan, type Plot } from './chart';

/**
 * A label kept inside the chart's area, on a dark backing so lines never run
 * through it.
 */
function tag(
  ctx: CanvasRenderingContext2D,
  area: Plot,
  text: string,
  x: number,
  y: number,
  alpha: number,
  size = 12,
) {
  const half = textWidth(ctx, text, size, 600) / 2;
  const top = area.top + size;
  const bottom = area.bottom - size;
  label(
    ctx,
    text,
    Math.min(area.right - half - 4, Math.max(area.left + half + 4, x)),
    Math.min(bottom, Math.max(top, y)),
    {
      size,
      weight: 600,
      color: INK.white,
      align: 'center',
      alpha,
      backing: INK.void,
    },
  );
}

/** A step line through records: along at each record's value until the next one. */
function steps(
  ctx: CanvasRenderingContext2D,
  p: Plot,
  points: { date: string; value: number; color: string }[],
  until: number,
  alpha: number,
  width = 2,
) {
  ctx.lineWidth = width;
  points.forEach((point, index) => {
    const time = day(point.date);
    if (time > until) return;
    const next = points[index + 1];
    const stop = Math.min(until, next ? day(next.date) : p.end);
    ctx.strokeStyle = rgba(point.color, alpha);
    ctx.beginPath();
    ctx.moveTo(p.x(time), p.y(point.value));
    ctx.lineTo(p.x(stop), p.y(point.value));
    if (next && day(next.date) <= until) ctx.lineTo(p.x(stop), p.y(next.value));
    ctx.stroke();
  });
}

/** Every model on the index, as dots, with the models named in `ghost` terms when faint. */
function field(
  ctx: CanvasRenderingContext2D,
  race: Race,
  p: Plot,
  radius: number,
  paint: (index: number) => [color: string, alpha: number],
) {
  race.models.forEach((model, index) => {
    const [color, alpha] = paint(index);
    if (alpha <= 0.01) return;
    ctx.fillStyle = rgba(color, alpha);
    ctx.beginPath();
    ctx.arc(p.x(day(model.date)), p.y(model.index), radius, 0, Math.PI * 2);
    ctx.fill();
  });
}

/** The index range the charts show: every model, with a little room above. */
const LOW = 50;
const HIGH = 175;
const indexTicks = ticks(60, 170, 20);

/** Every dot is a model: the field fills in over time, takes its makers' colours, and names its leaders. */
export function createField(race: Race): Draw {
  const { start, end } = timeSpan(race);
  const colored = new Set(race.makers.map((maker) => maker.makerId));
  const entries: Entry[] = [
    ...race.makers.map((maker) => ({ color: makerColor(maker.makerId), text: maker.maker })),
    { color: INK.muted, text: 'Other makers' },
  ];
  const leaders = [...race.models].sort((a, b) => b.index - a.index).slice(0, 5);
  return (ctx, { w, h, p, t }) => {
    backdrop(ctx, w, h, 0.05);
    const sweep = easeInOut(span(p, 0.05, 0.3));
    const tint = easeInOut(span(p, 0.42, 0.62));
    const named = easeInOut(span(p, 0.74, 0.94));
    const key = legend(ctx, entries, 16, 18, w - 32, 0);
    const chart = plot(frame(w, h, { top: key + 4, bottom: 0 }), start, end, LOW, HIGH);
    axes(ctx, chart, indexTicks, (value) => `${value}`);
    legend(ctx, entries, 16, 18, w - 32, tint);
    const cursor = lerp(start, end, sweep);
    const fade = 45 * 864e5;
    field(ctx, race, chart, w < 620 ? 2.2 : 2.8, (index) => {
      const model = race.models[index];
      const shown = 0.1 + 0.9 * clamp((cursor - day(model.date)) / fade);
      const mine = colored.has(model.makerId);
      const color = mine ? mixHex(INK.silver, makerColor(model.makerId), tint) : INK.silver;
      // The field steps back while its leaders are named.
      return [color, shown * (mine ? 0.85 : lerp(0.75, 0.4, tint)) * (1 - 0.45 * named)];
    });
    if (sweep > 0 && sweep < 1)
      additive(ctx, () => {
        const x = chart.x(cursor);
        for (let y = chart.top; y < chart.bottom; y += 18)
          glow(ctx, x, y, 10, HUE.cyan, 0.35 + 0.2 * Math.sin(t * 3 + y));
      });
    // The five highest scores today, listed where the early, lower models leave room.
    if (named > 0.01) {
      leaders.forEach((model, index) => {
        const x = chart.left + 12;
        const y = chart.top + 12 + index * 20;
        const text = `${index + 1}. ${model.name}`;
        const color = makerColor(model.makerId);
        const dx = chart.x(day(model.date));
        const dy = chart.y(model.index);
        ctx.strokeStyle = rgba(color, 0.4 * named);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x + 14 + textWidth(ctx, text, 12, 600) + 6, y);
        ctx.lineTo(dx - 6, dy);
        ctx.stroke();
        ctx.strokeStyle = rgba(color, named);
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(dx, dy, 5, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = rgba(color, named);
        ctx.beginPath();
        ctx.arc(x + 4, y, 4, 0, Math.PI * 2);
        ctx.fill();
        label(ctx, text, x + 14, y, {
          size: 12,
          weight: 600,
          color: INK.white,
          alpha: named,
          backing: INK.void,
        });
      });
    }
    note(
      ctx,
      w,
      h,
      'Each dot is a model: its release date across, its capability index up.',
      1 - span(p, 0.1, 0.25),
    );
    note(
      ctx,
      w,
      h,
      `${race.models.length} models, ${month(race.models[0].date)} to ${month(race.models.at(-1)!.date)}`,
      span(p, 0.25, 0.3) * (1 - span(p, 0.42, 0.5)),
    );
    note(
      ctx,
      w,
      h,
      'Coloured by maker: the six makers with the strongest models',
      span(p, 0.55, 0.62) * (1 - span(p, 0.74, 0.8)),
    );
    note(ctx, w, h, 'The five highest scores today', span(p, 0.88, 0.94));
  };
}

/** The record changes hands: a line that steps up with each new best model, in its maker's colour. */
export function createRecords(race: Race): Draw {
  const { start, end } = timeSpan(race);
  const records = race.records;
  const first = records[0];
  const last = records.at(-1)!;
  const count = new Map<string, { maker: string; count: number }>();
  for (const record of records)
    count.set(record.makerId, {
      maker: record.maker,
      count: (count.get(record.makerId)?.count ?? 0) + 1,
    });
  const entries: Entry[] = [...count]
    .sort((a, b) => b[1].count - a[1].count)
    .map(([id, { maker, count: n }]) => ({
      color: makerColor(id),
      text: `${maker}: ${n} record${n === 1 ? '' : 's'}`,
    }));
  const points = records.map((record) => ({
    date: record.date,
    value: record.index,
    color: makerColor(record.makerId),
  }));
  return (ctx, { w, h, p, t }) => {
    backdrop(ctx, w, h, 0.2);
    // Three steps: the first record, every record, and the latest.
    const sweep = easeInOut(span(p, 0.06, 0.44));
    const latest = easeInOut(span(p, 0.56, 0.94));
    const key = legend(ctx, entries, 16, 18, w - 32, 0);
    const chart = plot(frame(w, h, { top: key + 4, bottom: 0 }), start, end, LOW, HIGH);
    axes(ctx, chart, indexTicks, (value) => `${value}`);
    legend(ctx, entries, 16, 18, w - 32, 1);
    field(ctx, race, chart, w < 620 ? 1.8 : 2.2, () => [INK.silver, 0.16]);
    // At first only the first record: halfway to the second.
    const second = records[1] ? day(records[1].date) : end;
    const until = lerp((day(first.date) + second) / 2, end, sweep);
    steps(ctx, chart, points, until, 0.95, 2.2);
    // The newest record the line has reached glows while the line is drawn.
    const newest = records.filter((record) => day(record.date) <= until).length - 1;
    records.forEach((record, index) => {
      const time = day(record.date);
      if (time > until) return;
      const x = chart.x(time);
      const y = chart.y(record.index);
      const color = makerColor(record.makerId);
      const fresh = index === newest;
      if (fresh && sweep < 1)
        additive(ctx, () => glow(ctx, x, y, 22, color, 0.7 + 0.3 * Math.sin(t * 4)));
      ctx.fillStyle = rgba(color, 1);
      ctx.beginPath();
      ctx.arc(x, y, 3.6, 0, Math.PI * 2);
      ctx.fill();
    });
    const at = (record: RaceRecord) => [chart.x(day(record.date)), chart.y(record.index)] as const;
    const [fx, fy] = at(first);
    tag(ctx, chart, `${first.name}, ${month(first.date)}`, fx + 40, fy - 16, 1 - sweep);
    const [lx, ly] = at(last);
    tag(ctx, chart, `${last.name}: ${last.index.toFixed(1)}`, lx - 50, ly - 16, latest);
    note(ctx, w, h, `The first record: ${first.name}, from ${first.maker}`, 1 - span(p, 0.06, 0.2));
    note(
      ctx,
      w,
      h,
      'Each step up is a new record, in its maker’s colour',
      span(p, 0.3, 0.44) * (1 - span(p, 0.56, 0.66)),
    );
    note(
      ctx,
      w,
      h,
      `${race.facts.records} records, set by ${race.facts.holders} makers`,
      span(p, 0.8, 0.94),
    );
  };
}

/** Each maker's climb: the leading makers' own records, and how close they finish. */
export function createMakers(race: Race): Draw {
  const { start, end } = timeSpan(race);
  const entries: Entry[] = race.makers.map((maker) => ({
    color: makerColor(maker.makerId),
    text: maker.maker,
  }));
  const bests = race.makers.map((maker) => maker.records.at(-1)!.index);
  const top = Math.max(...bests);
  const bottom = Math.min(...bests);
  return (ctx, { w, h, p }) => {
    backdrop(ctx, w, h, 0.35);
    // Three steps: the early race, every line, and how close they end.
    const sweep = easeInOut(span(p, 0.06, 0.44));
    const close = easeInOut(span(p, 0.56, 0.94));
    const key = legend(ctx, entries, 16, 18, w - 32, 0);
    const chart = plot(frame(w, h, { top: key + 4, bottom: 0 }), start, end, LOW, HIGH);
    axes(ctx, chart, indexTicks, (value) => `${value}`);
    legend(ctx, entries, 16, 18, w - 32, 1);
    const until = lerp(Date.UTC(new Date(start).getUTCFullYear() + 1, 0, 1), end, sweep);
    race.makers.forEach((maker) => {
      const color = makerColor(maker.makerId);
      const points = maker.records.map((record) => ({
        date: record.date,
        value: record.index,
        color,
      }));
      steps(ctx, chart, points, until, 0.9, 2);
      const shown = maker.records.filter((record) => day(record.date) <= until);
      const lastShown = shown.at(-1);
      if (lastShown) {
        ctx.fillStyle = rgba(color, 1);
        ctx.beginPath();
        ctx.arc(chart.x(Math.min(until, chart.end)), chart.y(lastShown.index), 3.4, 0, Math.PI * 2);
        ctx.fill();
      }
    });
    // How close the six finish: a bracket at the right edge.
    if (close > 0.01) {
      const x = chart.right - 4;
      const y1 = chart.y(top);
      const y2 = chart.y(bottom);
      ctx.strokeStyle = rgba(INK.white, 0.8 * close);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x - 6, y1);
      ctx.lineTo(x, y1);
      ctx.lineTo(x, y2);
      ctx.lineTo(x - 6, y2);
      ctx.stroke();
      const text = `${(top - bottom).toFixed(1)} points`;
      label(ctx, text, x - 12, y2 + 18, {
        size: 12,
        weight: 600,
        color: INK.white,
        align: 'right',
        alpha: close,
        backing: INK.void,
      });
    }
    note(ctx, w, h, 'Each maker’s best model to date', 1 - span(p, 0.56, 0.66));
    note(
      ctx,
      w,
      h,
      `The six best models are within ${(top - bottom).toFixed(1)} points of each other`,
      span(p, 0.8, 0.94),
    );
  };
}

/** Open weights close in: the best open-weights model against the closed models' records. */
export function createOpenClosed(race: Race): Draw {
  const { start, end } = timeSpan(race);
  const lag = race.facts.openLag;
  const entries: Entry[] = [
    { color: CATEGORIES[1], text: 'Closed models' },
    { color: CATEGORIES[0], text: 'Open-weights models' },
  ];
  return (ctx, { w, h, p }) => {
    backdrop(ctx, w, h, 0.5);
    // Two steps: both lines, then the gap between them.
    const gap = easeInOut(span(p, 0.1, 0.9));
    const key = legend(ctx, entries, 16, 18, w - 32, 0);
    const chart = plot(frame(w, h, { top: key + 4, bottom: 0 }), start, end, LOW, HIGH);
    axes(ctx, chart, indexTicks, (value) => `${value}`);
    legend(ctx, entries, 16, 18, w - 32, 1);
    const line = (records: RaceRecord[], color: string) =>
      steps(
        ctx,
        chart,
        records.map((record) => ({ date: record.date, value: record.index, color })),
        end,
        0.95,
        2.2,
      );
    line(race.closed, CATEGORIES[1]);
    line(race.open, CATEGORIES[0]);
    if (lag && gap > 0.01) {
      const x1 = chart.x(day(lag.closed.date));
      const x2 = chart.x(day(lag.open.date));
      const y = chart.y(lag.open.index);
      ctx.strokeStyle = rgba(INK.white, 0.85 * gap);
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(x1, y);
      ctx.lineTo(lerp(x1, x2, gap), y);
      ctx.stroke();
      ctx.setLineDash([]);
      for (const [x, color] of [
        [x1, CATEGORIES[1]],
        [x2, CATEGORIES[0]],
      ] as const) {
        ctx.fillStyle = rgba(color, gap);
        ctx.beginPath();
        ctx.arc(x, x === x1 ? chart.y(lag.closed.index) : y, 4.5, 0, Math.PI * 2);
        ctx.fill();
      }
      tag(ctx, chart, `${lag.months} months`, (x1 + x2) / 2, y + 18, gap);
    }
    note(
      ctx,
      w,
      h,
      'The best model to date, among closed and among open-weights models',
      1 - span(p, 0.1, 0.3),
    );
    if (lag)
      note(
        ctx,
        w,
        h,
        `${lag.open.name} (open) reached what ${lag.closed.name} (closed) scored ${lag.months} months earlier`,
        span(p, 0.7, 0.9),
      );
  };
}

/** The price of a score: the cheapest price to date among models at or above an index level. */
export function createPrice(race: Race): Draw {
  const { start, end } = timeSpan(race);
  const cheaper = race.facts.cheaper;
  const bands = race.prices;
  const prices = bands.flatMap((band) => band.points.map((point) => point.price));
  const low = Math.min(...prices) * 0.5;
  const high = Math.max(...prices) * 2;
  const shade = (level: number) =>
    mixHex(INK.silver, HUE.amber, 0.25 + 0.75 * ((level - 120) / 30));
  const entries: Entry[] = bands.map((band) => ({
    color: shade(band.level),
    text: `Index ${band.level} or higher`,
  }));
  return (ctx, { w, h, p }) => {
    backdrop(ctx, w, h, 0.66);
    // Three steps: one level, its fall, and every level.
    const drop = easeInOut(span(p, 0.06, 0.44));
    const all = easeInOut(span(p, 0.56, 0.94));
    const key = legend(ctx, entries, 16, 18, w - 32, 0);
    // Gridlines at each power of ten, with room on the left for their labels.
    const decades = [0.01, 0.1, 1, 10, 100].filter((value) => value >= low && value <= high);
    const price = (value: number) => `$${Number(value.toPrecision(1))}`;
    const box = frame(w, h, { top: key + 4, bottom: 0 });
    box.left = Math.max(
      box.left,
      10 + Math.max(...decades.map((value) => textWidth(ctx, price(value), 10.5, 500, 'mono'))),
    );
    const chart = plot(box, start, end, low, high, true);
    axes(ctx, chart, decades, price);
    legend(ctx, entries, 16, 18, w - 32, all);
    for (const band of bands) {
      const main = band.level === cheaper?.level;
      const alpha = main ? 1 : all;
      if (alpha <= 0.01) continue;
      const color = shade(band.level);
      steps(
        ctx,
        chart,
        band.points.map((point) => ({ date: point.date, value: point.price, color })),
        end,
        alpha * (main ? 1 : 0.7),
        main ? 2.4 : 1.6,
      );
      for (const point of band.points) {
        ctx.fillStyle = rgba(color, alpha);
        ctx.beginPath();
        ctx.arc(chart.x(day(point.date)), chart.y(point.price), main ? 3.4 : 2.4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    if (cheaper && drop > 0.01) {
      const from = [chart.x(day(cheaper.from.date)), chart.y(cheaper.from.price)] as const;
      const to = [chart.x(day(cheaper.to.date)), chart.y(cheaper.to.price)] as const;
      tag(
        ctx,
        chart,
        `${cheaper.from.name}: ${dollars(cheaper.from.price)}`,
        from[0] + 30,
        from[1] - 16,
        drop * (1 - all),
      );
      tag(
        ctx,
        chart,
        `${cheaper.to.name}: ${dollars(cheaper.to.price)}`,
        to[0] - 40,
        to[1] - 18,
        drop * (1 - all),
      );
    }
    note(
      ctx,
      w,
      h,
      cheaper
        ? `The cheapest model scoring ${cheaper.level} or more, at today’s list prices per million tokens`
        : 'The cheapest price to date',
      1 - span(p, 0.06, 0.2),
    );
    if (cheaper)
      note(
        ctx,
        w,
        h,
        `${Math.round(cheaper.factor)} times cheaper, ${month(cheaper.from.date)} to ${month(cheaper.to.date)}`,
        span(p, 0.3, 0.44) * (1 - span(p, 0.56, 0.66)),
      );
    note(ctx, w, h, 'Every level, from index 120 up, got cheaper', span(p, 0.8, 0.94));
  };
}

/** Where the race stands: the highest scores today, with their confidence intervals. */
export function createStanding(race: Race): Draw {
  const top = [...race.models].sort((a, b) => b.index - a.index).slice(0, 8);
  const rows = top.map((model) => ({
    name: model.name,
    color: makerColor(model.makerId),
    score: model.index,
    low: model.low,
    high: model.high,
  }));
  const close = withinLeader(rows);
  const makers = [...new Map(top.map((model) => [model.makerId, model.maker]))];
  const entries: Entry[] = makers.map(([id, maker]) => ({ color: makerColor(id), text: maker }));
  return (ctx, { w, h, p }) => {
    backdrop(ctx, w, h, 0.9);
    // Two steps: the scores, then how far each could be off.
    const ranges = span(p, 0.1, 0.9);
    const key = legend(ctx, entries, 16, 18, w - 32, 1);
    intervalRows(ctx, w, rows, { top: 18 + key + 8, bottom: h - 70 }, { ranges });
    note(ctx, w, h, 'The eight highest scores on the index today', 1 - span(p, 0.1, 0.3));
    note(
      ctx,
      w,
      h,
      `${close} models reach into the leader’s confidence interval (shaded)`,
      span(p, 0.7, 0.9),
    );
  };
}

/** The opening: every model as a point of light, and the record line drawn across them. */
export function createRaceOpening(race: Race): Draw {
  const { start, end } = timeSpan(race);
  const points = race.records.map((record) => ({
    date: record.date,
    value: record.index,
    color: makerColor(record.makerId),
  }));
  return (ctx, { w, h, p, t }) => {
    ctx.fillStyle = INK.void;
    ctx.fillRect(0, 0, w, h);
    wash(ctx, w * 0.5, h * 0.62, Math.max(w, h) * 0.7, spectrum(0.15), 0.14);
    const chart = plot(
      { left: w * 0.06, right: w * 0.94, top: h * 0.3, bottom: h * 0.92 },
      start,
      end,
      LOW,
      HIGH,
    );
    const drawn = easeOut(clamp(0.25 + p * 1.2));
    additive(ctx, () =>
      race.models.forEach((model, index) => {
        const twinkle = 0.5 + 0.5 * Math.sin(t * 1.3 + index * 2.1);
        glow(
          ctx,
          chart.x(day(model.date)),
          chart.y(model.index),
          6 + twinkle * 4,
          spectrum(0.1 + ((model.index - LOW) / (HIGH - LOW)) * 0.5),
          0.35 + twinkle * 0.3,
        );
      }),
    );
    const until = lerp(start, end, drawn);
    steps(ctx, chart, points, until, 0.9, 2.5);
    // A pulse runs along the line to its newest end.
    const run = (t * 0.08) % 1;
    const record = points[Math.min(points.length - 1, Math.floor(run * points.length))];
    if (day(record.date) <= until)
      additive(ctx, () =>
        glow(ctx, chart.x(day(record.date)), chart.y(record.value), 26, record.color, 0.9),
      );
  };
}

/** The close: the record line again, quietly, with the newest record glowing. */
export function createRaceFinale(race: Race): Draw {
  const { start, end } = timeSpan(race);
  const points = race.records.map((record) => ({
    date: record.date,
    value: record.index,
    color: makerColor(record.makerId),
  }));
  const last = race.records.at(-1)!;
  return (ctx, { w, h, t }) => {
    ctx.fillStyle = INK.void;
    ctx.fillRect(0, 0, w, h);
    const wide = w >= 900;
    const chart = plot(
      wide
        ? { left: w * 0.52, right: w * 0.94, top: h * 0.22, bottom: h * 0.82 }
        : { left: 16, right: w - 16, top: h * 0.3, bottom: h * 0.9 },
      start,
      end,
      LOW,
      HIGH,
    );
    const alpha = wide ? 1 : 0.3;
    wash(ctx, (chart.left + chart.right) / 2, h * 0.5, Math.max(w, h) * 0.5, spectrum(0.2), 0.1);
    field(ctx, race, chart, 2, () => [INK.silver, 0.25 * alpha]);
    steps(ctx, chart, points, end, 0.85 * alpha, 2.2);
    additive(ctx, () =>
      glow(
        ctx,
        chart.x(day(last.date)),
        chart.y(last.index),
        24 + 6 * Math.sin(t * 2),
        makerColor(last.makerId),
        0.9 * alpha,
      ),
    );
  };
}
