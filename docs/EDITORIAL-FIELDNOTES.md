# Fieldnotes collection: content, sources, and artwork

Eight original English long-form AI explainers, added on 28 September 2026. These are educational articles, not breaking-news reports. Each uses original explanations and clearly hypothetical scenarios, with short attributed descriptions of research and links to primary sources. No third-party prose, research figures, tables, or code are reproduced. The article bodies contain no fabricated model rankings, measurements, or claims of new releases.

## Content inventory

Word counts include main-body prose only, excluding headings, source URLs, and the closing Sources and rights notes. Existing articles and their assets are preserved.

| Article                                                                                                                                                  | Prose words | Sections | Unique cover              |
| -------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------: | -------: | ------------------------- |
| [FlashAttention: why moving less data can make AI faster](https://artificials.net/news/flashattention-gpu-memory-movement)                               |        1455 |       10 | fieldnotes-flashattention |
| [Neural network pruning: fewer weights do not guarantee faster inference](https://artificials.net/news/neural-network-pruning-sparse-inference)          |        1433 |       10 | fieldnotes-pruning        |
| [Promptable segmentation: turn an outline into a useful image mask](https://artificials.net/news/promptable-image-segmentation-masks)                    |        1373 |        9 | fieldnotes-segmentation   |
| [Tabular AI: choose a model for the rows you actually have](https://artificials.net/news/tabular-ai-trees-neural-networks)                               |        1464 |       10 | fieldnotes-tabular        |
| [Differential privacy in AI: define the protection before training](https://artificials.net/news/differential-privacy-model-training)                    |        1382 |        9 | fieldnotes-privacy        |
| [Approximate vector search: find useful neighbors without visiting every point](https://artificials.net/news/approximate-nearest-neighbor-vector-search) |        1426 |       10 | fieldnotes-vector-search  |
| [Test-time adaptation: when an AI model changes while it is being used](https://artificials.net/news/test-time-adaptation-distribution-shift)            |        1450 |       10 | fieldnotes-adaptation     |
| [Multi-task learning: when sharing a model helps and when tasks compete](https://artificials.net/news/multi-task-learning-negative-transfer)             |        1460 |       10 | fieldnotes-multitask      |

Total: **11,443 prose words**. Each article has at least 1,300 words before source and rights notes.

## Integration

Articles live in `shared/editorial-fieldnotes.ts`, registered in `shared/content.ts`. Cover mappings are additive in `shared/editorial-covers.ts`. The existing rendering, routing, metadata, sitemap, and search mechanisms consume the new entries without production code or UI changes. `supabase/009_editorial_fieldnotes.sql` is an optional additive CMS seed using `ON CONFLICT (slug) DO NOTHING`; it preserves existing CMS edits and is safe to rerun. No production database migration is required for the bundled-content configuration.

The existing search-index size guard is adjusted from 40,000 to 42,000 characters to accommodate eight additional title/summary records. The index still contains only article metadata, never article bodies. Search implementation and existing article excerpts remain unchanged.

## Sources and rights

Each article names and links its primary research or documentation near the relevant discussion and includes a Sources and rights note. The following records the terms found on the source pages. An arXiv distribution licence permits arXiv to host a paper; it does not grant a general right to reuse that paper. Linked software, datasets, and model weights may have separate licences. Sources are referenced, not republished.

| Primary source                                                                                                                               | Source licence or rights                                                                                                                     |
| -------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| [FlashAttention: Fast and Memory-Efficient Exact Attention with IO-Awareness](https://arxiv.org/abs/2205.14135)                              | [arXiv non-exclusive distribution licence; authors retain copyright](https://arxiv.org/licenses/nonexclusive-distrib/1.0/)                   |
| [FlashAttention-2: Faster Attention with Better Parallelism and Work Partitioning](https://arxiv.org/abs/2307.08691)                         | [arXiv non-exclusive distribution licence; authors retain copyright](https://arxiv.org/licenses/nonexclusive-distrib/1.0/)                   |
| [The Lottery Ticket Hypothesis: Finding Sparse, Trainable Neural Networks](https://arxiv.org/abs/1803.03635)                                 | [arXiv non-exclusive distribution licence; authors retain copyright](https://arxiv.org/licenses/nonexclusive-distrib/1.0/)                   |
| [SparseGPT: Massive Language Models Can Be Accurately Pruned in One-Shot](https://arxiv.org/abs/2301.00774)                                  | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)                                                                                    |
| [Segment Anything](https://arxiv.org/abs/2304.02643)                                                                                         | [arXiv non-exclusive distribution licence; authors retain copyright](https://arxiv.org/licenses/nonexclusive-distrib/1.0/)                   |
| [SAM 2: Segment Anything in Images and Videos](https://arxiv.org/abs/2408.00714)                                                             | [arXiv non-exclusive distribution licence; authors retain copyright](https://arxiv.org/licenses/nonexclusive-distrib/1.0/)                   |
| [Why do tree-based models still outperform deep learning on tabular data?](https://arxiv.org/abs/2207.08815)                                 | [arXiv non-exclusive distribution licence; authors retain copyright](https://arxiv.org/licenses/nonexclusive-distrib/1.0/)                   |
| [Revisiting Deep Learning Models for Tabular Data](https://arxiv.org/abs/2106.11959)                                                         | [arXiv non-exclusive distribution licence; authors retain copyright](https://arxiv.org/licenses/nonexclusive-distrib/1.0/)                   |
| [Deep Learning with Differential Privacy](https://arxiv.org/abs/1607.00133)                                                                  | [arXiv non-exclusive distribution licence; authors retain copyright](https://arxiv.org/licenses/nonexclusive-distrib/1.0/)                   |
| [Efficient and robust approximate nearest neighbor search using Hierarchical Navigable Small World graphs](https://arxiv.org/abs/1603.09320) | [arXiv non-exclusive distribution licence; authors retain copyright](https://arxiv.org/licenses/nonexclusive-distrib/1.0/)                   |
| [Tent: Fully Test-time Adaptation by Entropy Minimization](https://arxiv.org/abs/2006.10726)                                                 | [arXiv non-exclusive distribution licence; authors retain copyright](https://arxiv.org/licenses/nonexclusive-distrib/1.0/)                   |
| [Continual Test-Time Domain Adaptation](https://arxiv.org/abs/2203.13591)                                                                    | [arXiv non-exclusive distribution licence; authors retain copyright](https://arxiv.org/licenses/nonexclusive-distrib/1.0/)                   |
| [Multi-Task Learning Using Uncertainty to Weigh Losses for Scene Geometry and Semantics](https://arxiv.org/abs/1705.07115)                   | [arXiv non-exclusive distribution licence; authors retain copyright](https://arxiv.org/licenses/nonexclusive-distrib/1.0/)                   |
| [Gradient Surgery for Multi-Task Learning](https://arxiv.org/abs/2001.06782)                                                                 | [arXiv non-exclusive distribution licence; authors retain copyright](https://arxiv.org/licenses/nonexclusive-distrib/1.0/)                   |
| [Dwork and Roth: The Algorithmic Foundations of Differential Privacy](https://www.cis.upenn.edu/~aaroth/Papers/privacybook.pdf)              | Copyright 2014 Cynthia Dwork and Aaron Roth; cited only, no content reproduced.                                                              |
| [Opacus FAQ](https://opacus.ai/docs/faq)                                                                                                     | Project identifies [Apache 2.0](https://github.com/pytorch/opacus/blob/main/LICENSE); documentation cited only, no code or prose reproduced. |
| [Faiss index-selection guidance](https://github.com/facebookresearch/faiss/wiki/Guidelines-to-choose-an-index)                               | Software uses [MIT](https://github.com/facebookresearch/faiss/blob/main/LICENSE); wiki guidance cited only, no code or prose reproduced.     |

## Artwork production

All eight covers were generated individually with the built-in `image_gen` tool, using one distinct prompt per article. No CLI/API fallback, external paid image service, or API key was used. They are conceptual AI-generated editorial illustrations, not photographs of real devices, experiments, or events. Each generated output was inspected for subject, composition, text artifacts, and consistency with its article.

Final assets: `public/editorial/fieldnotes-<topic>.webp` at 1200 × 800 and `public/editorial/fieldnotes-<topic>-small.webp` at 640 × 427. Generated 1536 × 1024 originals were resized and encoded with cwebp (quality 84, method 6). The existing responsive image component selects the size. The 16 WebP files total 1,109,704 bytes. Each article uses its own cover and descriptive alt text; no previous image is overwritten.

## Verification

- `npm run check`: TypeScript, 43 test files / 316 tests, private-file guard, production build, prerendering, and social images passed.
- Content audit: 99 articles total; all 91 existing entries are unchanged. New IDs and slugs are unique. Every new article exceeds 1,300 main-prose words; no repeated long paragraphs were found within this batch or against existing articles.
- The search index without maker/test entries contains 41,418 characters; each new search entry matches title, excerpt, category, and route only.
- The optional SQL seed ran twice in PGlite without duplicate rows, exactly matched bundled content, and preserved a preexisting CMS edit on rerun.
- All eight prerendered pages have the expected heading, canonical, Article structured data, cover metadata, and alt text. Sixteen WebP assets have unique hashes and the expected responsive dimensions.
- All eight pages passed browser checks at 1440px Chromium, 320px Chromium, and 390px WebKit with loaded covers, no horizontal overflow, and no page errors. Article filtering and navigation passed in each configuration. Automated axe checks on the FlashAttention page found no violations in each configuration; this is not a complete manual accessibility audit.
- `wrangler deploy --env production --dry-run` passed.

## Final prompts

### flashattention

Assets: `public/editorial/fieldnotes-flashattention.webp` and `public/editorial/fieldnotes-flashattention-small.webp`.

Alt text: Silver ribbon paths loop through a raised glass chamber on a chip resting on dark stone.

Use case: stylized-concept. Asset: original landscape 1536x1024 cover for an Artificials AI explainer. Subject: A compact brushed-silver chip on a dark stone platform, with tightly nested luminous silver ribbon pathways looping through a small raised cache chamber instead of travelling to a distant bank of glass slabs. Precise macro architectural photography. Style: professional technology magazine editorial illustration rendered as photorealistic 3D art; silver, graphite, optical glass and soft white light, rich dark background, realistic material detail. Central subject fully visible with generous crop safety for mobile thumbnails. No text, letters, numbers, brands, logos, charts, UI, watermarks, borders or collage. This is conceptual artwork, not documentation of a real device or experiment.

### pruning

Assets: `public/editorial/fieldnotes-pruning.webp` and `public/editorial/fieldnotes-pruning-small.webp`.

Alt text: An open silver lattice arch stands beside detached metal columns.

Use case: stylized-concept. Asset: original landscape 1536x1024 cover for an Artificials AI explainer. Subject: An intricate silver lattice sculpture with a few complete vertical columns carefully removed and placed beside it, the remaining lattice forming a stable elegant open arch. Hard rim lighting, three-quarter studio still life. Style: professional technology magazine editorial illustration rendered as photorealistic 3D art; silver, graphite, optical glass and soft white light, rich dark background, realistic material detail. Central subject fully visible with generous crop safety for mobile thumbnails. No text, letters, numbers, brands, logos, charts, UI, watermarks, borders or collage. This is conceptual artwork, not documentation of a real device or experiment.

### segmentation

Assets: `public/editorial/fieldnotes-segmentation.webp` and `public/editorial/fieldnotes-segmentation-small.webp`.

Alt text: A silver silhouette surrounds a glass pear and its leaf on dark fabric.

Use case: stylized-concept. Asset: original landscape 1536x1024 cover for an Artificials AI explainer. Subject: A real-looking translucent glass pear and delicate leaf on charcoal cloth, surrounded by a hovering wafer-thin brushed-silver silhouette cutout precisely following the pear shape. Soft gallery lighting, close still-life photograph. Style: professional technology magazine editorial illustration rendered as photorealistic 3D art; silver, graphite, optical glass and soft white light, rich dark background, realistic material detail. Central subject fully visible with generous crop safety for mobile thumbnails. No text, letters, numbers, brands, logos, charts, UI, watermarks, borders or collage. This is conceptual artwork, not documentation of a real device or experiment.

### tabular

Assets: `public/editorial/fieldnotes-tabular.webp` and `public/editorial/fieldnotes-tabular-small.webp`.

Alt text: A branching silver tree and woven metal mesh rise from an ordered grid of graphite blocks.

Use case: stylized-concept. Asset: original landscape 1536x1024 cover for an Artificials AI explainer. Subject: A museum sculpture of ordered graphite cuboids arranged as an uneven data grid; a branching silver tree grows from one side and a smooth woven metal mesh rises from the other. Isometric view, visually balanced, no numbers. Style: professional technology magazine editorial illustration rendered as photorealistic 3D art; silver, graphite, optical glass and soft white light, rich dark background, realistic material detail. Central subject fully visible with generous crop safety for mobile thumbnails. No text, letters, numbers, brands, logos, charts, UI, watermarks, borders or collage. This is conceptual artwork, not documentation of a real device or experiment.

### privacy

Assets: `public/editorial/fieldnotes-privacy.webp` and `public/editorial/fieldnotes-privacy-small.webp`.

Alt text: A frosted glass panel obscures individual silver beads inside a clear circular vessel.

Use case: stylized-concept. Asset: original landscape 1536x1024 cover for an Artificials AI explainer. Subject: A clear circular vessel filled with hundreds of tiny silver beads, viewed through a frosted glass panel that preserves the overall silhouette while obscuring individual beads. A narrow clear edge reveals the material. Restrained premium studio photograph. Style: professional technology magazine editorial illustration rendered as photorealistic 3D art; silver, graphite, optical glass and soft white light, rich dark background, realistic material detail. Central subject fully visible with generous crop safety for mobile thumbnails. No text, letters, numbers, brands, logos, charts, UI, watermarks, borders or collage. This is conceptual artwork, not documentation of a real device or experiment.

### vector-search

Assets: `public/editorial/fieldnotes-vector-search.webp` and `public/editorial/fieldnotes-vector-search-small.webp`.

Alt text: A bright path descends through a layered network of silver spheres toward a small cluster.

Use case: stylized-concept. Asset: original landscape 1536x1024 cover for an Artificials AI explainer. Subject: A dark three-dimensional field of polished silver spheres connected by sparse fine wires at several heights, one elegant bright path winding from a high overlook toward a small cluster on the lower plane. Wide cinematic miniature with depth. Style: professional technology magazine editorial illustration rendered as photorealistic 3D art; silver, graphite, optical glass and soft white light, rich dark background, realistic material detail. Central subject fully visible with generous crop safety for mobile thumbnails. No text, letters, numbers, brands, logos, charts, UI, watermarks, borders or collage. This is conceptual artwork, not documentation of a real device or experiment.

### adaptation

Assets: `public/editorial/fieldnotes-adaptation.webp` and `public/editorial/fieldnotes-adaptation-small.webp`.

Alt text: A silver camera lens on a gimbal faces a curtain of frosted glass droplets.

Use case: stylized-concept. Asset: original landscape 1536x1024 cover for an Artificials AI explainer. Subject: A brushed-metal camera lens on a precise rotating gimbal, half surrounded by crystal-clear air and half by a curtain of frosted glass rain droplets, with a small mechanical return spring visible. Macro editorial photograph. Style: professional technology magazine editorial illustration rendered as photorealistic 3D art; silver, graphite, optical glass and soft white light, rich dark background, realistic material detail. Central subject fully visible with generous crop safety for mobile thumbnails. No text, letters, numbers, brands, logos, charts, UI, watermarks, borders or collage. This is conceptual artwork, not documentation of a real device or experiment.

### multitask

Assets: `public/editorial/fieldnotes-multitask.webp` and `public/editorial/fieldnotes-multitask-small.webp`.

Alt text: Three metal forms share a woven silver trunk with tension cables extending to separate anchors.

Use case: stylized-concept. Asset: original landscape 1536x1024 cover for an Artificials AI explainer. Subject: Three differently shaped polished metal tools emerge from one intricately woven silver trunk, with separate delicate tension cables pulling toward different charcoal anchors. Sculptural still life, asymmetrical composition, studio reflections. Style: professional technology magazine editorial illustration rendered as photorealistic 3D art; silver, graphite, optical glass and soft white light, rich dark background, realistic material detail. Central subject fully visible with generous crop safety for mobile thumbnails. No text, letters, numbers, brands, logos, charts, UI, watermarks, borders or collage. This is conceptual artwork, not documentation of a real device or experiment.
