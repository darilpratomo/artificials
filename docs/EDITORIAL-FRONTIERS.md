# Frontiers collection: editorial and artwork record

Published collection dated 28 September 2026. Sixteen original English long-form guides, written specifically for Artificials. These are educational analysis, not breaking-news reports or claims of new model releases. Research claims link to primary papers or official documentation near the relevant discussion. All scenarios and workflow recommendations are original editorial examples, not reported experiments. No third-party article, figure, code listing, or dataset is reproduced; linked works retain their authors' copyrights and source-specific licences. Google Developers documentation identifies CC BY 4.0 for its prose; no verbatim passage is reused here.

Only content registration, new article data, cover mappings, images, this record, and an additive CMS seed change. Existing article text, cover assets, layouts, components, styles, routes, APIs and behavior are preserved. The existing content registry supplies prerendered pages, metadata, the runtime sitemap and site search with the new entries.

## Content inventory

Word counts exclude headings and source URLs, and count the main prose only. No shared filler paragraphs are inserted.

| Article                                                                                                                                                      | Prose words | Sections | Unique cover               |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------: | -------: | -------------------------- |
| [Diffusion and flow matching: how image models turn noise into structure](https://artificials.net/news/diffusion-and-flow-matching-image-models)             |        1435 |        9 | frontier-diffusion-flow    |
| [State-space models: a different way to carry context through a sequence](https://artificials.net/news/state-space-models-mamba-sequence-memory)             |        1429 |        9 | frontier-state-space       |
| [Time-series foundation models: forecast the future without leaking it](https://artificials.net/news/time-series-foundation-models-forecasting)              |        1407 |        9 | frontier-forecasting       |
| [Graph neural networks: learning from relationships without losing the problem](https://artificials.net/news/graph-neural-networks-relational-data)          |        1324 |        9 | frontier-graph-learning    |
| [AI recommendations: cold starts, feedback loops, and useful discovery](https://artificials.net/news/recommendation-systems-cold-start-feedback)             |        1442 |        9 | frontier-recommendations   |
| [Training data lineage: know what entered the model before trusting what leaves](https://artificials.net/news/training-data-lineage-deduplication)           |        1382 |        9 | frontier-data-lineage      |
| [AI code review: build an evidence trail before accepting the suggestion](https://artificials.net/news/ai-code-review-evidence-and-human-judgment)           |        1396 |        9 | frontier-code-review       |
| [Document chunking: preserve meaning before optimizing retrieval](https://artificials.net/news/document-chunking-boundaries-retrieval)                       |        1502 |       10 | frontier-chunking          |
| [Multimodal embeddings: search across pictures and words with clearer evidence](https://artificials.net/news/multimodal-embeddings-cross-modal-search)       |        1372 |        9 | frontier-multimodal-search |
| [AI summarization: preserve the numbers, exceptions, and uncertainty](https://artificials.net/news/ai-summarization-numbers-uncertainty)                     |        1470 |       10 | frontier-summarization     |
| [Conformal prediction: useful uncertainty with conditions attached](https://artificials.net/news/conformal-prediction-uncertainty-ai)                        |        1367 |        9 | frontier-conformal         |
| [Federated learning: moving the training without pretending the data is risk-free](https://artificials.net/news/federated-learning-privacy-distributed-data) |        1342 |        9 | frontier-federated         |
| [Machine unlearning: why deleting a record does not erase a trained model](https://artificials.net/news/machine-unlearning-deletion-model-memory)            |        1503 |       10 | frontier-unlearning        |
| [Training checkpoints: recovering the experiment, not just the weights](https://artificials.net/news/ai-training-checkpoints-reproducibility)                |        1449 |       10 | frontier-checkpoints       |
| [AI image descriptions: write for the reader and the task](https://artificials.net/news/ai-accessibility-alt-text-context)                                   |        1496 |       10 | frontier-accessibility     |
| [Batch AI pipelines: make a million small tasks observable and recoverable](https://artificials.net/news/batch-ai-pipelines-retries-quality)                 |        1432 |       10 | frontier-batch-pipelines   |

Total: 22,748 words of new main-body prose.

## Publishing

The production API currently serves the bundled content collection (authentication configuration is disabled). New guides are registered in `shared/content.ts` via `shared/editorial-frontiers.ts`. `supabase/007_editorial_frontiers.sql` is an additive, rerunnable seed for a future or existing configured CMS: `ON CONFLICT (slug) DO NOTHING` preserves edits to existing slugs. The seed does not change schema or delete data. If the site switches to a configured Supabase CMS, apply the seed through the normal private database workflow.

## Artwork

All sixteen images were generated individually with the built-in image_gen tool, using distinct prompts and subjects. They are conceptual editorial illustrations, not photographs of real events or scientific measurements. No API-key-based generation or CLI image model was used. Original PNGs remain in the local generated-image archive.

Workspace assets: `public/editorial/frontier-*.webp`, each at 1200 x 800, plus matching `-small.webp` variants at 640 x 427. Encoded from original 1536 x 1024 PNGs using cwebp quality 86, method 6. These dimensions match the existing ArticleCover srcset without changing the component. Each cover has descriptive alt text in `shared/editorial-covers.ts`.

## Final prompts

Validation before publication: `npm run check` passed (43 test files, 316 tests, TypeScript and production build). Six existing browser checks passed across desktop, mobile Chromium and mobile WebKit. All 16 new article pages passed additional browser checks at 1440px, 320px and 390px for image decoding, navigation and horizontal overflow; the first article at each size also passed an axe accessibility scan. Prerendered titles, canonical URLs, Article schema, alt text and cover metadata were checked for every new article. All 25 distinct primary-source URLs returned HTTP 200. All 47 pre-existing article objects remain unchanged. The additive SQL was executed twice in PGlite and matched the bundled text; a simulated CMS edit survived another execution. New sitemap and search entries were verified through the existing implementations.

### diffusion-flow

Article: `diffusion-and-flow-matching-image-models`. Assets: `public/editorial/frontier-diffusion-flow.webp` and `public/editorial/frontier-diffusion-flow-small.webp`.

Use case: stylized-concept. Asset: one original Artificials editorial cover, landscape 1536x1024. Subject: A half-formed porcelain nautilus shell emerges from an orderly cloud of silver dust, its left side granular and right side precisely sculpted. Wide macro scene on black slate. Style: sophisticated technology magazine photorealistic 3D illustration; tactile silver, graphite, porcelain and optical glass, restrained cool-white lighting, rich charcoal background. Strong distinctive composition legible as a small thumbnail and in a wide crop. Keep main object inside safe central 80 percent. No text, lettering, digits, logos, watermark, screens, charts, borders, collage or grid. This is a conceptual illustration, not a real product photograph.

### state-space

Article: `state-space-models-mamba-sequence-memory`. Assets: `public/editorial/frontier-state-space.webp` and `public/editorial/frontier-state-space-small.webp`.

Use case: stylized-concept. Asset: one original Artificials editorial cover, landscape 1536x1024. Subject: A continuous liquid-silver ribbon threads through a row of translucent lenses and becomes a compact luminous core at the far end. Side-view optical laboratory sculpture. Style: sophisticated technology magazine photorealistic 3D illustration; tactile silver, graphite, porcelain and optical glass, restrained cool-white lighting, rich charcoal background. Strong distinctive composition legible as a small thumbnail and in a wide crop. Keep main object inside safe central 80 percent. No text, lettering, digits, logos, watermark, screens, charts, borders, collage or grid. This is a conceptual illustration, not a real product photograph.

### forecasting

Article: `time-series-foundation-models-forecasting`. Assets: `public/editorial/frontier-forecasting.webp` and `public/editorial/frontier-forecasting-small.webp`.

Use case: stylized-concept. Asset: one original Artificials editorial cover, landscape 1536x1024. Subject: A silver tidal waveform rises from a dark horizontal sea, then splits into several delicate translucent future arcs beyond a thin vertical glass pane. No graph axes or numbers. Style: sophisticated technology magazine photorealistic 3D illustration; tactile silver, graphite, porcelain and optical glass, restrained cool-white lighting, rich charcoal background. Strong distinctive composition legible as a small thumbnail and in a wide crop. Keep main object inside safe central 80 percent. No text, lettering, digits, logos, watermark, screens, charts, borders, collage or grid. This is a conceptual illustration, not a real product photograph.

### graph-learning

Article: `graph-neural-networks-relational-data`. Assets: `public/editorial/frontier-graph-learning.webp` and `public/editorial/frontier-graph-learning-small.webp`.

Use case: stylized-concept. Asset: one original Artificials editorial cover, landscape 1536x1024. Subject: An intricate suspended mobile of graphite spheres and polished silver rods forms three visibly different neighborhoods. Asymmetrical overhead composition with one connection illuminated. Style: sophisticated technology magazine photorealistic 3D illustration; tactile silver, graphite, porcelain and optical glass, restrained cool-white lighting, rich charcoal background. Strong distinctive composition legible as a small thumbnail and in a wide crop. Keep main object inside safe central 80 percent. No text, lettering, digits, logos, watermark, screens, charts, borders, collage or grid. This is a conceptual illustration, not a real product photograph.

### recommendations

Article: `recommendation-systems-cold-start-feedback`. Assets: `public/editorial/frontier-recommendations.webp` and `public/editorial/frontier-recommendations-small.webp`.

Use case: stylized-concept. Asset: one original Artificials editorial cover, landscape 1536x1024. Subject: An elegant mechanical record selector with blank silver discs, a curved selection arm and one unusual translucent disc outside the main stack. Editorial still-life. Style: sophisticated technology magazine photorealistic 3D illustration; tactile silver, graphite, porcelain and optical glass, restrained cool-white lighting, rich charcoal background. Strong distinctive composition legible as a small thumbnail and in a wide crop. Keep main object inside safe central 80 percent. No text, lettering, digits, logos, watermark, screens, charts, borders, collage or grid. This is a conceptual illustration, not a real product photograph.

### data-lineage

Article: `training-data-lineage-deduplication`. Assets: `public/editorial/frontier-data-lineage.webp` and `public/editorial/frontier-data-lineage-small.webp`.

Use case: stylized-concept. Asset: one original Artificials editorial cover, landscape 1536x1024. Subject: A long silver woven fabric unravels into individually traceable threads leading back to distinct glass spools. Museum-grade textile sculpture, oblique overhead view. Style: sophisticated technology magazine photorealistic 3D illustration; tactile silver, graphite, porcelain and optical glass, restrained cool-white lighting, rich charcoal background. Strong distinctive composition legible as a small thumbnail and in a wide crop. Keep main object inside safe central 80 percent. No text, lettering, digits, logos, watermark, screens, charts, borders, collage or grid. This is a conceptual illustration, not a real product photograph.

### code-review

Article: `ai-code-review-evidence-and-human-judgment`. Assets: `public/editorial/frontier-code-review.webp` and `public/editorial/frontier-code-review-small.webp`.

Use case: stylized-concept. Asset: one original Artificials editorial cover, landscape 1536x1024. Subject: A precision jeweler's loupe above a tiny metallic bridge reveals a hairline gap in one joint, with a second intact bridge softly out of focus. Dramatic macro still life. Style: sophisticated technology magazine photorealistic 3D illustration; tactile silver, graphite, porcelain and optical glass, restrained cool-white lighting, rich charcoal background. Strong distinctive composition legible as a small thumbnail and in a wide crop. Keep main object inside safe central 80 percent. No text, lettering, digits, logos, watermark, screens, charts, borders, collage or grid. This is a conceptual illustration, not a real product photograph.

### chunking

Article: `document-chunking-boundaries-retrieval`. Assets: `public/editorial/frontier-chunking.webp` and `public/editorial/frontier-chunking-small.webp`.

Use case: stylized-concept. Asset: one original Artificials editorial cover, landscape 1536x1024. Subject: A sculptural folded silver book separates into interlocking curved page segments, with a seam carefully aligned across two pieces. Close-up dark studio composition. Style: sophisticated technology magazine photorealistic 3D illustration; tactile silver, graphite, porcelain and optical glass, restrained cool-white lighting, rich charcoal background. Strong distinctive composition legible as a small thumbnail and in a wide crop. Keep main object inside safe central 80 percent. No text, lettering, digits, logos, watermark, screens, charts, borders, collage or grid. This is a conceptual illustration, not a real product photograph.

### multimodal-search

Article: `multimodal-embeddings-cross-modal-search`. Assets: `public/editorial/frontier-multimodal-search.webp` and `public/editorial/frontier-multimodal-search-small.webp`.

Use case: stylized-concept. Asset: one original Artificials editorial cover, landscape 1536x1024. Subject: A frosted glass photographic frame and a folded silver speech ribbon cast matching geometric shadows on a charcoal plane. Clean conceptual optical still life. Style: sophisticated technology magazine photorealistic 3D illustration; tactile silver, graphite, porcelain and optical glass, restrained cool-white lighting, rich charcoal background. Strong distinctive composition legible as a small thumbnail and in a wide crop. Keep main object inside safe central 80 percent. No text, lettering, digits, logos, watermark, screens, charts, borders, collage or grid. This is a conceptual illustration, not a real product photograph.

### summarization

Article: `ai-summarization-numbers-uncertainty`. Assets: `public/editorial/frontier-summarization.webp` and `public/editorial/frontier-summarization-small.webp`.

Use case: stylized-concept. Asset: one original Artificials editorial cover, landscape 1536x1024. Subject: A tall delicate column of clear glass vessels channels multiple thin silver streams into one shallow bowl while three small distinct beads remain visible. Abstract editorial distillation sculpture. Style: sophisticated technology magazine photorealistic 3D illustration; tactile silver, graphite, porcelain and optical glass, restrained cool-white lighting, rich charcoal background. Strong distinctive composition legible as a small thumbnail and in a wide crop. Keep main object inside safe central 80 percent. No text, lettering, digits, logos, watermark, screens, charts, borders, collage or grid. This is a conceptual illustration, not a real product photograph.

### conformal

Article: `conformal-prediction-uncertainty-ai`. Assets: `public/editorial/frontier-conformal.webp` and `public/editorial/frontier-conformal-small.webp`.

Use case: stylized-concept. Asset: one original Artificials editorial cover, landscape 1536x1024. Subject: A polished silver sphere enclosed in concentric translucent flexible shells, with one small satellite just outside the outer shell. Oblique close-up, soft rim lighting. Style: sophisticated technology magazine photorealistic 3D illustration; tactile silver, graphite, porcelain and optical glass, restrained cool-white lighting, rich charcoal background. Strong distinctive composition legible as a small thumbnail and in a wide crop. Keep main object inside safe central 80 percent. No text, lettering, digits, logos, watermark, screens, charts, borders, collage or grid. This is a conceptual illustration, not a real product photograph.

### federated

Article: `federated-learning-privacy-distributed-data`. Assets: `public/editorial/frontier-federated.webp` and `public/editorial/frontier-federated-small.webp`.

Use case: stylized-concept. Asset: one original Artificials editorial cover, landscape 1536x1024. Subject: Four isolated stone islands each hold a silver seedling, with fine white light paths converging above the water into a suspended glass prism. Atmospheric miniature landscape. Style: sophisticated technology magazine photorealistic 3D illustration; tactile silver, graphite, porcelain and optical glass, restrained cool-white lighting, rich charcoal background. Strong distinctive composition legible as a small thumbnail and in a wide crop. Keep main object inside safe central 80 percent. No text, lettering, digits, logos, watermark, screens, charts, borders, collage or grid. This is a conceptual illustration, not a real product photograph.

### unlearning

Article: `machine-unlearning-deletion-model-memory`. Assets: `public/editorial/frontier-unlearning.webp` and `public/editorial/frontier-unlearning-small.webp`.

Use case: stylized-concept. Asset: one original Artificials editorial cover, landscape 1536x1024. Subject: A sculpted silver tree has one branch delicately removed while its subtle reflection persists inside a smoky glass block beneath it. Poetic minimal still-life. Style: sophisticated technology magazine photorealistic 3D illustration; tactile silver, graphite, porcelain and optical glass, restrained cool-white lighting, rich charcoal background. Strong distinctive composition legible as a small thumbnail and in a wide crop. Keep main object inside safe central 80 percent. No text, lettering, digits, logos, watermark, screens, charts, borders, collage or grid. This is a conceptual illustration, not a real product photograph.

### checkpoints

Article: `ai-training-checkpoints-reproducibility`. Assets: `public/editorial/frontier-checkpoints.webp` and `public/editorial/frontier-checkpoints-small.webp`.

Use case: stylized-concept. Asset: one original Artificials editorial cover, landscape 1536x1024. Subject: An intricate mechanical chronometer without numerals floats in exploded layers, its gears and springs held in precise alignment above a closed matching case. Silver and graphite macro scene. Style: sophisticated technology magazine photorealistic 3D illustration; tactile silver, graphite, porcelain and optical glass, restrained cool-white lighting, rich charcoal background. Strong distinctive composition legible as a small thumbnail and in a wide crop. Keep main object inside safe central 80 percent. No text, lettering, digits, logos, watermark, screens, charts, borders, collage or grid. This is a conceptual illustration, not a real product photograph.

### accessibility

Article: `ai-accessibility-alt-text-context`. Assets: `public/editorial/frontier-accessibility.webp` and `public/editorial/frontier-accessibility-small.webp`.

Use case: stylized-concept. Asset: one original Artificials editorial cover, landscape 1536x1024. Subject: A silver embossed relief of a mountain unfolds from a flat dark picture frame into a tactile three-dimensional landscape, lit with gentle grazing light. Elegant gallery sculpture. Style: sophisticated technology magazine photorealistic 3D illustration; tactile silver, graphite, porcelain and optical glass, restrained cool-white lighting, rich charcoal background. Strong distinctive composition legible as a small thumbnail and in a wide crop. Keep main object inside safe central 80 percent. No text, lettering, digits, logos, watermark, screens, charts, borders, collage or grid. This is a conceptual illustration, not a real product photograph.

### batch-pipelines

Article: `batch-ai-pipelines-retries-quality`. Assets: `public/editorial/frontier-batch-pipelines.webp` and `public/editorial/frontier-batch-pipelines-small.webp`.

Use case: stylized-concept. Asset: one original Artificials editorial cover, landscape 1536x1024. Subject: A wide miniature conveyor with distinct silver parcels passes through three glass inspection gates, with a small side lane holding one parcel for review. Architectural top-down perspective. Style: sophisticated technology magazine photorealistic 3D illustration; tactile silver, graphite, porcelain and optical glass, restrained cool-white lighting, rich charcoal background. Strong distinctive composition legible as a small thumbnail and in a wide crop. Keep main object inside safe central 80 percent. No text, lettering, digits, logos, watermark, screens, charts, borders, collage or grid. This is a conceptual illustration, not a real product photograph.
