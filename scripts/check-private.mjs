import { readdir } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { basename, join } from 'node:path';
const isPrivate = (name) => basename(name).toLowerCase() === 'admin.md';
async function inspect(directory) {
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (error.code === 'ENOENT') return;
    throw error;
  }
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (isPrivate(path) || /^\.(env|dev\.vars)(\.|$)/.test(entry.name))
      throw new Error(`Private file cannot be published: ${path}`);
    if (entry.isDirectory()) await inspect(path);
  }
}
await inspect('public');
await inspect('dist');
let files = [];
try {
  files = execFileSync('git', ['ls-files', '-z'], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).split('\0');
} catch {
  /* Tarball builds may not contain Git metadata; upload directories are still checked. */
}
if (files.some(isPrivate))
  throw new Error('admin.md is tracked by Git. Remove it from the index before publishing.');
console.log(
  'Private guide and secret files are excluded from tracked files and upload directories.',
);
