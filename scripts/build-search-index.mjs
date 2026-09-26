/**
 * Writes public/data/models/search.json: the makers, pages, guides, lessons and
 * tools the site search finds (shared/search.ts). It runs after the profile build,
 * which replaces that folder, in both `npm run dev` and `npm run build`.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const root = fileURLToPath(new URL('../', import.meta.url));
// Vite loads the site's own modules, whose imports Node alone cannot resolve.
const server = await createServer({
  root,
  logLevel: 'error',
  server: { middlewareMode: true },
  appType: 'custom',
});
try {
  const { searchIndex } = await server.ssrLoadModule('/shared/search.ts');
  // The makers come from the profile build, which runs first.
  const makers = JSON.parse(
    await readFile(resolve(root, 'public/data/models/makers.json'), 'utf8'),
  ).makers;
  const index = searchIndex(makers);
  await writeFile(resolve(root, 'public/data/models/search.json'), JSON.stringify(index) + '\n');
  const count = (kind) => index.entries.filter(([entry]) => entry === kind).length;
  console.log(
    `Search index: ${count('maker')} makers, ${count('page')} pages, ${count('guide')} guides, ${count('lesson')} lessons and ${count('tool')} tools.`,
  );
} finally {
  await server.close();
}
