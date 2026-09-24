import { useEffect, useRef, useState } from 'react';

/** Width of an element, kept current as the layout changes. Zero until measured. */
export function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const measure = () => setWidth(Math.round(element.getBoundingClientRect().width));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return [ref, width] as const;
}

/** Evenly spaced round ticks covering [min, max]. */
export function linearTicks(min: number, max: number, count = 5) {
  const span = max - min || 1;
  const raw = span / count;
  const power = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((factor) => factor * power).find((s) => s >= raw) ?? power;
  const ticks: number[] = [];
  for (let value = Math.ceil(min / step) * step; value <= max + step * 1e-9; value += step)
    ticks.push(Number(value.toFixed(10)));
  return { ticks, step };
}

/** Domain padded out to whole ticks, so bars and points never touch the frame. */
export function niceDomain(min: number, max: number, count = 5): [number, number] {
  const { step } = linearTicks(min, max, count);
  return [Math.floor(min / step) * step, Math.ceil(max / step) * step];
}

/** 1, 2, 5 steps across decades; only whole decades when space is short. */
export function logTicks(min: number, max: number, maximum = 8) {
  const all: number[] = [];
  for (let power = Math.floor(Math.log10(min)); power <= Math.ceil(Math.log10(max)); power += 1)
    for (const factor of [1, 2, 5]) {
      const value = factor * 10 ** power;
      if (value >= min * 0.999 && value <= max * 1.001) all.push(Number(value.toPrecision(3)));
    }
  if (all.length <= maximum) return all;
  const decades = all.filter((value) => Number.isInteger(Number(Math.log10(value).toFixed(9))));
  return decades.length >= 2 ? decades : all.filter((_, index) => index % 2 === 0);
}

/** Year starts, or half-years when the range is short. */
export function timeTicks(min: number, max: number) {
  const start = new Date(min);
  const end = new Date(max);
  const years = end.getUTCFullYear() - start.getUTCFullYear();
  const months = years <= 2 ? 6 : 12;
  const ticks: number[] = [];
  const cursor = new Date(Date.UTC(start.getUTCFullYear(), 0, 1));
  while (cursor.getTime() <= max) {
    if (cursor.getTime() >= min) ticks.push(cursor.getTime());
    cursor.setUTCMonth(cursor.getUTCMonth() + months);
  }
  return ticks;
}

export function compactUsd(value: number) {
  if (value >= 100) return `$${Math.round(value)}`;
  if (value >= 1) return `$${Number(value.toFixed(1))}`;
  return `$${Number(value.toPrecision(2))}`;
}

export function compactTokens(value: number) {
  return new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(
    value,
  );
}

export function monthYear(value: number | string) {
  const date = typeof value === 'number' ? new Date(value) : new Date(`${value}T00:00:00Z`);
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' });
}
