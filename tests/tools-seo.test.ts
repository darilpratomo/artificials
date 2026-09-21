import { describe, expect, it } from 'vitest';
import { pageMetadata, publicPages } from '../shared/seo';
import { UTILITIES } from '../shared/utilities';

describe('tool discoverability', () => {
  it('lists every utility in the sitemap exactly once', () => {
    const paths = publicPages([]).map((page) => page.path);
    for (const tool of UTILITIES) {
      expect(paths.filter((path) => path === `/tools/${tool.id}`)).toHaveLength(1);
    }
    expect(paths).toContain('/tools');
  });

  it('gives each utility an indexable page with a unique title', () => {
    const titles = new Set<string>();
    for (const tool of UTILITIES) {
      const meta = pageMetadata(`/tools/${tool.id}`, []);
      expect(meta.known).toBe(true);
      expect(meta.robots).toMatch(/^index,follow/);
      expect(meta.canonical).toBe(`https://artificials.net/tools/${tool.id}`);
      expect(titles.has(meta.title)).toBe(false);
      titles.add(meta.title);
    }
    expect(titles.size).toBe(UTILITIES.length);
  });

  it('keeps utility ids URL-safe and descriptions non-empty', () => {
    for (const tool of UTILITIES) {
      expect(tool.id).toMatch(/^[a-z][a-z0-9-]*$/);
      expect(tool.title.length).toBeGreaterThan(3);
      expect(tool.description.length).toBeGreaterThan(20);
      expect(tool.note.length).toBeGreaterThan(40);
      expect(['Images', 'PDF', 'Documents']).toContain(tool.category);
    }
  });
});
