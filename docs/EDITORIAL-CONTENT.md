# Editorial collection

The 20 September 2026 collection adds 16 original English explainers in `shared/editorial-collection.ts`, bringing the public collection to 21 guides. These are educational articles, not breaking-news reports. Publication dates describe editorial publication, not a model release. Primary documentation and research were checked during writing; links at the end of each article identify the technical background.

Each guide uses its own structure, applied examples, and decision process. No external article was copied or mechanically paraphrased. Illustrative scenarios and arithmetic are not benchmark results, provider prices, customer case studies, or evidence of product performance. The older diffusion-evaluation documentation is explicitly identified as such in the image-model guide. No claim is made that publication volume guarantees search traffic or rankings.

## Publishing and maintaining

- `shared/content.ts` includes the collection in the static public API, sitemap, metadata, homepage cards, and prerendered article pages.
- When enabling Supabase CMS, apply `supabase/003_editorial_collection.sql` after the existing schema and seed. It inserts only missing slugs and preserves existing CMS edits. After CMS activation, database publication state becomes authoritative; deployment alone does not insert articles into Supabase.
- Each article has a unique title, description, canonical URL, Article structured data, reading-time estimate, linked section navigation, and related reading. The full text is present in static HTML.
- Existing original category illustrations remain responsive WebP assets. Detail-page covers now share both edges of the article text column. See `EDITORIAL-ASSETS.md` for artwork provenance.
- Review technical claims and linked documentation when updating a guide. Keep original worked examples, identify hypothetical numbers, and avoid invented release announcements or model rankings.
- Check Search Console impressions, indexing, and reader engagement after publication. Use those observations to decide what deserves expansion; do not mass-produce near-duplicate pages for keywords.
