# Artificials

Independent AI model directory, sourced capability benchmarks, separate specification/price rankings, side-by-side comparison, illustrated editorial guides, a free 36-lesson AI Academy and a metered full-stack AI app builder for **artificials.net**. English interface; black/silver design, responsive visuals, horizontal scroll storytelling on desktop and mobile, a smoothly morphing floating header, and reduced-motion support. Branding uses the supplied metallic A and a locally hosted Sora wordmark.

## Run locally

Use Node.js 24 LTS (`.nvmrc`). Python 3.11+ is also required for `npm run check:academy`, which verifies the downloadable educational examples. Cloudflare builds only need Node.js.

```sh
npm ci
cp .dev.vars.example .dev.vars
npm run build
npm run dev:api
```

Second terminal: `npm run dev`, then open http://127.0.0.1:5173.

The public catalog works without account credentials. Authentication, CMS, paid generation and checkout require configuration and are disabled until ready. Secrets belong in `.dev.vars` locally and Cloudflare Secrets in production.

## Architecture

- React, TypeScript, Vite, locally hosted fonts and Lucide SVG icons. No animation or 3D runtime dependency.
- Hono on Cloudflare Workers with static assets; Supabase Auth/Postgres with RLS; Paddle subscriptions; OpenAI Responses on the server.
- Source-attributed models.dev snapshot; complete paginated provider offerings, precomputed search index and record shards. No artificial 50-model limit. Counts represent offerings, not unique underlying models.
- `/models`, `/leaderboard`, `/compare`, `/news`, `/learn`, `/learn/:slug`, `/studio`, `/pricing`, `/login`, `/dashboard`, `/about`, `/privacy`, `/terms`, `/contact`.
- CMS at a server-configured unpredictable path; server admin role + MFA remain mandatory. No public admin link.
- Studio generates downloadable React + Worker API + D1 schema + Supabase Auth projects. Its isolated design preview has no live customer database. Customers deploy exported applications on their own infrastructure.
- $12/30, $29/90 and $59/200 generation plans per month. Atomic quotas, token/request/concurrency limits and a global spend guard protect API use. These are cost controls, not a guarantee of net profit.

## Learn AI

The free Academy has nine modules, 36 original lessons, four runnable Python projects, two interactive concept labs, and local learning progress. Each lesson loads separately and includes theory, code download, practice, a suggested solution, and a quiz. See [Academy content and verification](docs/ACADEMY.md).

## Data and updates

```sh
npm run sync:catalog
```

The scheduled GitHub workflow refreshes the snapshot every six hours. Scheduled jobs can be delayed; the website shows the actual last successful source retrieval time. It does not claim guaranteed real-time coverage. Rankings compare reported context windows or base token prices, not invented intelligence scores. Read [data methodology](docs/DATA.md).

## Verification and deployment

```sh
npm run check
npm run check:academy
npx playwright install chromium webkit
E2E_PRODUCTION=1 npm run test:e2e
npx wrangler deploy --dry-run --env production
npm run deploy
```

The owner selected **Cloudflare Free**. Requests, CPU and build usage remain subject to free-tier limits; OpenAI and payment processing are not free. Vercel Hobby is unsuitable for the commercial SaaS under its [fair-use terms](https://vercel.com/docs/limits/fair-use-guidelines).

Completed, verified changes are committed and pushed to the private Artificials repository. CI verifies code and browser behavior. Deployment requires the repository's Cloudflare connection or deployment secrets; see [launch guide](docs/LAUNCH.md). No paid provider calls run in CI.

## Private administration guide

`admin.md` is deliberately local only: ignored by Git and Vercel uploads, outside public/build assets, and checked by `npm run check:private`. Do not upload it manually. Public documentation contains no credentials, admin path secret or private operator configuration.

[Implementation status](docs/STATUS.md) distinguishes local verification from provider-dependent launch steps.
