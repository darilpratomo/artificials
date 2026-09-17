# Model data and provenance

Artificials uses the [models.dev catalog](https://models.dev/api.json), an MIT-licensed,
community-maintained dataset. Its [official documentation](https://github.com/anomalyco/models.dev)
describes provider-model offerings, prices per million tokens, context limits and capabilities.
The full license and SVG attribution are published at `/providers/LICENSE.txt`.

The catalog is **not a real-time census of every AI model**. It includes the offerings
covered by models.dev, which can lag a provider's launch, withdrawal or price change.
A serving provider may host a model made by another company. A model served through
several providers is several offerings, not several unique underlying models.
Catalog records include their exact source URL, provider documentation, and the snapshot's
retrieval time. Verify pricing and availability with the provider before purchasing.

## Automatic updates within free hosting limits

Run `node scripts/sync-catalog.mjs` with Node 24 LTS. The script downloads the **entire**
source; no arbitrary first-50 cap is applied. The scheduled GitHub workflow runs this script,
validates the result and publishes a new deployment when configured. A failed download or
validation does not publish a replacement. Existing deployed data remains available.

The sync accepts HTTPS from one fixed source, disables redirects, enforces a 25-second
network timeout and a 16 MiB response limit. It rejects empty/tiny catalogs and unexpected
losses of more than 25% of existing offerings. If a large legitimate cleanup occurs, review
upstream changes before manually running `node scripts/sync-catalog.mjs --accept-shrink`.
No provider API credentials are required for the public catalog. Automated sync and hosting
remain subject to GitHub and Cloudflare free quotas, service availability and upstream access.

We intentionally run normalization in GitHub's Node process, not on each website visit.
Parsing and normalizing the source is too much CPU for a Cloudflare Worker Free request's
budget. The script produces:

- `/data/catalog.json`: complete normalized snapshot, available as a download.
- `/data/catalog-index.json`: compact search metadata with shared string values and precomputed sort order.
- `/data/catalog-first/*.json`: 15 ready-to-serve first pages covering common sizes and sorts; avoids index parsing on landing-page requests.
- `/data/catalog-summary.json`: small statistics and featured provider records.
- `/data/catalog-shards/*.json`: 32 records per file, used to load only visible results.

Unfiltered first pages at sizes 20, 24 and 40 stream directly from static assets. Filtered
requests keep the compact index in isolate memory and load only necessary detail shards.
The default page has 24 offerings; the maximum is 40 to stay below Cloudflare Free's 50
subrequest limit. Pagination covers the entire dataset. No request contacts a model provider.
CDN/browser cache headers allow a five-minute browser cache and one-hour shared cache;
a deployment's retrieval time remains visible, so users can judge actual freshness.

## API

`GET /api/catalog/summary` returns source metadata, `updatedAt`, total offering/provider
counts, reasoning/open-weight counts, provider metadata and eight featured provider records.
Featured means the newest source-reported text-output offering per selected provider,
not a quality endorsement. It is selected automatically, never assigned a performance score.

`GET /api/catalog?query=claude&provider=anthropic&sort=context&page=1&limit=24`
returns source/summary fields, `models`, `total`, `page`, `pageCount`, `limit` and `sort`.
Supported filters: `query`, exact `provider`, exact `modality`, `reasoning=true|false`,
`openWeights=true|false`. Sorts: `name`, `newest`, `context`, `input-price`, `output-price`.
`ids` accepts up to three comma-separated full offering IDs for saved comparisons.
Always URL-encode query parameters.

Unknown prices/context/dates are `null` and sort last. An explicit zero price stays zero.
Prices are base USD per million tokens where reported. They exclude tiered pricing,
caching discounts, taxes and special image/audio billing. Context is source-reported tokens,
not intelligence or response quality. `releaseDate` can be month-only when the source does
not specify a day. Capability flags are true only when explicitly reported by the source.

## Rankings and measured benchmarks

Context-window and price rankings are deterministic catalog metric rankings. They **do not**
measure intelligence, accuracy, speed or reliability. No fake benchmark, latency or throughput
is created to fill a UI. Each record's `benchmark` is absent by default and the snapshot says
`benchmarkStatus: "unavailable"`.

The [Artificial Analysis API](https://artificialanalysis.ai/data-api) currently limits free API
access to internal use and forbids redistribution. Its free scores are therefore not imported
or republished. A paid key alone is not proof of redistribution permission. Before adding a
benchmark feed, obtain the necessary rights for this public commercial site, verify the model
and exact metric, and preserve its methodology, measurement date and source attribution.
Do not mix scores from different benchmark methods into a single overall ranking.

Capability rankings now live separately in `public/data/benchmarks.json` and appear by default
on `/leaderboard`. `scripts/sync-benchmarks.mjs` ingests published LiveBench task scores and
T2I-CoReBench image-generation results. The six-hour catalog workflow refreshes both sources,
validates them, runs checks, and commits the complete snapshots for native Cloudflare deploy.
Failed source retrieval/schema checks leave the last successful published deployment intact.
Requests have time and size limits; unexpected category changes or loss of over 25% of a
category's rows require review. `--accept-shrink` is an explicit operator override, never automatic.

LiveBench files are pinned to one upstream Git commit; the newest published release is selected
from its file listing. Category scores are arithmetic means of complete task results. Overall
is an equal-weight mean of category means, not of all individual tasks. Missing results are
excluded from the affected view; zero remains a valid score. Exact model/effort identifiers
are preserved. Ties at two-decimal display precision receive competition ranks (1, 1, 3).

Image rankings use the primary Gemini 2.5 Flash evaluator table from T2I-CoReBench and its
published overall values. These assess composition/reasoning, not universal image quality or
human aesthetic preferences. Prompt-rewriting variants and other evaluator tables are excluded.
Only models evaluated by that source appear. This source updates less often than model releases.

Both views show source-check time, benchmark edition/evaluator, source revision time and
methodology. A check timestamp is not an evaluation date. Checks older than 48 hours show an
update-delay notice; no claim of instantaneous real-time coverage is made.

Attribution, licenses and normalization changes are recorded in `/data/benchmark-NOTICE.txt`.
LiveBench's datasheet licenses the benchmark suite under Apache-2.0, with a bundled license
copy. The T2I-CoReBench website is CC BY-SA 4.0; the adapted image-result portion of the JSON
retains that license. Artificials' original UI does not copy the source site's implementation.

## Logos

26 commonly used provider marks are bundled locally from models.dev's SVG repository.
They are restricted to static SVG drawing elements, sanitized, and served as images rather
than injected HTML. Other providers use an original neutral geometric mark. No visitor
request is sent to an external image host. Logos identify providers; trademarks remain with
their owners and do not imply a partnership. `providerLogo(id)` always returns an existing
local file or the generic fallback.
