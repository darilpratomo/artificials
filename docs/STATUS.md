# Artificials implementation status

Updated: 25 September 2026. Artificials is now free and non-commercial: the paid app builder (Studio), plans, checkout and paid AI generation were removed on this date.

## Implemented

Optional Google Analytics (`G-YR7B1XDDLM`) uses explicit visitor consent, manually dispatched public page views, sanitized URLs, account/CMS exclusion and footer privacy controls. The owner confirmed Enhanced measurement is disabled. Google script and measurement destinations are allowed by CSP without unsafe inline scripts. Local tests intercept collection; account-side reporting requires Realtime verification.

SEO: 53 public pages prerendered as static HTML, per-page metadata/canonicals/social previews, article and website structured data, expanded sitemap and real missing-page 404s. See [SEO.md](SEO.md) for owner Search Console/Bing setup and remaining measurement limits. All dropdowns share an accessible custom combobox; search fields have a single border and consistent spacing; editorial imagery is compact on desktop.

Black/silver responsive English UI with SVG icons, owner-supplied metallic A branding with a Sora wordmark, a data-led home hero with the top five models on the capability index and the record over three years, a continuously interpolated floating header, an animated accessible mobile menu, damped horizontal scroll sequences on desktop and mobile, and reduced-motion fallback. Model directory, capability benchmarks, separate metadata rankings, comparison, coding agent results, illustrated original AI guides, a 36-lesson Learn AI Academy with nine modules and four Python projects, free file tools, editor sign-in and account security, about/privacy/terms/contact and hidden CMS. Instagram and X profiles use official icon-only brand glyphs in the centered footer. Author names and badges are removed from news and lessons. Visible illustration captions and catalog branding are removed at the owner’s request; distribution license notices remain. Source-backed model snapshots include every offering in the upstream catalog, with pagination, filters and source links.

Backend includes Supabase Auth/RLS/MFA for editors and the article CMS, rate limits and origin checks. There is no payment handling or paid AI; old `/studio`, `/pricing` and `/checkout` links redirect home.

## Verification scope

Automated checks cover type safety, production build, PostgreSQL permissions, MFA and origin security, catalog normalization/pagination, desktop/mobile workflows, comparison persistence, reduced motion and automated accessibility.

Browser fixtures test interface behavior; real provider model data is checked separately. No production authentication is performed without configured provider accounts. Automated accessibility checks do not replace manual assistive-technology testing.

Verified locally in this implementation:

- TypeScript, production build, private-file guard and Worker dry-run pass.
- 49 code/database tests pass, including benchmark score normalization, ties, missing results, source-schema rejection, catalog normalization, quota transactions and security behavior.
- 89 production-build browser tests pass across desktop Chrome, mobile Chrome and mobile Safari/WebKit. Coverage checks widths 320, 375, 430, 768 and 1180px throughout scrolling, radio/checkbox label geometry up to 1440px, mobile and desktop horizontal storytelling, reduced motion, floating header/menu focus and dismissal, hero board placement beside or under the headline at 320–1280px, intermediate animation frames and settling, a compact centered footer logo, icon-only social profiles, benchmark recovery and loaded editorial images. CI tests the built assets, including the actual CSS chunk order.
- Automated axe checks pass across the existing 11 routes on desktop/mobile and three Academy routes on desktop/mobile Chrome and mobile Safari. All 36 Python examples execute successfully, including an HTTP/SQLite integration check.
- A separate production-build smoke test reads the actual source snapshot (7,842 offerings / 220 providers), renders desktop/mobile, and checks private route and cross-origin write rejection.
- Initial Cloudflare production deploy succeeded at https://artificials.artificials.workers.dev; the public catalog endpoint returned HTTP 200 with actual source data.
- Source code is in the private repository https://github.com/darilpratomo/artificials. The local admin guide is not tracked.
- The Cloudflare Free zone for artificials.net is Active with the assigned Cloudflare nameservers. Production APP_URL targets https://artificials.net.
- Native GitHub-to-Cloudflare deployment succeeded for commit c28240d (Workers Builds run 00b0cd9c-0499-4bdf-9dda-ede41e795663). The production route artificials.net/* serves the Worker using the existing proxied DNS; request-limit fail-open is disabled. No DNS records were deleted.
- https://artificials.net returns HTTP 200 with HSTS and CSP. The sitemap uses the production domain. Live-source smoke tests pass on that domain: 7,842 offerings / 220 providers, desktop/mobile rendering without browser errors or horizontal overflow, private routes returning 404, and foreign-origin writes returning 403.
- HTTP now redirects to HTTPS with status 301, preserving path and query parameters. Keep the zone's Always Use HTTPS setting enabled.
- Header menus: the Analysis menu shows its pages in three labelled columns (Rankings, Market, Trends and media) and Resources in two; every page carries an icon, which the phone menu also uses in place of numbers. A rank of #1 in the maker and test tables sits on a gold pill that keeps its number in line with the ranks below.
- The header search (Ctrl+K, ⌘K or /) finds models, makers, tests, pages, guides, lessons and free tools from anywhere, loading only when first opened.
- The weekly recap (`/weekly`, one page and card per week, and the `/weekly.xml` feed) sums up each week's releases, new leaders and price changes.
- Test rows match more models (serving details, maker prefixes and "Org/Model" names), and rows with no model page show readable names instead of raw identifiers.
- Test pages (`/tests`, `/tests/:id`) give each published test its own indexable page: what it measures, its publisher and licence, every model's best result and its new leaders.
- Maker pages (`/makers`, `/makers/:slug`) gather each maker's models, its rank on each test and its capability index standing; model pages and the market list link to them.
- Each refresh records what changed (the makers' listed prices, models joining the capability index and new leaders on each test) in `public/data/history.json`; `/changes` and its RSS feed show the last 30 days, and each model's Pricing tab shows its price changes.
- The catalog workflow refreshes every three hours, started on time by the `artificials-refresh` Cloudflare Cron Trigger once its GitHub token is set, with GitHub's schedule as a fallback and a daily safety net. Publishing future changes uses the native Workers Builds connection.

## Required provider activation

The public support contact is support@artificials.net, as supplied by the owner. Website configuration does not provision or verify the mailbox. Editorial illustrations are locally hosted responsive WebP files; asset prompts and provenance are in EDITORIAL-ASSETS.md. Capability benchmarks have nine views, initially 58 LiveBench model configurations and 40 image-model results. These are sourced, scheduled snapshots, not invented scores or guaranteed real-time measurements.

For the optional article CMS: Supabase database/auth/SMTP and editor MFA; legal operator details; optional Google OAuth; Turnstile. Hosting and data refresh are subject to provider quotas. There is no guarantee of complete real-time AI coverage.

The local-only `admin.md` contains the setup and operations guide and is excluded from Git and deploy assets.
