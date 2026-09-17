import { it, expect } from 'vitest';
import { mkdtemp, writeFile, mkdir, symlink, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { projectFiles } from '../shared/export';
import { DEMO } from '../src/lib/demo';
const run = promisify(execFile);
it('the downloadable full-stack example passes TypeScript and builds independently', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'artificials-export-'));
  for (const [name, content] of Object.entries(projectFiles(DEMO))) {
    const target = path.join(directory, name);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, content);
  }
  await symlink(path.resolve('node_modules'), path.join(directory, 'node_modules'), 'dir');
  const tsc = await run(
    process.execPath,
    [path.resolve('node_modules/typescript/bin/tsc'), '--noEmit', '-p', directory],
    { cwd: directory },
  ).catch((e) => {
    throw new Error(e.stdout + '\n' + e.stderr);
  });
  expect(tsc.stderr).toBe('');
  await run(process.execPath, [path.resolve('node_modules/vite/bin/vite.js'), 'build'], {
    cwd: directory,
  });
  expect(await readFile(path.join(directory, 'dist/index.html'), 'utf8')).toContain('assets/');
}, 30000);
