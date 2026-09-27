/**
 * Keeps public/data/history.json: what changed from one data snapshot to the
 * next (listed prices, models joining the capability index, new top models on
 * each test). The refresh workflow runs it after fetching new snapshots; each
 * change is dated by the day it was seen.
 *
 *   node scripts/sync-history.mjs             add today's snapshot
 *   node scripts/sync-history.mjs --backfill  rebuild from every snapshot in git
 */
import { execFileSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { historyState, recordHistory } from '../shared/history.ts';
import { buildProfiles } from '../shared/model-profiles.ts';

const root = fileURLToPath(new URL('../', import.meta.url));
const target = resolve(root, 'public/data/history.json');
const git = (...args) =>
  execFileSync('git', args, {
    cwd: root,
    encoding: 'utf8',
    maxBuffer: 256 * 1024 * 1024,
    // An early snapshot without a file is expected; git's own message about it is noise.
    stdio: ['ignore', 'pipe', 'ignore'],
  });

/** The state of one snapshot: its catalog, benchmark results and research records. */
function stateOf(catalog, benchmarks, facts, day) {
  const { profiles, links } = buildProfiles(catalog, benchmarks, facts?.facts ?? []);
  return historyState(profiles, links, benchmarks, day);
}

let history;
let before;
if (process.argv.includes('--backfill')) {
  const commits = git(
    'log',
    '--reverse',
    '--format=%H %cI',
    '--',
    'public/data/catalog.json',
    'public/data/benchmarks.json',
  )
    .trim()
    .split('\n')
    .map((line) => line.split(' '));
  const at = (commit, path) => {
    try {
      return JSON.parse(git('show', `${commit}:${path}`));
    } catch {
      return undefined;
    }
  };
  let used = 0;
  for (const [commit, date] of commits) {
    const catalog = at(commit, 'public/data/catalog.json');
    const benchmarks = at(commit, 'public/data/benchmarks.json');
    if (!catalog?.models || !benchmarks?.categories) continue;
    try {
      const day = new Date(date).toISOString().slice(0, 10);
      history = recordHistory(
        history,
        stateOf(catalog, benchmarks, at(commit, 'public/data/model-facts.json'), day),
        day,
      );
      used += 1;
    } catch (error) {
      // Early snapshots in an older shape are skipped rather than guessed at.
      console.warn(`Skipped ${commit.slice(0, 7)}: ${error.message}`);
    }
  }
  console.log(`History rebuilt from ${used} of ${commits.length} snapshots.`);
} else {
  const read = async (name) =>
    JSON.parse(await readFile(resolve(root, 'public/data', name), 'utf8'));
  try {
    before = await readFile(target, 'utf8');
    history = JSON.parse(before);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  let facts;
  try {
    facts = await read('model-facts.json');
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  const catalog = await read('catalog.json');
  const benchmarks = await read('benchmarks.json');
  const day = new Date().toISOString().slice(0, 10);
  history = recordHistory(history, stateOf(catalog, benchmarks, facts, day), day);
}

// A snapshot that changes nothing but the day leaves the file alone, so the
// refresh has nothing to commit or deploy.
const previous = before && JSON.parse(before);
const unchanged =
  previous &&
  JSON.stringify(previous) ===
    JSON.stringify({ ...history, latest: { ...history.latest, day: previous.latest.day } });
if (!unchanged) await writeFile(target, JSON.stringify(history) + '\n');
const changed = Object.keys(history.prices).length;
console.log(
  `History since ${history.since}: ${changed} models with price changes, ${history.indexed.length} joined the index, ${history.leaders.length} new leaders.`,
);
