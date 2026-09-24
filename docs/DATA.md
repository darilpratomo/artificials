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
or republished. A paid key alone is not proof of redistribution permission. OpenRouter's
public endpoint data includes latency and throughput fields, but they were empty for current
models when checked on 24 September 2026, and its terms of service prohibit automated copying
of information from the service. It is not used. Artificials does not run its own paid speed
tests, so **no speed or latency figures are shown**; profiles say so plainly. Before adding a
benchmark feed, obtain the necessary rights for this public commercial site, verify the model
and exact metric, and preserve its methodology, measurement date and source attribution.
Do not mix scores from different benchmark methods into a single overall ranking.

Capability rankings now live separately in `public/data/benchmarks.json` and appear by default
on `/leaderboard`. `scripts/sync-benchmarks.mjs` ingests published LiveBench task scores,
Epoch AI's own benchmark evaluations and capability index, and T2I-CoReBench image-generation
results. The six-hour catalog workflow refreshes both sources,
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

### Epoch AI

`scripts/lib/epoch.ts` reads Epoch AI's published archive (`https://epoch.ai/data/benchmark_data.zip`).
Epoch licenses **its own** data under CC BY 4.0. The archive also bundles results from other
projects (files ending in `_external`), which keep their original licences; those are never
imported. The parser refuses to publish if the README's licence text changes, if a benchmark
moves or is marked superseded, if a column disappears, or if a score leaves 0–1.

Imported tests: GPQA Diamond, Mock AIME 2024–2025 (OTIS), FrontierMath Tiers 1–3 and Tier 4
(v2), MATH Level 5, SWE-bench Verified, SimpleQA Verified and chess puzzles. Scores are
converted to percentages. A configuration tested twice keeps only its latest run. Standard
errors and evaluation dates are kept. The Epoch Capabilities Index (ECI) is published as its
own category with `unit: "index"`: it is open-ended, has confidence bounds, and is never shown
as a percentage. Each ECI row carries the model versions it was built from, taken from
`processed_data_for_eci.csv`; only that mapping is used from the file, not its bundled
third-party scores. Two first-party tests (mystery game puzzles, EBR-bench) are skipped
because they could not be described accurately.

Views show when results were last checked and the test's methodology. Credits appear in a
compact "Sources and method" note and in the rankings footnote, rather than as prominent
links; the licences require attribution, and Artificials does not claim to run these tests.

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

## Model profiles

`/models/:slug` is one page per underlying model, grouping every host that sells it. Profiles
are built by `scripts/build-model-profiles.mjs` from the two committed snapshots, at the start
of every `npm run build` and `npm run dev`. The output in `public/data/models/` is generated,
git-ignored and deployed with the build: 128 bucket files (FNV-1a hash of the slug),
`directory.json` for the Worker and search, and `links.json` for rankings.

Grouping: `modelSlug()` lower-cases the model id, drops a host path prefix, Bedrock region and
vendor prefixes, the Bedrock `-v1:0` suffix and routing suffixes such as `:free` or `@date`.
Versions and dated snapshots are kept, because two snapshots can behave differently; an
undated alias and a dated snapshot are therefore separate profiles.

Benchmark matching is conservative, because a wrong match shows one model's score on
another's page. A row may match its exact name, or the name with configuration markers
removed: Epoch's `_effort` suffix, an explicit `-high-effort`, a thinking mode, or a trailing
date. A bare `-max` is never removed ("Qwen3 Max" is not "Qwen3"). A row never attaches when
its evaluator's attribution contradicts the model's maker. The exact configuration name is
always shown next to each score. Unmatched rows still appear in rankings, unlinked.

Calculated by Artificials, and labelled as such: standing among tested models, ranks per test
(never combined across tests), blended price (three input tokens per output token), cost
estimates, token-to-word conversions (0.75 words per token, 500 words per page, English), and
similar models (nearest on the capability index).

Prices: a listing with **both** prices at $0 is a free tier or access bundled into a
subscription (for example plan-based providers). It is labelled "No per-token charge" and is
never used as a model's lowest price. When several hosts tie on the lowest list price, the
maker's own listing is named, and no single host gets a "Lowest price" badge.

The Worker serves `/models/*` first: it reads `directory.json` (cached per isolate for five
minutes), returns the app shell with the model's title, description and canonical URL, and a
real 404 with `noindex` for unknown or malformed slugs. The sitemap lists profiles that have
benchmark results or at least three hosts.
