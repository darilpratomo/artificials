# Visual laboratories

Three original English explainers extend the visual collection with six browser-only experiments. They preserve the previous 103 article records and their covers. Main-prose counts exclude headings, source URLs, and figure text.

| Article                                                                                                   | Words | Experiments                                                           |
| --------------------------------------------------------------------------------------------------------- | ----: | --------------------------------------------------------------------- |
| [Before the next word](https://artificials.net/news/visual-lab-temperature-top-p-token-sampling)          | 1,516 | Temperature/top-p distribution; reversible probability-interval sweep |
| [What does nearby mean?](https://artificials.net/news/visual-lab-vector-similarity-search-geometry)       | 1,582 | Rotating/scaling vectors; metric and normalization ranking comparison |
| [Inside the serving queue](https://artificials.net/news/visual-lab-ai-serving-queues-continuous-batching) | 1,577 | Fixed/continuous admission timelines; reversible six-job replay       |

Total: 4,675 words. These are educational articles, not reports of new model releases. All examples and prose are original. Primary documentation and research are linked near the relevant explanations; no external text, figures, benchmark tables, or code have been reproduced.

## Numerical contract

`shared/visual-lab-math.ts` contains the small, deterministic teaching fixtures and their calculations. Every figure identifies its numbers as illustrative, never a benchmark or API measurement.

- Sampling uses six authored logits, applies positive temperature, keeps the smallest descending probability prefix reaching top-p, and renormalizes retained mass. The interval sweep uses temperature 1 and top-p 0.9 independently of the first figure. The marker is a hypothetical uniform draw in [0, 1), not a stream of random samples. Selection uses full precision; display values are rounded.
- Geometry uses original 2D vectors, not actual document embeddings or projections of a model. Cosine removes magnitude, dot product retains it, and Euclidean distance compares endpoints. The unit-normalization toggle updates both drawn positions and scoring. Candidate IDs have no semantic labels. Zero vectors are excluded, not silently assigned a cosine.
- Queue examples admit six simultaneous jobs with lengths [2, 8, 3, 6, 2, 4]; each active job receives one token per tick. Fixed batches refill only after the entire admitted group completes. Continuous admission refills individual slots at iteration boundaries. At two slots, completion is tick 18 versus 14. These units are not wall-clock time. The simulation omits prefill, networking, memory limits and occupancy-dependent compute cost. The replay is fixed independently of the timeline controls.

The original cover compositions are generated from `scripts/build-visual-lab-assets.mjs` into `public/editorial/lab-{sampling,vectors,queues}.{svg,webp}` plus small WebP variants. The covers are teaching schematics, not separate measured charts. Raster exports are 1200×800 and 640×427, using the existing local canvas dependency. There is no image service, external API call, or new dependency.

## Scope and accessibility

`shared/article-visuals.ts` registers six fixed placements in the new slugs. `VisualLabs.tsx` renders those types; it does not execute CMS HTML. Styles are confined to `.visual-lab` within existing article figures. Old layouts, navigation, tools and account functionality are unchanged.

Motion reuses the existing viewport-aware `useProcessMotion` hook. Replays are finite and reversible, pause offscreen or when the document is hidden, and yield to manual controls. Reduced-motion users retain keyboard-accessible sliders with automatic playback disabled. All charts expose text values or tables; illustrations are decorative to screen readers. Prerendered HTML includes article prose and initial figures.

The shared registry adds entries to sitemap, search and prerendered pages. Search remains metadata-only at 42,786 serialized characters for the tested 106-guide collection, within the unchanged 43,000-character ceiling.

`supabase/011_visual_labs.sql` is an additive optional CMS seed with `ON CONFLICT (slug) DO NOTHING`. It preserves existing CMS edits and is not applied remotely by this release. The current production site uses bundled articles. As documented for the earlier batch, the existing configured-CMS list endpoint caps at 100 rows; enabling CMS for the full collection needs a separately scoped pagination change.

## Validation

`npm run check` passes TypeScript, 330 unit tests and the production build. Twenty-four browser checks cover all seven visual articles on desktop Chromium, mobile Chromium and mobile Safari: figure counts, image loading, horizontal overflow, article accessibility, keyboard controls, probability boundaries, metric changes, queue arithmetic, reduced motion and existing scroll reversal. Both new replays also pass mobile playback, pause and scroll-direction checks. Original covers and figures are visually inspected at desktop and 320px mobile widths. The optional SQL seed is checked for content equality and rerun safety in PGlite. Release verification checks the live articles, images, sitemap/search entries and preservation of all previous article records.
