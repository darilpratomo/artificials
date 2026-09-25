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
benchmark feed, confirm its licence allows republishing on this public, non-commercial site, verify the model
and exact metric, and preserve its methodology, measurement date and source attribution.
Do not mix scores from different benchmark methods into a single overall ranking.

Capability rankings now live separately in `public/data/benchmarks.json` and appear by default
on `/leaderboard`. `scripts/sync-benchmarks.mjs` ingests published LiveBench task scores,
Epoch AI's own benchmark evaluations and capability index, and T2I-CoReBench image-generation
results, and the agent tests DeepSWE, CursorBench and SWE-bench Verified (bash only), plus agent
results and task lengths for the coding agents page (see below). The six-hour catalog workflow refreshes both sources,
validates them, runs checks, and commits the complete snapshots for native Cloudflare deploy.
Failed source retrieval/schema checks leave the last successful published deployment intact.
A benchmark source that is down does not hold back the catalog: the workflow still checks and
publishes the new catalog, then marks the run as failed so the problem stays visible. Requests
to GitHub's API carry the workflow's own token (only ever sent to `api.github.com`), because
anonymous requests from shared workflow runners are often refused.
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
because they could not be described accurately. Capability-index rows also keep Epoch AI's release date
and weight access (open or closed) for each model.

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

Brand marks are shown in their original colours. They come from LobeHub Icons
(`@lobehub/icons-static-svg`, MIT) and are vendored into `public/providers/brand/` by
`scripts/vendor-logos.mjs`, which copies only the marks listed in `BRAND_ICONS`
(`shared/catalog.ts`, hosts and providers) and `MAKER_STYLES` (`shared/makers.ts`, model
makers). The script rejects any SVG with scripts, event handlers, embedded documents,
images or references; marks are served as images, never injected as HTML. Pages draw
them on a light tile so black marks, such as OpenAI's or xAI's, stay visible on the dark
interface. A maker's mark can differ from its cloud's: Microsoft makes Phi, Azure hosts it.

`providerLogo(id)` and `makerLogo(id)` always return an existing local file or the neutral
fallback, so a guess can never show another company's logo. No visitor request goes to an
external image host. Trademarks remain with their owners and do not imply a partnership.

Charts colour each maker with its own brand colour (`MAKER_STYLES`), lifted where needed for
3:1 contrast on the chart surface. Several makers share a blue or an orange, as their brands
do, so colour never identifies a maker alone: every mark sits beside the maker's logo or name.

## Model profiles

`/models/:slug` is one page per underlying model, grouping every host that sells it. Profiles
are built by `scripts/build-model-profiles.mjs` from the two committed snapshots, at the start
of every `npm run build` and `npm run dev`. The output in `public/data/models/` is generated,
git-ignored and deployed with the build: 128 bucket files (FNV-1a hash of the slug),
`directory.json` for the Worker and search, and `links.json` for rankings.

Grouping: `modelSlug()` lower-cases the model id, drops a host path prefix, Bedrock region and
vendor prefixes, the Bedrock `-v1:0` suffix and routing suffixes such as `:free` or `@date`.
Versions and dated snapshots are kept, because two snapshots can behave differently; an
undated alias and a dated snapshot are therefore separate profiles. When variants share a
display name, each gets the part of its id that tells it apart, such as "Claude Opus 5.5
(fast)" or "GPT-4o (2024-08-06)".

Maker: a name pattern (`MAKERS`) identifies the maker. Failing that, a listing by a lab that
only sells its own models counts; any other host is never presented as the maker, and the
profile says "Maker not reported" until a research record names one.

Profile facts prefer the maker's own listing. Otherwise the release date is the earliest
plausible date across hosts (placeholders such as 1970-01-01 are ignored) and the context
window is the most common listed value, so one host's typo cannot inflate it.

Benchmark matching is conservative, because a wrong match shows one model's score on
another's page. A row may match its exact name, or the name with configuration markers
removed: Epoch's `_effort` suffix, an explicit `-high-effort`, a thinking mode, or a trailing
date. A bare `-max` is removed only when another record shows that the same model has a "max"
effort setting (Epoch AI's `name_max` identifiers); otherwise it is kept ("Qwen3 Max" is not
"Qwen3"). A row never attaches when its evaluator's attribution contradicts the model's maker. The exact configuration name is
always shown next to each score. Unmatched rows still appear in rankings, unlinked.

Calculated by Artificials, and labelled as such: standing among tested models, ranks per test
(never combined across tests), blended price (three input tokens per output token), cost
estimates, token-to-word conversions (0.75 words per token, 500 words per page, English), and
similar models (nearest on the capability index).

Prices: a listing with **both** prices at $0 is a free tier or access bundled into a
subscription (for example plan-based providers). It is labelled "No per-token charge" and is
never used as a model's lowest price. When several hosts tie on the lowest list price, the
maker's own listing is named, and no single host gets a "Lowest price" badge.

