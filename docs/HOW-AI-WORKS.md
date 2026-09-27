# How AI works

The site carries two guides to how AI works while the owner compares them:

- `/how-ai-works`, **How AI works**: an animated journey that follows one question down through an AI system to the silicon and back. Linked from Resources and the footer, in site search and the sitemap, and prerendered.
- `/how-ai-works-2`, **How AI works 2**: the earlier interactive visual guide, described below. It is linked from Resources and prerendered, but unlisted: its robots meta is `noindex,follow` and it is left out of the sitemap and site search (`unlisted` in `shared/seo.ts`).

## How AI works (`/how-ai-works`)

One question, “Why is the sky blue?”, is followed from the keyboard down through every layer and back up to the answer. After an animated opening, 20 chapters run in five parts, with a full-screen interlude between parts:

1. Language: tokens, meaning (embeddings), one neuron, layers, attention, the transformer, predicting one token at a time.
2. Learning: training as a walk downhill, backpropagation.
3. Hardware: matrix multiplication, why GPUs, memory bandwidth.
4. Scale: why many GPUs, the training bill, inside the data centre.
5. Back to you: serving (prefill, decode, KV cache, batching), smaller numbers (quantization), beyond words (images by diffusion), models that use tools, what AI is not.

A finale draws every layer on one line with the answer, followed by the list of sources.

Every chapter is a canvas picture that stays in place while its text scrolls beside it (on screens narrower than 1024px, the picture sits at the top and the text scrolls beneath it). Three chapters have controls: temperature for next-token sampling, model size (8B, 70B, 405B) for the GPUs needed, and the number of GPUs for training time.

### Content boundaries

- The pictures are simplified teaching models drawn in the browser. No model or AI service is called.
- Published figures are cited where they appear. Numbers derived from them are arithmetic in `src/lib/descent-math.ts`, tested in `tests/descent-math.test.ts`. Examples: Llama 3.1 405B's 30.84 million H100 GPU hours on up to 16,384 GPUs (Meta) gives about 3,520 years on one GPU and 11 weeks on 16,384. A 70B model in 16-bit takes 140 GB, which at the H100's 3.35 TB/s (NVIDIA) takes about 42 ms to read once. 16,384 GPUs at 700 W draw 11.5 MW for the GPUs alone.
- Illustrative values are labelled as such: token pieces, word positions, attention weights, candidate scores, the loss landscape, and the CPU and GPU core counts ("not to scale").
- The page lists 15 sources: papers (word2vec, GELU, transformer, backpropagation, scaling laws, ZeRO, Llama 3, ViT, DDPM), Meta's Llama 3.1 model card and announcement, NVIDIA's H100 specifications and Hopper whitepaper, OpenAI's token help article, and NASA Space Place for the answer.

### Implementation

