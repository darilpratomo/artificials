-- Four original visual explainers. Preserve existing CMS edits.
insert into public.articles (slug,title,excerpt,category,body,published,updated_at) values
('visual-guide-model-price-capability-frontier','The price–capability frontier: choose a model with the chart open','Move the budget. Change the workload. Inspect the tradeoff.','Guides','A model can lead a capability ranking and still be the wrong purchase for a particular application. Another can look remarkably inexpensive until its output bill, repeated attempts, or missing task capability enters the calculation. The useful decision is rarely a single name at the top of a list. It is a set of acceptable options under explicit constraints.

This guide puts those constraints on the page. The first interactive figure uses the same kind of price and capability records behind Artificials'' model charts. Change the budget to see which points remain available. Then change the balance between input and output tokens. The exercise is designed to make the decision visible, rather than hide it inside an unexplained recommendation score.

The figures use a bundled dataset, not a real-time price quote. They select the highest-index model with a matched, positive price from each maker, then retain the first ten makers by index. That selection makes the diagram readable; it is not the entire market. Use the linked model pages and full comparison chart when building an actual shortlist.

## Move a constraint before picking a winner

Start with the price–capability plot below. Each point combines an Epoch capability-index value with a reference token price from the website catalog. Higher points have larger index values. Points farther left have lower blended prices. Moving the budget slider removes candidates that exceed that particular reference-price ceiling; it does not improve the remaining models or change their measured scores.

Notice how much information a budget boundary adds. A ranking answers which listed score is highest. A constrained comparison answers which listed options are feasible for a specified condition. Those are different questions. If no point remains, the correct result is an empty set, not an invented bargain or a recommendation that silently ignores the ceiling.

## Read the axes as different kinds of evidence

The capability axis is a research index, not a percentage of tasks your product will solve. Epoch describes ECI as a scale that combines evidence across benchmarks. Its methodological role is broader comparison; it does not remove the need to inspect the underlying tasks or the uncertainty around close results.

https://epoch.ai/eci

The price axis is catalog metadata. The reference is the maker''s own listed offer when available, or the middle price across eligible hosts under the site''s existing matching rules. It is not a benchmark measurement of a completed workflow. Both axes are useful, but they deserve different questions: how was capability evaluated, and what billing conditions does the listing represent?

The two records can also describe different levels of specificity. An index may summarize evidence across configurations, while a catalog price describes an API offering. A scatter point is therefore a screening aid. Before relying on it, verify the exact version, reasoning setting, provider, region, and billing treatment available to your application.

## A frontier is a shortlist, not a promise

Imagine tracing the candidates from the cheapest toward the most expensive. Keep a candidate only when its capability value improves on every cheaper candidate seen so far. Those retained points form a simple price–capability frontier within the displayed selection. A point below that frontier has another displayed option that is no more expensive and has at least as high an index, with a strict improvement on one dimension.

That does not make the lower point useless. It may have an important context limit, deployment option, language behavior, or interface that the two-dimensional chart omits. Dominance is always relative to the dimensions being compared. Adding a third requirement can restore a previously excluded candidate to the practical shortlist.

There is another limitation: the figure contains one selected model per maker. A smaller model from the same maker may be ideal for your task but absent from this teaching view. The frontier shown here belongs to the displayed sample, not to every model that exists. This is why the full chart remains one click away.

## Change the workload and watch the price move

The familiar blended price assumes three input tokens for every output token. The workload control lets you replace that assumption. For a ratio of r input tokens per output token, the price per million total tokens is the sum of r times the input price and one output price, divided by r plus one. Both the unit and denominator matter.

Suppose an invented service charges two dollars per million input tokens and eight dollars per million output tokens. A three-to-one mix costs three dollars and fifty cents per million total tokens. An equal mix costs five dollars. Nothing about the tariff changed; the workload changed. These numbers illustrate the arithmetic and are not an additional model listing.

The second figure applies the same calculation to the actual reference prices in the selected dataset. It also shows the input and output rates separately. A single blended number can conceal why two candidates respond differently to an output-heavy task. Read the component prices before concluding that the ordering is stable.

## Estimate a completed job, not an isolated call

A reference price is most useful after the application has a task definition. Consider a hypothetical support workflow that reads a ticket, retrieves approved guidance, drafts an answer, and asks a reviewer to check uncertain cases. The application may make more than one call. Some calls include repeated context, and some produce output that never reaches the customer.

Write down all model calls needed for one completed case, including validation and recovery. Record the total billed tokens and the fraction of cases that satisfy the acceptance criteria. A cheap first answer that routinely needs correction can have a higher cost per accepted case than a more expensive first answer that usually completes the job.

Keep human review and infrastructure separate rather than pretending the token calculation includes them. Database operations, retrieval, logging, queue time, and review effort belong in the operating picture. They may not be charged by the model provider, but they still influence whether the application can serve its intended users reliably.

## Cached tokens need their own accounting

Caching can alter an actual bill, but a discounted rate should not be applied to all input by default. A cache hit depends on the provider''s rules and the request pattern. Shared instructions may repeat while user-specific evidence changes. An application that rewrites its prefix on every call may achieve a different cache pattern from one that keeps a stable reusable prefix.

The figures deliberately use ordinary input and output reference rates. They exclude cached-input discounts, tool charges, batch discounts, and provider-specific billing details. That keeps the exercise interpretable. When estimating production cost, use observed eligible cache hits and the actual contract rather than reducing every token by a hopeful discount.

Check what happens when the cache is cold. A short load test after repeated identical prompts can make both cost and response time look better than a day of varied traffic. Report cold and warm conditions separately so the operating plan survives a deploy, a restart, or a sudden change in user questions.

## Treat quality requirements as gates

Budget filtering should sit alongside task-specific quality gates. Define unacceptable behavior before examining the models. For a source-grounded assistant, that might include fabricated policy clauses, missing exceptions, or disclosure of a record the reader cannot access. A general capability score does not directly measure those application failures.

Evaluate feasible candidates on the same reviewed examples and the same output contract. Include ambiguous requests and cases where abstention is the correct response. Keep the evidence for each failure. If every affordable model fails a necessary requirement, narrowing the product task or adding a deterministic check can be more sensible than choosing the least bad score.

Avoid turning the broad index into a fake probability of success. Dividing a price by an index value produces a ratio, but it does not automatically produce a meaningful business measure. A cost per accepted task, measured under a clear acceptance rule, is easier to interpret than an attractive but arbitrary price-per-intelligence number.

## Run a small, reproducible buying experiment

Choose a handful of feasible candidates and preserve the exact settings for each run. Use examples held apart from prompt development. Measure accepted-task rate, token consumption, response-time distribution, and review burden. Keep the comparison paired so each model sees the same cases, and repeat enough runs to expose meaningful variation.

Then test a plausible workload change: longer source documents, shorter answers, more difficult questions, or a temporary traffic spike. The second figure suggests one sensitivity analysis, but actual workflows have more moving parts. The purpose is to discover whether the choice remains sensible when the easy assumptions stop holding.

The final decision should name a model, a configuration, a budget, and a fallback plan. Preserve the reasons for the choice so a later price change or model update can trigger a focused reevaluation. A chart is most valuable when it leads to an inspectable decision rather than a screenshot that cannot explain itself.

## Keep the chart beside the question

Return to the first figure after defining the task. Your interpretation should now be more precise. The budget boundary describes one constraint. The index supplies one broad signal. The frontier reduces the number of candidates worth investigating. None of those elements substitutes for the evidence your particular product needs.

Use the controls to form a hypothesis, then test it with representative work. That is the productive role of a model comparison chart: it makes tradeoffs visible, exposes hidden assumptions, and helps you ask a smaller, better question before spending money or committing an application to a provider.',true,'2026-10-03'),
('visual-guide-benchmark-rankings-by-task','A leaderboard has more than one winner','Switch skills and see why the ordering changes.','Research','A leaderboard compresses a complicated evaluation into an order that is easy to scan. That compression is useful until the order starts answering questions the test never asked. A model that leads one kind of problem can trail on another. A configuration that is strong in a controlled benchmark can behave differently inside an application with tools, documents, and strict output requirements.

This article turns that issue into something you can inspect. The interactive comparison keeps a fixed group of evaluated configurations while changing the skill being displayed. The bars move because the metric changes, not because the page invents a universal intelligence score. A second view places the same values side by side so an impressive overall impression does not erase an uneven profile.

The data comes from the LiveBench snapshot already used by Artificials. The sample consists of the first eight configurations in the bundled overall ranking. It is a teaching selection, not a complete leaderboard and not a claim that these eight are the only candidates worth considering. Exact configuration identifiers remain visible for checking.

## Change the question, then read the order

Choose coding, mathematics, reasoning, or language in the first figure. Each choice sorts the same configurations by that category''s reported value. The scale remains zero to one hundred, so changing categories does not quietly magnify a small difference by tightening the axis. The numeric score sits next to the bar and remains available without interpreting color.

Look for a configuration whose position changes. That movement is not necessarily an inconsistency in the evaluation. It can be the expected result of measuring different abilities. The useful follow-up is to ask which of those abilities resembles your work and which important requirement is absent from the available categories.

## Preserve the identity of what was evaluated

A model family name is not always a complete description of an evaluated system. Different effort settings, checkpoints, prompting arrangements, and tool access can affect the result. Combining the best score from one configuration with the best score from another can create a profile that no single deployable configuration actually achieved.

The figures match rows using the exact configuration identifier in each category. They do not merge names because they look similar. If a selected configuration lacks a value, the visual displays a missing result instead of a zero. Zero is a measurement; missing is a statement about available evidence. Treating them as equivalent changes the story.

This identity rule also helps when you inspect a result elsewhere on the site. Follow the category''s full leaderboard and look for the recorded setting. If an API or downloaded checkpoint exposes a different version, treat that as a new candidate to evaluate. A familiar brand name is not proof that the tested system and your deployed system are identical.

## Understand what the benchmark is trying to measure

LiveBench describes a collection of tasks spanning several capabilities and a process intended to make evaluation more resistant to contamination through refreshed questions and objective checking. Its research explains why the construction of questions and scoring procedures matters, not just the eventual model order. Those design goals do not make any benchmark a complete simulation of every product.

https://arxiv.org/abs/2406.19314

For an application team, the next step is to map a test category to a real requirement. Coding might be relevant to generating a function, but your workflow may also need repository navigation, environment setup, and checking an ambiguous issue. Language performance may help with a support assistant, yet access control and faithfulness to an internal policy require separate evidence.

The diagram does not resolve those gaps by adding more decimal places. It supplies a useful observation about a defined test. Your job is to preserve the scope of that observation while deciding how much weight it deserves in a practical choice.

## Read a profile across columns

The score matrix lets you inspect every selected skill at once. Read across one configuration before comparing it with another. This reveals whether its performance is broadly strong within the sample or concentrated in particular categories. Then read down a single column, where the task and scoring scale are held fixed.

Do not average the visible columns simply because they share a zero-to-one-hundred display range. Their questions, difficulty distributions, and aggregation procedures can differ. An arbitrary mean could overvalue a task that your product rarely performs and undervalue the one failure that matters most. A shared numeric range is not a shared business meaning.

If you need a combined application score, define it from your own task distribution and make the weighting explicit. For example, a fictional document assistant might spend most of its workload extracting facts and a smaller share drafting prose. That workload description can guide evaluation design, but it should not be presented as an official benchmark formula.

## Separate a visible lead from a meaningful lead

A difference in displayed scores does not, by itself, establish how stable the ordering is. Consider the number of evaluated tasks, variability across runs, and whether the results are paired on the same questions. Confidence intervals or standard errors, when supplied by a source, add information about uncertainty. The absence of such fields is not evidence that uncertainty disappeared.

The chosen LiveBench rows do not supply uncertainty bounds in this site''s dataset. The article therefore does not draw invented error bars or label a narrow lead statistically significant. It shows the reported values and leaves the inferential claim open. This is less dramatic than declaring a decisive winner, but it is more faithful to the available evidence.

In a local evaluation, preserve per-example outcomes rather than only a mean. Two systems can have similar totals while failing on different cases. Those disagreements are valuable material for review because they reveal what a switch would improve and what it might break.

## Examine the denominator behind a percentage

A score becomes easier to reason about when you understand what contributes to it. Is each question equally weighted? Does a task award partial credit? Are multiple subtests averaged? Are refusals, timeouts, and malformed answers counted consistently? The same displayed number can arise from different scoring contracts.

As an invented illustration, one assistant might complete eighteen of twenty straightforward tasks and fail both tasks involving exceptions. Another might complete seventeen tasks, including both exceptions. The first has a higher simple success fraction, while the second may be preferable if handling exceptions is essential. This is not a reported result for any model in the figure.

The lesson is to connect the denominator to the decision. Do not silently remove failed or timed-out attempts because they make a comparison messy. If exclusions are necessary, report the rule and how many cases it removed. A tidy chart should be the result of clear measurement, not selective disappearance.

## Translate the comparison into a small application test

Use the category view to choose a manageable set of candidates. Then assemble reviewed examples from the intended workload. Include ordinary cases, difficult cases, cases with missing information, and cases that should trigger a refusal or handoff. Write the expected behavior before looking at model outputs.

Run the candidates under comparable constraints. A model given a tool, extra attempts, or a larger reasoning budget may be solving a different operational problem from one that receives a single short prompt. Sometimes that difference is exactly what you want to study, but name it as a system comparison rather than attributing everything to the base model.

Record useful completion, review effort, latency, and resource use together. The public leaderboard helps you decide what to investigate. The application test decides whether the candidate fits the job. Keeping those stages separate prevents a broad benchmark from carrying more responsibility than its methodology supports.

## Use disagreement as a research clue

When two evaluation sources disagree, first inspect their task definitions and configurations. A preference ranking, a repository-level agent benchmark, and a narrowly checked mathematics test need not order models the same way. Their disagreement can reveal a genuine distinction in what they reward rather than an error that must be smoothed away.

Keep each scale intact. Do not subtract an Arena rating from a percentage score, and do not place unrelated numbers on one axis without an explicit transformation and a reason. A visually unified dashboard can accidentally imply mathematical comparability that the underlying data does not have.

For a reader, the practical habit is simple: ask what changed between the two measurements. That question usually produces more useful insight than choosing whichever ranking confirms a preferred model. It also encourages better reporting, because task, configuration, and scoring method become part of the headline''s meaning.

## Make a shortlist you can explain

Return to the moving bars and identify the category most connected to your work. Inspect the exact configuration, read the source, and compare the other columns. Then name the requirements that the figure cannot establish. This produces a shortlist with an evidence trail rather than a favorite with a persuasive animation.

The best outcome of reading a leaderboard is not memorizing its first row. It is knowing what that row does and does not support. Once the question is explicit, several apparent winners can coexist, and the choice among them becomes a testable engineering decision.',true,'2026-10-03'),
('visual-guide-prefill-decode-kv-cache','Inside a streaming answer: prefill, decode, and the growing cache','Follow tokens through an animated inference pipeline.','Engineering','A chat interface makes an AI answer look like a sentence gradually appearing on a screen. Behind that familiar effect are several different kinds of work. The server receives and prepares an input, the model processes the available context, and a generation loop produces a continuation. The interface then turns arriving data into visible text. Those stages need not share the same bottleneck.

The animated figure in this guide follows one simplified request. Scroll through it to move forward, scroll back to reverse the explanation, or use the controls to inspect a stage directly. The moving shapes explain information flow. They are not a timing trace from a commercial model, and their speed does not represent tokens per second.

The second figure isolates one resource that often surprises developers: the key-value cache. Change the context length and number of simultaneous sequences to see an illustrative memory estimate. The architecture assumptions are shown beside the result so the number can be understood rather than mistaken for a measurement of a named service.

## Follow one request through the system

Begin with the input. An application may assemble system instructions, earlier conversation, retrieved material, and the latest user message. A tokenizer converts text into the model''s token representation. A visible word can map to multiple tokens, and a token can contain only part of a word or include punctuation and whitespace. The blocks in the figure are schematic units, not an actual tokenizer''s output.

The request then enters model computation. In a conventional autoregressive transformer workflow, the available prompt is processed before the system repeatedly chooses continuations. Earlier positions supply information that later positions can use under the model''s attention rules. The figure separates prompt processing from the repeated generation loop because their operational behavior differs.

## Prefill is work on the available prompt

Prefill processes the input sequence and prepares representations used when generating a continuation. Many positions in the already available prompt can be processed together, subject to the architecture''s causal mask and implementation. This differs from waiting for a future generated token whose identity has not yet been chosen.

A longer prompt can require more computation and memory traffic, but its effect on elapsed time depends on implementation, hardware, batching, and context management. The animation therefore does not make a long prompt take a proportionally exact number of seconds. A conceptual flow should not smuggle in a performance claim that only a real measurement could support.

For an application, distinguish time waiting in a queue from time spent processing the prompt. A busy service can make an otherwise ordinary request feel slow before substantial model work starts. Network connection setup, routing, and application preparation can also contribute to the delay before the first visible output.

## Decode depends on what was just produced

During autoregressive decoding, the model produces a distribution for a continuation and the generation procedure selects a token. That token becomes part of the context for the next step. The loop continues until a stopping condition, output limit, or application boundary is reached. The resulting text arrives incrementally only if the server and client expose it that way.

The distinction between tokens and readable text matters here. A network event does not always contain exactly one token, and a token does not always produce a complete visible word. Some interfaces buffer partial output for display. Counting animation frames or text chunks in the browser is therefore not automatically the same as measuring the model''s decoding rate.

An application should also know what ends the loop. A natural stopping token, a token budget, a timeout, and a tool call are different events. If the system treats every interrupted answer as complete, a smooth stream can conceal missing reasoning, unfinished instructions, or invalid structured output.

## Reuse earlier attention state

The key-value cache stores attention-related representations for earlier positions so an implementation can reuse them during later decoding steps. The useful intuition is avoiding repeated preparation of the same historical information. It is not a database of verified facts, a permanent memory of the user, or a guarantee that the model interpreted those positions correctly.

Hugging Face''s cache documentation describes several implementation strategies, including dynamic and static caches and approaches involving offloading or quantization. Those strategies have different tradeoffs. The existence of a cache does not imply that every runtime allocates memory in the same way or supports the same optimizations.

https://huggingface.co/docs/transformers/main/en/kv_cache

The diagram represents cached positions as stored cells. As decoding adds positions, the represented history grows. This is intentionally separate from the model weights, which are another major part of memory use. Confusing weights and cache can make a deployment estimate appear plausible while omitting the resource that grows with active conversations.

## Turn the memory assumptions into a calculation

The calculator uses a hypothetical transformer with thirty-two layers, eight key-value heads per layer, a head dimension of one hundred twenty-eight, and two bytes per stored element. It accounts for both keys and values. Multiplying those factors gives one hundred thirty-one thousand seventy-two bytes per cached token per sequence before allocator and other overhead.

At eight thousand one hundred ninety-two cached tokens, that illustrative raw cache occupies one gibibyte for one sequence. Two such sequences require two gibibytes under the same assumptions. These are arithmetic results for the displayed hypothetical architecture, not memory figures for any named model in the catalog. Different head counts, precision, attention windows, or cache-sharing behavior change the answer.

Move the sliders and watch the cache tiles and total change together. The relationship being taught is the dependence on stored positions and simultaneous sequences under fixed architecture assumptions. It does not imply that total GPU memory, total latency, or billed cost follows the same simple proportional rule.

## Allocation is different from useful content

Even a correct count of raw key-value elements is not a complete serving-memory plan. Implementations may reserve capacity, align blocks, carry metadata, or retain temporary workspaces. Model weights and activations consume additional memory. The difference between allocated capacity and currently useful content can become important when requests have varied lengths.

The PagedAttention research studies memory management for language-model serving and presents an approach inspired by paging. Its central relevance here is the organization of changing cache requirements across requests. It is evidence that allocation strategy matters, not a universal promise that any application will obtain the paper''s reported performance under arbitrary conditions.

https://arxiv.org/abs/2309.06180

When testing a server, include short and long requests together. A benchmark containing only equal-length prompts may hide the fragmentation, scheduling, and cancellation behavior that appears in actual traffic. Measure the workload you expect to serve rather than only the shape that gives the cleanest throughput number.

## Streaming improves feedback, not correctness

Showing early output can reassure a user that work is progressing. It can also let them stop an irrelevant answer before it consumes the full output budget. These are interaction benefits. They do not establish that the eventual answer is accurate, grounded, or complete.

For some tasks, displaying unverified partial output is undesirable. An application producing a structured record may need to wait until the object is complete and validated. A tool-using assistant may need to distinguish provisional narration from the result of a completed action. The right streaming policy follows the task''s meaning, not just the availability of a streaming API.

Design the interface to communicate interruption. If the connection ends early, preserve enough state to say that the response did not finish. Avoid turning the final visible fragment into a confident answer simply because it arrived without a browser exception. Completion is an application condition as well as a transport event.

## Measure the phases separately

For a useful latency investigation, record when the application submits the request, when the first useful output arrives, and when the task finishes. Where the serving stack exposes them, separate queueing, prefill, and decoding measurements. Keep the definitions consistent across runs and providers.

Use several prompt lengths and output lengths. A request with a large document and a short answer stresses a different balance from a short instruction asking for a long draft. Report distributions and difficult cases, not only an average that conceals a tail of slow requests. Include failures and timeouts in the outcome accounting.

If a change appears to improve performance, verify that it did not silently shorten answers, remove required context, or change the accepted-task rate. Faster completion of an easier or incomplete task is not necessarily an improvement in the original workflow. The benchmark must preserve what success means.

## Give cancellation a real destination

A stop button should do more than hide incoming text. The application needs to propagate cancellation through its own work and, where supported, to the upstream request. It should then release local resources and stop scheduling dependent steps. Whether already performed provider work remains billable depends on the service''s actual terms.

Cancellation also interacts with retries. Automatically starting a second request after a client disconnect can turn a user trying to stop work into more work. Give each request a lifecycle and record whether it completed, failed, or was cancelled. That makes resource behavior easier to understand when the system becomes busy.

The animation ends at an answer, but a production request ends at an explicit state. Keeping those states clear helps both the interface and the infrastructure. It is one of the simplest ways to prevent a visually polished streaming experience from hiding operational confusion.

## Read the moving picture as a map

Return to the request diagram and pause at each stage. Ask what information exists, what work can happen together, what depends on the previous output, and what state must remain available. Those questions turn a moving illustration into a useful model of the system.

The picture deliberately leaves out many hardware details. Its purpose is to separate concepts that a chat box merges together: preparation, prompt processing, reuse, generation, and delivery. Once those pieces are distinct, memory estimates, latency measurements, and interface decisions become much easier to discuss precisely.',true,'2026-10-03'),
('visual-guide-retrieval-evidence-answer','From a question to evidence: watch a grounded answer take shape','Trace retrieval, inspect sources, and remove the evidence.','Engineering','A retrieval-augmented assistant does not become trustworthy merely because a search step sits before a language model. The search can return an obsolete rule, the context can omit an exception, and the answer can claim more than the retrieved passage supports. To understand the system, follow one question and inspect what crosses each boundary.

This visual guide uses a deliberately fictional equipment-rental policy. The question is simple: how long may a member keep a standard loan? Three short documents provide a current rule, an older rule, and a rule for a different plan. Their values are invented for this teaching example. They are not a real organization''s terms and are not evidence about a model''s benchmark performance.

Scroll through the architecture diagram or choose a stage to follow the question from retrieval to verification. In the evidence exercise, remove the current document and inspect the response. The important change is not a more elaborate sentence. It is the system recognizing that the remaining evidence does not establish the current answer.

## Follow the question, not a cloud of boxes

The request begins with a precise subject: a member asking about a standard loan under the current policy. That scope matters. A document describing an extended plan may contain similar words while answering a different question. A previous policy may be historically accurate while being wrong for a current request.

The animated path separates retrieval, eligibility checks, context assembly, drafting, and claim verification. Each stage receives an explicit input and produces an inspectable output. The illustration is a teaching architecture, not a recording of a deployed model thinking. It helps reveal where an application must make decisions that a generic search score cannot settle.

## Retrieve candidates before calling them evidence

A search result is a candidate passage. It becomes useful evidence only after its meaning and applicability are checked against the question. Similarity can help locate material, but semantic proximity alone does not establish that a document is current, authorized for the reader, or relevant to the exact plan being discussed.

The original retrieval-augmented generation research combines a retrieval component with a generative model for knowledge-intensive tasks. That architecture motivates bringing external material into generation. It does not establish that every retrieved result is correct or that a citation automatically proves every sentence in the answer.

https://arxiv.org/abs/2005.11401

In the fictional example, all three passages plausibly match a query about borrowing equipment. A naive system could choose the shorter old rule or the more generous plan simply because the wording looks relevant. Keeping the candidates visible lets the reader see why retrieval and selection must be treated as separate responsibilities.

## Eligibility belongs outside the model''s imagination

Suppose the archive records which policy is active and which plan each passage covers. Those fields should participate in the selection process. The application can exclude an archived policy from a current-policy answer and exclude an extended-plan passage from a standard-plan question. These are explicit rules over maintained records, not facts the generator should invent.

Access permission is another eligibility condition. A passage that the user may not read should not be sent into the user''s answer context and then hidden only at the display stage. The appropriate access boundary depends on the application, but it should be enforced by trusted software using the actual user identity and resource policy.

The teaching diagram uses a simplified current-plan check rather than a full authorization system. That simplification is visible because each document has a named status. In a real implementation, preserve the identifiers and decision reasons needed to audit why a passage was included or excluded without exposing sensitive document text in unnecessary logs.

## Assemble context that can still be traced

After selection, the generator needs enough context to answer the question and identify the supporting passage. A useful context package preserves the source identifier, the relevant excerpt, and the scope that makes it applicable. Stripping these details to save a few tokens can make later verification harder.

Do not concatenate every retrieved document without a clear boundary. A model may blend an old duration with a current exception or borrow a benefit from a different plan. Distinct source labels and concise excerpts help the application inspect the resulting claim. They do not guarantee perfect behavior, but they make failures less mysterious.

The example''s current standard policy permits a twelve-day loan. The older policy says seven days, and the extended plan says twenty-one. These deliberately conflicting values force the system to use scope rather than majority voting or numerical generosity. Repeating the wrong document several times would not make it the right source.

## Try the evidence removal experiment

The interactive evidence desk below exposes those three fictional documents. Toggle the current standard policy off. The deterministic teaching response should now state that the current duration cannot be established from the eligible evidence. It should not promote an archived passage or a different plan into authority merely to avoid leaving the user without a number.

Turn the current document back on and inspect the claim-to-source connection. The answer is supported by a particular passage, not by a vague declaration that the system searched the web. The exercise is intentionally small so that every choice can be checked directly by a human reader.

This widget runs entirely in the browser and makes no AI API call. Its output is a scripted demonstration of an evidence policy. That distinction matters: an example showing how an application should behave is not an evaluation proving that a language model will always follow the same rule.

## Verify claims at the right level

An answer can contain several claims, each needing different support. In the fictional policy case, the duration is one claim and the plan''s applicability is another. If the assistant adds a late fee, a renewal promise, or an exception absent from the source, the presence of a valid duration citation does not support those additions.

A useful verification step compares individual claims with the relevant passages and checks whether the evidence actually entails them. It should distinguish direct support, reasonable but uncertain inference, and unsupported content. The application can then revise the answer, request clarification, or hand the case to a person according to the task''s requirements.

Automated verification is itself a component to evaluate. A second model can repeat the first model''s mistake or approve a fluent unsupported sentence. Preserve reviewed examples where the verifier should reject a claim, and test the complete pipeline. Adding another box to the architecture diagram does not automatically add dependable assurance.

## Keep instructions separate from retrieved material

Documents are data supplied to the application, not a new source of system authority. A retrieved page could contain text telling an assistant to ignore earlier instructions, reveal secrets, or contact an unrelated service. The application should not treat that text as permission to change its rules or perform an action.

The safe boundary is broader than wording a prompt politely. Restrict the actions and data available to the generation step, enforce access in trusted code, and validate any proposed operation before execution. Retrieval should not become a route by which arbitrary source text acquires control over the application.

OWASP''s prompt-injection guidance describes this class of risk and emphasizes defenses across the system. The practical implication for this example is that a policy passage can support a statement about a loan; it cannot authorize a new tool call or override the rules for deciding which policy applies.

https://genai.owasp.org/llmrisk/llm01-prompt-injection/

## Evaluate retrieval and answering separately

Create a reviewed set of questions with known supporting passages. First measure whether the retrieval stage brings those passages into the candidate set. Then inspect whether eligibility and context assembly retain the right material. Finally evaluate whether the answer expresses the supported conclusion without adding unsupported details.

This separation makes diagnosis much easier. If the relevant policy never reaches the candidate set, changing the final answer prompt may not address the underlying issue. If the correct passage is present but the generator chooses the archived rule, retrieval recall alone cannot explain the failure. Each boundary needs an observable outcome.

Include questions with no eligible answer. A pipeline that always produces a plausible sentence may appear helpful on easy examples while failing the most important absence test. Missing evidence should be represented in the evaluation contract, not treated as an inconvenient case to remove from the dataset.

## Make changes propagate through the whole path

A source archive changes over time. A policy can be replaced, a document can be deleted, or a user''s access can be revoked. The retrieval index, cached context, and generated answers need a plan for reflecting those changes. Updating the source file alone does not prove that every downstream copy has stopped serving the old material.

Track source versions and the dependencies of cached outputs where the application needs that precision. Test a policy replacement from ingestion through retrieval and answer delivery. Check whether a previously saved answer remains appropriately labeled as historical or is recomputed when the product promises a current answer.

The evidence-removal control is a miniature version of this operational test. It asks whether the system''s confidence changes when its support disappears. A robust application should make that dependence explicit rather than preserve an old confident answer simply because it is convenient to cache.

## Design the answer for inspection

Present the conclusion with a concise source link and enough context for the reader to verify its applicability. Avoid overwhelming the user with an unfiltered document dump. The goal is a usable explanation whose important claims can be checked, not a performance of research made from many unrelated citations.

For the fictional loan question, a strong answer gives the current standard duration and points to the current standard policy. If that evidence is unavailable, it says what could not be established and what additional record would resolve the question. The response remains useful because it describes the boundary of its knowledge precisely.

Follow the animated path once more with that output in mind. Retrieval finds candidates, eligibility narrows their authority, context preserves traceability, generation expresses a conclusion, and verification checks its support. The value comes from the connections between those stages. That is what turns a collection of documents and a language model into an answer a reader can inspect.',true,'2026-10-03')
on conflict (slug) do nothing;
