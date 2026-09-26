# Artificials deployment notes

The owner selected **Cloudflare Workers Free** with GitHub integration. Artificials is free and non-commercial: there is no billing or paid AI to configure. Keep `LEGAL_READY=false` until the operator details and policies are final. Do not upgrade provider plans automatically.

## Local development

Use Node.js 24 LTS. Run `npm ci`, copy `.dev.vars.example` to `.dev.vars`, then `npm run build`. Run `npm run dev:api` and `npm run dev` in separate terminals. The frontend uses http://127.0.0.1:5173 and proxies API calls to the local Worker.

## Required services

- Cloudflare Worker and static assets for hosting; Turnstile to protect editor sign-in.
- Optional, for the article CMS only: a dedicated Supabase project for editor Auth and PostgreSQL. Apply `supabase/001_initial.sql` to `005_remove_paid_features.sql` in order. Configure production email delivery and the exact OAuth callback origin.

Never put service-role credentials in `VITE_` variables. Configure each server secret in the production Worker, for example `npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY --env production`; do not bulk-upload local development overrides to production. The detailed operator guide is intentionally kept local in `admin.md` and excluded from source control and deployment.

## Production deployment

`wrangler.jsonc` separates local defaults from `env.production`. Both target the Worker name `artificials`; production deploys must explicitly select the production environment. Run `npm run check` and `npm run test:e2e`, review the diff, then run `npm run deploy`. This script builds the site and executes `wrangler deploy --env production`. If the build already passed, the direct deploy command is `npx wrangler deploy --env production`. Do not use bare `wrangler deploy` for the live site: the top-level variables are for local development.

The production `APP_URL` is `https://artificials.net`; keep `ENVIRONMENT=production`. Configure that same origin in Supabase callbacks and Turnstile before enabling editor sign-in. Secure cookies, CSRF checks, authentication callbacks and sitemap links depend on this value. The workers.dev address remains available for public browsing; account writes use the canonical production origin. Use `--env production` for all production secret commands.

## Domain connection

The Cloudflare Free zone for `artificials.net` was verified Active on 17 September 2026, with nameservers `karina.ns.cloudflare.com` and `peter.ns.cloudflare.com`. The production configuration routes `artificials.net/*` to the Worker through the existing proxied apex DNS record. Keep that record proxied (orange cloud): the route requires it. The Worker serves every path from its API or the ASSETS binding; it does not forward requests to the legacy DNS origin. Keep unrelated mail and verification DNS records intact. Verify HTTPS and provider callbacks after any origin change.

The initial Custom Domain attachment failed with error 100117 because existing apex web records conflict. The Worker route avoids deleting those records. If migrating to a Worker-managed Custom Domain later, first inspect and replace only the confirmed conflicting apex web records, change `env.production.routes` to `custom_domain: true` with the exact hostname, and verify HTTPS after deployment. Never delete MX, TXT or unrelated subdomain records. Wrangler login may have Worker deployment permission without DNS-edit permission.

`www.artificials.net` redirects to `artificials.net` (26 September 2026). Its proxied DNS record had no Worker route, so Cloudflare forwarded www requests to the record’s origin, which does not answer: error 522. A separate small Worker, `artificials-www` (`wrangler.www.jsonc`, `worker/www.ts`), is routed at `www.artificials.net/*` and answers every request with a 301 to the same path and query on the apex. It is separate because the main Worker serves static files before its code runs, whatever the host. Workers Builds deploys only the main Worker; deploy this one with `npx wrangler deploy -c wrangler.www.jsonc` when it changes, and CI checks that it bundles. Keep the www DNS record proxied (orange cloud): the route requires it.

## GitHub deployment connection

Native Cloudflare Workers Builds must be connected once in the dashboard. Open Workers & Pages → `artificials` → Settings → Builds → Connect → GitHub. Authorize the Cloudflare GitHub App for only the Artificials repository, then select:

- Production branch: `main`
- Root directory: `/`
- Build command: `npm run check`
- Deploy command: `npx wrangler deploy --env production`
- Node.js version: 24

This native connection was verified with a successful deployment of commit `c28240d` on 17 September 2026. It does not require a GitHub personal access token or Cloudflare credentials stored in GitHub Actions. Keep runtime secrets in Cloudflare rather than build-time environment variables. The detailed guide remains local in `admin.md`.

