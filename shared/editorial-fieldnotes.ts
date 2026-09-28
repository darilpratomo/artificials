import type { Article } from './content';

// Original explainers; content additions only, with independently generated covers.
export const EDITORIAL_FIELDNOTES: Article[] = [
  {
    id: 'fieldnotes-092',
    slug: 'flashattention-gpu-memory-movement',
    title: 'FlashAttention: why moving less data can make AI faster',
    excerpt: 'Understand the memory traffic behind faster attention.',
    category: 'Engineering',
    published: true,
    updated_at: '2026-09-28',
    body: `An AI model can spend surprisingly much of its time waiting for numbers to arrive. A processor may support enormous amounts of arithmetic, yet an implementation can repeatedly move intermediate results through slower memory before the next operation begins. Understanding this distinction helps explain why a change to attention software can improve performance without adding parameters or teaching the model new facts.

FlashAttention is an influential example of designing an algorithm around the hardware that executes it. Its central lesson extends beyond one implementation: count where data travels, not only how many mathematical operations appear on a whiteboard. For someone evaluating an AI service, that lesson also suggests better questions about speed claims, workload shape, and the difference between a fast component and a responsive product.

## Follow one request through memory

Imagine a hypothetical document assistant processing a long equipment manual. Before drafting its answer, the model must process the supplied tokens. Attention combines information across positions, so its implementation needs access to representations of those positions. The useful work is numerical, but moving the numbers into place is part of the cost.

A GPU has a memory hierarchy. Large device memory provides capacity; smaller memory close to the compute units provides faster access but cannot hold everything. A good implementation organizes work so that data brought into the smaller working area contributes as much useful computation as possible before being replaced.

Think of a repair bench with a small tray and a distant storage cabinet. Repeatedly fetching the same components wastes time even if the technician works quickly. The analogy is imperfect because GPUs execute many operations concurrently, but it highlights why fewer trips can matter as much as faster hands.

## What the original algorithm changes

Tri Dao and colleagues introduced FlashAttention as an exact attention algorithm designed to reduce traffic between GPU memory levels. It computes attention in tiles and avoids writing the entire matrix of intermediate attention scores to large device memory. Running statistics allow the normalized result to be assembled across blocks.

The word exact distinguishes this approach from methods that deliberately approximate or omit attention interactions. It does not promise identical floating-point bits across every kernel, precision, or hardware configuration. Numerical implementations still need appropriate correctness tolerances.

https://arxiv.org/abs/2205.14135

The engineering consequence is specific: a different execution strategy can produce the intended attention calculation with a more favorable memory-access pattern. That does not change the model's training data, extend its verified knowledge, or establish that its answers are more reliable. Faster computation and better answers are separate claims with separate evidence requirements.

## Less storage does not remove every cost

Avoiding a large intermediate matrix can reduce memory pressure substantially, but it does not mean ordinary dense attention has become free as context grows. There are still interactions to compute. Model weights, activations outside attention, and other parts of the request also consume resources.

For the document assistant, a larger context might become feasible while still taking longer to process. It could also reduce the number of simultaneous requests a server can handle. Capacity and latency therefore need their own measurements; neither can safely be inferred from a single memory-saving headline.

Be especially careful with a comparison that changes both the kernel and the amount of source material. An answer produced from a shorter manual is doing a different job. Hold the task constant before deciding which system is more efficient, then separately test whether extra context improves the user's outcome.

## Why work partitioning matters too

FlashAttention-2 examines how work is divided among GPU execution units. Tri Dao's paper describes changes to reduce non-matrix-multiplication work and improve parallelism and communication patterns. This is another reminder that mathematically equivalent plans can have different practical costs on parallel hardware.

https://arxiv.org/abs/2307.08691

For an application team, the important implication is methodological. A kernel is part of a software and hardware combination, not a universal speed multiplier. A result reported for one accelerator, sequence length, and numerical format does not automatically predict a result on another configuration.

Record the exact implementation selected at runtime. A framework may expose a convenient attention operation while choosing different execution paths for different inputs. A configuration flag alone is weaker evidence than a trace showing which path actually ran for the requests being measured.

## Separate prompt processing from generation

The document assistant has at least two visibly different phases: processing the input and producing the continuation. A user notices both the wait before the first useful output and the pace of the answer afterward. Improving one phase may have little effect on the other.

Create workloads that represent the product. A short question with a long manual differs from a brief prompt that requests a very long response. A service handling many simultaneous conversations differs from a single-user demonstration. Label each measurement with its input and output lengths and concurrency.

Avoid reducing the whole experience to one tokens-per-second figure. A long initial delay can make an otherwise rapid answer feel unresponsive. Conversely, a quick first token can conceal a slowly completed response. Measure the full request, including queueing and any retrieval work that precedes model execution.

## Build a comparison that answers a decision

Suppose the hypothetical team wants to know whether an attention-kernel change can support longer manuals without increasing the wait users experience. The decision is narrower than proving that one implementation is generally best. Start with a fixed set of representative manuals and questions, including unusually long inputs.

Run the existing and proposed configurations on the same hardware with the same model, precision, request mix, and output limits. Warm-up should be handled consistently and reported separately when startup behavior matters. Repeat measurements rather than relying on the most favorable individual request.

Collect latency distributions, peak memory use, throughput at realistic concurrency, and failure counts. Keep answer-quality checks in the comparison as well. Even an optimization intended to preserve semantics deserves verification against unsupported masks, numerical problems, or accidental configuration changes elsewhere in the stack.

## Diagnose the bottleneck before celebrating

Consider an illustrative request that spends substantial time retrieving files, waiting in a queue, and rendering a long response. Making its attention computation faster may produce a modest overall improvement because other steps still dominate. This is a hypothetical scenario, not a measured result for a particular product.

A useful trace assigns time to stages the team can act on. If queueing dominates, server admission and concurrency may matter more. If retrieval dominates, the index or document pipeline needs attention. If model execution dominates, kernel improvements become more relevant to the user's wait.

Do not blame an optimization for failing to solve a different bottleneck. Equally, do not advertise its isolated component improvement as the improvement to the complete service. State which boundary the measurement covers so that readers can connect the result to their own workload.

## Check correctness where the inputs get awkward

Ordinary examples are necessary but insufficient. Include empty or minimal supported inputs, heavily padded batches, different sequence lengths, and the attention masks the application actually uses. A kernel that performs well on a convenient rectangular benchmark may follow another path under real batching conditions.

Compare reference outputs at tolerances suitable for the chosen numerical format. For generative behavior, also inspect task-level outcomes because small numerical differences can change later sampled tokens. Requiring every sampled paragraph to be identical is different from requiring acceptable numerical and application behavior.

Preserve a fallback configuration and make runtime failures observable. A silent fallback can keep requests working while erasing the expected performance gain. A deployment should therefore distinguish successful use of the intended path, successful fallback, and failed execution instead of treating all completed requests as equivalent evidence.

## Treat context growth as a product choice

More available context creates an opportunity, not an instruction to include every document. Irrelevant passages can increase cost and make evidence harder to inspect. A focused retrieval strategy can remain useful even when an efficient attention implementation makes longer inputs technically possible.

For the manual assistant, test whether the extra pages contain information needed to answer actual questions. Track cases where the right passage was supplied but the answer still missed an exception. That failure calls for better task design or evaluation, not automatically for another increase in context length.

Also consider the reader. A faster model that returns an unnecessarily long explanation may still create more work. The deployment objective should connect resource savings to a concrete benefit: a shorter wait, more simultaneous users, or access to relevant evidence that previously could not fit.

## Read speed claims as workload descriptions

A useful performance report names the model, hardware, software versions, numerical format, input shapes, output lengths, concurrency, and measurement boundary. It includes unsuccessful runs and quality checks. These details make a claim transferable by showing where the comparison might resemble your own system.

FlashAttention is valuable to understand because it makes a hidden cost visible. AI performance depends on the route numbers take through hardware as well as the operations performed on them. Once that becomes clear, optimization discussions become less about an impressive multiplier and more about a reproducible improvement to a defined job.

## Sources and rights

The FlashAttention and FlashAttention-2 papers are cited under their authors' copyrights and arXiv's non-exclusive distribution licence. The licence grants arXiv distribution rights; it is not a general licence to reuse the papers. No source text, figures, or code are reproduced here.`,
  },
  {
    id: 'fieldnotes-093',
    slug: 'neural-network-pruning-sparse-inference',
    title: 'Neural network pruning: fewer weights do not guarantee faster inference',
    excerpt: 'Connect model sparsity to real deployment savings.',
    category: 'AI models',
    published: true,
    updated_at: '2026-09-28',
    body: `Removing weights from a neural network sounds like a direct route to a smaller, faster model. If the original system contains many parameters, surely deleting some should reduce the work. The complication is that mathematical sparsity, file size, memory use, and execution speed are related but distinct properties. A model full of zeros can still run through software that processes every position.

Pruning is best understood as a family of methods for choosing which parts of a network to remove or disable. The useful question is not simply how much can disappear. It is which capability must survive, what representation will store the result, and whether the deployment stack can exploit the resulting structure. Those questions turn a compression experiment into an engineering decision.

## Start with the constraint that matters

Imagine a hypothetical inspection camera that identifies packaging defects on a small local computer. Its team wants a model that starts quickly, fits alongside other software, and completes each prediction before the next item arrives. Reducing the model's parameter count is only one possible means to those ends.

Write down the actual limit first. A slow download calls attention to the distributed artifact. A memory failure calls attention to the loaded model and temporary buffers. A missed processing deadline calls attention to execution latency. The same pruning method may help one of these while doing little for another.

The team should also define unacceptable mistakes. Missing a rare damaged seal may matter more than a slight increase in errors on common, obvious defects. A deployment target is therefore a combination of resource requirements and task behavior, not a maximum sparsity percentage chosen in isolation.

## Unstructured and structured removal

Unstructured pruning removes individual weights without necessarily following a regular layout. This gives the method considerable freedom to preserve useful connections. However, the remaining nonzero values need an efficient representation, and a runtime must know how to operate on that representation without spending too much effort on bookkeeping.

Structured pruning removes larger components such as channels or groups of dimensions. It can produce smaller dense operations that ordinary hardware handles well, although removing whole components may sacrifice different information than deleting scattered weights. The practical benefit depends on exactly which shapes remain after the transformation.

Between these extremes are constrained sparsity patterns designed for particular execution paths. The pattern is part of the deployment contract. A claim that a device supports sparse computation does not imply it accelerates every possible arrangement of missing weights or every layer in the model.

## Zeros are not automatically skipped

Consider an illustrative matrix with many entries set to zero. Stored as an ordinary dense array, it still occupies space for each entry. A dense multiplication routine may still process the full dimensions. Compressing the file for download can reduce transferred bytes without changing that runtime behavior.

Sparse storage records surviving values and enough information to locate them. That metadata has a cost, and irregular access can create additional work. Whether the representation wins depends on the amount and pattern of sparsity, the matrix dimensions, and the implementation serving the actual workload.

For the inspection camera, measure the exported artifact on its intended computer. A speedup observed in a training notebook may vanish after conversion to the deployment format. Conversely, a moderate reduction in structured dimensions may matter more than a dramatic count of individual zeroed weights.

## What pruning research establishes

Jonathan Frankle and Michael Carbin's lottery ticket work investigates sparse subnetworks whose initializations allow them to train effectively. Its experiments concern the relationship between network structure, initialization, and learning. It is not a promise that an arbitrary large deployed model can lose most of its weights without a task-specific investigation.

https://arxiv.org/abs/1803.03635

Elias Frantar and Dan Alistarh's SparseGPT investigates one-shot pruning of large language models. It provides a different research setting and method from searching for trainable subnetworks at initialization. Reading the two together helps distinguish questions that are often collapsed into the single word pruning.

https://arxiv.org/abs/2301.00774

When comparing methods, identify the starting checkpoint, allowed calibration data, retraining requirements, target sparsity structure, and evaluated tasks. Similar final parameter counts can conceal very different preparation costs and very different evidence about preserved behavior.

## Importance is defined by an objective

A small weight is not automatically irrelevant to every input. Its effect depends on the surrounding computation and on which examples are considered. A pruning criterion is a way to estimate importance under assumptions; it is not a direct measurement of everything a network knows.

In the camera example, common defects may dominate the available evaluation set. A method could preserve overall accuracy while damaging sensitivity to an unusual material or lighting condition. The mistake would be treating the aggregate score as evidence that every operationally important behavior survived.

Build a review set around the uses that justify the product. Include borderline defects, uncommon packaging, confusing backgrounds, and the conditions under which staff already struggle. The goal is to discover which errors the compression process introduces and whether those errors fit the team's acceptance criteria.

## Calibration data deserves its own review

Some pruning methods use example inputs to guide the transformation. These examples should resemble the relevant workload without leaking the final evaluation set into the optimization process. Their origin and preprocessing are part of the experiment, even when no conventional full training run occurs.

A camera calibrated only on bright laboratory images may be poorly represented when installed near a shadowed conveyor. A language model calibrated on general prose may need additional evaluation for structured extraction. Neither observation proves failure; each identifies a distribution that the evidence must cover.

Keep calibration, model selection, and final testing separate. If a team repeatedly chooses settings based on the final test results, those results become part of development. Reserve independent examples or a later evaluation period so that the final report still measures behavior beyond the choices already made.

## Compare against a smaller dense model

Pruning a familiar checkpoint is not the only way to satisfy a resource limit. A smaller dense model may offer simpler deployment and predictable execution. Distillation or a narrower task definition may also be relevant, depending on the available data and quality requirements.

Use a common budget to compare realistic alternatives. Include preparation effort, fine-tuning when required, conversion time, inference memory, and latency on the intended device. Comparing an extensively tuned pruned model with an untouched dense baseline can answer a different question from the one the team thinks it is asking.

Operational simplicity has value too. If one option requires a specialized runtime that the team cannot maintain, its benchmark advantage may not translate into a dependable product. Record that tradeoff explicitly instead of burying it beneath the final number of surviving parameters.

## Test the complete artifact

The deployable artifact includes weights, configuration, preprocessing, label definitions, and the code path that executes predictions. An export can alter dimensions, supported operations, or numerical behavior. Validation must happen after that export, on the package that will actually be installed.

For the inspection camera, replay representative image sequences at the expected arrival rate. Measure cold startup separately from steady operation. Watch memory over time and include other processes that share the device. A system that passes an isolated image benchmark can still miss deadlines under realistic contention.

Keep the original model available for controlled comparison and rollback. If a regression appears, the team should be able to reproduce it on both artifacts with the same input. This is much more useful than trying to reconstruct a pruning experiment from an unlabeled directory of checkpoints.

## Watch interactions with other optimizations

Pruning is often combined with quantization, batching, or compiler transformations. These techniques can interact. A kernel that accelerates one precision or shape may not support the new sparse representation. Temporary conversion buffers may also change memory behavior during loading or execution.

Evaluate important combinations directly rather than multiplying isolated speedup claims. If pruning and quantization each helped separately, that does not establish that their benefits will multiply. The combined deployment has its own execution path and its own quality risks to inspect.

Change one major factor at a time while diagnosing results. Once the individual effects are understood, compare complete candidate configurations. This produces a clearer explanation of why the chosen package works and makes future regressions easier to trace when a compiler or runtime changes.

## Report what became smaller and what improved

A useful pruning report separates parameter count, nonzero count, distributed bytes, loaded memory, temporary memory, and prediction latency. It states the sparsity pattern and runtime. Task results should include the operationally important slices as well as any aggregate metric used for selection.

For the hypothetical camera team, success might mean meeting a processing deadline while preserving the detection behavior staff depend on. The final percentage of removed weights is supporting information. Pruning becomes valuable when the removed computation is both unnecessary for the defined job and absent from the work the hardware actually performs.

## Sources and rights

The Lottery Ticket Hypothesis is available under arXiv's non-exclusive distribution licence, with copyright retained by its authors. SparseGPT is published under CC BY 4.0 by Elias Frantar and Dan Alistarh. This article provides original discussion of the cited research and reproduces no paper text, figures, or code.`,
  },
  {
    id: 'fieldnotes-094',
    slug: 'promptable-image-segmentation-masks',
    title: 'Promptable segmentation: turn an outline into a useful image mask',
    excerpt: 'Evaluate image masks, fine edges, and editing effort.',
    category: 'AI models',
    published: true,
    updated_at: '2026-09-28',
    body: `A photograph contains objects, shadows, reflections, gaps, and surfaces that overlap. Asking an AI system to select one object requires more than recognizing its name. The system must decide which pixels belong to the requested region and which belong elsewhere. That decision becomes especially interesting when the request arrives as a click or a rough box instead of a carefully drawn outline.

Promptable segmentation makes this interaction useful: a person supplies a small amount of guidance, and a model proposes a mask. The proposal can save substantial manual work, but the quality of the result depends on what the mask will be used for. A selection that looks convincing in a colored overlay may still be unsuitable for compositing, measurement, or repeated editing.

## Define the selected object before its boundary

Imagine a hypothetical designer preparing a photograph of a houseplant for a catalog. The desired selection could mean the ceramic pot, the leaves, the entire plant and pot, or everything in the foreground including its shadow. A point inside one leaf does not fully express these alternatives.

This ambiguity is part of the task, not necessarily a model failure. A useful interface lets the designer refine the instruction, inspect candidate masks, and undo an unsuccessful change. The design question is how quickly the person can reach the intended region with understandable controls.

Write down the selection policy for the workflow. Decide whether holes between leaves remain transparent, whether detached foliage counts, and whether shadows are selected separately. These choices also guide annotation and evaluation. Without them, reviewers may disagree while each follows a reasonable interpretation of the image.

## What a prompt contributes

Alexander Kirillov and colleagues introduced Segment Anything around promptable segmentation, including spatial guidance such as points or boxes. The model produces masks from this guidance, and its design accounts for ambiguity in what a prompt might identify. The paper is a primary reference for the approach rather than a guarantee for every image domain.

https://arxiv.org/abs/2304.02643

For the plant photograph, a foreground click says something about inclusion. An exclusion click can help distinguish the neighboring chair from a leaf. A box narrows the relevant area but does not necessarily settle every fine boundary inside it. Each interaction adds evidence about the intended selection.

Evaluate the interaction sequence, not just the first mask. If a model needs one extra click but produces a much more usable boundary, it may serve the designer better than one that looks impressive immediately and then becomes difficult to correct.

## A mask is not an alpha matte

A binary mask classifies pixels as selected or unselected. An alpha matte represents degrees of opacity for compositing. Hair, fine fibers, motion blur, and transparent objects often require more than a clean division between inside and outside to look natural against a different background.

The distinction matters for the glass vase beside the plant. Selecting the vase's silhouette does not recover how the original background appears through the glass. Pasting the selected region onto a dark backdrop can therefore retain colors from the old scene even when the outline is correct.

Treat segmentation and compositing as connected but separate stages. The first can identify the region to work on; later processing may need edge refinement, color decontamination, or a dedicated matting method. A product should communicate these capabilities accurately rather than presenting every mask as a finished cutout.

## Inspect the boundary at the intended scale

A small preview hides defects. Zoom in on thin stems, leaf tips, holes, and places where foreground and background have similar colors. Then inspect the output at its final display size. A boundary error that is obvious at extreme magnification may be irrelevant to a small thumbnail, while a halo may remain visible at any size.

Use several background colors during review. White can conceal pale fringes, and black can conceal dark ones. A checkerboard helps identify transparency but should not be the only inspection surface. Place the cutout into a realistic layout before deciding whether it is ready.

Preserve the original image and the editable mask separately. That allows a designer to correct an edge without repeatedly degrading the photograph through exports. Reversibility is a practical quality feature, especially when the model's first interpretation is close enough to be useful but still requires judgment.

## Match metrics to the editing job

Intersection over union compares the overlap between a proposed region and a reference region. It is useful for evaluating masks, but a single area-based score can understate the importance of small structures. Losing a narrow stem may affect few pixels while visibly disconnecting a leaf from the plant.

For an editing workflow, also record boundary defects, missed holes, and how much human correction remains. Time to an acceptable result can reveal differences that a mask score misses. Define acceptable before timing the task so that reviewers are not quietly applying different standards.

Use a collection of challenging examples rather than one polished demonstration. Include clutter, soft edges, similar colors, partial occlusion, reflective surfaces, and small objects. Report results by these conditions so that a strong average does not conceal the cases your users encounter most often.

## Avoid making the evaluation easier with hindsight

A prompt chosen after seeing a model's failure gives it information that an ordinary user might not have supplied initially. Interactive evaluation should distinguish a first attempt from later corrections. Both are useful measurements, but they answer different questions about the workflow.

For the plant example, record the initial click, every corrective click, any candidate-mask selection, and the stopping rule. Compare methods with the same interaction budget or report the effort needed to meet the same acceptance standard. This makes a favorable result easier to reproduce.

Also separate prompts supplied by a skilled evaluator from prompts produced by an automatic procedure. A professional retoucher may know exactly where to click to resolve an ambiguity. That success does not establish that a novice or a downstream automated pipeline will obtain the same outcome.

## Video adds identity and time

A mask in one frame does not establish that the same object will remain selected throughout a clip. Objects move, change appearance, leave the frame, and pass behind other objects. Errors can spread if later predictions depend on earlier selections that were already wrong.

Nikhila Ravi and colleagues' SAM 2 extends promptable segmentation to images and videos, using a memory-based design to support video processing. Its paper offers a starting point for understanding the temporal problem. A deployment still needs evaluation on the kinds of motion, occlusion, and edits it will actually encounter.

https://arxiv.org/abs/2408.00714

For a clip of the plant rotating on a stand, review more than the first and final frames. Check when a leaf crosses another leaf and when the pot passes behind a hand. Those transitions expose whether the selection tracks the intended object or merely follows a visually convenient region.

## Separate perceived quality from measurement reliability

An attractive cutout and a reliable measurement mask have different acceptance criteria. A slightly expanded leaf outline may look fine in a catalog but distort an estimate of leaf area. A workflow intended for measurement must address scale, image geometry, annotation policy, and uncertainty in the boundary.

The model's confidence score does not independently validate the physical quantity being measured. Compare against references collected with a suitable procedure, and inspect systematic errors by object size and image condition. When the evidence is insufficient, preserve the uncertainty instead of turning a neat mask into an unjustified precise number.

This distinction also changes who should review the result. A designer can judge visual fit, while a measurement workflow needs someone who understands the quantity and collection method. The same model output can be helpful in both contexts without serving as the same kind of evidence.

## Make corrections part of the saved work

Store the relationship between the source image, prompts, selected mask, and subsequent edits. If a source image is resized or rotated, coordinate handling must preserve the intended region. A forgotten transformation can make a saved click point at a different object when a project is reopened.

Keep review states explicit. A generated proposal, a manually corrected selection, and an approved export should not be indistinguishable files. This is particularly useful when several people collaborate or when a batch process sends uncertain cases to a human editor.

Promptable segmentation works best when it makes the person's intent easier to express and the result easier to inspect. Judge the full path from ambiguous image to accepted selection. The valuable outcome is an editable, appropriate mask that reduces real work while keeping the difficult boundaries visible.

## Sources and rights

Segment Anything and SAM 2 are cited under their authors' copyrights and arXiv's non-exclusive distribution licence. Model weights, datasets, and software can have separate terms; the paper links do not grant rights to those artifacts. No source text, figures, or code are reproduced here.`,
  },
  {
    id: 'fieldnotes-095',
    slug: 'tabular-ai-trees-neural-networks',
    title: 'Tabular AI: choose a model for the rows you actually have',
    excerpt: 'Compare trees and neural networks on honest data splits.',
    category: 'Guides',
    published: true,
    updated_at: '2026-09-28',
    body: `Many useful AI problems begin in an ordinary table. Each row records an event, an item, or a person, while columns describe quantities and categories. There may be no paragraph to generate and no photograph to interpret. The task could be estimating how long a repair will take or identifying which inventory items need closer inspection. These problems deserve their own modeling choices rather than inheriting whatever architecture dominates AI headlines.

Tabular modeling is challenging because the table's convenient appearance hides its history. Columns may be recorded at different times, missing values may have several meanings, and rows may repeatedly describe the same underlying entity. Before comparing neural networks with decision trees, establish what a prediction is allowed to know. An honest data boundary usually matters more than an impressive model name.

## Define the moment of prediction

Consider a hypothetical bicycle-repair shop that wants to estimate turnaround time when a customer checks in a bicycle. The available columns include the reported problem, bicycle type, current workshop queue, and parts already in stock. The final invoice and technician's completion notes appear later.

If those later columns enter training as features, the model receives clues that will not exist when the estimate is needed. A random train-test split does not fix that problem. The information boundary must be enforced when the training examples are constructed, using what was actually available at check-in.

Write a small example row by hand and label each field with its availability time. This exercise often reveals ambiguous columns. A status called parts available might mean available at arrival or available after an order was delivered. The name alone is not a reliable description of the evidence.

## Establish simple baselines

Start with a prediction that can be explained without a complex model. The shop might use the typical turnaround for a repair category or a simple relationship between queue length and completion time. These baselines expose how much improvement a more complicated system must deliver to justify its maintenance.

A baseline also helps diagnose the target. If all methods struggle during unusual supplier delays, the missing information may matter more than model capacity. If even a crude rule performs suspiciously well, investigate leakage before celebrating. Simple models can function as probes into the dataset's construction.

Keep the evaluation metric connected to the decision. An average absolute error describes one aspect of an estimate, but consistently underestimating long repairs can create a different problem from small symmetric mistakes. Inspect the distribution of errors and the cases that affect customer communication most.

## Why tree ensembles deserve a fair comparison

Decision trees divide the input space through a sequence of conditions. Ensembles combine many such components, offering flexible prediction without requiring every relationship to be smooth. For tables with mixed feature types and irregular interactions, this can be a useful starting point.

Léo Grinsztajn, Edouard Oyallon, and Gaël Varoquaux studied why tree-based models remained strong on a benchmark collection of tabular tasks. Their results support taking tree baselines seriously within that study's setting. They do not establish a permanent winner for every table, dataset size, or future architecture.

https://arxiv.org/abs/2207.08815

For the repair shop, compare a tuned tree ensemble with the simple baseline under the same split and target definition. Do not assume that familiar business columns make the problem trivial. Queue pressure, parts availability, and repair category can interact in ways that still require careful validation.

## Neural networks need an appropriate setup

Neural models can learn flexible representations of numerical and categorical inputs. Their performance depends on preprocessing, architecture, regularization, optimization, and the amount and nature of the data. A weak configuration is not a meaningful representative of everything neural modeling can do.

Yury Gorishniy and colleagues' study of deep learning for tabular data examines strong neural baselines, including a transformer-based approach. It is useful evidence that comparisons should specify implementations and tuning rather than treating either neural networks or trees as one fixed method.

https://arxiv.org/abs/2106.11959

Give candidate methods reasonable, documented tuning budgets. An extensively searched tree model and a default neural model do not receive equivalent preparation. The reverse comparison is equally misleading. Track total development effort as well as final accuracy so the team can choose something it can realistically reproduce.

## Missing values are part of the story

A missing measurement can mean not collected, not applicable, unavailable at prediction time, or lost during processing. Replacing all missing entries with one convenient value erases these distinctions. Sometimes the pattern of missingness is itself related to the workflow that produced the outcome.

In the shop example, an empty parts code could mean no replacement is needed or that diagnosis has not happened yet. Those meanings should not be silently merged if the source system can distinguish them. Improve the schema where possible and document unavoidable ambiguity.

Fit any imputation or scaling procedure using the training partition only. Otherwise information about the held-out data influences the pipeline before evaluation. Save preprocessing with the model so that a production request follows the same transformations as the examples used to establish quality.

## Split rows according to the deployment question

If the shop wants to predict future repairs, a time-based evaluation is usually more informative than shuffling all years together. It exposes changes in staffing, suppliers, and customer demand. However, the exact split should follow the deployment question rather than a universal preference for one technique.

Repeated entities require additional thought. The same bicycle or customer may appear many times. If a product must work for entirely new customers, evaluate that separately from returning customers. Otherwise memorized patterns can make generalization appear stronger than it will be for the intended population.

Keep the final test set independent of repeated model selection. Use development partitions to choose settings, then evaluate the chosen pipeline on examples that did not guide those choices. If the team learns from the final failures and changes the model, it needs fresh evidence for the revised version.

## Watch categorical shortcuts

An identifier can be useful when it represents a stable entity with meaningful history, but it can also become an accidental shortcut. A job number may encode time or location in a way that disappears when the numbering system changes. A staff identifier may absorb patterns that actually reflect different assignments.

Investigate unusually influential identifiers with targeted comparisons. Remove or alter them in a controlled experiment and inspect which predictions change. This does not mean every identifier must be excluded. It means the team should understand why the signal is expected to survive deployment.

Plan for categories that did not occur during training. A new bicycle brand or repair code should produce defined behavior instead of a preprocessing exception. Evaluation examples should include these cases, along with malformed or unexpectedly encoded inputs that real integrations can send.

## Evaluate slices that affect the decision

A single average can conceal poor estimates for uncommon repairs. Break down errors by repair type, queue conditions, parts availability, and other operationally relevant factors. Small groups may have noisy estimates, so report their sample sizes and avoid pretending every observed difference is stable.

For turnaround estimates, inspect both ordinary cases and the long tail. A model can perform well on frequent quick repairs while missing the delays that most frustrate customers. Choose thresholds and communication rules with those consequences in mind, rather than optimizing a metric that ignores them.

Review examples with workshop staff. They may identify mislabeled outcomes or explain that a long completion time included a customer delaying collection. That discovery changes the meaning of the target. More elaborate modeling cannot repair a label that measures something different from the promise the product intends to make.

## Treat uncertainty as a separate output requirement

A point estimate can be useful, but a single number may imply more precision than the evidence supports. If the shop needs a range, define what the range is intended to mean and evaluate its coverage on relevant held-out data. Do not manufacture a range by adding an arbitrary constant around every prediction.

Some conditions may justify requesting more information or using a conservative manual estimate. Record these decisions and evaluate how often they occur. A system that recognizes an unfamiliar repair can be more useful than one that always produces a precise-looking answer.

The interface should describe the estimate in terms the staff and customer can use. It need not expose the model family. What matters is whether the output supports a clear next step and whether people can understand when the estimate is uncertain or no longer applicable.

## Choose the pipeline the team can sustain

The final comparison should include prediction quality, startup and serving cost, retraining effort, schema stability, and recovery from broken inputs. A small improvement may be worthwhile, but it should be weighed against the operational work required to preserve it as the table changes.

Save the feature definitions, preprocessing, split logic, and evaluation results with the chosen artifact. Monitor whether new data still matches the assumptions used to approve it. Tabular AI succeeds when a disciplined representation of the problem meets a suitable model, and the resulting prediction remains honest about what was known at the moment it was made.

## Sources and rights

The two linked research papers are available under arXiv's non-exclusive distribution licence, with copyright retained by their authors. This original explainer does not reproduce their tables, figures, code, or prose. The repair-shop scenario and evaluation discussion are illustrative.`,
  },
  {
    id: 'fieldnotes-096',
    slug: 'differential-privacy-model-training',
    title: 'Differential privacy in AI: define the protection before training',
    excerpt: 'Understand privacy units, training noise, and accounting.',
    category: 'Research',
    published: true,
    updated_at: '2026-09-28',
    body: `Training data can influence a model in ways that are difficult to inspect afterward. Removing names from a table does not by itself establish that the learned model protects the people represented in it. Differential privacy offers a mathematical way to limit how much a randomized procedure's output can depend on a defined unit of private data. Understanding that unit is the first step toward understanding the protection.

For AI teams, the practical challenge is to connect the formal guarantee to the complete training and release process. A privacy parameter is not a substitute for defining whose contribution is protected, which outputs are released, and how repeated experiments are accounted for. The method becomes meaningful when those details are explicit enough for another person to examine.

## Ask what neighboring datasets may differ in

Differential privacy compares the distribution of outputs from a randomized procedure on neighboring datasets. The definition of neighbors specifies the contribution being protected. Depending on the construction, that might be one record or all of one person's records. These are materially different claims.

The parameters commonly written epsilon and delta bound how differently output events may behave between those datasets. Epsilon controls a multiplicative term and delta an additive allowance. They should not be translated into a simple percentage chance that a person's information will leak. Cynthia Dwork and Aaron Roth's monograph develops the formal framework and its assumptions.

https://www.cis.upenn.edu/~aaroth/Papers/privacybook.pdf

Before selecting numbers, write the neighboring-dataset definition in plain language. If an explanation says that one message is protected, it should not quietly become a claim that a prolific contributor's complete history receives the same guarantee. The mathematical statement must follow the data model.

## Follow one contributor through the dataset

Consider a hypothetical community application training a classifier on voluntarily supplied feedback. One participant has submitted a single comment; another has submitted many comments over several months. A table with one row per comment makes the contributions look uniform even though the participants' total influence can differ greatly.

The team should decide whether its intended protection concerns individual comments or contributors. If it concerns contributors, the grouping and contribution limits must reflect that choice. A training recipe developed for independent rows cannot simply acquire a user-level label because the rows happen to contain a user identifier.

This example illustrates a design question, not a privacy calculation for a deployed service. The right accounting depends on the mechanism, sampling, and contribution rules. Document those inputs before making public claims, and have the implementation reviewed against the intended formal definition.

## What private gradient training changes

In differentially private stochastic gradient descent, individual training contributions are bounded through clipping, and noise is added to an aggregate used for the update. The bounded contribution and calibrated randomization are connected parts of the mechanism. Adding arbitrary noise somewhere in training does not establish the same property.

Martín Abadi and colleagues' work on deep learning with differential privacy describes private training and privacy accounting for this setting. The accounting connects the sequence of training steps to a privacy guarantee under stated assumptions. It is not determined by the noise setting alone.

https://arxiv.org/abs/1607.00133

For the community classifier, review how examples are sampled and how clipping is implemented. A mismatch between the algorithm assumed by the accountant and the procedure actually executed can undermine the interpretation of the reported result. The training script and its configuration are therefore evidence, not just implementation details.

## Understand the role of clipping

Clipping limits the size of a contribution before aggregation. It can also affect learning because unusually large gradients no longer enter the update unchanged. Choosing a threshold is thus connected to both the mechanism and the model's usefulness. It deserves evaluation instead of being treated as an invisible library default.

The community team might discover that examples from a rare feedback category produce different training behavior from common categories. That observation does not justify weakening the stated protection for those contributors. It suggests examining data quality, task definitions, and the tradeoffs of the chosen training procedure.

Measure quality by relevant groups and examples as well as an overall score. Privacy and equitable performance are distinct properties. A formally private procedure can still yield a model that works poorly for some users, and a well-performing model can still lack the intended privacy guarantee.

## Account for the whole experiment

Teams often train several candidates, inspect intermediate results, adjust settings, and train again. If private data influences released choices or measurements, the privacy analysis must address the complete process. Reporting only the final run can leave important uses of the data outside the explanation.

Keep a record of which datasets and mechanisms produced every result considered for release. Distinguish experiments using genuinely public or synthetic development data from experiments that consult the protected dataset. This helps reviewers understand which activities require accounting under the adopted approach.

Define a release plan before the work begins. It might cover one model, a set of evaluation statistics, and a clearly specified selection procedure. Planning does not eliminate research uncertainty, but it reduces the temptation to treat every additional experiment as if it had no privacy consequence.

## A library helps execute a design

Opacus provides tools for training PyTorch models with differential privacy. Its documentation explains the privacy engine and configuration, and discusses secure random-number generation. The project is distributed under the Apache 2.0 licence. A library can make a mechanism more accessible while still requiring the user to understand its assumptions.

https://opacus.ai/docs/faq

Record the library version, sampling configuration, accounting method, and relevant randomness settings. Test that the intended private path is active. Merely importing a package or displaying a privacy-related configuration field is not evidence that every update followed the approved procedure.

Also review unsupported components and preprocessing. A convenient architecture change can alter how examples interact during training. Use the library's validation guidance and inspect the complete pipeline rather than assuming that attaching a privacy engine makes any arbitrary training program satisfy the desired guarantee.

## Training privacy does not secure the surrounding application

A private model-training procedure does not protect a raw-data export left in an accessible storage location. It does not stop an application log from recording the original feedback, or prevent an overprivileged operator from downloading the source table. Those are different paths by which information can be exposed.

Map where the community comments travel before and after training. Include development notebooks, backups, annotation tools, and debugging traces. Reduce unnecessary copies and define access and deletion procedures appropriate to the service. These measures complement the formal training guarantee by addressing systems outside its boundary.

Likewise, a model used with a retrieval tool may receive private documents at inference time. A guarantee about its training process does not automatically cover those retrieved documents or the application's authorization checks. Explain the boundary so that a correct narrow statement is not mistaken for protection of every data flow.

## Evaluate utility without overselling the result

Compare the private candidate with a clearly defined baseline using an evaluation procedure consistent with the privacy plan. Report the prediction task, dataset characteristics, metric, and any important limitations. A quality difference can depend on data size, model choice, and task difficulty rather than being a universal cost of privacy.

For the feedback classifier, inspect confusing categories and the policy for uncertain cases. If the model cannot reliably separate two labels, revising the taxonomy may be more useful than repeatedly increasing training effort. Product design can reduce the amount of predictive precision needed from the model.

Avoid presenting a favorable empirical attack test as a replacement for the mathematical analysis. Failure to recover a particular example during one test does not prove a general guarantee. Conversely, a formal guarantee needs accurate implementation and a clearly stated scope to be meaningful in the deployed system.

## Explain what the guarantee permits

Learning useful population patterns is compatible with differential privacy. A model may predict a general relationship that also applies to someone who never contributed data. The framework limits dependence on the specified private contribution; it is not a promise that no accurate inference about anyone can ever be made.

That distinction helps the community team write understandable product information. Explain what is protected, the parameters and assumptions, and which systems remain outside the claim. Do not substitute broad words such as anonymous or untraceable for a precise account of the mechanism.

Keep that explanation connected to the deployed version. If the training data, contribution rules, or release procedure changes, reassess the claim. Differential privacy is most useful when treated as a concrete property of an audited process, supported by careful accounting and ordinary data stewardship throughout the application.

## Sources and rights

The monograph is copyright Cynthia Dwork and Aaron Roth, 2014. The Abadi and colleagues paper is available under arXiv's non-exclusive distribution licence. Opacus identifies its project licence as Apache 2.0. These sources are cited for reference; no book or paper text, figures, or software are reproduced.`,
  },
  {
    id: 'fieldnotes-097',
    slug: 'approximate-nearest-neighbor-vector-search',
    title: 'Approximate vector search: find useful neighbors without visiting every point',
    excerpt: 'Balance vector-index recall, latency, and freshness.',
    category: 'Engineering',
    published: true,
    updated_at: '2026-09-28',
    body: `Semantic search often starts with a simple picture: convert a query and a collection of items into vectors, then return the items nearest to the query. The picture is useful, but it hides a practical question. How should a system find nearby vectors when comparing the query with every stored item becomes too expensive for its workload?

Approximate nearest-neighbor search trades some exactness in the search procedure for a different balance of latency, memory, and construction cost. That trade can be worthwhile, but it introduces a second source of error alongside the embedding model itself. Understanding which layer failed is essential when a search result looks plausible yet omits the document the user actually needed.

## Establish an exact reference first

Imagine a hypothetical museum searching its collection of object descriptions. A curator asks for carved wooden boxes with floral patterns. The embedding model converts that request into a vector, and the search system looks for nearby descriptions under a chosen similarity measure.

For a manageable evaluation collection, compute the exact nearest neighbors by checking every eligible vector. This gives the team a reference for measuring approximation error. It does not establish that the embedding model's neighbors are the best answers to the curator's question; that requires relevance judgments about the objects.

Keep those two references separate. Exact-vector neighbors tell you whether an approximate index recovered the intended geometric result. Human or task-specific relevance judgments tell you whether that geometric result helps the user. Improving one layer cannot automatically repair problems in the other.

## Similarity depends on the representation

The distance or similarity measure must match how the embeddings are intended to be used. Normalization, vector dimensions, and the model that produced them are part of the retrieval configuration. A query encoded by one incompatible model cannot reliably search a collection encoded by another simply because both outputs are lists of numbers.

For the museum, document how descriptions are assembled before embedding. Including a long conservation history may emphasize different information from including a short object description. A search index can faithfully return neighbors of a representation that has already obscured the feature the curator cares about.

When evaluating an embedding change, distinguish it from an index change. Rebuilding the collection with new vectors and switching the search algorithm simultaneously makes regressions harder to explain. Use controlled comparisons before choosing the complete configuration that will serve real queries.

## How graph search avoids visiting everything

Graph-based indexes connect vectors so a search can move through promising neighbors instead of examining the entire collection. Hierarchical Navigable Small World graphs, introduced by Yu. A. Malkov and D. A. Yashunin, organize this navigation across layers. Upper layers support broader movement, while lower layers support a more local search.

https://arxiv.org/abs/1603.09320

The useful intuition is a network of stepping stones, not a perfect map that reveals the answer immediately. The construction and query settings influence how much of the graph is explored. Spending more effort on search can improve recovery of exact neighbors while also increasing query cost.

For the curator, a fast response is only valuable if relevant objects remain discoverable. The team therefore needs a range of operating points instead of one default setting. Measure what changes as the search budget increases and decide which point supports the intended user experience.

## Other index families make different trades

Some approaches partition the space so a query searches selected regions. Others compress stored vectors or combine partitioning with compressed representations. These choices affect memory, construction, and distance estimates in different ways. A method attractive for a large static collection may be inconvenient for a frequently changing one.

The Faiss project's index-selection guidance discusses choices in relation to available memory, dataset size, and whether exact results are needed. It is a practical primary reference for framing an index comparison, not a universal prescription for every deployment or hardware configuration.

https://github.com/facebookresearch/faiss/wiki/Guidelines-to-choose-an-index

Begin with the simplest option that can meet the actual workload. The museum's collection might be small enough for exact search, especially with suitable hardware and batching. Adopting approximation before measuring the baseline creates complexity without establishing that the trade is necessary.

## Measure index recall and user relevance separately

Index recall at a chosen result count measures how many exact reference neighbors the approximate search recovered. State the similarity measure, reference collection, and treatment of ties. Without these details, two recall figures may describe different tasks despite sharing the same label.

User relevance asks whether the returned objects answer the question. The nearest vectors might contain many near-duplicate catalog descriptions, leaving little variety in the visible results. Conversely, an approximate result that differs from the exact set may still be useful to a curator. That does not make the approximation metric wrong; it gives it a specific scope.

Create query groups that reflect the collection. Include materials, visual motifs, historical terms, ambiguous descriptions, and exact identifiers. Exact identifiers may benefit from lexical matching, so evaluate the complete retrieval strategy rather than assuming semantic similarity should handle every search equally well.

## Filters change the search problem

The curator may restrict results to objects in a particular collection or items available for exhibition. A nearest-neighbor search over all objects followed by filtering can return too few eligible results. Raising the initial candidate count may help in some cases but requires measurement under selective filters.

Use an exact reference over the same eligible subset when evaluating filtered queries. Otherwise the test compares different problems. Include common filters and combinations that leave only a small fraction of the collection available, because these can behave differently from an unrestricted demonstration.

Authorization is a separate boundary. If some records are private, ensure their content and identifying metadata cannot reach an unauthorized user through results, snippets, debugging output, or later reranking. A relevance filter and an access-control rule may share implementation machinery while carrying different consequences if applied incorrectly.

## Reranking cannot recover missing candidates

A second-stage model can reorder retrieved candidates using a richer comparison with the query. That can improve visible relevance, but it only evaluates what the first stage supplies. If the relevant wooden box never enters the candidate pool, a reranker cannot select it from that pool.

Measure candidate retrieval before evaluating the final ranking. For each missed answer, ask whether the item was absent from the index, absent from the candidate set, or ranked poorly after retrieval. These failure categories point to different fixes and prevent unnecessary changes to a component that worked correctly.

Also include the reranker's latency and cost in the complete request measurement. A larger candidate pool may improve quality while making the second stage more expensive. The right retrieval budget is therefore connected to both the first-stage index and the processing that follows it.

## Updates are part of index quality

Collections change. New records arrive, descriptions are corrected, objects move between categories, and access permissions are revised. An index that answers old queries well but reflects updates slowly can still fail the product's requirements. Define how quickly each kind of change must affect results.

For the museum, an obsolete description should not remain searchable indefinitely after a correction. Track the relationship between source records, embedding versions, and index entries. When rebuilding, preserve a consistent snapshot or a clear update protocol so the deployed index does not mix incompatible states accidentally.

Test deletion and replacement directly. Verify that removed content is absent from the serving path, including replicas and caches relevant to the application. A background rebuild that eventually fixes the index is different from an immediate removal guarantee and should be described accordingly.

## Benchmark realistic operation

Run queries while the system performs the updates and concurrency expected in production. Measure latency distributions, memory usage, index construction time, and quality at each configuration. Include cold and warm behavior when loading or caching materially affects the experience.

Use representative queries rather than only randomly selected stored vectors. Searching with a vector already present in the collection can be an easier problem than interpreting a curator's short, imperfectly phrased request. Preserve the query set and reference results so future changes can be compared fairly.

Record unsuccessful searches and timeouts as outcomes. Excluding them makes a fast-looking configuration appear more dependable than it is. A useful operational report connects quality and latency under a stated workload, rather than presenting the best number from separate favorable conditions.

## Choose a tradeoff that stays understandable

The final choice should explain why approximation is needed, how much exact-neighbor recovery it sacrifices, and what that means for users. Include the embedding model, index family, construction and search settings, filters, update behavior, and reranking stages in the release record.

Approximate search is a way to spend computation selectively. Its value depends on retaining useful candidates while meeting the system's practical constraints. For the museum, success is a curator finding the right objects promptly and consistently, with enough visibility into the pipeline to explain why a missing result was missed.

## Sources and rights

The HNSW paper is available under arXiv's non-exclusive distribution licence, with copyright retained by its authors. Faiss software uses the MIT licence; its linked documentation is cited for reference, without reproducing code or documentation text. The museum scenario is original and illustrative.`,
  },
  {
    id: 'fieldnotes-098',
    slug: 'test-time-adaptation-distribution-shift',
    title: 'Test-time adaptation: when an AI model changes while it is being used',
    excerpt: 'Test online updates against drift, order, and recovery.',
    category: 'Research',
    published: true,
    updated_at: '2026-09-28',
    body: `Most deployed models are treated as fixed instruments. They receive an input, produce an output, and keep the same learned parameters for the next request. Test-time adaptation explores a different possibility: use information in incoming data to adjust parts of the model while it is being used. This can be attractive when deployment conditions differ from the conditions represented during training.

The change also makes evaluation more complicated. A prediction may now depend on the sequence of earlier inputs and on the adaptation state accumulated so far. A model that improves during one stream may drift during another. Understanding this behavior requires treating the stream, update rule, and reset policy as parts of the system rather than evaluating each input as an isolated event.

## Identify the shift you are trying to address

Imagine a hypothetical warehouse camera that classifies package types. Its original training images were captured under one lighting arrangement. After a renovation, reflections and color balance change. The objects and label definitions may remain similar while the appearance of the input changes.

This is one possible adaptation setting, but not every deployment failure has that form. A new package category changes the task differently from a darker photograph of a familiar category. A broken camera can remove information altogether. Adjusting model parameters cannot reliably recreate evidence the sensor never captured.

Describe the suspected shift before choosing a method. Compare examples across conditions and verify the data pipeline. An incorrect channel order, unexpected resize, or damaged sensor should be fixed directly. Test-time learning should not become a complicated way to compensate for an ordinary integration bug.

## Distinguish adaptation from other runtime changes

An application can change behavior at runtime without training the model. It might select a different prompt, retrieve new documents, adjust a decision threshold, or choose among several fixed models. These approaches have different state and evaluation requirements from updating learned parameters on incoming examples.

Within adaptation, methods also differ in what they change. Some update a limited set of parameters or statistics; others use additional objectives or memory. State precisely which components may change and what data drives the update. The label test-time adaptation alone leaves too much unspecified.

For the warehouse camera, a practical proposal should say whether updates persist across shifts, whether the original training data is available, and whether labels arrive later. Those details determine which research setting is relevant and what resources the implementation actually needs while serving predictions.

## What an unlabeled objective can teach

Without ground-truth labels, an adaptation method needs another signal. Dequan Wang and colleagues' Tent studies entropy minimization for fully test-time adaptation, updating selected components to make predictions more confident on incoming data. The paper is a concrete example of an objective that can operate without ordinary supervised labels at deployment.

https://arxiv.org/abs/2006.10726

Confidence is not the same as correctness. If the warehouse model initially mistakes a new reflective package for a familiar one, making that prediction sharper may reinforce the wrong interpretation. The usefulness of the objective depends on assumptions about the shift and the model's starting behavior.

This is why an unlabeled training signal still needs labeled evaluation somewhere in the development process. Measure whether the adaptation objective improves the actual classification task under representative shifts. A steadily decreasing internal objective is evidence about optimization, not sufficient evidence about operational accuracy.

## The order of inputs becomes part of the experiment

A fixed model generally gives the same deterministic prediction for the same input and configuration. A stateful adapting model can encounter that input after a long sequence that changed its parameters. Evaluating it on shuffled images may therefore answer a different question from evaluating it on a chronological camera stream.

For the warehouse, morning lighting may gradually become afternoon glare, followed by a return to the original condition. Test these transitions in a plausible order. Also compare alternative orders to understand sensitivity. Do not report the most favorable ordering as if the method were independent of history.

Document the initial checkpoint and any warm-up period. If a benchmark resets between conditions but production never resets, the measured system and deployed system differ. The reset policy can have as much practical importance as the update rule because it controls which earlier experiences continue to influence predictions.

## Continual adaptation raises recovery questions

Qin Wang and colleagues' work on continual test-time domain adaptation investigates changing conditions over time and methods intended to address error accumulation and forgetting. It provides a primary research reference for why long-running adaptation needs more than success on a single isolated shift.

https://arxiv.org/abs/2203.13591

For an engineering team, translate that concern into recovery experiments. After a difficult sequence, return to a familiar condition and observe whether performance recovers. Then reset to the approved checkpoint and compare. This distinguishes a temporary challenge in the input from persistent damage to the adaptation state.

Keep an immutable reference artifact. A saved name such as production model is insufficient if its parameters continue to change. The deployment record should identify the original weights, adaptation method, current state when relevant, and the procedure that restores the validated starting configuration.

## Compare with a strong fixed alternative

Before adding online updates, evaluate whether a more representative fixed model solves the problem. Training data augmentation, improved sensor calibration, or a scheduled retraining process may be simpler to operate. Adaptation should compete with realistic alternatives rather than a deliberately weak baseline.

In the warehouse example, collecting labeled photographs after the lighting renovation might be feasible. If the environment changes constantly and labeling is slow, online adaptation could be more attractive. The choice depends on the cost and frequency of change, not just the novelty of learning during inference.

Include operational costs in the comparison. Gradient calculations, extra passes, or state storage can affect latency and memory. A quality improvement that prevents the camera from keeping up with the conveyor may not satisfy the system's actual purpose. Measure the complete request and update cycle.

## Protect the boundary between streams

If adaptation state is shared across unrelated users or devices, one stream can influence predictions for another. That may be intended in some systems and unacceptable in others. The ownership and lifetime of adaptation state should therefore be explicit parts of the architecture.

For a fleet of warehouse cameras, decide whether each device adapts independently. Combining streams from different lighting conditions can produce behavior unlike any individual camera's evaluation. A central service also needs a policy for restarts, device replacement, and the movement of workloads between servers.

Inspect whether incoming data is sufficiently trusted to drive updates. Even without a malicious actor, a long burst of unusual or corrupted inputs can be harmful. Define the conditions under which updates pause, the model falls back to a fixed state, or examples are routed for review.

## Avoid label leakage in method selection

Researchers and engineers may have labels for an evaluation stream even when the proposed method does not use labels during deployment. Those labels can guide development, but repeatedly choosing settings against the final stream makes it part of training and selection in a broader sense.

Separate development shifts from the held-out sequences used for the final claim. Choose learning rates, stopping rules, and reset criteria using development evidence. Then report the behavior of the chosen procedure on independent streams, including cases where it performs worse than the fixed baseline.

Do not allow a retrospective best checkpoint to stand in for a deployable selection rule. A system cannot choose the most accurate moment in a stream using labels it does not receive. Evaluate the rule that would actually decide when to save, reset, or stop adapting.

## Monitor signals without confusing them with truth

Production systems may lack immediate labels, so monitoring often relies on input statistics, confidence patterns, disagreement, or operational failures. These signals can trigger investigation, but none automatically measures true accuracy. An adapting model can become confidently wrong while looking stable on a superficial dashboard.

Maintain a process for obtaining appropriate delayed labels or human review where the application needs them. Sample ordinary examples as well as alerts, because a monitor that only examines flagged cases can miss systematic unflagged errors. Connect reviewed examples back to the state that produced each prediction.

Use simple operational controls. A team should be able to pause adaptation, restore a reference model, and identify affected periods without reconstructing an opaque history. Observability and rollback are especially valuable when the artifact being monitored is not the same artifact that was originally deployed.

## Approve a procedure, not just a checkpoint

A credible release report names the shift assumptions, updated components, unlabeled objective, learning schedule, input order, state-sharing policy, and reset behavior. It compares quality and resource use with fixed alternatives. It also describes what happened after difficult conditions ended, because recovery is part of long-running behavior.

Test-time adaptation asks whether incoming evidence can improve a model under a specific kind of change. The answer is empirical and conditional. Treat the deployed system as an evolving procedure with boundaries and recovery paths, and the results become much easier to interpret than a claim that the model simply learns as it goes.

## Sources and rights

The Tent and continual test-time adaptation papers are available under arXiv's non-exclusive distribution licence, with copyright retained by their authors. The warehouse examples and operational evaluation discussion are original illustrations. No paper prose, figures, or code are reproduced.`,
  },
  {
    id: 'fieldnotes-099',
    slug: 'multi-task-learning-negative-transfer',
    title: 'Multi-task learning: when sharing a model helps and when tasks compete',
    excerpt: 'Measure shared representations and conflicting objectives.',
    category: 'AI models',
    published: true,
    updated_at: '2026-09-28',
    body: `A single image can support several useful predictions. A room photograph might reveal object categories, surface boundaries, and approximate depth. Separate models could learn each task, or a shared model could reuse some of the same representations. Multi-task learning explores that sharing, with the hope that related objectives teach compatible and useful features.

The hope is reasonable, but sharing is not automatically beneficial. Tasks can compete for limited capacity, receive unequal training attention, or encourage conflicting changes to shared parameters. A combined score can conceal that one task improves while another gets worse. A good multi-task experiment therefore begins with clear individual tasks and ends with evidence for each of them.

## Draw the boundary around each task

Imagine a hypothetical application that helps organize photographs of furniture. One task identifies the furniture category, another locates the object in the image, and a third estimates whether the photograph is suitable for a catalog. These outputs use related visual evidence, but their acceptance criteria differ.

Category prediction needs meaningful labels. Localization needs an agreed object boundary or box. Catalog suitability might depend on lighting, framing, or an editorial standard rather than the object's identity. Treating all three as interchangeable accuracy problems would obscure what each output is supposed to accomplish.

Define the input and target for each task before designing the shared model. Record whether all labels exist for every photograph and who supplied them. A missing suitability judgment must not silently become a negative judgment, and uncertain object categories should not become confident labels through a convenient preprocessing rule.

## What sharing changes

A common design uses shared layers followed by task-specific output components. The shared representation receives learning signals from several objectives, while each output component converts that representation into its own prediction. This can reuse computation and allow one task's examples to influence features used by another.

The amount of sharing is a design choice. Early image features might be shared while later processing remains specialized. Alternatively, separate branches may be necessary when tasks rely on different details. The fact that two outputs come from the same photograph does not prove that every internal representation should be identical.

For the furniture application, compare these choices against independent models. Sharing may simplify deployment or reduce repeated image processing, but those benefits need measurement. If the combined model must run an expensive branch even when only one output is requested, the practical savings may differ from the initial expectation.

## Negative transfer is a result to investigate

Negative transfer describes a task becoming worse through joint learning than under an appropriate separate baseline. It is not a diagnosis by itself. The cause might involve incompatible objectives, insufficient capacity, loss weighting, label quality, or an unfairly tuned comparison. Each possibility suggests different experiments.

Suppose the application becomes better at identifying chairs but worse at judging image suitability. Inspect the examples that changed. The suitability task might need sensitivity to blur and lighting that the shared representation learns to ignore for robust category recognition. That is a plausible hypothesis to test, not a conclusion established by the aggregate scores.

Use targeted variants to investigate. Adjust the shared layers, training balance, or task-specific capacity while preserving the evaluation split. Keep a record of what each experiment changes. Repeatedly adding complexity without isolating the cause can produce a fragile system whose apparent gains are difficult to reproduce.

## Loss scales are not comparable by default

Different objectives can produce numbers on different scales. Adding them with equal coefficients does not necessarily give the tasks equal influence over shared parameters. The number of labeled examples, gradient magnitudes, and frequency of updates also affect which objective shapes the model.

Alex Kendall, Yarin Gal, and Roberto Cipolla investigated weighting multiple losses using task uncertainty in a setting involving scene geometry and semantics. Their work is a primary example of treating weighting as a modeling problem. Its method is not a guarantee that every application will receive an appropriate balance automatically.

https://arxiv.org/abs/1705.07115

For the furniture application, report the weighting rule and examine each task's learning curves. If one task's metric deteriorates while the total training loss improves, the combined objective may be hiding an unacceptable tradeoff. The product's requirements must remain visible outside the arithmetic used for optimization.

## Gradient conflict offers another view

Two tasks can suggest different directions for changing shared parameters. Tianhe Yu and colleagues' work on gradient surgery studies interventions when task gradients conflict. This provides a concrete research approach to interactions that a scalar sum of losses can make difficult to see.

https://arxiv.org/abs/2001.06782

For an application team, gradient measurements can help test a hypothesis about training behavior. They do not replace evaluation on actual outputs. A method that changes gradient relationships still needs to demonstrate useful task performance, acceptable resource use, and reproducibility under the chosen data and architecture.

Avoid treating conflict as evidence that the tasks are fundamentally incompatible. It may be local to a training stage or configuration. Conversely, apparently cooperative updates do not prove that a final model meets every task's requirements. Diagnostic measurements are most useful when connected to a specific failure and an experiment designed to investigate it.

## Sampling determines whose examples are heard

The furniture archive may contain many category labels but relatively few carefully reviewed suitability labels. Uniformly sampling all records could give the category task far more updates. Balancing batches differently changes the effective training distribution and may also increase repeated exposure to the smaller dataset.

Document how examples and tasks are sampled. If one task is oversampled, watch for overfitting and inspect performance on independent examples. If missing labels are masked out, verify that this happens correctly and that the remaining objective is normalized in a way the experiment intends.

Label quality also matters. A large collection of weak labels can dominate a small collection of careful annotations if the training procedure does not account for the difference. Investigate disagreement in the labels before assuming that more shared data must produce a better representation.

## Compare under a fair resource budget

A shared model and several independent models can differ in parameter count, training time, inference cost, and tuning effort. There is no single universally fair comparison; the right one depends on the decision. State whether the constraint is serving memory, total training compute, latency, or development capacity.

For the photograph organizer, all three outputs might be requested together during ingestion. Shared computation could be valuable there. In an interactive tool, users might request only category prediction, making a smaller dedicated model attractive. Benchmark the request patterns the product actually serves.

Count data preparation and maintenance as well. Combining tasks may require aligning annotations and coordinating releases across teams. A modest compute saving can still be worthwhile, but it should not conceal substantial operational coupling that makes future changes harder to ship or roll back.

## Preserve evidence for every output

Report task-level metrics separately before presenting any overall objective. Include important slices such as object size, lighting conditions, unfamiliar furniture types, and images with several objects. A weighted average cannot tell a reader whether the system satisfies a minimum quality requirement for each feature.

Use the same held-out source images appropriately across comparisons, while preventing near-duplicate photographs from leaking between training and testing. Related images of the same item can make generalization look easier than it is. Grouping by object or photo session may be relevant depending on the intended deployment.

Inspect joint failures too. An incorrect category and incorrect localization may arise from the same missed object. Understanding that relationship helps the application decide when to request human review. Independent confidence thresholds may be insufficient if errors across outputs are strongly related.

## Plan for one task to change

Suppose the editorial team revises what counts as a catalog-ready photograph. Updating that task can alter shared representations and affect category recognition or localization. A release that appears to concern only one output may therefore require regression checks for every output that shares the backbone.

Version the label definitions and evaluation sets. Keep representative examples from the earlier tasks available for regression testing, and decide whether the shared model can be rolled back as one unit. If independent release schedules are essential, less sharing may be the better engineering choice.

This is also a reason to retain useful baselines after the initial experiment. A previously reliable separate model can help identify which behavior changed and provide a practical fallback. Deleting every alternative as soon as joint training wins one comparison makes future diagnosis unnecessarily difficult.

## Share where the evidence supports it

Multi-task learning is most convincing when the related objectives have clear definitions, the sharing arrangement is justified by experiments, and every task retains acceptable behavior. The report should make the costs and benefits legible, including any task that sacrifices quality for another's improvement.

For the furniture application, the successful outcome is a dependable set of predictions that reduces work for the people organizing the archive. A shared model is one possible way to achieve that. Choose the amount of sharing that earns its place through measured performance and maintainability, and keep individual task outcomes visible throughout the model's life.

## Sources and rights

Both linked research papers are available under arXiv's non-exclusive distribution licence, with copyright retained by their authors. This explainer includes original discussion and a hypothetical furniture-archive scenario. It reproduces no research figures, code, or source prose.`,
  },
];
