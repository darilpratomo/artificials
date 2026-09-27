# Artificials

Free, non-commercial AI model directory: sourced capability benchmarks, coding agent results, separate specification/price rankings, side-by-side comparison, illustrated editorial guides, a free 36-lesson AI Academy and free file tools for **artificials.net**. There are no paid plans, ads or sponsored listings. English interface; black/silver design, responsive visuals, horizontal scroll storytelling on desktop and mobile, a smoothly morphing floating header, and reduced-motion support. Branding uses the supplied metallic A and a locally hosted Sora wordmark.

## Run locally

Use Node.js 24 LTS (`.nvmrc`). Python 3.11+ is also required for `npm run check:academy`, which verifies the downloadable educational examples. Cloudflare builds only need Node.js.

```sh
npm ci
cp .dev.vars.example .dev.vars
npm run build
npm run dev:api
```

Second terminal: `npm run dev`, then open http://127.0.0.1:5173.

Everything public works without accounts or credentials. Only editor sign-in and the article CMS need configuration, and they stay disabled until ready. Secrets belong in `.dev.vars` locally and Cloudflare Secrets in production.

## Architecture

- React, TypeScript, Vite, locally hosted fonts and Lucide SVG icons. No animation or 3D runtime dependency.
- Hono on Cloudflare Workers with static assets; Supabase Auth/Postgres with RLS for editor sign-in and articles.
- Source-attributed models.dev snapshot; complete paginated provider offerings, precomputed search index and record shards. No artificial 50-model limit. Counts represent offerings, not unique underlying models.
- `/models`, `/coding-agents`, `/trends`, `/image-models`, `/video-models`, `/model-finder`, `/leaderboard`, `/compare`, `/compare/:a-vs-:b`, `/changes` (with the `/changes.xml` feed), `/makers`, `/makers/:slug`, `/tests`, `/tests/:id`, `/weekly`, `/weekly/:monday` (with the `/weekly.xml` feed), `/cost-calculator`, `/news`, `/learn`, `/learn/:slug`, `/tools`, `/about`, `/privacy`, `/terms`, `/contact`; `/following` lists the models, makers and tests a visitor follows, kept in their browser and not indexed; each model, maker and test has an RSS feed at `changes.xml` under its address; `/login` and `/dashboard` are for editors only.
- Site search (header button, Ctrl+K, ⌘K or /) across models, pages, guides, lessons and free tools; it loads on first use. See [data methodology](docs/DATA.md#site-search).
- CMS at a server-configured unpredictable path; server admin role + MFA remain mandatory. No public admin link.

## Learn AI

The free Academy has nine modules, 36 original lessons, four runnable Python projects, two interactive concept labs, and local learning progress. Each lesson loads separately and includes theory, code download, practice, a suggested solution, and a quiz. See [Academy content and verification](docs/ACADEMY.md).

## Data and updates

```sh
npm run sync:catalog
```

The data refreshes every three hours, started on time by a Cloudflare Cron Trigger (see [launch notes](docs/LAUNCH.md#data-updates)). Upstream sources can lag; the rankings page says so when a refresh is more than two days late. The website does not claim guaranteed real-time coverage. Rankings compare reported context windows or base token prices, not invented intelligence scores. Read [data methodology](docs/DATA.md).

## Verification and deployment

```sh
npm run check
npm run check:academy
npx playwright install chromium webkit
E2E_PRODUCTION=1 npm run test:e2e
npx wrangler deploy --dry-run --env production
npm run deploy
```

The owner selected **Cloudflare Free**. Requests, CPU and build usage remain subject to free-tier limits. Artificials is non-commercial: it sells nothing and runs no paid AI requests.

Completed, verified changes are committed and pushed to the private Artificials repository. CI verifies code and browser behavior. Deployment requires the repository's Cloudflare connection or deployment secrets; see [launch guide](docs/LAUNCH.md). No paid provider calls run in CI.

## Private administration guide

`admin.md` is deliberately local only: ignored by Git and Vercel uploads, outside public/build assets, and checked by `npm run check:private`. Do not upload it manually. Public documentation contains no credentials, admin path secret or private operator configuration.

[Implementation status](docs/STATUS.md) distinguishes local verification from provider-dependent launch steps.