## Data updates

`.github/workflows/sync-catalog.yml` refreshes the data every three hours. It fetches the catalog with `scripts/sync-catalog.mjs`, published capability results with `scripts/sync-benchmarks.mjs` and Arena's image and video leaderboards with `scripts/sync-arena.mjs`, validates them, runs `npm run check`, and commits only verified `public/data/` changes to `main`. The native Cloudflare connection then deploys those commits. GitHub's built-in workflow token is used for the snapshot commit. Each source is read up to three times when it times out, drops the connection or answers with a server error (`scripts/lib/retry.ts`), and a failure names the source that failed.

GitHub runs scheduled workflows late, often by hours, or drops them when it is busy: with a six-hourly schedule, runs started 2.5 to 5 hours late, and after a switch to every two hours, 2 of 6 ran in the next 12 hours. So the refresh has three triggers (26 September 2026):

- **Cloudflare Cron Trigger (primary, on time).** A small Worker, `artificials-refresh` (`wrangler.refresh.jsonc`, `worker/refresh.ts`), fires at minute 7 of every third hour UTC (07:07, 10:07, 13:07 … in WIB) and starts the workflow through GitHub's `workflow_dispatch` API. It needs one secret, `GITHUB_TOKEN`: a fine-grained GitHub token for this repository only, with the repository permissions **Actions: Read and write** and **Variables: Read and write**, and no expiry or the longest allowed. Create it at GitHub → Settings → Developer settings → Fine-grained tokens, then add it in Cloudflare → Workers & Pages → `artificials-refresh` → Settings → Variables and Secrets as a Secret named `GITHUB_TOKEN`, or with `npx wrangler secret put GITHUB_TOKEN -c wrangler.refresh.jsonc`. Without it, the Worker does nothing. Deploy changes to the Worker with `npx wrangler deploy -c wrangler.refresh.jsonc`; Workers Builds deploys only the main Worker.
- **GitHub's schedule every three hours (fallback).** Runs until the Cloudflare trigger takes over. After its first successful dispatch, the Worker sets the repository variable `REFRESH_TRIGGER` to `cloudflare`, and the workflow's `if` then skips these runs, which uses no minutes. Delete the variable to bring GitHub's schedule back, for example if the token lapses.
- **A daily safety net** at 07:11 UTC, whichever trigger is in charge.

Budget on the free plans, both of which stop rather than charge when used up (GitHub blocks further runs when a private repository's 2,000 monthly minutes are gone and no payment method is on file):

- Refresh: about 40–60 seconds, billed as one minute. It skips drawing the link previews (`SKIP_OG_IMAGES=1`), which would add about ten seconds; Workers Builds draws them on deploy. Eight a day plus the safety net is about 270 of GitHub's 2,000 minutes a month. Each refresh that changes data triggers one Workers Builds deploy of one to two minutes, about 270–540 of the 3,000 free build minutes.
- CI (`.github/workflows/ci.yml`): each push runs the checks and the desktop browser suite, about five minutes; the full suite with mobile Chrome and Safari, about 12 minutes, runs weekly and on demand (Actions → Verify Artificials → Run workflow). Pushes that change only documentation skip CI. At about 150 pushes a month this stays near 1,100 minutes in total, leaving room.

Upstream publication can still lag, so this is periodic updating, not an instantaneous feed. The UI credits each source; retrieval times stay in the data files. Catalog metric rankings are not independent intelligence benchmark scores. On refresh failure, investigate the failed workflow while retaining the last valid snapshot.

## Capacity and cost

Free hosting is subject to provider quotas. Workers Free currently allows 100,000 Worker requests/day and 10 ms CPU/request. Static assets have separate accounting. Local catalog timing and local Worker smoke tests are not Cloudflare production CPU telemetry; verify the actual deployed requests in Cloudflare before drawing capacity conclusions. Supabase Free has storage, auth and egress limits. Keep services on their free plans and stop or reduce usage at capacity.

Official references checked September 17, 2026: [Cloudflare limits](https://developers.cloudflare.com/workers/platform/limits/), [Workers Builds setup](https://developers.cloudflare.com/workers/ci-cd/builds/), [Supabase pricing](https://supabase.com/pricing).
