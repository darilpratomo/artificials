-- Original Artificials collection, 20 September 2026. Preserve existing CMS edits.
insert into public.articles (slug,title,excerpt,category,body,published,updated_at) values
('choose-an-ai-model-for-your-product','How to choose an AI model for your product','Turn a crowded model shortlist into a practical decision using task contracts, failure costs, and a repeatable comparison.','AI models','Choosing a model starts with a product decision: what outcome are you paying for? A document assistant, a code reviewer, and a receipt extractor can all use language models, but their definitions of success differ. Comparing them through one general ranking hides the requirements that determine whether the product works.

Consider an illustrative assistant for a bicycle repair shop. It reads a customer message, identifies the bicycle type, and proposes an appointment category. A beautifully written reply is less useful than correctly distinguishing a routine service from a safety concern that needs a technician.

## Write the task contract first

Describe the input, the required output, and the cases that must be handed to a person. For the repair shop, inputs might include incomplete messages and photos; outputs might include a service category, missing information, and a draft response. The assistant must not promise stock availability without checking the inventory system.

Give each requirement an observable test. “Understands customers” is difficult to judge consistently. “Requests clarification when the bicycle type is missing” can be checked. Keep several examples where the right behavior is to ask a question instead of finishing the task.

## Use model cards to eliminate mismatches

Model cards can document intended uses, limitations, evaluation information, and licensing metadata. Read the card and the actual serving documentation together. A downloadable model and an API offering with a similar name may have different formats, limits, or operational behavior.

Record the exact identifier and deployment route in your shortlist. Reject candidates that cannot accept your required inputs or operate inside your data-handling requirements. This is cheaper than benchmarking an unsuitable option and discovering the mismatch during integration.

## Compare the complete workflow

Run the same representative cases through each candidate with the same access to tools and evidence. Include normal requests, ambiguous requests, and malformed inputs. Save the answer, tool results, timing, and validation outcome. A model that succeeds only after several retries may be expensive even when its per-token rate is low.

For the repair shop, score category selection separately from response quality. Otherwise, friendly writing can disguise incorrect routing. Review errors by consequence: asking one extra question and booking an unsuitable repair slot should not receive identical penalties.

## Make a decision you can revisit

Set minimum quality requirements before comparing cost. Among candidates that pass, compare cost per completed task, operational complexity, and the waiting time users experience. Keep the evaluation cases and model settings so a later model update can be assessed against the same standard.

Start with a limited rollout and a visible correction path. Capture technician edits as candidate evaluation examples, removing unnecessary personal information. Investigate repeated mistakes before expanding traffic. A shortlist becomes valuable when it connects model behavior to a real decision, with evidence that another person can inspect.

## Your first experiment

Take twenty varied, anonymized customer requests and write the expected category and clarification behavior before generating answers. Treat this as an initial diagnostic set, not statistical proof of reliability. Compare two candidates, examine every disagreement, then expand the set around the errors that matter most to the business.

## Further reading

https://huggingface.co/docs/hub/model-cards',true,'2026-09-20'),
('evaluate-ai-coding-models','Evaluating coding models beyond a leaderboard','Compare AI coding assistants on repository tasks, independent tests, review effort, and the reliability of the final patch.','AI models','A coding assistant can write convincing code that does not fit the repository around it. The gap often appears in small details: an existing permission check, a shared formatting rule, or a migration that older clients still depend on. Choosing a coding model means evaluating how it works inside those constraints.

Public benchmarks help identify candidates. SWE-bench, for example, evaluates software issue resolution in repositories. Its results belong to a particular evaluation setup. They are not a promise that the same model will resolve your team''s tickets at the same rate.

## Build tasks from actual maintenance work

Create a small collection of completed historical issues for which you know the desired behavior. Use a clean repository snapshot from before the fix, and remove the solution from anything the assistant can access. Include a bug fix, an accessibility improvement, a dependency change, and a request that should require clarification.

One useful example is a search field that loses its value after navigation. The task is not simply to make the field look correct. The patch should preserve browser navigation, avoid breaking another filter, and follow the project''s state-management conventions. Write those checks before running the assistant.

## Separate model ability from tool access

Keep time limits, available commands, and repository information comparable. A system allowed to inspect tests and run a browser has a different working environment from a model asked to produce a patch from a short excerpt. Record both the model and the surrounding agent configuration.

Give assistants an isolated checkout with no production credentials. Restrict network access where the task permits it. Successful editing does not require access to the team''s customer database, and a development experiment should not create a path to production data.

## Test behavior independently

Run tests that were not written solely by the model generating the patch. Otherwise, the assistant can accidentally validate its own mistaken interpretation. Include checks for the reported bug and nearby behavior that must remain intact. Inspect whether the patch weakened or deleted a test to obtain a passing result.

Review the diff as a maintainer would. Look for unrelated edits, hidden configuration changes, and unnecessary dependencies. A solution that passes today but introduces a large abstraction for a small fix may increase future maintenance costs. Keep review effort separate from functional success in your scorecard.

## Count retries and unfinished work

Track how many attempts were required, how long a reviewer spent correcting the output, and whether the final patch could be merged. Include failures and timeouts in the denominator. Reporting only successful runs makes the tool appear more dependable than it was.

For an illustrative ten-task trial, record each result as accepted, accepted after human changes, or rejected, with a short reason. Those categories make it easier to see whether the assistant saves implementation time or simply transfers work into review. Ten tasks still provide only an early signal; broader use needs broader evidence.

## Turn findings into working rules

If the assistant handles local UI fixes well but struggles with database ownership rules, scope its initial use accordingly. Supply repository instructions that explain real constraints. Re-run the comparison after material changes to the model, tools, or agent prompts, and keep the previous results available for reference.

## Further reading

https://www.swebench.com/',true,'2026-09-20'),
('rag-vs-fine-tuning','RAG vs. fine-tuning: diagnose the problem first','Distinguish missing knowledge from inconsistent behavior before choosing retrieval, fine-tuning, or a simpler application change.','AI models','An assistant gives the wrong answer about your product. Should you connect it to a document index or fine-tune a model? The answer depends on why it failed. It may lack the relevant information, misunderstand a policy, ignore a required format, or receive contradictory instructions from the application.

Treat those as separate defects. A larger engineering investment does not help if it targets the wrong one. Begin with a failure you can reproduce and inspect the exact evidence and instructions that reached the model.

## Retrieval supplies information at request time

Retrieval-augmented generation combines a generator with access to retrieved material. The original RAG research explored how external memory could support knowledge-intensive language tasks. In a product, the practical question is whether the system can locate the right evidence before composing an answer.

Imagine a travel equipment store changing its return window for a seasonal promotion. A current policy document can provide the new rule without retraining the model. The application still needs to distinguish the active policy from an archived one and confirm that the retrieved paragraph applies to the customer''s purchase.

## Fine-tuning changes learned behavior

Fine-tuning adjusts a model using training examples. Parameter-efficient methods such as LoRA train additional parameters while keeping the base model weights fixed. This can make adaptation more manageable, but good results still depend on appropriate examples, evaluation, and deployment compatibility.

For the store, fine-tuning might be worth testing if the assistant repeatedly fails to produce the required support categories despite clear instructions and good examples. It is a weaker first choice for a rule that changes every week. You would be turning routine information updates into a training and validation process.

## Try a controlled diagnosis

Choose a set of failed requests and manually provide the correct, concise evidence. If answers improve, retrieval or document quality is a likely place to investigate. If answers remain wrong, examine instruction conflicts, reasoning requirements, and output validation. This experiment helps locate the defect; it does not prove that automated retrieval will work equally well.

Then provide a few well-chosen examples of the desired response. Measure whether they improve consistency without causing failures on different requests. A prompt adjustment may solve the immediate problem at lower operational complexity. Keep a separate test set so each experiment does not simply memorize the examples used during development.

## Combine approaches only with a reason

A system can retrieve current facts and use an adapted model to follow a specialized workflow. That combination adds moving parts: document ingestion, retrieval settings, model versions, training data, and rollout checks. You need to know which component caused an error to improve it efficiently.

Maintain a small failure log with the input, expected behavior, available evidence, and observed mistake. Tag failures as missing evidence, wrong evidence, unsupported inference, or format violation. Several categories can apply to one request. The distribution gives your next experiment a stronger foundation than a general impression that the assistant needs more training.

## A practical decision rule

Use retrieval experiments when answers depend on external, changing, or attributable information. Investigate adaptation when the system must repeatedly perform a distinctive task and simpler instructions have been evaluated. In both cases, define success before implementation and compare against the simplest working baseline. Neither approach automatically makes an answer true or a workflow secure.

## Further reading

https://arxiv.org/abs/2005.11401

https://huggingface.co/docs/peft/main/conceptual_guides/lora',true,'2026-09-20'),
('hybrid-search-and-reranking-for-rag','Better RAG starts with retrieval you can inspect','Learn where keyword search, embeddings, reranking, and document permissions fit in a grounded answer pipeline.','Engineering','A grounded assistant cannot use a paragraph it never receives. When an answer is wrong, teams often edit the generation prompt first. It is usually worth opening the retrieval results before doing that. The relevant passage may be absent, outdated, or buried beneath near-duplicate documents.

Consider a maintenance manual containing an error code, E-417. A user types the code exactly. Another user describes the same problem as “the pump stops after warming up.” These are different search problems, even though the useful destination may be the same page.

## Give exact terms and meaning a place

Keyword search can preserve exact matches for identifiers and specialist terminology. Embedding search compares learned vector representations and can help connect different wording. A hybrid approach combines candidate sets or rankings from both. Its value must be measured on your queries rather than assumed from the architecture.

Avoid casually adding raw scores from unrelated retrieval methods. Their scales may differ. Use a documented fusion method or tune a combination against relevance judgments. Keep the original candidate lists available while debugging so you can see which branch found a useful result and which introduced noise.

## Use reranking as a second decision

Sentence Transformers documents a retrieve-and-rerank pattern in which an efficient first stage finds candidates and a cross-encoder scores query-document pairs. The second stage can examine relationships more closely, at additional processing cost. It can reorder candidates; it cannot recover a document that never entered its candidate set.

For the maintenance example, inspect whether the E-417 page appeared in the initial results. If it did not, increasing reranker quality is unlikely to repair that request. If it appeared but ranked below irrelevant pages, reranking is a plausible experiment. This distinction saves time and makes failures easier to explain.

## Preserve enough context to interpret a passage

Splitting every document into identical character counts can detach a warning from the instruction it qualifies. Keep headings, units, revision dates, and useful parent context with each chunk. Test tables and numbered procedures explicitly. A sentence containing “do not” is especially dangerous to separate from the action it governs.

Store a stable document identifier and location with every result. The final answer should link to evidence the reader can inspect. If the document changes, maintain a way to determine which revision supported an earlier answer, subject to your retention policy.

## Apply permissions before evidence reaches the model

Restrict the search to records the current user can access. Filtering unauthorized passages after generation is too late: information may already have influenced the response. Apply equivalent access rules across keyword search, vector search, caches, and reranking inputs.

Test with two accounts that have different access to similar documents. Ask both the same questions and inspect retrieved identifiers. This is an application authorization check as much as a search-quality check; a fluent answer cannot compensate for the wrong evidence boundary.

## Build a retrieval report

For a diagnostic query set, mark relevant passages and inspect recall at the candidate stage, ordering after reranking, and support for the final answer. Include exact codes, paraphrases, missing answers, and conflicting revisions. Keep retrieval timing separate from generation timing. Change one stage at a time so an improvement has an identifiable cause.

## Further reading

https://sbert.net/examples/sentence_transformer/applications/retrieve_rerank/README.html',true,'2026-09-20'),
('open-weight-models-vs-hosted-apis','Open-weight models vs. hosted APIs: the operating decision','Compare control, infrastructure, maintenance, and workload shape before deciding where an AI model should run.','Industry','A downloadable model can offer substantial control over deployment. A hosted API can reduce the infrastructure your team needs to operate. Neither description settles the decision. The right comparison includes the actual workload, the people maintaining it, and the behavior users require.

It also helps to use precise language. Access to model weights does not by itself tell you everything about training data availability, permitted uses, or distribution rights. Inspect the particular model''s documentation and license rather than treating a broad label as a complete specification.

## Map the work before pricing the hardware

Suppose a small publisher wants to classify incoming articles. Most arrive during two editorial windows each day. A continuously running server may spend long periods idle, while an on-demand API follows the arrival pattern more closely. A steady, high-volume workload can create a different calculation.

Measure request sizes, peak concurrency, acceptable queues, and required completion times. Include evaluation runs and retries. An average number of daily requests hides the difference between evenly distributed traffic and a hundred people submitting work at once.

## Count operational responsibilities

Self-hosting can involve model loading, capacity planning, dependency updates, monitoring, and recovery from failed machines. A team also needs to manage access to endpoints and stored prompts. A hosted service handles part of that stack, while introducing its own availability, quota, and integration dependencies.

Write down who responds when requests stop completing. If the answer is the same developer responsible for the whole product, maintenance time belongs in the comparison. A low infrastructure bill can still create an expensive operating model when support and reliability work are included.

## Inspect the exact model artifact

Hugging Face model cards provide a place for creators to describe intended uses, limitations, evaluation results, and license metadata. Treat that information as input to your review. Check the actual artifact revision, tokenizer, serving configuration, and any required custom code before adopting it.

For the publisher''s classifier, compare the deployed version on editorial categories and unfamiliar writing styles. Downloadable access does not establish that the model meets the task. Similarly, an API''s general benchmark score does not establish that it can follow the publication''s taxonomy.

## Separate data location from data handling

Running a model on your own machine can reduce external transmission, but the surrounding application may still send logs, error reports, or files elsewhere. Draw the complete path of prompts, responses, uploads, and telemetry. Use technical verification and the relevant service terms to understand that path.

Make retention and deletion behavior explicit. If a user removes a document, determine whether its contents remain in logs, backups, search indexes, or caches. The serving location is only one part of the system''s data lifecycle.

## Compare cost per accepted result

Use a trial with the same task contract for both deployment options. Count accepted outputs and human corrections, then include compute or API usage plus the operating effort you actually observed. Keep speculative future discounts separate from the measured baseline.

Choose the arrangement your team can maintain today and document the conditions that would justify revisiting it. Those conditions might include sustained traffic, an unmet latency requirement, or a new deployment constraint. A clear trigger is more useful than assuming one approach is permanently superior.

## Further reading

https://huggingface.co/docs/hub/model-cards',true,'2026-09-20'),
('quantization-and-local-ai-memory','Quantization explained: what fits is not always what works','Understand model weight precision, runtime memory, and the quality checks needed before deploying a smaller model artifact.','AI models','A model download may fit on disk and still fail to run comfortably on a laptop or server. The file is only part of the memory story. Runtime buffers, intermediate operations, attention caches, and the number of simultaneous requests can change the amount of memory required.

Quantization reduces the precision used to represent some numerical values. It can make a model more practical to deploy, but the result depends on the method, the model, and the hardware supporting the computation. Treat a smaller artifact as a candidate to test, not as an automatic performance upgrade.

## Use a rough estimate correctly

As a deliberately simplified calculation, eight billion weights stored at sixteen bits each occupy about sixteen billion bytes before other overheads. At four bits per weight, the corresponding raw weight storage is about four billion bytes. Actual formats may also store scales, metadata, and values at other precisions.

Those numbers estimate only weight storage. They do not predict total runtime memory or tokens per second. Distinguish decimal gigabytes from binary gibibytes when comparing the estimate with tools. A seemingly small discrepancy can matter when a workload is near the device limit.

## Check the serving path

Quantization support is tied to the software and hardware executing the model. Hugging Face''s overview describes multiple methods with different compatibility and requirements. Confirm that the chosen runtime supports your artifact and device, and that it uses the intended accelerated path.

A method that saves memory can still introduce conversion overhead or miss an optimized implementation. Record the runtime version and configuration when measuring. Otherwise, you may attribute a serving change to the quantization method or compare runs that used different computation paths.

## Test the workload at its real length

Start with the actual prompt lengths, output lengths, and concurrency expected in the application. A short single-user chat is a poor substitute for processing long documents in parallel. Watch peak memory during model loading as well as during generation.

For an illustrative offline document assistant, test a brief question, a long extract, and repeated requests without restarting the process. Record failures and fallback behavior. The useful question is whether the whole session remains responsive and completes reliably, not whether the model starts once.

## Look for task-specific quality changes

Compare the quantized candidate against a suitable higher-precision reference on identical examples. Examine structured fields, uncommon vocabulary, numerical details, and cases that were already difficult. A broad average can hide a regression that matters to your particular use case.

Do not assume one precision level has a universal quality penalty. Different methods and models can behave differently. If the task is invoice extraction, inspect totals and identifiers independently from prose quality. A convincing summary is not evidence that each extracted field survived the change.

## Keep a reproducible deployment record

Save the model revision, quantization method, runtime, device, test inputs, and observed memory and latency. Describe whether timing includes loading and whether responses were cached. This makes future hardware or software changes easier to assess.

Set an operational margin below the observed memory limit. Reject inputs that exceed the tested envelope or send them to a controlled alternative. A configuration that barely succeeds in a clean development environment leaves little room for the variation of a real application.

## Further reading

https://huggingface.co/docs/transformers/main/en/quantization/overview',true,'2026-09-20'),
('structured-output-is-not-data-validation','Structured output is the beginning of validation','JSON schemas help software read model responses. Business rules, evidence checks, and authorization still decide whether those responses are usable.','Engineering','A model response can be valid JSON and still contain the wrong information. It can have the correct fields, use the correct types, and describe an event that never happened. Structured output solves an integration problem: it gives the application a predictable shape to inspect.

Google''s structured-output documentation distinguishes syntactic conformance from the semantic correctness of values. That distinction should shape your application boundary. Treat a returned object as a candidate result that must pass the checks relevant to the action you plan to take.

## Design a small, explicit contract

Imagine an assistant that turns a workshop request into a proposed booking. A useful response might contain a service category, a requested date, and missing details. Keep fields narrow enough that the application can validate them. If a value is unknown, represent that explicitly rather than encouraging a guess.

Avoid a single unrestricted “instructions” field that downstream code interprets as an action plan. Separate descriptive text from operational fields. This makes it easier to display a draft while keeping booking creation behind application checks.

## Validate meaning after parsing

Check that dates are real, categories belong to the supported set, and identifiers refer to records the user can access. Then enforce cross-field rules. A service duration may be individually valid but incompatible with the selected appointment slot.

For an illustrative booking on a closed day, the JSON parser should succeed and the business validator should reject the proposal. Return a useful correction path, such as a list of available dates. Do not silently rewrite a user''s request into a confirmed booking that they never reviewed.

## Preserve evidence for extracted facts

If the model extracts a serial number from a document, keep enough provenance to compare the value with the input. For higher-consequence fields, show the supporting text or page location during review. A required schema field should not pressure the system into inventing missing data.

Test blurred images, contradictory documents, and absent fields. Decide whether the response should contain an unknown value, request clarification, or stop the workflow. This policy belongs in product requirements before you optimize the prompt.

## Put retries inside a budget

When validation fails, a targeted retry can explain the failed rule. Bound the number of attempts and the total input and output allowance. Repeatedly asking for a different answer can increase cost without providing new evidence.

Handle timeouts, refusals, and interrupted responses as explicit outcomes. A partial object should not be committed as a completed operation. Preserve the user''s input and provide an understandable status rather than letting the interface appear successful while the server discarded the result.

## Keep actions separate from proposals

The server should derive permissions from the authenticated user, not from a model-supplied role or account identifier. When a validated proposal becomes a write operation, apply normal authorization and concurrency controls. Use an idempotency strategy where retries could create duplicate bookings.

Build a test matrix around the boundary: valid shape with wrong meaning, valid meaning with missing permission, and a repeated request after a network failure. Passing these cases gives you evidence about the application as a whole. A neatly formatted response alone cannot provide that evidence.

## Further reading

https://ai.google.dev/gemini-api/docs/structured-output',true,'2026-09-20'),
('when-to-build-an-ai-agent','When does your product need an AI agent?','Decide whether a fixed workflow or a model-directed loop fits the task, then define tools, stopping conditions, and recovery paths.','Engineering','The word agent often hides an important design choice: who decides the next step? In a fixed workflow, application code determines the sequence. In a model-directed system, the model can choose actions based on intermediate results. That flexibility can be useful, but it creates more states to test and recover from.

Anthropic''s discussion of effective agents makes a similar distinction between predefined workflows and dynamically directed processes. For a product team, the practical goal is to give the model enough discretion to solve the task without making every part of the application unpredictable.

## Start with a task that has a clear finish

Consider a supplier comparison assistant. A user wants three available replacements for a discontinued component, with supporting specifications. The task may require different searches depending on what the first results contain, so a dynamic loop could be useful.

Define the finish line: three candidates that meet named constraints, or a report explaining which constraints could not be verified. “Keep researching until confident” is not an operational stopping rule. Set limits on elapsed time, tool calls, and spending, alongside the quality criteria.

## Keep deterministic decisions in code

If the process always reads a form, validates fields, and saves a record, ordinary application logic may be sufficient. A model can help interpret a free-text field without selecting the entire workflow. Adding autonomy to a predictable sequence can create work without improving the result.

For the supplier assistant, code can check whether a price is numeric and whether a candidate includes a source. The model can help interpret descriptions. Separate those responsibilities so a change in model behavior cannot silently bypass a hard requirement.

## Make tools small and observable

Give each tool a narrow purpose, documented inputs, and a clear result. A search tool should report matches or an explicit failure. A draft-saving tool should not also email the draft unless that action is part of its visible contract.

Log tool names, status, timing, and appropriate identifiers. Avoid storing unnecessary sensitive content. When the assistant produces an unsupported claim, you should be able to determine whether the tool returned no evidence, the model misread it, or the application lost part of the response.

## Plan for partial completion

Suppose the assistant finds two candidates and the third supplier site becomes unavailable. Save the verified work and describe the missing part. Do not turn a network failure into an invented third result or discard everything and start an unbounded retry loop.

For state-changing operations, define how retries behave. A search can often be repeated safely; a purchase cannot simply be repeated after an uncertain timeout. Keep a durable operation identifier and inspect the prior result before issuing another action where duplication matters.

## Evaluate the outcome and the path

Review whether the final result meets the task and whether the actions were appropriate. A correct answer reached through an unauthorized data source is still a failure. Include tests where tools return empty results, conflicting information, and content that tries to instruct the assistant.

Begin with a small set of permitted tools and expand only when a demonstrated need justifies it. Keep a manual completion path for unresolved cases. The strongest case for an agent is a measured improvement on a task that benefits from adaptation, with costs and failure behavior that the team can explain.

## Further reading

https://www.anthropic.com/engineering/building-effective-agents',true,'2026-09-20'),
('prompt-injection-and-tool-permissions','Prompt injection: design the boundary around the model','Understand why retrieved text can become an instruction risk and how narrow tools, permissions, and evidence handling reduce the impact.','Engineering','An assistant reads a document because the user asked for a summary. Inside the document is a sentence telling the assistant to send private notes to an unrelated address. The user authorized reading the document, not obeying everything it says. That distinction is a core security boundary for systems that process external content.

OWASP describes indirect prompt injection as instructions arriving through external material such as files or websites. Retrieval and fine-tuning do not automatically remove that risk. The practical response is to limit what a manipulated model can cause the application to do.

## Trace the path from content to action

Draw the assistant''s inputs and tools. Mark which inputs are controlled by the user, another account, or an external publisher. Then identify which tools can read private records or change state. A document summarizer with no write tools has a different exposure from an assistant that can also send messages and update invoices.

For a project-notes assistant, the source document should remain evidence about a project. It should not gain permission to change the destination account or request broader access. Preserve the distinction even if the document contains text that imitates an administrator or application instruction.

## Derive access from the authenticated session

When a tool queries records, the server must apply the current user''s access rules. Do not trust a model-provided organization identifier as proof of membership. For operations that target a record, verify ownership or the appropriate shared permission at execution time.

Test this with two test accounts and distinct documents. Ask the assistant to retrieve a known identifier belonging to the other account. The request should fail at the data boundary regardless of how the prompt is phrased. This check tests authorization directly rather than hoping the model refuses.

## Make consequential actions explicit

Separate drafting from sending. Show the actual recipient, content, and intended operation before a user approves an externally visible action that requires confirmation. Bind that approval to the reviewed version so later changes cannot reuse it unnoticed.

Avoid giving a summarization tool general shell access or an unrestricted HTTP client when its task does not require them. Narrow contracts make it easier to test expected behavior and reduce the number of unexpected actions available after a model mistake.

## Treat displayed output as untrusted data

Render generated text through an appropriate escaping or sanitization layer. Do not insert model output directly into HTML or executable code. Inspect generated links before turning them into privileged fetches, and apply server-side network restrictions if the application retrieves arbitrary URLs.

An answer may contain an exfiltration link even when no tool was called. The interface therefore belongs in the threat model. Check what information could be exposed through automatic previews, remote images, and logs as well as explicit tool actions.

## Test defenses as a system

Create controlled documents containing benign instruction conflicts and verify that the application cannot cross account or action boundaries. Include failed tools, partial responses, and a document that asks for an unrelated operation. Record both the final answer and the attempted actions.

No single prompt establishes a complete defense. Use the model''s instructions as one layer, then enforce access, validation, and operation limits in ordinary application code. Repeat boundary tests when tools or data sources change, because those changes can alter the consequences of the same model behavior.

## Further reading

https://genai.owasp.org/llmrisk/llm01-prompt-injection/',true,'2026-09-20'),
('evaluate-image-generation-models','How to evaluate an image model for real design work','Assess composition, instruction following, editability, and usable output rate instead of choosing a model from one impressive sample.','Guides','One attractive image can make a generation model look ideal for a design team. A production workflow asks a harder question: can it repeatedly create usable assets under a brief, at the required size, with an acceptable amount of correction? The answer depends on the work you intend to publish.

Hugging Face''s diffusion evaluation overview explains that numerical metrics and visual quality do not always align. It also flags that overview as older material and points to newer evaluation frameworks. Use it for the general distinction between measurements and human judgment, rather than treating its examples as a current model ranking.

## Build briefs that resemble your deliverables

Create a small set of original briefs: a wide hero with room for a heading, a square editorial image, a product composition, and an illustration with several specified objects. Include an edit request as well as a fresh generation. A tool that excels at one-shot art may be less useful when a client requests a precise change.

For an illustrative equipment catalog, ask for a lamp on the right side of a desk with open space on the left. Evaluate object placement separately from visual polish. An image that looks excellent but leaves no room for the heading can still fail the actual brief.

## Define rejection reasons before reviewing

Use separate criteria for subject accuracy, required objects, spatial relationships, text accuracy when needed, and suitability for the final crop. Identify hard failures such as a missing product or an altered logo. Keep subjective preference as its own field.

When possible, conceal the model identity during review. Ask reviewers to record reasons rather than only a winner. Two images may receive similar overall preference while failing different production requirements. Those distinctions help explain which model fits which type of assignment.

## Review repeated outputs

Generate multiple candidates per brief within a fixed effort budget. Keep every candidate, including rejected ones. Selecting a model from its best image while ignoring dozens of unsuccessful attempts hides the work required to obtain that result.

Measure the proportion accepted for the intended use and the time spent selecting or editing. Describe the sample size and settings with the result. A handful of briefs can guide an initial trial, but it does not establish universal superiority across subjects, languages, or visual styles.

## Test edits and final crops

Ask for one specific change while preserving the rest of the composition. Compare the changed area and the areas that should remain stable. For a catalog image, an edit to the wall color should not quietly redesign the featured product.

Inspect desktop and mobile crops at their actual display sizes. Tiny details that look impressive in a full-resolution preview may disappear in a card. Conversely, artifacts around a face or product edge may become obvious when the image spans a large article column. Save the original output and the approved derivative so later edits remain traceable.

## Keep publication review in the workflow

Confirm that the asset accurately represents its role: an illustration should not be presented as documentary evidence of an event. Check the applicable service terms and any brand materials you supplied. Track provenance internally even when you do not display a caption beneath every image.

Choose the model and process that deliver the required asset with predictable review effort. A repeatable brief, a documented acceptance decision, and a usable final crop are stronger evidence than an isolated gallery favorite.

## Further reading

https://huggingface.co/docs/diffusers/main/en/conceptual/evaluation',true,'2026-09-20'),
('multimodal-ai-document-workflows','Multimodal AI for documents: test the whole page','Build a document evaluation that checks visual detail, layout, extraction accuracy, and what happens when the evidence is unreadable.','AI models','A model that accepts images can be useful for documents containing tables, diagrams, and scanned text. Accepting an image does not guarantee that it will read every detail correctly. The quality of the input and the way the application prepares it are part of the system being evaluated.

Google''s image-understanding documentation describes image inputs and image-based tasks for its API. Use the documentation for the exact model and endpoint you select. Input limits and supported options belong to that specific serving configuration, not to the word multimodal in general.

## Start with the fields that matter

Imagine an assistant reading delivery slips. It must extract an order identifier, a date, and received quantities. A fluent description of the page is not the target. Correct field values and a clear indication of unreadable entries are the target.

Create reference answers for each field. Preserve leading zeros in identifiers and distinguish a blank quantity from zero items received. Decide how the output should represent uncertainty before testing. If the system must guess to satisfy a required field, the contract needs adjustment.

## Evaluate input preparation

Test the same document through the pipeline users will use: phone capture, upload, resizing, compression, and page selection. A model evaluated on a clean original PDF may behave differently after the application converts it to a small image.

Inspect orientation, glare, and cropping. Confirm that important details remain legible after any size reduction. If processing a page in tiles, preserve their order and relationships. An isolated table cell may lose the row label needed to interpret it correctly.

## Separate reading from interpretation

For a delivery slip, first inspect whether the model read “12” correctly. Then inspect whether it associated that value with the right product. Finally, check whether the application interpreted it as ordered or received quantity. These are distinct failure points.

Track exact matches for identifiers and appropriate tolerance rules for measurements. Do not use one similarity score for every field. A nearly correct order identifier may refer to another shipment, while a differently formatted date can still represent the same day.

## Make evidence review convenient

Keep the page reference and, when the system supports a trustworthy location mapping, a view of the relevant region. Let a reviewer inspect the source alongside the extracted values. Test any coordinate mapping after resizing rather than assuming a box still points to the correct place.

When the input is unreadable, ask for a clearer capture or route the document to manual review. Avoid presenting a model''s confident tone as proof that the text was visible. A useful exception path can matter more than squeezing another answer out of a poor scan.

## Test document variety

Include several layouts, languages used by your audience, handwritten amendments, empty pages, and repeated page headers. Keep documents from the same template family together when designing holdout groups if near-duplicates would make the evaluation misleading.

Review failures by source and preparation step. If most errors come from excessive compression, changing models may be an expensive distraction. Improve the failing stage, rerun the same cases, and record whether the final field-level accuracy and review effort actually improved.

## Further reading

https://ai.google.dev/gemini-api/docs/image-understanding',true,'2026-09-20'),
('build-an-ai-evaluation-dataset','Build an AI evaluation set you can trust','Collect representative cases, prevent leakage, and keep development examples separate from the evidence used to approve a release.','Research','An evaluation set is a compact description of the work your AI system is expected to do. If the examples are too easy, too similar, or repeatedly used to tune the prompt, the resulting score can offer more reassurance than evidence. Good evaluation starts with the questions the data should help answer.

For a help-center assistant, those questions might be whether it finds the correct policy, recognizes missing evidence, and handles a request outside its supported scope. A single average should not obscure these different behaviors.

## Collect ordinary cases and difficult cases deliberately

Start with representative requests obtained through an appropriate data-handling process. Remove unnecessary personal information and document where each example came from. Include ordinary traffic because it determines day-to-day usefulness, then add difficult cases to probe known failure modes.

Keep those groups identifiable. If you deliberately add many unusual adversarial requests, the combined pass rate no longer estimates the rate for ordinary production traffic. Both groups are valuable; they answer different questions. Report their results separately and explain how they were sampled.

## Write the expected behavior before generating

Define the required facts, allowed alternatives, and unacceptable outcomes for each case. Some questions have several valid answers. Others should produce a clarification or an explicit statement that the evidence is missing. A reference answer can be a rubric rather than a single sentence to match.

For a support request about a feature that does not exist, the desired behavior might be to say it is unavailable and suggest a documented alternative. If your grader rewards mentioning the nonexistent feature, you have encoded the wrong product behavior into the test.

## Keep development and holdout evidence separate

Use a development set to refine prompts and inspect failures. Reserve a holdout set for a later check. Repeatedly examining holdout mistakes and changing the system to fix them gradually turns that set into development data, even if no model weights were updated.

Scikit-learn''s guidance on leakage explains why information from evaluation data must not influence training transformations. The wider lesson for an AI application is to record which examples influenced model, prompt, and retrieval decisions. A split in a spreadsheet is not enough if the same solutions enter the prompt elsewhere.

## Split related material carefully

If several examples come from one support conversation or nearly identical document templates, a random row split can place close relatives on both sides. Group examples by the unit that needs to generalize, such as customer, document family, or time period.

For the help center, a time-based holdout can help examine behavior on recently added topics. It also changes the question being measured, so describe that choice. No split is universally correct; the split should reflect how the system will encounter unfamiliar work.

## Version the evidence

Store a dataset version, rubric version, and a record of corrections. If a policy changes, update the expected answer deliberately and preserve the reason. Compare releases on a common version where possible so a changed score is not confused with a changed test.

Start small enough to inspect every case, then expand around observed gaps. Report counts as well as percentages, and avoid treating a tiny sample as a precise reliability estimate. The strongest evaluation set is one whose examples, judgments, and limits another reviewer can understand.

## Further reading

https://scikit-learn.org/stable/common_pitfalls.html',true,'2026-09-20'),
('llm-as-a-judge-evaluation','LLM as a judge: useful reviewer, imperfect measurement','Design model-based grading with explicit rubrics, position checks, human calibration, and deterministic checks where they fit.','Research','A model can help review large collections of generated answers, but a second model''s opinion does not turn an answer into a verified fact. The grading system has its own prompt, assumptions, and failure modes. Evaluate it with the same care you apply to the system it is grading.

The MT-Bench and Chatbot Arena research investigated model judges and discussed biases including response position and verbosity. These findings are a reason to inspect grading behavior, not a universal claim that every judge fails in the same way.

## Define a rubric that describes the task

Suppose an assistant writes product-support replies. A useful rubric separates factual support, completeness, tone, and adherence to the requested format. “Which answer is better?” combines these dimensions without stating their relative importance.

Include examples of unacceptable errors. A courteous answer that invents a refund policy should fail the factual-support criterion. A brief answer that correctly asks for a missing order number should not lose simply because another answer is longer. State those distinctions before the judge sees the candidate responses.

## Use code where code can decide

Check parseability, required fields, exact identifiers, and executable test results with deterministic validators when appropriate. A model judge adds little value to deciding whether an object contains a required key. It can help with qualities that are harder to encode, such as whether an explanation addresses the user''s actual concern.

Keep the outputs of different checks separate. A response may pass the format validator and fail the factual review. A single blended number makes it harder to identify what needs fixing and can let a strong style score hide a serious error.

## Calibrate against reviewed examples

Create a set of answers that human reviewers have assessed with the same rubric. Resolve disagreements about the rubric itself before treating that set as a reference. Then inspect where the model judge disagrees and whether those disagreements cluster around particular error types.

Use the result to decide the judge''s role. It might be suitable for prioritizing a review queue while remaining unsuitable as an automatic release gate. The acceptable level of disagreement depends on the consequences of a wrong acceptance, not just on the volume of answers you want to process.

## Probe position and style effects

For pairwise comparisons, swap the order of the answers and check whether the decision changes. Compare concise and verbose versions that contain the same relevant facts. Keep model identity hidden when it is not part of the task, and avoid unnecessary metadata that could influence preference.

Treat candidate answers as untrusted content. A response may contain text telling the judge to award a high score. The grading prompt should identify that text as material to assess, and the surrounding workflow should include tests for such attempts. Prompt wording alone is not proof that the judge is immune.

## Report uncertainty in the measurement

Version the judge model, prompt, rubric, and sampling settings. Inspect disagreements and borderline cases rather than reporting only an overall pass rate. Reassess the grading setup when changing the kinds of answers being judged.

Use model grading to extend a review process that has clear standards and reference evidence. Keep periodic human review and deterministic checks in place. An efficient grading pipeline is valuable when its limitations are visible enough to guide decisions.

## Further reading

https://arxiv.org/abs/2306.05685',true,'2026-09-20'),
('ai-confidence-calibration-and-abstention','When should an AI system say “I don’t know”?','Separate confident language from calibrated evidence, then design an abstention path that balances useful coverage and costly errors.','Research','A fluent answer can sound certain while being wrong. A percentage written by a language model is also not automatically a calibrated probability. If an application uses confidence to decide whether to act, it needs evidence about what that signal means for the task.

Calibration asks whether predicted probabilities correspond to observed frequencies. Scikit-learn''s calibration documentation describes reliability diagrams and calibration methods for classifiers. A model-generated statement such as “I am 90 percent certain” should not be assumed to satisfy that property.

## Define the decision behind the score

Imagine a system that routes maintenance requests to teams. For familiar messages, automatic routing saves time. For ambiguous reports, assigning the wrong team delays the repair. The product needs an automatic route, a clarification path, and a manual review path.

Write down the cost of each outcome in operational terms. A correct automatic route, a wrong route, and an unnecessary review have different consequences. Without that distinction, choosing a threshold becomes a cosmetic decision about a number rather than a product decision about work.

## Evaluate the signal on held-out cases

If your classifier provides probabilities, group predictions into ranges and compare them with observed correctness on representative data. Keep the data used to fit or adjust the confidence mechanism separate from the final evaluation. Small groups produce unstable estimates, so report counts and avoid unwarranted precision.

For a language-model workflow, a useful signal might combine evidence availability, output validation, and observed behavior on similar cases. Whatever signal you choose, test it against actual outcomes. Do not rename an arbitrary score “probability” simply because it ranges from zero to one.

## Measure coverage alongside error

A system can lower its observed error among accepted predictions by sending more work to people. That may be a good trade, but the amount of automatic coverage must remain visible. Report how many requests were handled automatically and how many required intervention.

For an illustrative hundred-request pilot, twenty accepted predictions with no errors are a different result from ninety accepted predictions with no errors. Neither sample establishes perfect reliability. The counts explain how much work the system attempted and help plan the capacity of the review team.

## Make abstention useful to the user

An uncertainty path should say what is missing or what can happen next. For the maintenance router, asking whether the issue affects electricity or water is more useful than displaying a generic confidence warning. If the evidence is unavailable, offer a manual handoff without making the user repeat the entire request.

Preserve the distinction between “the source does not answer this” and “the service failed to retrieve the source.” Both can prevent an answer, but they require different recovery steps. Logging them separately also improves diagnosis and product planning.

## Recheck as traffic changes

A threshold tested on one language or message type may behave differently on another. Inspect outcomes by relevant traffic groups and time periods. Add new cases when the product expands, and revisit the review workload after changes to prompts or models.

Design confidence as an evaluated decision aid with an explicit fallback. The goal is to complete useful work within acceptable error limits while making uncertain cases easy to resolve, rather than making every request produce a confident-looking answer.

## Further reading

https://scikit-learn.org/stable/modules/calibration.html',true,'2026-09-20'),
('ai-model-routing-and-fallbacks','Model routing: lower cost without hiding quality failures','Use measurable task categories, bounded escalation, and explicit fallback rules to decide which model should handle each request.','Engineering','A product does not always need the same model for every request. Extracting a short label and resolving an ambiguous support case are different workloads. Routing can assign them to different paths, but the router becomes another component that can make mistakes.

Evaluate the entire routing policy. A cheaper first attempt is not necessarily a cheaper completed task if it creates retries, escalations, and additional review. The savings should remain visible after every step of the workflow is counted.

## Begin with observable categories

Use categories the application can identify reliably: input modality, document length, required tool, or explicit task type. Avoid starting with a vague “easy or hard” label that has no tested definition. A request can be short and still require difficult reasoning.

Imagine a catalog assistant that handles both attribute extraction and product compatibility questions. Extraction from a supported template can have deterministic validators. Compatibility may need several sources and clarification. Those differences provide a clearer routing basis than prompt length alone.

## Evaluate each branch and the routing decision

Create reference cases for each task type, then include ambiguous cases near the boundaries. Check whether the selected path can complete the job and whether the router sends too much work to an expensive fallback. Compare against a simpler baseline that uses one model or one fixed workflow.

Report quality for the complete system, not only for each model when it receives ideal inputs. The router may send the wrong cases to an otherwise capable branch. Keep an explanation of the selected route in diagnostic logs without exposing private content unnecessarily.

## Bound escalation

Set a maximum number of attempts and a total budget per user operation. If a first response fails validation, decide whether the next step is a retry, a different model, a request for evidence, or a manual handoff. A stronger model cannot recover facts that no branch has permission or ability to retrieve.

For an illustrative cost calculation, suppose the first step costs $0.002 per request and 20 percent of requests add a $0.020 fallback. Expected model cost is $0.006 per request before other charges: $0.002 plus 0.2 times $0.020. These are invented arithmetic inputs, not current provider prices. Use observed usage and actual rates for your product.

## Distinguish failure from poor output

A timeout and a valid but unsupported answer require different handling. For transient service errors, use a bounded retry policy with backoff. For missing evidence, repeating the same request may only produce a differently worded guess.

Before switching providers, confirm that the fallback can accept the required input and follow the same data-handling constraints. Normalize response handling carefully, while retaining provider-specific errors for diagnosis. Do not mark an incomplete stream as success just because a fallback can produce a fluent continuation.

## Roll out with a visible comparison

Test the policy offline, then use a limited rollout with explicit quality and cost checks. Watch task completion, corrections, tail latency, and fallback frequency. Anthropic''s agent evaluation guidance emphasizes measuring systems that act across multiple steps; the same discipline is useful when a router creates several possible execution paths.

Keep a way to restore the simpler baseline. If the router saves token cost but increases abandoned tasks or support work, revise the decision rules. Routing earns its complexity when the finished workflow delivers a measured improvement that survives realistic traffic.

## Further reading

https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents',true,'2026-09-20'),
('ai-caching-without-stale-or-private-answers','AI caching without stale or cross-user answers','Separate context caching from answer caching, then design cache keys, invalidation, and permission checks around the underlying data.','Engineering','Repeated work is an attractive optimization target in an AI product. Several requests may share a long instruction block or ask similar questions about the same document. Caching can help, but different caches reuse different things. Confusing them can lead to wrong cost estimates or stale answers.

Provider context caching reuses eligible input context under the provider''s rules. An application answer cache stores a completed response for reuse. Google''s context-caching documentation describes provider mechanisms, lifecycle settings, and billing considerations. Check those details for the exact service; cached input should not be assumed free.

## Identify what is safe to reuse

A public explanation of a stable concept has a different reuse boundary from a response about a customer''s current order. Before caching an answer, identify the facts it depends on, who can access those facts, and how quickly they can change.

Consider a team assistant that answers questions about project notes. Two users can ask identical questions and still be entitled to different evidence. The text of the question is therefore not a sufficient cache key. Permission context is part of the operation''s meaning.

## Build keys from the decision inputs

An answer cache may need the task version, model configuration, relevant document revision, locale, and account or permission scope in addition to normalized input. Include any factor that can change the correct answer. Avoid storing raw personal data in observable key strings.

Normalization deserves care. Removing punctuation from a product identifier or collapsing distinct date formats can make unrelated inputs appear identical. Test the key-building function with examples from your actual domain, and prefer an exact policy you can explain over an aggressive similarity shortcut.

## Invalidate when evidence changes

A time-to-live limits how long an entry can persist, but it does not guarantee that the entry remains correct during that period. If a project document is deleted or access is revoked, a previously cached response may need to become unavailable immediately.

Use document or permission versions where practical, and apply current authorization before returning a stored response. For the team assistant, test the sequence of asking a question, revoking access, and asking again. A cache hit must not bypass the access rules enforced on a cache miss.

## Treat semantic caching as a separate experiment

A similarity-based cache can reuse an answer for a differently worded request. That creates a classification problem: are the two requests equivalent for this task? Similar wording is not enough when a date, account, or requested action changes.

Start with a narrow, low-consequence domain and evaluate false matches explicitly. Include pairs such as “Can I cancel this order?” and “Was this order cancelled?” A system that treats them as interchangeable may save computation while returning the wrong kind of answer.

## Measure savings and correctness together

Track hit rate, age of served entries, latency, invalidation behavior, and user corrections. Separate provider usage savings from application-level savings. Include storage and cache-management work in the operational picture rather than reporting only avoided generation requests.

Keep a diagnostic way to bypass the cache and compare results under controlled conditions. When users report an obsolete answer, record which evidence version and cache policy produced it. A useful cache makes repeated work cheaper while preserving the application''s correctness and permission boundaries.

## Further reading

https://ai.google.dev/gemini-api/docs/caching',true,'2026-09-20')
on conflict (slug) do nothing;
