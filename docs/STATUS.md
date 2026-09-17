# Artificials implementation status

Updated: 17 September 2026.

## Implemented

Black/silver responsive English UI with SVG icons, orbital illustration, horizontal scroll sequence on desktop, and reduced-motion fallback. Model directory, metadata rankings, comparison, original AI guides, Studio, account dashboard, login, pricing, about/privacy/terms/contact and hidden CMS. Source-backed model snapshots include every offering in the upstream catalog, with pagination, filters, source links and retrieval timestamps.

Backend includes Supabase Auth/RLS/MFA, Paddle webhook/payment handling, atomic generation quotas and spend reservations, server-only OpenAI API access, isolated static previews and downloadable full-stack source with database schema. AI and billing are disabled by default.

## Verification scope

Automated checks cover type safety, production build, atomic PostgreSQL operations, ownership/MFA/payment security, catalog normalization/pagination, export structure, desktop/mobile workflows, comparison persistence, reduced motion and automated accessibility.

Browser fixtures test interface behavior; real provider model data is checked separately. No OpenAI requests, customer payments or production authentication are performed without configured provider accounts. Automated accessibility checks do not replace manual assistive-technology testing. Generated model code is not guaranteed to build for every possible prompt.

Verified locally in this implementation:

- TypeScript, production build, private-file guard and Worker dry-run pass.
- 37 code/database tests pass, including catalog source normalization, quota transactions and security behavior.
- 21 desktop/mobile browser tests pass; one desktop-specific horizontal-scroll case is intentionally skipped on mobile.
- Automated axe checks pass across 11 routes on both viewport profiles.
- A separate production-build smoke test reads the actual source snapshot (7,842 offerings / 220 providers), renders desktop/mobile, and checks private route and cross-origin write rejection.
- Initial Cloudflare production deploy succeeded at https://artificials.artificials.workers.dev; the public catalog endpoint returned HTTP 200 with actual source data.
- Source code is in the private repository https://github.com/darilpratomo/artificials. The local admin guide is not tracked.
- The Cloudflare Free zone for artificials.net is Active with the assigned Cloudflare nameservers. Production APP_URL targets https://artificials.net.
- GitHub commit 87d5f75 triggered native Cloudflare Workers Builds, and GitHub verification passed. Initial Custom Domain attachment failed with error 100117 because existing apex DNS records conflict. The production configuration now uses a Worker route over the existing proxied DNS record; deployment and HTTPS verification are pending.
- The six-hour catalog workflow is installed and a manual refresh succeeded. Publishing future changes uses the native Workers Builds connection.

## Required provider activation

Supabase database/auth/SMTP and admin MFA; OpenAI key and staging usage checks; approved Paddle merchant account, sandbox webhook verification, production prices and legal operator details; optional Google OAuth; Turnstile. The operator must test full generation within Cloudflare Free CPU limits before enabling paid traffic. Hosting and data refresh are subject to provider quotas. There is no guarantee of net profit or complete real-time AI coverage.

The local-only `admin.md` contains the setup and operations guide and is excluded from Git and deploy assets.
