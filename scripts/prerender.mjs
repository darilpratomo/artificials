import { createServer } from 'vite';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { price, score } from '../shared/format.ts';

const xml = (value) =>
  value.replace(
    /[&<>"']/g,
    (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[char],
  );
/** One RSS item per change, in the page's words, newest first. */
function changesFeed(changes) {
  const site = 'https://artificials.net';
  const items = changes.events.slice(0, 100).map((event) => {
    const { name, slug, maker } = event.model;
    const link = site + (slug ? `/models/${slug}` : '/changes');
    const title =
      event.kind === 'release'
        ? `${name} was released${maker ? ` by ${maker}` : ''}`
        : event.kind === 'leader'
          ? `${name} took the top spot on ${event.label} at ${score(event.score, event.unit)}, from ${event.previous.name}`
          : event.kind === 'index'
            ? `${name} joined the capability index at ${score(event.score, 'index')}`
            : `${maker ? `${maker}’s` : 'The'} listed price for ${name} went from ${price(event.from[0])} in and ${price(event.from[1])} out to ${price(event.to[0])} in and ${price(event.to[1])} out per 1M tokens`;
    return `<item><title>${xml(title)}</title><link>${xml(link)}</link><guid isPermaLink="false">${xml(`${event.kind}:${event.day}:${slug ?? name}${event.kind === 'leader' ? `:${event.test}` : ''}`)}</guid><pubDate>${new Date(`${event.day}T00:00:00Z`).toUTCString()}</pubDate></item>`;
  });
  return `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"><channel><title>What changed in AI models — Artificials</title><link>${site}/changes</link><atom:link href="${site}/changes.xml" rel="self" type="application/rss+xml"/><description>New AI model releases, listed price changes, new leaders on each benchmark and models joining the capability index.</description><language>en</language>${items.join('')}</channel></rss>\n`;
}

const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
try {
  const { renderPage } = await server.ssrLoadModule('/src/prerender.tsx');
  const {
    publicPages,
    pageMetadata,
    metadataHtml,
    comparisonMetadata,
    makerMetadata,
    testMetadata,
  } = await server.ssrLoadModule('/shared/seo.ts');
  const { comparisonPath } = await server.ssrLoadModule('/shared/compare.ts');
  const { profileBucket } = await server.ssrLoadModule('/shared/model-profiles.ts');
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
    'coding-agents': 'CodingAgents',
    trends: 'Trends',
    'image-models': 'ImageModels',
    'video-models': 'VideoModels',
    'model-finder': 'ModelFinder',
    leaders: 'Leaders',
    'score-price-time': 'ScorePriceTime',
    market: 'Market',
    leaderboard: 'Leaderboard',
    releases: 'Releases',
    changes: 'Changes',
    makers: 'Makers',
    tests: 'Tests',
    compare: 'Compare',
    news: 'Learn',
    tools: 'Tools',
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
  // The coding agents page does the same with its own data.
  const codingText = await readFile('dist/data/models/coding.json', 'utf8');
  const coding = JSON.parse(codingText);
  const codingInline = `<script type="application/json" id="coding-data">${codingText
    .trim()
    .replace(/</g, '\\u003c')}</script>`;
  const trendsText = await readFile('dist/data/models/trends.json', 'utf8');
  const trends = JSON.parse(trendsText);
  const trendsInline = `<script type="application/json" id="trends-data">${trendsText
    .trim()
    .replace(/</g, '\\u003c')}</script>`;
  const imagesText = await readFile('dist/data/models/images.json', 'utf8');
  const images = JSON.parse(imagesText);
  const imagesInline = `<script type="application/json" id="images-data">${imagesText
    .trim()
    .replace(/</g, '\\u003c')}</script>`;
  const videosText = await readFile('dist/data/models/videos.json', 'utf8');
  const videos = JSON.parse(videosText);
  const videosInline = `<script type="application/json" id="videos-data">${videosText
    .trim()
    .replace(/</g, '\\u003c')}</script>`;
  const finderText = await readFile('dist/data/models/finder.json', 'utf8');
  const finder = JSON.parse(finderText);
  const finderInline = `<script type="application/json" id="finder-data">${finderText
    .trim()
    .replace(/</g, '\\u003c')}</script>`;
  const changesText = await readFile('dist/data/models/changes.json', 'utf8');
  const changes = JSON.parse(changesText);
  const changesInline = `<script type="application/json" id="changes-data">${changesText
    .trim()
    .replace(/</g, '\\u003c')}</script>`;
  const makersText = await readFile('dist/data/models/makers.json', 'utf8');
  const makers = JSON.parse(makersText);
  const makersInline = `<script type="application/json" id="makers-data">${makersText
    .trim()
    .replace(/</g, '\\u003c')}</script>`;
  const testsText = await readFile('dist/data/models/test-pages.json', 'utf8');
  const testList = JSON.parse(testsText);
  const testsInline = `<script type="application/json" id="tests-data">${testsText
    .trim()
    .replace(/</g, '\\u003c')}</script>`;
  const comparisonsText = await readFile('dist/data/models/comparisons.json', 'utf8');
  const comparisons = JSON.parse(comparisonsText);
  const comparisonsInline = `<script type="application/json" id="comparisons-data">${comparisonsText
    .trim()
    .replace(/</g, '\\u003c')}</script>`;
  for (const { path } of publicPages()) {
    const lesson = path.startsWith('/learn/')
      ? JSON.parse(
          await readFile(`src/content/academy/lessons/${path.split('/').pop()}.json`, 'utf8'),
        )
      : undefined;
    const withData = path === '/' || path === '/models';
    const withCoding = path === '/coding-agents';
    const withTrends = path === '/trends';
    const withImages = path === '/image-models';
    const withVideos = path === '/video-models';
    const withFinder = path === '/model-finder';
    const withComparisons = path === '/compare';
    const withChanges = path === '/changes';
    const withMakers = path === '/makers';
    const withTests = path === '/tests';
    const html = template
      .replace(
        '</head>',
        metadataHtml(pageMetadata(path)) + styles + pagePreloads(path) + '</head>',
      )
      .replace(
        '<div id="root"></div>',
        `<div id="root">${renderPage(path, {
          lesson,
          overview: withData ? overview : undefined,
          coding: withCoding ? coding : undefined,
          trends: withTrends ? trends : undefined,
          images: withImages ? images : undefined,
          videos: withVideos ? videos : undefined,
          finder: withFinder ? finder : undefined,
          comparisons: withComparisons ? comparisons : undefined,
          changes: withChanges ? changes : undefined,
          makers: withMakers ? makers : undefined,
          testList: withTests ? testList : undefined,
        })}</div>${withData ? inline : ''}${withCoding ? codingInline : ''}${
          withTrends ? trendsInline : ''
        }${withImages ? imagesInline : ''}${withVideos ? videosInline : ''}${
          withFinder ? finderInline : ''
        }${withComparisons ? comparisonsInline : ''}${withChanges ? changesInline : ''}${
          withMakers ? makersInline : ''
        }${withTests ? testsInline : ''}`,
      );
    const destination = path === '/' ? 'dist/index.html' : `dist${path}.html`;
    await mkdir(dirname(destination), { recursive: true });
    await writeFile(destination, html);
  }
  // Featured comparisons: each at its canonical address, with both profiles inline so
  // the page shows at once and search engines read the whole comparison.
  const buckets = new Map();
  const profileOf = async (slug) => {
    const index = profileBucket(slug);
    if (!buckets.has(index))
      buckets.set(index, JSON.parse(await readFile(`dist/data/models/${index}.json`, 'utf8')));
    const bucket = buckets.get(index);
    const profile = bucket.profiles.find((entry) => entry.slug === slug);
    if (!profile) throw Error(`A featured comparison names ${slug}, which has no profile.`);
    return { profile, sources: bucket.sources };
  };
  for (const { slugs } of comparisons.featured) {
    const path = comparisonPath(slugs);
    const found = await Promise.all(slugs.map(profileOf));
    const comparison = {
      version: 1,
      profiles: found.map(({ profile }) => profile),
      sources: [
        ...new Map(
          found.flatMap(({ sources }) => sources).map((source) => [source.id, source]),
        ).values(),
      ],
    };
    const meta = comparisonMetadata(
      comparison.profiles.map(({ slug, name, maker }) => ({ slug, name, maker })),
      slugs,
      true,
    );
    const html = template
      .replace('</head>', metadataHtml(meta) + styles + pagePreloads(path) + '</head>')
      .replace(
        '<div id="root"></div>',
        `<div id="root">${renderPage(path, { comparison })}</div><script type="application/json" id="compare-data">${JSON.stringify(
          comparison,
        ).replace(/</g, '\\u003c')}</script>`,
      );
    await mkdir(dirname(`dist${path}.html`), { recursive: true });
    await writeFile(`dist${path}.html`, html);
  }
  // Each maker's page, with its own data and the list of makers inline.
  for (const { slug } of makers.makers) {
    const path = `/makers/${slug}`;
    const text = await readFile(`dist/data/models/makers/${slug}.json`, 'utf8');
    const maker = JSON.parse(text);
    const html = template
      .replace(
        '</head>',
        metadataHtml(makerMetadata(maker)) + styles + pagePreloads(path) + '</head>',
      )
      .replace(
        '<div id="root"></div>',
        `<div id="root">${renderPage(path, { makers, maker })}</div>${makersInline}<script type="application/json" id="maker-data">${text
          .trim()
          .replace(/</g, '\\u003c')}</script>`,
      );
    await mkdir(dirname(`dist${path}.html`), { recursive: true });
    await writeFile(`dist${path}.html`, html);
  }
  // Each test's page, with its own results and the list of tests inline.
  for (const { id } of testList.tests) {
    const path = `/tests/${id}`;
    const text = await readFile(`dist/data/models/test-pages/${id}.json`, 'utf8');
    const test = JSON.parse(text);
    const html = template
      .replace(
        '</head>',
        metadataHtml(testMetadata(test)) + styles + pagePreloads(path) + '</head>',
      )
      .replace(
        '<div id="root"></div>',
        `<div id="root">${renderPage(path, { testList, test })}</div>${testsInline}<script type="application/json" id="test-data">${text
          .trim()
          .replace(/</g, '\\u003c')}</script>`,
      );
    await mkdir(dirname(`dist${path}.html`), { recursive: true });
    await writeFile(`dist${path}.html`, html);
  }
  // The "What changed" feed, from the same events as the page.
  await writeFile('dist/changes.xml', changesFeed(changes));
  for (const route of ['login', 'dashboard', '404'])
    await writeFile(
      `dist/${route}.html`,
      template.replace('</head>', metadataHtml(pageMetadata('/' + route)) + '</head>'),
    );
  console.log(
    `Prerendered ${publicPages().length} public pages, ${comparisons.featured.length} featured comparisons, ${makers.makers.length} maker pages and ${testList.tests.length} test pages with unique metadata and crawlable HTML.`,
  );
} finally {
  await server.close();
}
