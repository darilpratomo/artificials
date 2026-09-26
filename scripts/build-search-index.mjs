/**
 * Writes public/data/models/search.json: the pages, guides, lessons and tools
 * the site search finds (shared/search.ts). It runs after the profile build,
 * which replaces that folder, in both `npm run dev` and `npm run build`.
 */
import { writeFile } from 'node:fs/promises';
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
  const index = searchIndex();
  await writeFile(resolve(root, 'public/data/models/search.json'), JSON.stringify(index) + '\n');
  const count = (kind) => index.entries.filter(([entry]) => entry === kind).length;
  console.log(
    `Search index: ${count('page')} pages, ${count('guide')} guides, ${count('lesson')} lessons and ${count('tool')} tools.`,
  );
} finally {
  await server.close();
}
