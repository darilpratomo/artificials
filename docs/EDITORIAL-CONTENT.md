# Editorial collection

The 20 September 2026 collection adds 16 original English explainers in `shared/editorial-collection.ts`, bringing the public collection to 21 guides. These are educational articles, not breaking-news reports. Publication dates describe editorial publication, not a model release. Primary documentation and research were checked during writing; links at the end of each article identify the technical background.

Each guide uses its own structure, applied examples, and decision process. No external article was copied or mechanically paraphrased. Illustrative scenarios and arithmetic are not benchmark results, provider prices, customer case studies, or evidence of product performance. The older diffusion-evaluation documentation is explicitly identified as such in the image-model guide. No claim is made that publication volume guarantees search traffic or rankings.

## Long-form collection

A second collection on 20 September 2026 adds six articles in `shared/editorial-deep-dives.ts`, bringing the total to 27. Each contains approximately 1,650–1,820 words, about three times the preceding collection's 523–577 words per article. Topics cover reasoning and inference budgets, embedding migrations, model releases, voice interaction, compact models and distillation, and synthetic-data quality. Each has a sustained original worked scenario, practical decision criteria, limitations, section navigation, and checked primary references. Research papers are identified as background evidence rather than breaking announcements or proof of an application's performance.

Apply `supabase/004_editorial_deep_dives.sql` when using the database-backed CMS. Like the earlier content migration, it inserts missing slugs only and does not overwrite CMS edits. The public static collection and sitemap include the new articles automatically on deployment while CMS is unconfigured.

## Publishing and maintaining

### Systems collection, 27 September 2026

`shared/editorial-systems.ts` adds 20 original English explainers (693–794 words each,
14,615 words in total), bringing the static collection to 47 articles. Subjects include
MoE routing, KV-cache capacity, speculative decoding, LoRA, preference data, multilingual
tokenization, vision inputs, image consistency, video evaluation, transcription, SQL,
permission-aware retrieval, memory, idempotency, MCP connections, contamination,
ranking uncertainty, energy measurement, browser inference, and agent traces.

These are educational insights, not announcements of new products. Research claims are
attributed to the linked primary papers or official documentation. Proposed experiments,
decision checklists, and fictional scenarios are original editorial analysis; numerical
examples do not claim observed benchmark results. No source article was copied or
mechanically rewritten. Older research is presented as background, not current rankings.

Each new article has a distinct AI-generated cover, a 640px responsive derivative,
descriptive alt text, and matching social/structured-data image metadata. See
[the artwork prompt record](EDITORIAL-SYSTEMS-ASSETS.md). The existing visual layout,
search/filter behavior, navigation, and old article content are unchanged. The only
rendering integration selects the per-article asset in place of a category fallback.

`supabase/006_editorial_systems.sql` contains the same 20 records for a database-backed
CMS. It inserts missing slugs only, preserving existing editorial changes. Applying it
twice is safe. As before, a static deployment does not write to a configured CMS database;
check the live `/api/articles` and sitemap after publishing.

- `shared/content.ts` includes the collection in the static public API, sitemap, metadata, homepage cards, and prerendered article pages.
- When enabling Supabase CMS, apply `supabase/003_editorial_collection.sql` after the existing schema and seed. It inserts only missing slugs and preserves existing CMS edits. After CMS activation, database publication state becomes authoritative; deployment alone does not insert articles into Supabase.
- Each article has a unique title, description, canonical URL, Article structured data, reading-time estimate, linked section navigation, and related reading. The full text is present in static HTML.
- Existing original category illustrations remain responsive WebP assets. Detail-page covers now share both edges of the article text column. See `EDITORIAL-ASSETS.md` for artwork provenance.
- Review technical claims and linked documentation when updating a guide. Keep original worked examples, identify hypothetical numbers, and avoid invented release announcements or model rankings.
- Check Search Console impressions, indexing, and reader engagement after publication. Use those observations to decide what deserves expansion; do not mass-produce near-duplicate pages for keywords.
