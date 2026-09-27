# Search visibility

Public sitemap: https://artificials.net/sitemap.xml. Crawler rules: https://artificials.net/robots.txt.

The build prerenders 91 current public pages (12 main pages, the Tools directory and 15 utility pages, 27 original editorial guides and 36 Academy lessons) using the same React page components as the browser. Titles, descriptions, canonical URLs, Open Graph/Twitter metadata and supported structured data are present in the initial HTML. Article text and complete Academy lesson content do not require JavaScript to be discovered. Interactive model catalog results and benchmark data still load through their APIs; their static page headings and explanatory content are prerendered.

`shared/seo.ts` is the public route/metadata registry. `scripts/prerender.mjs` writes flat HTML files into `dist` after Vite builds; Cloudflare resolves extensionless URLs to these files. Changes to repository content are published by the normal main-branch build. Rendered pages are ordinary static assets: no browser install, Python runtime or per-request React render is needed in Cloudflare Builds/Workers. The React client mounts the interactive application over this initial HTML.

`/changes.xml` is an RSS 2.0 feed of the "What changed" page, announced to feed readers by a `rel="alternate"` link in every page's head. Each item is dated by the day the change was seen; the feed carries no build or retrieval time.

The sitemap includes every maker page (`/makers/:slug`) and test page (`/tests/:id`), the featured model comparisons (`/compare/a-vs-b`, canonical in alphabetical order), contact, editorial pages, Academy lessons, `/tools` and each utility page defined in `shared/utilities.ts`. Article/lesson lastmod values come from editorial update dates, never the current deployment time. Account, checkout and private CMS URLs are omitted and carry noindex where served. Account routes remain crawlable so crawlers can read noindex; robots.txt is not access control. Unknown URLs return a real HTTP 404 through Cloudflare's custom 404 handling, with a noindex page. Canonicals discard UI filter/query parameters, avoiding a separate search listing for every combination of filters.

When Supabase CMS is configured, the published article query controls the news index, article HTML and sitemap; unpublished/deleted articles return 404. This currently follows the same latest-100-articles scope as the public articles API. Increase/paginate both together before exceeding that editorial volume. A database failure returns an error instead of silently publishing stale drafts. HTML and JSON-LD escape CMS text. The CMS stays behind its path token, authentication, MFA and authorization controls.

## Link previews

Shared links show a 1200 × 630 PNG card drawn at build time by `scripts/build-og-images.mjs`
(drawing in `scripts/lib/og.ts`, with `@napi-rs/canvas`, the site's Inter and Michroma fonts and
the maker logos in `public/providers`). Every card credits the data it shows, as the licences
require, and none states a date.

- `/og/default.png`: the headline and the top five on the capability index. Every page without
  a card of its own uses it; articles keep their cover images.
- `/og/models/{slug}.png`: one per model with test results (the directory's `hasResults`),
  with its headline result, reference price and context window. Other models use the default.
- `/og/compare/{a}-vs-{b}.png`: one per featured comparison, in canonical order, also used when
  the same models are linked in the other order. `/og/compare.png` serves `/compare` and every
  other comparison.
- `/og/makers/{slug}.png`: one per maker page, with its best model on the capability index, its
  open-weights models and its newest release, figures from Epoch AI and models.dev only, so the
  card credits both in full. `/og/makers.png` serves `/makers`.
- `/og/tests/{id}.png`: one per test page, with its skill area in the site's skill-area colour,
  its publisher and what it measures, beside its top five; the card credits the one publisher.
  `/og/tests.png` serves `/tests`, with the top score on each skill area's main test.

`shared/seo.ts` picks the card by the same rules the build draws them, so no manifest is
needed. Cards on `/og/` carry `og:image:width`, `og:image:height` and `og:image:type`; every
page also has `og:image:alt` and `twitter:image:alt`. Drawing all of them takes about ten
seconds. The data refresh skips it (`SKIP_OG_IMAGES=1`), and Workers Builds draws them on every
deploy. Platforms cache previews for days, so a shared card can show figures from when it was
first fetched.

## Owner setup in Google and Bing

1. Add a Domain property for `artificials.net` in [Google Search Console](https://search.google.com/search-console).
2. Copy its verification TXT record to Cloudflare DNS and complete verification. Do not change existing mail or website records.
3. In Sitemaps, submit `https://artificials.net/sitemap.xml`.
4. Inspect the home page, an article and an Academy lesson with URL Inspection / Test live URL. Check the rendered HTML and request indexing if needed.
5. Review Page indexing and Core Web Vitals after Google has collected enough data. Treat field metrics separately from local browser tests.
6. Add the site and sitemap in [Bing Webmaster Tools](https://www.bing.com/webmasters/), or import the verified Search Console property.

No Search Console/Bing account has been used by this implementation. Submission status, indexed-page counts, actual rankings and field Core Web Vitals remain unverified. A valid sitemap and technical SEO improve discoverability but do not guarantee indexing, ranking or rich results. Continue publishing useful original content and maintaining accurate source-backed data.

Primary guidance: [Google JavaScript SEO](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics), [Google sitemap overview](https://developers.google.com/search/docs/crawling-indexing/sitemaps/overview), [Cloudflare HTML handling](https://developers.cloudflare.com/workers/static-assets/routing/advanced/html-handling/).

## Google Analytics

GA4 measurement ID: `G-YR7B1XDDLM` (public identifier, not a secret). A single deferred, self-hosted `/google-tag.js` bootstrap is included in the head of every generated page. It loads Google's asynchronous tag only after analytics consent and only on the production hostname. Unknown/private/account URLs do not initialize analytics. Public page views are dispatched manually on path changes; query strings, fragments and private referrers are omitted. The initial external referrer is deliberately omitted. Advertising consent remains denied; Google signals and ad personalization are disabled.

**Keep Enhanced measurement disabled** in GA4 → Admin → Data streams → Artificials. The owner confirmed disabling it on 19 September 2026. This avoids duplicate automatic history page views and unrequested form/search tracking. Do not install another GA tag through Tag Manager or Cloudflare.

The footer and privacy page offer Analytics preferences. Declining prevents loading Google; withdrawing disables further measurement and removes first-party `_ga` cookies. Choices persist in local storage. A missing consent choice is treated as denied for collection. This is basic consent mode: no Google network request is made before opt-in. Local development and preview hosts do not send production measurements.

To verify: open https://artificials.net in a fresh browser profile, choose **Allow analytics**, and visit two public pages. In the GA4 property, open **Reports → Realtime** to check the visit. Browser blockers or declined consent intentionally prevent collection. Tag detection tools may report no tag until consent is granted. Code/browser tests intercept analytics requests to avoid generating artificial production traffic; acceptance into the GA property must be checked in its dashboard.

## Cloudflare Web Analytics

Cloudflare adds its Web Analytics beacon to HTML responses at the edge (enabled in the Cloudflare dashboard, free). It sets no cookies and stores nothing on the device, loads as a deferred module of about 10 KB compressed and sends one small report per page view, so it runs without the analytics consent that Google Analytics needs. The CSP allows `https://static.cloudflareinsights.com` in `script-src` and `https://cloudflareinsights.com` in `connect-src`; without both, the browser blocks the beacon. The privacy page discloses it.

CSP permits the Google tag and Google Analytics collection endpoints without allowing arbitrary inline scripts or eval. The privacy page discloses optional Google Analytics. No GA account retention settings or property permissions are changed by the website deployment.
