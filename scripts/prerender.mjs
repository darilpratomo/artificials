import { createServer } from 'vite';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
try {
  const { renderPage } = await server.ssrLoadModule('/src/prerender.tsx');
  const { publicPages, pageMetadata, metadataHtml } = await server.ssrLoadModule('/shared/seo.ts');
  const template = (await readFile('dist/index.html', 'utf8'))
    .replace(/<title>.*?<\/title>/s, '')
    .replace(/<meta name="description"[^>]*>/, '');
  const manifest = JSON.parse(await readFile('dist/.vite/manifest.json', 'utf8'));
  const styles = [...new Set(Object.values(manifest).flatMap((entry) => entry.css || []))]
    .filter((file) => !template.includes(file))
    .map((file) => `<link rel="stylesheet" href="/${file}">`)
    .join('');
  await writeFile('dist/app-shell.html', template);
  // The home page renders its leaders and releases into the HTML and carries the
  // same data inline, so the browser shows it without another request.
  const overviewText = await readFile('dist/data/models/overview.json', 'utf8');
  const overview = JSON.parse(overviewText);
  const inline = `<script type="application/json" id="overview-data">${overviewText
    .trim()
    .replace(/</g, '\\u003c')}</script>`;
  for (const { path } of publicPages()) {
    const lesson = path.startsWith('/learn/')
      ? JSON.parse(
          await readFile(`src/content/academy/lessons/${path.split('/').pop()}.json`, 'utf8'),
        )
      : undefined;
    const home = path === '/';
    const html = template
      .replace('</head>', metadataHtml(pageMetadata(path)) + styles + '</head>')
      .replace(
        '<div id="root"></div>',
        `<div id="root">${renderPage(path, lesson, home ? overview : undefined)}</div>${
          home ? inline : ''
        }`,
      );
    const destination = path === '/' ? 'dist/index.html' : `dist${path}.html`;
    await mkdir(dirname(destination), { recursive: true });
    await writeFile(destination, html);
  }
  for (const route of ['login', 'dashboard', 'checkout', '404'])
    await writeFile(
      `dist/${route}.html`,
      template.replace('</head>', metadataHtml(pageMetadata('/' + route)) + '</head>'),
    );
  console.log(
    `Prerendered ${publicPages().length} public pages with unique metadata and crawlable HTML.`,
  );
} finally {
  await server.close();
}
