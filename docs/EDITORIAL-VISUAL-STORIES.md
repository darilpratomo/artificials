# Visual editorial collection

Four original English explainers published as a separate collection on 3 October 2026. Each contains more than 1,300 words of main prose and two interactive figures. The 99 existing article records and all existing editorial assets are preserved.

| Article                                                                                                        |  Main prose | Embedded experiences                                                      |
| -------------------------------------------------------------------------------------------------------------- | ----------: | ------------------------------------------------------------------------- |
| [The price–capability frontier](https://artificials.net/news/visual-guide-model-price-capability-frontier)     | 1,531 words | Budget-filtered scatter plot; input/output workload calculator            |
| [A leaderboard has more than one winner](https://artificials.net/news/visual-guide-benchmark-rankings-by-task) | 1,476 words | Skill-switching score bars; exact-configuration score matrix              |
| [Inside a streaming answer](https://artificials.net/news/visual-guide-prefill-decode-kv-cache)                 | 1,599 words | Reversible inference architecture; explicit KV-cache memory calculator    |
| [From a question to evidence](https://artificials.net/news/visual-guide-retrieval-evidence-answer)             | 1,647 words | Reversible retrieval architecture; source-removal and abstention exercise |

Total: 6,253 words, excluding headings, URLs, and figure text. These are original educational explainers, not breaking-news announcements. They cite primary research and documentation without reproducing third-party figures or substantial quotations.

## Data and boundaries

`shared/editorial-visual-data.json` is a deliberately fixed editorial snapshot drawn from the site's own `public/data/benchmarks.json` and `public/data/models/overview.json` at repository revision `50c6cff`. It does not claim real-time retrieval. The articles and figure credits explicitly identify the bundled dataset and link to the full model/benchmark pages. Retrieval and source revision times stay in the data, not in the visual UI.

- Benchmark sample: the first eight exact configurations in LiveBench's bundled overall ranking. Their IDs are joined unchanged to coding, mathematics, reasoning, and language results. All 32 displayed values were checked against the source snapshot. No confidence bounds are invented, and missing results are distinct from zero.
- Price sample: filter to models with a matched profile and a positive blended reference price; sort by capability index; retain the highest-index eligible model per maker; take the first ten makers. All ten price records and capability values were checked against the website snapshot. This is a teaching selection, not the complete market or a universal recommendation.
- Benchmark credit: LiveBench, Apache-2.0. Capability credit: Epoch AI, CC BY 4.0. Catalog credit: models.dev, MIT. Figure credits link to sources and licences. Existing source notices remain intact.
- Workload arithmetic changes the input/output token ratio while preserving each listing's original rates. It excludes cache discounts, tool fees, retries and infrastructure. The default uses the site's three-input-to-one-output convention.
- The cache calculator describes a hypothetical architecture with 32 layers, 8 KV heads, head dimension 128 and 2 bytes per key/value element. It reports binary GiB of raw cache only. It is not a measurement of a named model or total device allocation.
- The evidence exercise uses fictional current, archived and other-plan policies. Its answer is deterministic browser code, with no AI request. Removing current evidence produces abstention; other policies cannot substitute for it.

## Rendering and motion

`shared/article-visuals.ts` maps fixed article slugs and exact headings to eight supported figure types. It does not interpret HTML, execute CMS code or accept arbitrary component names from article bodies. `src/pages/Learn.tsx` adds a figure only at those registered headings. Legacy article rendering remains unchanged.

The existing scatter component supplies the price chart, maker filtering and model links. All additional styles are scoped to `.article-visual`. Data tables, numeric labels and an all-stages transcript make the figures readable independently of animation or color. Article prose, matrix values, price tables, source credits and the initial diagram are present in prerendered HTML.

Architecture progress follows scrolling in both directions when motion is allowed. Selecting a stage or touching its range control takes manual control. Playback is finite, can be paused and stops advancing while the figure or document is not visible. Reduced-motion users receive manual stage controls with animated playback disabled. All controls support keyboard interaction.

## Artwork

Four original SVG covers are created by code in `scripts/build-visual-editorial-assets.mjs`. They are not AI-generated raster illustrations and do not reuse external artwork. The script uses the existing `@napi-rs/canvas` dependency to export WebP at 1200 × 800 and 640 × 427. No API key, image-generation quota or additional dependency is needed.

- `public/editorial/visual-frontier.svg`: points derived from the selected price/capability records.
- `public/editorial/visual-skills.svg`: score cells derived from the selected benchmark records.
- `public/editorial/visual-inference.svg`: original prompt/prefill/cache/decode schematic.
- `public/editorial/visual-evidence.svg`: original fictional policy/evidence schematic.

Each has matching `.webp` and `-small.webp` files. Run `node scripts/build-visual-editorial-assets.mjs` from the repository root to reproduce the cover exports after editorial review. The animation lives in the embedded figures, rather than in heavy video or GIF downloads.

## Publication and validation

The shared article registry supplies sitemap entries, metadata, prerendering, and search entries. The search test budget accommodates the 103-guide collection and now also verifies every guide entry contains exactly title/excerpt/category metadata rather than the article body.

`supabase/010_visual_editorial.sql` is an optional additive seed, tested with PGlite and safe to rerun; matching slugs preserve existing CMS edits. Production currently serves bundled articles. The existing configured-CMS list endpoint has a 100-row limit; switching to CMS for the full 103-article collection will require a separate pagination change. No remote database migration is performed by this release.

Validation: 322 unit tests and the production build pass. Twenty-one browser checks pass across desktop Chromium, mobile Chromium and mobile Safari, covering all four routes, keyboard controls, reversible scroll progress, reduced motion, article accessibility, horizontal overflow, prerendered content and existing search/image layouts. The diagrams were also visually inspected at 320px and 1440px. All 99 prior article objects are unchanged, the 32 benchmark values and ten price records match their source snapshot, and the SQL seed passes insertion and rerun checks in PGlite.
