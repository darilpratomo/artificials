import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { academy, parseProgress, thresholdMetrics, type Lesson } from '../src/lib/academy';

describe('academy curriculum integrity', () => {
  it('has one complete, original lesson for each curriculum entry and valid navigation metadata', () => {
    const files = readdirSync('src/content/academy/lessons');
    expect(files.length).toBe(academy.lessons.length);
    expect(new Set(academy.lessons.map((lesson) => lesson.slug)).size).toBe(files.length);
    for (const summary of academy.lessons) {
      const lesson = JSON.parse(
        readFileSync(`src/content/academy/lessons/${summary.slug}.json`, 'utf8'),
      ) as Lesson;
      expect(lesson).toMatchObject(summary);
      expect(academy.modules.some((module) => module.id === summary.module)).toBe(true);
      expect(lesson.sections.length).toBeGreaterThanOrEqual(2);
      expect(lesson.sections.every((section) => section.paragraphs.length >= 2)).toBe(true);
      expect(lesson.code.source.length).toBeGreaterThan(150);
      expect(lesson.practice.steps.length).toBeGreaterThanOrEqual(3);
      expect(lesson.quiz.options[lesson.quiz.answer]).toBeTruthy();
      expect(new Set(lesson.quiz.options).size).toBe(lesson.quiz.options.length);
      expect(lesson.code.filename).toBe(`${summary.slug}.py`);
    }
  });
  it('recovers safely from corrupt or stale local progress', () => {
    const slug = academy.lessons[0].slug;
    expect(parseProgress(null)).toEqual([]);
    expect(parseProgress('bad json')).toEqual([]);
    expect(parseProgress('{"constructor":"bad"}')).toEqual([]);
    expect(parseProgress(JSON.stringify([slug, slug, 'deleted-lesson', 7, null]))).toEqual([slug]);
  });
  it('computes threshold outcomes including undefined precision and boundary equality', () => {
    expect(thresholdMetrics(0.5)).toEqual({ tp: 2, fp: 1, fn: 1, precision: 2 / 3, recall: 2 / 3 });
    expect(thresholdMetrics(1)).toEqual({ tp: 0, fp: 0, fn: 3, precision: null, recall: 0 });
    expect(thresholdMetrics(0.3)).toEqual({ tp: 3, fp: 2, fn: 0, precision: 0.6, recall: 1 });
  });
});