- `src/pages/Descent.tsx`: the page, chapter rail, pause control, finale and sources.
- `src/pages/descent.css`: every rule scoped to `.dsc-page`. Loaded only on this route during prerendering.
- `src/components/descent/engine.ts`: one `requestAnimationFrame` loop for every canvas. Each picture is drawn from two numbers: eased progress through its steps (each step's picture is complete when that step reaches the reading line) and a looping clock. Nothing accumulates between frames, so scrolling back redraws exactly what was there. Scenes off screen do not draw, and the loop stops when everything has settled. Canvas density is capped at 2× (1.5× for full-screen light). One failing picture does not stop the others.
- `src/components/descent/Scene.tsx`: the chapter, interlude, opening and finale sections.
- `src/components/descent/chapters.tsx`: the text, controls and sources, in reading order.
- `src/components/descent/kit.ts`: palette and drawing helpers.
- `src/components/descent/scenes/`: one file per picture.

Colour runs by depth: violet at the surface through blue, cyan, green and amber to red at the bottom. Categories use the validated sets in `kit.ts`, and adjacent spectrum colours are never paired as categories. Text stays neutral; colour sits in swatches and dots beside it.

With `prefers-reduced-motion`, each step shows its finished picture, with no gliding and no looping motion. Otherwise a Pause motion button stops the looping motion where it is. Without JavaScript, the prerendered text and sources remain readable. No new runtime dependency or paid service is used.

Measured in headless Chromium with software rendering at 2× and 1440×900, 17 of the 20 chapters draw within a 60 fps frame (16.7 ms). Images takes about 22 ms, training and the training bill about 17.6 ms, the opening about 24 ms and the interludes 18–22 ms. In phone emulation every scene draws within 16.7 ms. These are emulation measurements, not physical-device results.

## How AI works 2 (`/how-ai-works-2`)

A reversible, eight-stage scroll journey following one question: “Why does the Moon shine?” A pinned instrument transforms the prompt into token pieces, vector columns, attention connections, a projected layer stack, a next-token distribution, an answer, and an independent evidence check. Eight detailed chapters and seven browser-based experiments follow.

### Content and simulation boundaries

- Token pieces, the semantic map, and attention weights are illustrative, not measurements of a commercial model. The causal mask is explicit.
- The temperature experiment computes a numerically stable softmax over four fixed teaching logits. Sampling runs locally; no model endpoint is called.
- Training uses actual gradient descent for `y = w × x`, mean squared error, six points on `y = 2x`, and a learning rate of `0.045`. The displayed loss is training error, not evidence of generalization.
- The museum document and both retrieval responses are authored examples. Adding a source does not call an AI service.
- Vision, audio, and diffusion art is original SVG/CSS illustration. It is not a visualization of a running production model.
- The final knowledge checks distinguish context from training, likelihood from truth, and tool availability from authorization.

The opening journey is an authored illustration, not a running language model. Its token boundaries, connections, dimensions, layer count, and probabilities are illustrative. NASA's Moonlight explanation supports the final factual claim; verification is explicitly a separate step, not an automatic feature of every model.

Primary references are linked within the page: the transformer and RAG papers, Hugging Face tokenization and diffusion documentation, Google's gradient-descent lesson, and NASA's Moonlight explanation.

### Implementation

- `src/pages/HowAIWorks.tsx`: page, local interactions, visibility and scroll handling.
- `src/pages/how-ai-works.css`: scoped styling and scan/wave animations for the detailed labs.
- `src/lib/ai-lab.ts`: pure probability and training arithmetic.
- `src/components/ai-journey/SignalJourney.tsx`: sticky stage, scroll measurement, keyboard stage navigation, and motion preferences.
- `src/components/ai-journey/draw-signal.ts`: original Canvas 2D drawing, including perspective-projected layers. All geometry depends on scroll progress; no random values or elapsed-time animation is used.
- `src/lib/signal-journey.ts`: narrative, clamped timeline, interpolation, and scroll-coordinate mapping.

The page is lazy-loaded. Its stylesheets are included only on this route during prerendering. Native scrolling remains intact; no wheel/touch interception is used. `requestAnimationFrame` eases toward the current scroll position and stops once settled, offscreen, or hidden. Canvas resolution follows the viewport with a device-pixel-ratio cap of two.

Stepped motion displays a static representative drawing for each stage. With `prefers-reduced-motion`, the long scroll track becomes a compact manual stage viewer and the complete text transcript opens. Without JavaScript, the static poster, transcript, and full chapter text remain readable. No paid API or new runtime dependency is required.

## Verification

Run `npm run check`, then `E2E_PRODUCTION=1 npx playwright test tests/e2e/descent.spec.ts tests/e2e/how-ai-works.spec.ts`. Stop any preview process before rebuilding.

`tests/e2e/descent.spec.ts` covers `/how-ai-works`:

- every chapter, interlude and the finale draws without page errors;
- under reduced motion, each step's picture holds still and is identical when scrolled back to;
- the three controls change their pictures and announce their values;
- pausing stops the motion and playing resumes it;
- the chapter rail follows the reader and jumps to a chapter;
- axe finds no WCAG 2.1 AA violations, and there is no horizontal overflow at 320–1440px;
- the Resources menu lists both guides;
- the prerendered HTML carries the canonical address, indexing and every chapter with JavaScript disabled.

`tests/e2e/how-ai-works.spec.ts` covers `/how-ai-works-2`: canvas changes during scrolling, identical canvas fingerprints when rewinding to the same position, a stable drawing at rest, all experiments, keyboard navigation, reduced motion, accessibility, portrait and landscape layouts including 320×568 and 844×390, and prerendered content with JavaScript disabled and `noindex`. The three projects cover desktop Chromium, mobile Chromium, and mobile WebKit. These are browser-emulation checks, not a claim of physical-device testing.
