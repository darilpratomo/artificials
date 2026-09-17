# Artificials deployment notes

The owner selected **Cloudflare Workers Free** with GitHub integration. Keep `AI_ENABLED=false`, `BILLING_ENABLED=false`, and `LEGAL_READY=false` until the services, policies, and production checks are configured. Do not upgrade provider plans automatically.

## Local development

Use Node.js 24 LTS. Run `npm ci`, copy `.dev.vars.example` to `.dev.vars`, then `npm run build`. Run `npm run dev:api` and `npm run dev` in separate terminals. The frontend uses http://127.0.0.1:5173 and proxies API calls to the local Worker.

## Required services

- Cloudflare Worker and static assets for hosting; Turnstile for public email sign-in protection.
- A dedicated Supabase project for Auth and PostgreSQL. Apply `supabase/001_initial.sql` once, followed by `supabase/002_seed.sql`. Configure production email delivery and the exact OAuth callback origin.
- Paddle merchant approval, monthly USD prices, verified webhooks, and production policy/operator details before opening checkout.
- An OpenAI API project and server-side secret before enabling paid generation. ChatGPT subscriptions do not include this API usage.

Never put API keys or service-role credentials in `VITE_` variables. Configure each server secret in the production Worker, for example `npx wrangler secret put OPENAI_API_KEY --env production`; do not bulk-upload local development overrides to production. The detailed operator guide is intentionally kept local in `admin.md` and excluded from source control and deployment.

## Production deployment

`wrangler.jsonc` separates local defaults from `env.production`. Both target the Worker name `artificials`; production deploys must explicitly select the production environment. Run `npm run check` and `npm run test:e2e`, review the diff, then run `npm run deploy`. This script builds the site and executes `wrangler deploy --env production`. If the build already passed, the direct deploy command is `npx wrangler deploy --env production`. Do not use bare `wrangler deploy` for the live site: the top-level variables are for local development.

The production `APP_URL` is `https://artificials.net`; keep `ENVIRONMENT=production`. Configure that same origin in Supabase callbacks, Turnstile and Paddle before enabling those integrations. Secure cookies, CSRF checks, authentication callbacks and sitemap links depend on this value. The workers.dev address remains available for public browsing; account writes use the canonical production origin. Use `--env production` for all production secret commands.

## Domain connection

The Cloudflare Free zone for `artificials.net` was verified Active on 17 September 2026, with nameservers `karina.ns.cloudflare.com` and `peter.ns.cloudflare.com`. The production configuration routes `artificials.net/*` to the Worker through the existing proxied apex DNS record. Keep that record proxied (orange cloud): the route requires it. The Worker serves every path from its API or the ASSETS binding; it does not forward requests to the legacy DNS origin. Keep unrelated mail and verification DNS records intact. Verify HTTPS and provider callbacks after any origin change.

The initial Custom Domain attachment failed with error 100117 because existing apex web records conflict. The Worker route avoids deleting those records. If migrating to a Worker-managed Custom Domain later, first inspect and replace only the confirmed conflicting apex web records, change `env.production.routes` to `custom_domain: true` with the exact hostname, and verify HTTPS after deployment. Never delete MX, TXT or unrelated subdomain records. Wrangler login may have Worker deployment permission without DNS-edit permission.

## GitHub deployment connection

Native Cloudflare Workers Builds must be connected once in the dashboard. Open Workers & Pages → `artificials` → Settings → Builds → Connect → GitHub. Authorize the Cloudflare GitHub App for only the Artificials repository, then select:

- Production branch: `main`
- Root directory: `/`
- Build command: `npm run check`
- Deploy command: `npx wrangler deploy --env production`
- Node.js version: 24

This native connection was verified with a successful deployment of commit `c28240d` on 17 September 2026. It does not require a GitHub personal access token or Cloudflare credentials stored in GitHub Actions. Keep runtime secrets in Cloudflare rather than build-time environment variables. The detailed guide remains local in `admin.md`.

## Data updates

`.github/workflows/sync-catalog.yml` runs at minute 17 every six hours in UTC and can also be triggered manually. It fetches a sourced snapshot with `scripts/sync-catalog.mjs`, validates it, runs `npm run check`, and commits only verified `public/data/` changes to `main`. The native Cloudflare connection then deploys those commits. GitHub's built-in workflow token is used for the snapshot commit; no personal token is required.

Scheduled runs and upstream publication can lag, so this is periodic updating, not an instantaneous feed. The UI shows retrieval time and source. Catalog metric rankings are not independent intelligence benchmark scores. On refresh failure, investigate the failed workflow while retaining the last valid snapshot.

## Capacity and cost

Free hosting is subject to provider quotas. Workers Free currently allows 100,000 Worker requests/day and 10 ms CPU/request; measure real authenticated generation in staging before selling access. Static assets have separate accounting. Local catalog timing and local Worker smoke tests are not Cloudflare production CPU telemetry; verify the actual deployed requests in Cloudflare before drawing capacity conclusions. Supabase Free has storage, auth and egress limits. Keep services on their free plans and stop or reduce usage at capacity.

Paid generation reserves $0.10 per submitted attempt before calling the provider, with atomic monthly and daily limits. The pinned model, maximum payload, output tokens, and SQL quotas must be reviewed together when changing pricing. No retries or paid tools run automatically. Subscription pricing targets positive contribution after conservative AI reservations and the base processing fee; profit is not guaranteed. OpenAI usage, payment fees, and optional third-party services are separate from hosting costs.

Official references checked September 17, 2026: [Cloudflare limits](https://developers.cloudflare.com/workers/platform/limits/), [Workers Builds setup](https://developers.cloudflare.com/workers/ci-cd/builds/), [Supabase pricing](https://supabase.com/pricing), [OpenAI GPT-5 Mini](https://developers.openai.com/api/docs/models/gpt-5-mini), [Paddle pricing](https://www.paddle.com/pricing).