Research records (`public/data/model-facts.json`) come from Epoch AI's `model_metadata.csv`
and attach the same way as scores, by exact identifier. Profiles show them in a "Research
record" card with Epoch AI's own model name, organization, country, access category, release
date and estimated training compute. Where Epoch AI's release date differs from the catalog's,
both are shown. The file is optional: profiles build without it, and a missing or much smaller
file never stops the benchmark refresh.

Model page analysis (`src/components/profile/analysis.ts`), all calculated by Artificials:

- Comparison class: every model on the capability index. A model that is not on it is ranked as
  one more member, so a rank never exceeds its total.
- Summary tiles rank capability (higher first), price (cheapest first, by the reference blended
  price) and context window (largest first), and show the quarter the model falls in as four
  blocks. For price the blocks measure cost, not quality. Cache discount is one minus the cached
  input price divided by the input price, from the same listing as the price.
- The comparison summary and the questions and answers are written from those figures with fixed
  wording thresholds (top 10% "among the most capable", cheapest quarter "one of the least
  expensive", and so on). They never state anything the page does not show; speed, latency and
  parameter counts are said to be unmeasured or unlisted. The questions are also published as
  schema.org FAQPage data.
- Highlights compare the model with the nine models closest to it on the capability index.
- API providers: blended prices for three workloads, chat (3 input : 1 output), agents with
  caching (7 cached : 2 input : 1 output, using the input price when a listing has no cache
  price) and long answers (1 input : 3 output); the cheapest listing on each price and the
  largest context and reply length; and each listing's own tool-calling and JSON support.

The Worker serves `/models/*` first: it reads `directory.json` (cached per isolate for five
minutes), returns the app shell with the model's title, description and canonical URL, and a
real 404 with `noindex` for unknown or malformed slugs. The sitemap lists profiles that have
benchmark results or at least three hosts.

## Home dashboard

The home page is built from three more generated files in `public/data/models/`:

- `overview.json` (about 17 KB compressed): every model on the capability index with its
  maker, confidence range, release date, weight access, reference price and context window;
  the list of tests; up to 210 recent releases; the leaders; and counts. It is also written
  inline into the prerendered home page, so the first view needs no extra request and search
  engines see the leaders and releases.
- `tests.json`: every test's rows, best configuration per model. Loaded only when a visitor
  picks a single test in the ranking chart.
- `explorer.json`: one row per model for search and the full list. Loaded when the list comes
  near the screen or the search box is used.
- `timeline.json` (about 66 KB compressed): every dated release with its prices, limits,
  capabilities and research record, for the release timeline page at `/releases`.

Definitions, all calculated by Artificials:

- Reference price: the maker's own paid listing, or else the middle paid listing across hosts,
  blended as three input tokens per output token. Free tiers and plans are never used. It is a
  list price, not the cost of any particular task.
- Leaders: the top row of one named test each (capability index, LiveBench coding and agentic
  coding, FrontierMath Tiers 1–3, GPQA Diamond, SWE-bench Verified, SimpleQA Verified,
  T2I-CoReBench), the best open-weights model on the index, the lowest reference price among
  the top ten on the index, the largest listed context window and the newest release. Each card
  names its test and is labelled as a test result, listing data or a calculation.
- Frontier lines: on the price chart, the models no cheaper model beats; on the time chart, each
  new highest score. The shaded region marks above-median score at below-median price.
- Releases: dated profiles up to the snapshot day, newest first. Aliases of one release (same
  maker, name and day) collapse into the most-hosted one. "Known makers" shows models whose maker
  is identified and that the maker sells, several hosts list, or a test covers.
- Waiting for a score: the time chart places only models on the capability index. Known-maker
  releases from about a month before the newest scored model onward, without a score yet, are
  drawn as rings along the time axis, so a new release is visible before any test covers it.
- Market: shares (open weights, reasoning, image input), the median reference price, models with
  a million-token context and releases in the last 30 days, all over known-maker models; makers
  with the most models and their best index score; the most widely hosted models; and the gap
  between the best closed and best open-weights model on the index.

Every chart has a "Download image" button. The image is redrawn on a canvas from the same data
(`src/components/charts/share-image.ts`, loaded on first use), laid out 1600 pixels wide and
exported at 2.5 times that resolution, with the
Artificials pixel mark and wordmark, a faint watermark, `artificials.net` and a data credit line
that the sources' licences require. Phones get the share sheet; other devices get a download.

The home page shows no last-updated time; charts credit their data source beside them. Check
times remain on the rankings page and each model's "Sources and method".

Everything refreshes with the six-hourly workflow: a new model appears in the timeline as soon as
the catalog lists it, and its scores follow once a test covers it. No step needs manual input.
Speed and latency are not shown, because no reliable public source is available to republish.

## Models page

`/models` compares underlying models, not listings. It is built from the same `overview.json` as
the home page, prerendered with that data inline, and shows:

- At a glance: one sentence per measure naming the leaders, each linked to its profile. The most
  capable models on the capability index; the cheapest reference prices among models with a
  score; the largest context windows among models with a score; the most capable open-weights
  models; and the newest releases from known makers.
- Highlights: the ten highest index scores, with the same ten models' reference prices and
  context windows.
- New models: the twelve newest releases from known makers, with their index score when they
  have one, otherwise whether any test covers them yet, and their reference price and context
  window. A new model is listed here before any test covers it.
- The ranking and score, price and time charts from the home page.
- Prices: input, cached input and output list prices of the fifteen most capable models with a
  paid listing, from the same listing as the reference price.
- Context and scale: the largest context windows among models with a score, and Epoch AI's
  training compute estimates on a log scale.
- Every model, sorted by capability index, with models that have no score after them, most
  widely hosted first; and a question list answered from the same data (with `FAQPage`
  structured data).

Host listings, including gateways and resellers, stay under "Provider listings"
(`/models?view=listings`). Links with the old listing filters (`provider`, `modality`, `page`,
`sort`, `reasoning`, `openWeights`, `query`) still open that view.

## Coding agents page

`/coding-agents` compares coding agents (the program around a model that edits files and runs
commands) and the models inside them. It is built from `public/data/models/coding.json`,
generated at build time from `benchmarks.json` and `coding-agents.json`, and prerendered with
that data inline. Artificials is non-commercial, so non-commercial licences such as SWE-bench's
CC BY-NC 4.0 are acceptable; every source is credited beside its chart and in "Sources and
method".

Sources, all refreshed by `scripts/sync-benchmarks.mjs` every six hours:

- Terminal-Bench 2.0 (agent results): one result per agent and model, the share of 89 tasks
  solved, with standard error and run date. The leaderboard's submissions are Apache-2.0 on
  Hugging Face (`harborframework/terminal-bench-2-leaderboard`); scores are read from Epoch AI's
  compilation (`terminalbench_external.csv`), and only while the dataset card states
  `apache-2.0`. Its newest result is from April 2026.
- SWE-bench Verified (agent results and a model test): SWE-bench's `data/leaderboards.json`
  (CC BY-NC 4.0), pinned to one revision and used only while its `LICENSE` file carries that
  licence. Agents' entries count only when they tried each issue once with one model. The
  bash-only runs (every model in mini-SWE-agent) become the model test "SWE-bench Verified,
  bash only", with average API cost and model calls per issue.
- DeepSWE (Datacurve) and CursorBench (Cursor): model tests with average cost, tokens or output
  tokens, and steps per task, read from Epoch AI's compilations (`deepswe_external.csv`,
  `cursorbench_external.csv`). Their publishers state no licence of their own; Epoch AI
  republishes them under CC BY 4.0 and both are credited.
