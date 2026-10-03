import type { Article } from './content';

// Original teaching experiments: every numerical example is synthetic, not a model benchmark.
export const EDITORIAL_VISUAL_LABS: Article[] = [
  {
    id: 'visual-lab-104',
    slug: 'visual-lab-temperature-top-p-token-sampling',
    title: 'Before the next word: a visual lab for temperature and top-p',
    excerpt: 'Reshape a token distribution, then inspect how a sample is chosen.',
    category: 'AI models',
    published: true,
    updated_at: '2026-10-03',
    body: `Two answers can start from the same question and diverge before the first sentence is complete. That does not necessarily mean the model retrieved different facts or changed its knowledge. A generation system also has to choose a continuation from its possible next tokens. The rule used for that choice can change the answer even when the underlying model parameters stay fixed.

This laboratory isolates that decision. You can reshape an invented distribution, remove its lower-probability tail, and move a selection marker through the remaining choices. There is no language model running behind these controls. The six token labels and their scores are authored examples, chosen so that the arithmetic remains visible. They are not captured outputs from any commercial model.

The goal is to develop a practical distinction between what a model scores, what a decoder permits, and what a particular generation selects. Keeping those three ideas separate helps explain variation without describing every setting as a creativity slider or treating a repeated answer as evidence of truth.

## Reshape the distribution before choosing a token

The first figure starts with six invented logits: 3.0, 2.4, 1.8, 1.0, 0.2, and minus 0.7. A logit is a score before normalization, not a probability. The example labels are readable words, but actual token vocabularies also contain fragments, spaces, punctuation, and special symbols. A real model's candidate set is much larger than this deliberately small display.

Move temperature while leaving top-p at one. The bars show two stages: the probability after temperature scaling and the final probability after the top-p filter. When no tail is removed, those values agree. Lowering temperature concentrates probability toward the largest score. Raising it spreads more probability toward alternatives. Neither operation changes which underlying logit is largest in this example.

The calculation divides every logit by a positive temperature, subtracts the largest scaled value for numerical stability, exponentiates, and normalizes the results. Subtracting a common constant does not change the resulting probabilities. It prevents unnecessary numerical overflow without changing the mathematical question. The laboratory keeps temperature above zero and treats greedy selection as a separate decision rule.

## A probability is conditional, not a truth score

The score for a next token belongs to a particular prefix. If the prefix changes, the model generally produces a different distribution. This is why a single probability chart cannot describe an entire answer. After each selected token is appended, the next selection is conditioned on a longer sequence.

Suppose the visible continuation begins with “The workshop opened a”. A model may give high probability to a familiar phrase that fits the surrounding style. That preference does not establish that the workshop actually opened anything. Fluent continuation and factual support are different properties, and changing a sampling parameter does not add missing evidence to the prompt.

For the same reason, do not present a selected token's probability as the confidence that the whole response is correct. An answer can contain many individually ordinary tokens and still assert an unsupported event. Product-level confidence requires a defined task, an evaluation method, and often evidence outside the generation distribution.

## Top-p changes the eligible set

Now lower top-p. The laboratory sorts tokens by their temperature-adjusted probabilities and keeps the smallest leading group whose cumulative mass reaches the chosen threshold. The token that crosses the boundary remains eligible. Probabilities for retained tokens are then divided by their retained total, so the final distribution sums to one again.

The number of retained tokens is not fixed. If one candidate already holds most of the probability, a relatively high threshold may keep only that candidate. If probability is spread evenly, the same threshold may retain several. This is different from top-k, which limits the number of candidates rather than specifying a cumulative probability target.

Nucleus sampling was introduced by Holtzman and colleagues to address problems they observed in open-ended text generation. Its historical motivation is useful context, but it does not imply that one threshold is best for every contemporary application. The paper studies a decoding approach, not a universal setting for correctness, safety, or useful prose.

https://arxiv.org/abs/1904.09751

## Read the two bars together

A common misreading happens when someone sees a token's final probability increase after filtering and concludes that the model became more certain. In this experiment the original logits did not change. Removing alternatives and renormalizing increased the retained candidates' shares of a smaller distribution. That is a decoder operation, not new supporting evidence.

Try a threshold that leaves one token. Its final probability becomes one hundred percent even if its pre-filter probability was much lower. The display makes that difference explicit. A user interface that shows only the final number can conceal how much probability mass was discarded before the selection was made.

The order of operations also matters. This laboratory applies temperature first and top-p second. Changing that sequence can change which candidates cross a threshold. When reproducing a model experiment, record the actual implementation and processing order rather than assuming that similarly named controls behave identically across every library and endpoint.

## Move the draw through the probability intervals

The second figure holds a distribution fixed and places its probabilities along a ruler from zero to one. Each token owns an interval whose width matches its probability. A uniform draw selects the interval containing it. Wider intervals are selected more frequently over many independent draws, but a narrow eligible interval can still be selected on a particular attempt.

Here the marker follows scrolling, moves backward when you scroll upward, and can be controlled manually. That sweep is a teaching animation, not a random-number generator. Its position stands in for a possible draw so that you can inspect the boundary. The intervals use temperature one and top-p 0.9, independently of the first figure's controls.

Notice that the final marker stops just below one. The usual conceptual sampling interval includes zero and excludes one. At a shared boundary, the choice belongs to the interval that starts there. The visible percentages are rounded for reading; the selection code uses the unrounded numbers. Small display-rounding differences should not be mistaken for an extra token.

## Greedy does not mean globally best

Greedy decoding chooses the highest-scored eligible next token at each step. It can be useful when variation is undesirable, but it is a local rule. It does not search every possible finished response and certify the most useful one. Even the most probable full sequence would not automatically be the most truthful or helpful answer for a reader.

Hugging Face's generation documentation distinguishes greedy decoding, sampling, and beam-based strategies. Its configuration reference also separates temperature and candidate filtering from length limits and stopping rules. Those distinctions are more useful than treating every generation control as interchangeable. Consult the exact model and library configuration before assuming that a parameter is available or active.

https://huggingface.co/docs/transformers/main/en/generation_strategies

https://huggingface.co/docs/transformers/main/en/main_classes/text_generation

## Design an experiment that can answer a question

Imagine an application that rewrites short help messages. Start with a fixed set of messages, a rubric for preserving instructions, and examples where wording changes could reverse the meaning. Compare settings across that set. Keep the prompt, model version, and output limit fixed while changing one decoding parameter at a time.

Measure more than whether the wording varies. Count missing steps, invented promises, broken formatting, and unnecessary length. Review whether variation helps the intended reader. A wider distribution may create useful alternative phrasings, but it may also make a previously rare error more visible. A narrower distribution can repeatedly produce the same mistake.

Use repeated generations when evaluating a stochastic setting. One attractive sample is an anecdote, not a description of the distribution. Report the number of attempts and inspect difficult examples separately. If a workflow retries until an acceptable response appears, include those rejected attempts in its cost and latency measurements rather than reporting only the winning output.

## Reproducibility needs more than a seed

A seed can help reproduce a sampling sequence within a controlled implementation. It does not freeze every surrounding condition. Model revisions, numerical kernels, parallel execution, prompt formatting, and library changes can alter the calculation or the sequence of random operations. Treat reproducibility as an environment contract rather than a single integer copied into a settings panel.

For a regression test, save the inputs and the versioned generation configuration. Decide whether the requirement concerns exact text, valid structure, or preserved meaning. An exact-text comparison may be appropriate for a tightly controlled fixture; it can be too brittle for a user-facing paraphrase task. The acceptance rule should match the behavior the product actually promises.

Keep generation controls out of the role of security enforcement. An application should validate outputs and permissions independently of whether sampling is enabled. A deterministic unsafe action is still unsafe, and a low-temperature unsupported answer is still unsupported. The decoder influences selection; it is not the authorization system.

## Take a distribution-shaped view of the answer

The most useful habit from this laboratory is to ask where a change entered the pipeline. Did the model's evidence change? Did its logits change? Did a decoder remove options? Or did a different draw select another eligible continuation? Each explanation points toward a different test and a different repair.

Use the first figure to separate concentration from filtering, and the second to separate eligibility from selection. Then evaluate the resulting complete answer against the task. You will have a clearer account of why outputs vary, without mistaking probability for truth or assuming that a single knob can optimize every kind of AI work.`,
  },
  {
    id: 'visual-lab-105',
    slug: 'visual-lab-vector-similarity-search-geometry',
    title: 'What does “nearby” mean? A visual lab for AI vector search',
    excerpt: 'Rotate a vector and change the metric to see why rankings move.',
    category: 'Guides',
    published: true,
    updated_at: '2026-10-03',
    body: `A vector search result can look authoritative because it comes with a precise decimal score. Yet that number is meaningful only after several choices are understood: which representation produced the vectors, which metric compared them, whether their lengths were normalized, and which candidates were allowed into the search. Change one of those choices and “nearest” can mean something different.

This laboratory makes the geometry visible in two dimensions. It does not claim that a real embedding model compresses meaning into a simple compass. The vectors are invented numeric objects, not embeddings of the document labels shown beside them. Their small size lets you inspect every coordinate, check a calculation, and see a ranking change without invoking a remote model.

The first experiment separates direction from length. The second ranks four candidates under three different measures. Together they explain a common source of confusion in AI search: two implementations can process the same vectors correctly and still return different orders because they are answering different mathematical questions.

## Rotate direction without hiding length

The reference query in the first figure points along the positive horizontal axis and has length one. A second arrow has an adjustable angle and length. Rotate it while watching cosine similarity, dot product, and Euclidean distance. Then leave the angle fixed and stretch it. Different measures respond to those two operations in different ways.

Cosine similarity divides the dot product by the product of the vector lengths. For nonzero vectors, this removes their magnitudes from the comparison and leaves a measure of directional alignment. In this two-dimensional construction, its value is the cosine of the angle between the arrows. A parallel arrow has similarity one; a perpendicular arrow has similarity zero.

Dot product keeps magnitude in the calculation. With the reference fixed at unit length, stretching an aligned candidate increases the dot product. Euclidean distance measures the straight-line separation of the endpoints. A candidate can point in exactly the same direction as the query yet be farther away because its endpoint lies well beyond it.

## Work through a case where the measures disagree

Set the candidate angle to zero and its length to two. The query endpoint is at one, zero; the candidate endpoint is at two, zero. Their cosine similarity is one, their dot product is two, and their Euclidean distance is one. All three results are correct. They express different relationships between the same pair of vectors.

Now shorten that candidate until its length is one. The cosine value stays one, the dot product becomes one, and the distance becomes zero. This change did not make the direction more aligned. It brought the endpoints together. Understanding that distinction is more useful than trying to memorize which metric is supposedly best for every search system.

Try ninety degrees next. Cosine and dot product both become zero in the ideal calculation, even though the arrow still has a nonzero length. The endpoints remain separated. At one hundred eighty degrees, the arrows oppose each other and cosine reaches minus one. Floating-point calculations may show tiny residuals near theoretically exact values; display rounding is not a new semantic interpretation.

## Normalization changes the comparison contract

L2 normalization divides a nonzero vector by its length, placing its endpoint on a unit sphere. In this two-dimensional view the sphere becomes a circle. After both query and candidates are normalized, their dot products equal their cosine similarities. Squared Euclidean distance is then two minus twice the cosine, so descending cosine and ascending distance produce the same ordering.

That equivalence depends on the normalization condition. Applying it to raw vectors with different lengths can silently change the ranking. A system that was trained to use a particular similarity function should not be switched to another simply because the names sound related. The representation and the comparison rule form a pair.

The scikit-learn metric documentation defines cosine similarity through the normalized dot product. Sentence Transformers documents several similarity functions and discusses the relationship between dot product and cosine for normalized embeddings. These references establish the definitions; the examples in this article are independently constructed teaching data, not reproduced evaluation results.

https://scikit-learn.org/stable/modules/metrics.html#cosine-similarity

https://www.sbert.net/docs/sentence_transformer/usage/semantic_textual_similarity.html

## Change the metric and inspect the ranking

The second figure starts with four synthetic candidates. Candidate A is long and close to the query direction. Candidate B is shorter and aligned exactly with the initial query. Candidate C sits near the vertical direction. Candidate D points partly toward negative horizontal coordinates. The displayed table preserves the coordinates so that the ordering can be checked independently of the picture.

At the initial query angle, cosine favors B while dot product favors A. Euclidean distance also favors B in this fixture because its endpoint matches the unit query. Rotate the query and watch the order respond. The bars are unnecessary here: a coordinate plot and explicit metric values show the geometry without turning unlike score scales into apparently interchangeable percentages.

The normalize control changes both the candidate representation used for scoring and the positions drawn on the plane. With normalization enabled, compare the order under all three metrics. Apart from exact ties and numerical precision, the ranking relationship follows the identity described above. This is an algebra check, not evidence that normalized search is superior on your documents.

## Do not name invented axes after human concepts

It is tempting to label the horizontal axis “technical” and the vertical axis “creative” because that makes a diagram feel intuitive. For real embeddings, such labels require evidence. Individual dimensions are learned features whose interpretations are not usually supplied by a simple human-readable axis title. An attractive chart can become misleading if its labels imply knowledge the model did not provide.

The laboratory therefore calls the axes x and y. Candidate labels are identifiers, not semantic categories. A real embedding model may use hundreds or thousands of dimensions, and a two-dimensional projection can distort distances or hide relationships. Use projected pictures to explore hypotheses, then check the actual metric in the original representation before making a decision.

The same caution applies to clusters. Nearby points can suggest a group worth investigating, but a cluster does not automatically define a topic, intent, or permission boundary. Human inspection and task-specific labels are still needed. A visualization should help reveal what to test rather than quietly manufacture a ground truth.

## A high score is not an answer

Suppose a support search returns a policy document with a high cosine similarity to a question. That score indicates a relationship under the chosen representation and metric. It does not prove that the document is current, that its rule applies to the reader, or that the requested fact appears anywhere in the passage.

For a useful result, inspect relevance alongside scope. A historical policy may share nearly every important term with a current one. A neighboring product plan may describe the same workflow with a different allowance. A search system needs metadata and evidence checks to keep a semantically close but inapplicable passage from becoming an authoritative answer.

There is also no universal threshold such as “anything above 0.8 is correct.” Score distributions depend on the model, the data, and the task. Choose thresholds using labeled examples and the cost of mistakes. Recheck them after changing the encoder or preprocessing; the same number can behave differently in a different embedding space.

## Build a retrieval test that preserves the hard cases

Start with realistic questions and identify acceptable passages before looking at model rankings. Include paraphrases, short queries, misspellings, and questions whose answer is absent. Add near misses: an archived policy, a sibling feature, or a similarly named person. These examples test whether the system distinguishes useful evidence from merely related wording.

Measure whether a relevant passage appears within the number of results your application can actually inspect. A top-fifty recall result does not describe a product that reads only the first three passages. Review the ordering as well as presence, because an irrelevant first result can consume context space or mislead a downstream answer generator.

Separate exact scoring quality from index approximation. If exhaustive comparison already retrieves the wrong passage, increasing an approximate index's search effort will not fix the underlying representation. If exact scoring works but approximate search misses the candidate, investigate the index settings and candidate coverage. Each failure deserves a repair at the layer where it occurs.

## Treat a new embedding model as a new coordinate system

Vectors produced by different embedding models are not automatically compatible even if they have the same dimensionality. Matching the length of two arrays is not evidence that their coordinates share a meaning. Query and document encoders must belong to a supported pairing, with the required prefixes and normalization behavior preserved.

When migrating a search system, build a separate index for the new representation and compare it on a stable evaluation set. Keep the old path available while checking document coverage and relevance. Mixing freshly encoded queries with incompatible old document vectors can produce plausible-looking scores that have no intended interpretation.

Record the encoder version, text preparation, vector dimension, metric, and normalization policy together. That small contract makes troubleshooting much easier than a folder of unexplained arrays. It also makes the meaning of an index rebuild explicit: you are replacing a representation pipeline, not merely refreshing a cache of numbers.

## Bring geometry back to the reader's task

The laboratory's arrows are simple enough to inspect, but the lesson applies to larger systems. Similarity is defined by a representation and a metric, and relevance is defined by a user's task. Neither a precise decimal nor an elegant plot removes the need to connect the two.

Use the controls to develop an intuition for direction, magnitude, and distance. Then return to actual passages and ask whether the retrieved evidence answers the question under the right conditions. A good vector search system makes that connection measurable and reviewable, instead of asking the reader to trust whatever happens to be nearby.`,
  },
  {
    id: 'visual-lab-106',
    slug: 'visual-lab-ai-serving-queues-continuous-batching',
    title: 'Why a fast model can feel slow: inside the serving queue',
    excerpt: 'Replay a queue and compare fixed batches with continuous admission.',
    category: 'Engineering',
    published: true,
    updated_at: '2026-10-03',
    body: `A model can generate tokens quickly once it starts and still make a reader wait. Before useful text appears, the request may pass through admission checks, a queue, prompt processing, and a shared scheduler. A benchmark that measures an already running generation does not describe all of those stages. The user's experience includes time spent waiting for the model to begin.

This article turns one part of that problem into a replayable experiment. Six invented jobs arrive together, each requiring a different number of decoding iterations. You can change how many jobs the server admits at once and compare two rules for filling an empty slot. A second figure lets you inspect the same queue at any point in its execution.

The units are abstract ticks, not milliseconds or measured GPU performance. Each admitted job receives one token of progress per tick, regardless of occupancy. Prompt processing, memory limits, networking, and cancellation overhead are deliberately omitted. Those assumptions make the scheduling effect visible while preventing the figure from masquerading as a prediction of real hardware speed.

## Separate waiting from doing the work

In the first figure, the empty section before a job starts represents queue waiting. The solid segment represents service: iterations during which that job receives progress. The endpoint marks completion. These quantities answer different questions, so the table reports queue wait and total completion delay separately for every job.

All six jobs arrive at tick zero. Their lengths are two, eight, three, six, two, and four tokens, with a control that can extend the second job to twelve. The scheduler chooses jobs in arrival order, using their identifiers to break the simultaneous-arrival tie. The fixed workload is intentionally small enough that you can trace every slot by hand.

At one slot, both policies behave like a single line: each job waits for the previous job to finish. Increasing slots allows concurrent progress in this model. That is a mathematical property of the fixture, not a promise that doubling a production batch doubles throughput. Real devices can change their per-iteration time as the amount of work changes.

## Compare the two admission rules

The fixed-batch rule admits up to the selected capacity, then waits until every admitted job finishes before admitting another group. A short job can finish early while a longer neighbor keeps the batch open. The finished job's slot remains unavailable to the next waiting request under this particular rule, even though that job no longer needs progress.

The continuous rule checks for available slots at each iteration boundary. When a job completes, the next waiting job can occupy its slot on the following iteration. Existing unfinished jobs continue. This reduces idle slot time in the example without changing any job's required number of tokens or claiming that its individual decoding computation became faster.

With two slots, the fixed fixture completes at tick eighteen under the fixed-batch rule and tick fourteen under continuous admission. Those values follow from the stated lengths and equal-cost iterations. They should be read as a worked example, not a speedup claim for a named inference engine or a service-level guarantee.

## Follow one short job through the long neighbor

Focus on job C, which needs three tokens. In the fixed two-slot schedule, jobs A and B start together. A finishes after two ticks, but C cannot begin until B finishes at eight. C's short service time does not protect it from waiting behind the longer job's batch boundary.

Under continuous admission, A's slot becomes available at tick two and C enters immediately. B continues in its other slot. C completes at tick five, even though B still has work left. The important change is the opportunity to admit C earlier, not a change in the three units of work that C requires.

Now extend B to twelve tokens. Inspect which rows change and which remain unaffected. This is a useful way to reason about interference: a request's experience can depend on the lengths of other requests sharing its scheduler. An isolated timing test cannot reveal that dependence because there are no neighbors in the experiment.

## Replay the queue instead of guessing from an average

The second figure shows waiting, active, and completed jobs at a selected tick under continuous admission with two slots. Scroll downward to advance the replay and upward to reverse it. You can also use the playback controls or move directly to a tick. Each job displays completed tokens against its required length, so progress remains understandable without motion.

At an iteration boundary, a completed job moves to the finished group and an eligible waiting job can become active. The snapshot at tick two therefore already shows C admitted with zero of its three tokens produced. This convention matters: mixing “just before admission” and “just after admission” in different screenshots can create an apparent off-by-one inconsistency.

The replay is a deterministic explanation, not a connection to the site's production traffic. It contains no visitor data, and it does not estimate the load on any API. Its purpose is to make an admission rule inspectable. A useful operational dashboard would need actual request events and a carefully defined clock instead.

## Continuous batching is a systems technique, not a free lunch

The Orca research system describes iteration-level scheduling for transformer generation, allowing requests to be managed at a finer granularity than a whole request. That work provides a primary research reference for the scheduling idea. This article's simplified slot model is not an implementation of Orca and does not reproduce its benchmark measurements.

https://www.usenix.org/conference/osdi22/presentation/yu

Real serving systems must decide how to divide finite compute and memory among prompt processing and ongoing generation. They may impose token budgets, preempt requests, chunk prompt work, or reserve capacity for different workloads. A configuration that improves completed requests per second can still worsen the waiting time of some requests.

That is why a throughput headline should be accompanied by a workload description and latency distribution. Specify input lengths, output lengths, arrival pattern, concurrency, and the acceptance criteria used to count a request as successful. Without those conditions, comparing two serving numbers can be less informative than the precision of the reported decimals suggests.

## First-token time and final-answer time can move differently

A reader notices when useful output first appears, how smoothly it continues, and when the task is complete. These are related but distinct aspects of response time. Streaming can make progress visible sooner without making the final result arrive sooner. A very long output can begin promptly and still take substantial time to finish.

Queue wait contributes before generation begins. Prompt processing adds another cost, especially when the request carries a long context. After generation starts, the gaps between output tokens influence perceived smoothness. A product that reports only an average token rate can hide a long initial wait or a small fraction of requests with disruptive pauses.

The laboratory excludes prompt processing, so its start tick should not be renamed time to first token. Its first generated token appears one tick after service starts. Keeping that convention explicit prevents a teaching simplification from spreading into a misleading production metric. Real instrumentation should name every boundary it measures.

## Cache hits solve a different piece of the problem

A reusable prompt prefix may reduce repeated prompt-processing work under a serving system's cache rules. It does not mean that new output tokens no longer require generation. vLLM's automatic prefix caching documentation explicitly distinguishes avoiding repeated prefill work from accelerating the generation of new tokens. That distinction is useful when diagnosing a service that is fast on repeated demonstrations but slow on varied requests.

https://docs.vllm.ai/en/latest/features/automatic_prefix_caching/

Measure cold and warm conditions separately. A warm cache can make a narrow test look excellent while a new deployment, changed prompt template, or different user workload behaves otherwise. Cache memory also shares a finite environment with other serving state. A cache policy is part of the capacity plan, not a reason to ignore it.

Our queue fixture has no cache, so none of its gains come from prefix reuse. Keeping that omission explicit lets you identify the one variable it actually explains: admission at iteration boundaries. Combining every optimization into one unlabeled animation would make it harder to know which mechanism caused the result.

## Protect the service when demand exceeds capacity

A queue cannot create compute capacity. If requests arrive persistently faster than the system can complete them, waiting grows unless the application changes admission, adds resources, reduces work, or rejects some requests. An unbounded queue can turn a temporary spike into a long period of poor service after the spike has ended.

Define limits around the useful task. Bound input size, output length, simultaneous work, and waiting time. Respect cancellation so abandoned requests do not continue consuming resources without purpose. Decide whether a timed-out request may be retried, and account for the additional load that retries themselves create during an incident.

Fairness also needs a policy. Always prioritizing the shortest jobs may make averages attractive while repeatedly delaying larger legitimate requests. First-come order is easy to explain but may not meet every product requirement. Test the policy against the classes of work the service promises to support, including requests that are expensive but important.

## Measure the experience your interface promises

A practical load test should include bursts, quiet periods, long prompts, short outputs, and mixed jobs, with enough detail to reconstruct important failures. Report queue wait, first useful output, completion delay, and rejected or cancelled work separately. Review slower requests rather than hiding them inside a mean.

Use the figures as a starting point for those questions. Change a long job and observe who waits. Change capacity and inspect the assumptions behind the apparent improvement. Then replace the toy clock with measurements from the actual serving path. A fast model becomes a responsive product only when admission, scheduling, and the surrounding application are designed for the same reader experience.`,
  },
];
