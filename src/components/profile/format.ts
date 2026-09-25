import {
  Braces,
  Brain,
  Code2,
  Database,
  Image as ImageIcon,
  Languages,
  Library,
  Sigma,
  Sparkles,
  Workflow,
  type LucideIcon,
} from 'lucide-react';
import type { BenchmarkDomain } from '../../../shared/benchmarks';

/** Plain-language labels and a fixed colour per skill area. Colour follows the area, never the rank. */
export const DOMAINS: Record<
  BenchmarkDomain,
  { label: string; plain: string; icon: LucideIcon; token: string }
> = {
  overall: {
    label: 'Overall',
    plain: 'General ability across many kinds of tasks',
    icon: Sparkles,
    token: 'overall',
  },
  coding: { label: 'Coding', plain: 'Writing and fixing code', icon: Code2, token: 'coding' },
  math: { label: 'Math', plain: 'Solving math problems step by step', icon: Sigma, token: 'math' },
  knowledge: {
    label: 'Knowledge',
    plain: 'Recalling facts accurately',
    icon: Library,
    token: 'knowledge',
  },
  agentic: {
    label: 'Agents',
    plain: 'Finishing multi-step coding tasks on its own',
    icon: Workflow,
    token: 'agentic',
  },
  language: {
    label: 'Language',
    plain: 'Understanding text and following instructions',
    icon: Languages,
    token: 'language',
  },
  data: {
    label: 'Data analysis',
    plain: 'Working with tables and structured data',
    icon: Database,
    token: 'data',
  },
  reasoning: {
    label: 'Reasoning',
    plain: 'Thinking through hard science and logic problems',
    icon: Brain,
    token: 'reasoning',
  },
  image: {
    label: 'Image generation',
    plain: 'Creating images that follow a prompt',
    icon: ImageIcon,
    token: 'image',
  },
};
export const STRUCTURED_ICON = Braces;

/** Rules of thumb for English text; labelled as approximate wherever shown. */
export const WORDS_PER_TOKEN = 0.75;
export const WORDS_PER_PAGE = 500;

export function money(value: number | null | undefined) {
  if (value === null || value === undefined) return 'Not reported';
  if (value === 0) return 'Free';
  const digits = value >= 1 ? 2 : value >= 0.1 ? 3 : 4;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: value >= 1 ? 2 : 0,
    maximumFractionDigits: digits,
  }).format(value);
}

/** A list price with at least cents shown: $0.20, $0.175, $0.0875, $15.00. */
export function price(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: value >= 1 ? 2 : value >= 0.1 ? 3 : 4,
  }).format(value);
}

/** Costs from the calculator can be fractions of a cent. */
export function cost(value: number) {
  if (value === 0) return '$0';
  if (value < 0.01) return '< $0.01';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: value >= 100 ? 0 : 2,
  }).format(value);
}

export function tokens(value: number | null | undefined) {
  if (value === null || value === undefined) return 'Not reported';
  return new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(
    value,
  );
}

export function whole(value: number) {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(value);
}

export function approxWords(tokenCount: number) {
  return whole(Math.round((tokenCount * WORDS_PER_TOKEN) / 10) * 10);
}

export function approxPages(tokenCount: number) {
  const pages = (tokenCount * WORDS_PER_TOKEN) / WORDS_PER_PAGE;
  return pages < 1
    ? 'less than a page'
    : `${whole(pages)} ${Math.round(pages) === 1 ? 'page' : 'pages'}`;
}

export function day(value: string | null | undefined) {
  if (!value) return 'Not reported';
  const month = value.length === 7;
  const date = new Date(`${month ? value + '-01' : value}T00:00:00Z`);
  if (!Number.isFinite(date.getTime())) return 'Not reported';
  return date.toLocaleDateString('en-US', {
    month: 'short',
    ...(month ? {} : { day: 'numeric' }),
    year: 'numeric',
    timeZone: 'UTC',
  });
}

/**
 * Open-ended scores: ratings in the hundreds and thousands, such as Arena's,
 * read as whole numbers, the way their sources show them; a small index, such
 * as the capability index, keeps one decimal.
 */
export function indexValue(value: number) {
  return Math.abs(value) >= 500 ? `${Math.round(value)}` : value.toFixed(1);
}

export function score(value: number, unit: 'percent' | 'index') {
  return unit === 'index' ? indexValue(value) : `${value.toFixed(1)}%`;
}

/** 100 for first place, 0 for last. A single entry counts as first. */
export function standing(rank: number, total: number) {
  return total <= 1 ? 100 : Math.round(((total - rank) / (total - 1)) * 100);
}

export function rankLabel(rank: number, total: number) {
  if (rank === 1) return `#1 of ${whole(total)}`;
  const top = Math.max(1, Math.ceil((rank / total) * 100));
  return top <= 50 ? `Top ${top}%` : `#${whole(rank)} of ${whole(total)}`;
}

export function modalityList(values: string[]) {
  const names: Record<string, string> = {
    text: 'text',
    image: 'images',
    pdf: 'PDFs',
    audio: 'audio',
    video: 'video',
    file: 'files',
  };
  const words = values.map((value) => names[value] ?? value);
  if (words.length <= 1) return words.join('');
  return `${words.slice(0, -1).join(', ')} and ${words.at(-1)}`;
}