- METR time horizons: the length of software task, in the time skilled people need, that a
  model completes half the time, from Epoch AI's compilation. Only the latest method version is
  kept, since versions use different task suites.
- LiveBench agentic coding and coding, and Epoch AI's SWE-bench Verified, as elsewhere on the
  site.

The three model tests with task costs are regular benchmark categories, so they also appear on
`/leaderboard` and model profiles. Each optional source keeps its previous results when it
fails, shrinks sharply or changes licence, and never stops the rest of the refresh.

Cleaning: rows must cite their leaderboard; agent names are trimmed and merged across spellings
("Terminus 2", "Terminus-2"); an entry listed twice (with and without "_unknown", or with an
assumed effort at the same score) keeps its latest run. Models are matched to profiles the same
way as benchmark rows; models without a profile take Epoch AI's display name. An agent counts as
the model maker's own when the builder the source names is the model's maker, such as Codex CLI
by OpenAI running GPT-5.5.

The page shows, all calculated by Artificials from those results:

- Leaderboard, agent effect and agents, for one agent benchmark at a time (Terminal-Bench 2.0
  or SWE-bench Verified): agent and model pairs on a fixed 0–100% scale, filtered by builder or
  model; for models that at least three agents ran, the gap between the best and weakest agent;
  and each agent's builder, models run, best result and latest run.
- Cost per task: score against average cost per task for DeepSWE, CursorBench and SWE-bench
  bash only, with every configuration a source ran and the best score at each cost, plus
  tokens and steps per task. Costs are the sources' measurements at list prices and are never
  compared across tests.
- Task length: METR's time horizons on a log scale, with their intervals.
- Models on coding tests (one test per chart) and coding score against the blended list price.
- Questions answered from the same data, with `FAQPage` structured data, and the sources with
  their licences and retrieval times.

Time per task (wall-clock time) is not shown: no source publishes it under a licence this site
can use. Aider's leaderboard is not used because it stopped updating in October 2025.
