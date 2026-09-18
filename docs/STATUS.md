# Artificials implementation status

Updated: 18 September 2026.

## Implemented

SEO: 53 public pages prerendered as static HTML, per-page metadata/canonicals/social previews, article and website structured data, expanded sitemap and real missing-page 404s. See [SEO.md](SEO.md) for owner Search Console/Bing setup and remaining measurement limits. All dropdowns share an accessible custom combobox; search fields have a single border and consistent spacing; editorial imagery is compact on desktop.

Black/silver responsive English UI with SVG icons, owner-supplied metallic A branding with a Sora wordmark, separate full-width desktop and portrait mobile planetary banners bearing the supplied logo, a continuously interpolated floating header, an animated accessible mobile menu, damped horizontal scroll sequences on desktop and mobile, and reduced-motion fallback. Model directory, capability benchmarks, separate metadata rankings, comparison, illustrated original AI guides, a 36-lesson Learn AI Academy with nine modules and four Python projects, Studio, account dashboard, login, pricing, about/privacy/terms/contact and hidden CMS. Instagram and X profiles use official icon-only brand glyphs in the centered footer. Author names and badges are removed from news and lessons. Visible illustration captions and catalog branding are removed at the owner’s request; distribution license notices remain. Source-backed model snapshots include every offering in the upstream catalog, with pagination, filters, source links and retrieval timestamps.

Backend includes Supabase Auth/RLS/MFA, Paddle webhook/payment handling, atomic generation quotas and spend reservations, server-only OpenAI API access, isolated static previews and downloadable full-stack source with database schema. AI and billing are disabled by default.

## Verification scope

Automated checks cover type safety, production build, atomic PostgreSQL operations, ownership/MFA/payment security, catalog normalization/pagination, export structure, desktop/mobile workflows, comparison persistence, reduced motion and automated accessibility.

Browser fixtures test interface behavior; real provider model data is checked separately. No OpenAI requests, customer payments or production authentication are performed without configured provider accounts. Automated accessibility checks do not replace manual assistive-technology testing. Generated model code is not guaranteed to build for every possible prompt.

Verified locally in this implementation:

- TypeScript, production build, private-file guard and Worker dry-run pass.
- 49 code/database tests pass, including benchmark score normalization, ties, missing results, source-schema rejection, catalog normalization, quota transactions and security behavior.
- 80 production-build browser tests pass across desktop Chrome, mobile Chrome and mobile Safari/WebKit. Coverage checks widths 320, 375, 430, 768 and 1180px throughout scrolling, radio/checkbox label geometry up to 1440px, mobile and desktop horizontal storytelling, reduced motion, floating header/menu focus and dismissal, hero asset selection and full-width coverage at 320–760px, intermediate animation frames and settling, a compact centered footer logo, icon-only social profiles, benchmark recovery and loaded editorial images. CI tests the built assets, including the actual CSS chunk order.
- Automated axe checks pass across the existing 11 routes on desktop/mobile and three Academy routes on desktop/mobile Chrome and mobile Safari. All 36 Python examples execute successfully, including an HTTP/SQLite integration check.
- A separate production-build smoke test reads the actual source snapshot (7,842 offerings / 220 providers), renders desktop/mobile, and checks private route and cross-origin write rejection.
- Initial Cloudflare production deploy succeeded at https://artificials.artificials.workers.dev; the public catalog endpoint returned HTTP 200 with actual source data.
- Source code is in the private repository https://github.com/darilpratomo/artificials. The local admin guide is not tracked.
- The Cloudflare Free zone for artificials.net is Active with the assigned Cloudflare nameservers. Production APP_URL targets https://artificials.net.
- Native GitHub-to-Cloudflare deployment succeeded for commit c28240d (Workers Builds run 00b0cd9c-0499-4bdf-9dda-ede41e795663). The production route artificials.net/* serves the Worker using the existing proxied DNS; request-limit fail-open is disabled. No DNS records were deleted.
- https://artificials.net returns HTTP 200 with HSTS and CSP. The sitemap uses the production domain. Live-source smoke tests pass on that domain: 7,842 offerings / 220 providers, desktop/mobile rendering without browser errors or horizontal overflow, private routes returning 404, and foreign-origin writes returning 403.
- HTTP now redirects to HTTPS with status 301, preserving path and query parameters. Keep the zone's Always Use HTTPS setting enabled.
- The six-hour catalog workflow is installed and a manual refresh succeeded. Publishing future changes uses the native Workers Builds connection.

## Required provider activation

The public support contact is support@artificials.net, as supplied by the owner. Website configuration does not provision or verify the mailbox. Editorial illustrations are locally hosted responsive WebP files; asset prompts and provenance are in EDITORIAL-ASSETS.md. Capability benchmarks have nine views, initially 58 LiveBench model configurations and 40 image-model results. These are sourced, scheduled snapshots, not invented scores or guaranteed real-time measurements.

Supabase database/auth/SMTP and admin MFA; OpenAI key and staging usage checks; approved Paddle merchant account, sandbox webhook verification, production prices and legal operator details; optional Google OAuth; Turnstile. The operator must test full generation within Cloudflare Free CPU limits before enabling paid traffic. Hosting and data refresh are subject to provider quotas. There is no guarantee of net profit or complete real-time AI coverage.

The local-only `admin.md` contains the setup and operations guide and is excluded from Git and deploy assets.
