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

Set `env.production.vars.APP_URL` to the origin actually serving the site and keep `ENVIRONMENT=production`. The intended final origin is `https://artificials.net`; until custom-domain setup is complete, use the exact HTTPS `workers.dev` URL assigned by Cloudflare. The same origin must be configured in Supabase callbacks, Turnstile and Paddle before enabling those integrations. Secure cookies, CSRF checks, authentication callbacks and sitemap links depend on this value. Use `--env production` for all production secret commands.

## Domain connection

At the initial account audit, `artificials.net` was absent from the Cloudflare account and used Spaceship nameservers. This document does not claim that DNS has been connected. The owner needs to add the domain to Cloudflare on the Free plan, review imported DNS records, and set the assigned Cloudflare nameservers in Spaceship. Once the zone is active, add `artificials.net` under the Worker's Settings → Domains & Routes, update the production `APP_URL`, and redeploy. Verify HTTPS and provider callbacks after the change.

## GitHub deployment connection

Native Cloudflare Workers Builds must be connected once in the dashboard. Open Workers & Pages → `artificials` → Settings → Builds → Connect → GitHub. Authorize the Cloudflare GitHub App for only the Artificials repository, then select:

- Production branch: `main`
- Root directory: `/`
- Build command: `npm run check`
- Deploy command: `npx wrangler deploy --env production`
- Node.js version: 24

This native connection does not require a GitHub personal access token or Cloudflare credentials stored in GitHub Actions. Until the connection succeeds, pushing code alone does not activate automatic deployment. Keep runtime secrets in Cloudflare rather than build-time environment variables. The detailed guide remains local in `admin.md`.

## Data updates

`.github/workflows/sync-catalog.yml` runs at minute 17 every six hours in UTC and can also be triggered manually. It fetches a sourced snapshot with `scripts/sync-catalog.mjs`, validates it, runs `npm run check`, and commits only verified `public/data/` changes to `main`. The native Cloudflare connection then deploys those commits. GitHub's built-in workflow token is used for the snapshot commit; no personal token is required.

Scheduled runs and upstream publication can lag, so this is periodic updating, not an instantaneous feed. The UI shows retrieval time and source. Catalog metric rankings are not independent intelligence benchmark scores. On refresh failure, investigate the failed workflow while retaining the last valid snapshot.

## Capacity and cost

Free hosting is subject to provider quotas. Workers Free currently allows 100,000 Worker requests/day and 10 ms CPU/request; measure real authenticated generation in staging before selling access. Static assets have separate accounting. Local catalog timing and local Worker smoke tests are not Cloudflare production CPU telemetry; verify the actual deployed requests in Cloudflare before drawing capacity conclusions. Supabase Free has storage, auth and egress limits. Keep services on their free plans and stop or reduce usage at capacity.

Paid generation reserves $0.10 per submitted attempt before calling the provider, with atomic monthly and daily limits. The pinned model, maximum payload, output tokens, and SQL quotas must be reviewed together when changing pricing. No retries or paid tools run automatically. Subscription pricing targets positive contribution after conservative AI reservations and the base processing fee; profit is not guaranteed. OpenAI usage, payment fees, and optional third-party services are separate from hosting costs.

Official references checked September 17, 2026: [Cloudflare limits](https://developers.cloudflare.com/workers/platform/limits/), [Workers Builds setup](https://developers.cloudflare.com/workers/ci-cd/builds/), [Supabase pricing](https://supabase.com/pricing), [OpenAI GPT-5 Mini](https://developers.openai.com/api/docs/models/gpt-5-mini), [Paddle pricing](https://www.paddle.com/pricing).
