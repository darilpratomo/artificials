import { useState } from 'react';
import index from '../../shared/academy-index.json';
import { readLocal, writeLocal } from './storage';

export const academy = index;
export type LessonSummary = (typeof academy.lessons)[number];
export type AcademyModule = (typeof academy.modules)[number];
export type Lesson = LessonSummary & {
  objectives: string[];
  sections: { title: string; paragraphs: string[] }[];
  code: { filename: string; source: string; explanation: string };
  practice: { goal: string; steps: string[]; solution: string; expected: string };
  quiz: { question: string; options: string[]; answer: number; explanation: string };
};
const lessonFiles = import.meta.glob<Lesson>('../content/academy/lessons/*.json', {
  import: 'default',
});
export async function loadLesson(slug: string): Promise<Lesson | null> {
  if (!academy.lessons.some((lesson) => lesson.slug === slug)) return null;
  const loader = lessonFiles[`../content/academy/lessons/${slug}.json`];
  return loader ? loader() : null;
}
const progressKey = 'artificials-academy-progress-v1';
export function parseProgress(raw: string | null): string[] {
  try {
    const parsed: unknown = JSON.parse(raw || '[]');
    return Array.isArray(parsed)
      ? [
          ...new Set(
            parsed.filter(
              (slug): slug is string =>
                typeof slug === 'string' && academy.lessons.some((lesson) => lesson.slug === slug),
            ),
          ),
        ]
      : [];
  } catch {
    return [];
  }
}
export function useAcademyProgress() {
  const [completed, setCompleted] = useState(() => parseProgress(readLocal(progressKey)));
  function update(slug: string, done: boolean) {
    setCompleted((current) => {
      const next = done ? [...new Set([...current, slug])] : current.filter((id) => id !== slug);
      writeLocal(progressKey, JSON.stringify(next));
      return next;
    });
  }
  return { completed, update };
}
export const totalMinutes = academy.lessons.reduce((total, lesson) => total + lesson.minutes, 0);
export function learningTime(minutes: number) {
  const hours = Math.floor(minutes / 60);
  return hours ? `${hours}h${minutes % 60 ? ` ${minutes % 60}m` : ''}` : `${minutes} min`;
}
export const thresholdFixture = [
  { score: 0.95, actual: true },
  { score: 0.8, actual: false },
  { score: 0.65, actual: true },
  { score: 0.4, actual: false },
  { score: 0.3, actual: true },
  { score: 0.1, actual: false },
];
export function thresholdMetrics(threshold: number) {
  const tp = thresholdFixture.filter((row) => row.actual && row.score >= threshold).length;
  const fp = thresholdFixture.filter((row) => !row.actual && row.score >= threshold).length;
  const fn = thresholdFixture.filter((row) => row.actual && row.score < threshold).length;
  return { tp, fp, fn, precision: tp + fp ? tp / (tp + fp) : null, recall: tp / (tp + fn) };
}
