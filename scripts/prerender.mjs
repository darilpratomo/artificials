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
  // Each page's own code downloads alongside the main bundle, so the app takes over
  // the prerendered page as soon as it runs. Mirrors `pageAt` in src/main.tsx.
  const pageFiles = {
    leaders: 'Leaders',
    'score-price-time': 'ScorePriceTime',
    market: 'Market',
    leaderboard: 'Leaderboard',
    releases: 'Releases',
    compare: 'Compare',
    news: 'Learn',
    tools: 'Tools',
    studio: 'Studio',
    pricing: 'Pricing',
    about: 'Info',
    privacy: 'Info',
    terms: 'Info',
    contact: 'Info',
  };
  const pagePreloads = (path) => {
    const [first = '', second] = path.split('/').slice(1);
    const name =
      first === 'models'
        ? second
          ? 'ModelProfile'
          : 'Models'
        : first === 'learn'
          ? second
            ? 'AcademyLesson'
            : 'Academy'
          : Object.hasOwn(pageFiles, first)
            ? pageFiles[first]
            : undefined;
    const files = new Set();
    const visit = (key) => {
      const chunk = manifest[key];
      if (!chunk || files.has(chunk.file)) return;
      files.add(chunk.file);
      (chunk.imports || []).forEach(visit);
    };
    if (name) visit(`src/pages/${name}.tsx`);
    return [...files]
      .filter((file) => !template.includes(file))
      .map((file) => `<link rel="modulepreload" crossorigin href="/${file}">`)
      .join('');
  };
  // The home and models pages render their leaders and releases into the HTML and
  // carry the same data inline, so the browser shows it without another request.
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
    const withData = path === '/' || path === '/models';
    const html = template
      .replace(
        '</head>',
        metadataHtml(pageMetadata(path)) + styles + pagePreloads(path) + '</head>',
      )
      .replace(
        '<div id="root"></div>',
        `<div id="root">${renderPage(path, lesson, withData ? overview : undefined)}</div>${
          withData ? inline : ''
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
