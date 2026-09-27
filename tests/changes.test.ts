import { describe, expect, it } from 'vitest';
import { buildChanges, type ChangeEvent } from '../shared/changes';
import type { History } from '../shared/history';
import type { OverviewTests, Timeline } from '../shared/model-overview';
import type { ModelProfile } from '../shared/model-profiles';

const profile = (slug: string, name: string, maker: string, makerId: string) =>
  ({ slug, name, maker, makerId }) as unknown as ModelProfile;
const profiles = [
  profile('alpha', 'Alpha', 'OpenAI', 'openai'),
  profile('beta', 'Beta', 'DeepSeek', 'deepseek'),
];

const release = (slug: string, date: string, notable = true) => ({
  slug,
  name: slug,
  makerId: 'openai',
  maker: 'OpenAI',
  date,
  notable,
});
const timeline = {
  version: 1,
  updatedAt: '2026-09-26T00:00:00Z',
  entries: [
    release('fresh', '2026-09-25'),
    release('quiet', '2026-09-24', false),
    release('old', '2026-08-01'),
  ],
} as unknown as Timeline;

const tests = {
  version: 1,
  checkedAt: '2026-09-26T00:00:00Z',
  tests: [
    { id: 'coding', label: 'Coding', sourceId: 'livebench', unit: 'percent', rows: [] },
    { id: 'capability-index', label: 'Capability index', sourceId: 'epoch', unit: 'index' },
  ],
} as unknown as OverviewTests;

const source = (id: string) => ({
  id,
  name: id,
  url: `https://${id}.example`,
  license: 'CC BY 4.0',
  licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
  checkedAt: '2026-09-26T00:00:00Z',
});

const history: History = {
  version: 1,
  since: '2026-09-17',
  prices: {
    alpha: [
      ['2026-09-17', 10, 40],
      ['2026-09-20', 8, 32],
    ],
    gone: [
      ['2026-09-17', 1, 2],
      ['2026-09-20', 2, 4],
    ],
  },
  indexed: [['2026-09-22', 'beta', 151]],
  leaders: [
    {
      day: '2026-09-23',
      test: 'coding',
      slug: 'beta',
      name: 'Beta',
      makerId: 'deepseek',
      score: 81.5,
      previous: { name: 'alpha-max', makerId: 'openai', score: 80 },
    },
    // A new leader whose lead is inside its published range.
    {
      day: '2026-09-24',
      test: 'capability-index',
      slug: 'alpha',
      name: 'Alpha',
      makerId: 'openai',
      score: 160,
      ciLow: 157,
      ciHigh: 163,
      next: 158,
      previous: { slug: 'beta', name: 'Beta', makerId: 'deepseek', score: 159 },
    },
    // A test the site no longer shows is left out.
    {
      day: '2026-09-23',
      test: 'retired',
      name: 'Beta',
      makerId: 'deepseek',
      score: 90,
      previous: { name: 'Alpha', makerId: 'openai', score: 88 },
    },
  ],
  latest: { prices: {}, index: {}, leaders: {}, day: '2026-09-26' },
};

describe('what changed', () => {
  const changes = buildChanges({
    history,
    profiles,
    timeline,
    tests,
    sources: [source('livebench'), source('epoch'), source('arena')],
    until: '2026-09-26',
  });

  it('covers the last 30 days up to the data’s own day', () => {
    expect(changes).toMatchObject({ since: '2026-08-28', until: '2026-09-26' });
  });

  it('lists notable releases, price changes, new leaders and index entries, newest first', () => {
    expect(changes.events.map((event) => [event.day, event.kind, event.model.name])).toEqual([
      ['2026-09-25', 'release', 'fresh'],
      ['2026-09-24', 'leader', 'Alpha'],
      ['2026-09-23', 'leader', 'Beta'],
      ['2026-09-22', 'index', 'Beta'],
      ['2026-09-20', 'price', 'Alpha'],
    ]);
  });

  it('keeps each change’s detail, and names models without a profile as their test did', () => {
    expect(changes.events.find((event) => event.kind === 'price')).toMatchObject({
      model: { slug: 'alpha', maker: 'OpenAI' },
      from: [10, 40],
      to: [8, 32],
    });
    expect(
      changes.events.find((event) => event.kind === 'leader' && event.test === 'coding'),
    ).toMatchObject({
      test: 'coding',
      label: 'Coding',
      unit: 'percent',
      score: 81.5,
      model: { slug: 'beta', name: 'Beta', maker: 'DeepSeek' },
      previous: { name: 'alpha-max', maker: '', makerId: 'openai' },
    });
  });

  it('marks a new leader whose lead is inside its published range', () => {
    const leaders = changes.events.filter(
      (event): event is Extract<ChangeEvent, { kind: 'leader' }> => event.kind === 'leader',
    );
    expect(leaders.map((event) => [event.model.name, event.withinMargin ?? false])).toEqual([
      ['Alpha', true],
      ['Beta', false],
    ]);
  });

  it('credits only the sources behind the changes, without the time they were fetched', () => {
    expect(changes.sources).toEqual([
      {
        id: 'livebench',
        name: 'livebench',
        url: 'https://livebench.example',
        license: 'CC BY 4.0',
        licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
      },
      expect.objectContaining({ id: 'epoch' }),
    ]);
    expect(JSON.stringify(changes)).not.toContain('checkedAt');
  });

  it('still lists releases before any history is kept', () => {
    const early = buildChanges({ profiles, timeline, tests, sources: [], until: '2026-09-26' });
    expect(early.events.map((event) => event.kind)).toEqual(['release']);
    expect(early.sources).toEqual([]);
  });
});
