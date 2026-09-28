# How AI works

`/how-ai-works` is an animated journey that follows one question down through an AI system to the silicon and back. It is linked from Resources and the footer, in site search and the sitemap, and prerendered. An earlier guide briefly kept at `/how-ai-works-2` for comparison was retired on 28 September 2026; that address now redirects here (301).

## The journey

One question, “Why is the sky blue?”, is followed from the keyboard down through every layer and back up to the answer. After an animated opening, 20 chapters run in five parts, with a full-screen interlude between parts:

1. Language: tokens, meaning (embeddings), one neuron, layers, attention, the transformer, predicting one token at a time.
2. Learning: training as a walk downhill, backpropagation.
3. Hardware: matrix multiplication, why GPUs, memory bandwidth.
4. Scale: why many GPUs, the training bill, inside the data centre.
5. Back to you: serving (prefill, decode, KV cache, batching), smaller numbers (quantization), beyond words (images by diffusion), models that use tools, what AI is not.

A finale draws every layer on one line with the answer, followed by the list of sources.

Every chapter is a canvas picture that stays in place while its text scrolls beside it (on screens narrower than 1024px, the picture sits at the top and the text scrolls beneath it). Three chapters have controls: temperature for next-token sampling, model size (8B, 70B, 405B) for the GPUs needed, and the number of GPUs for training time.

## Content boundaries

- The pictures are simplified teaching models drawn in the browser. No model or AI service is called.
- Published figures are cited where they appear. Numbers derived from them are arithmetic in `src/lib/descent-math.ts`, tested in `tests/descent-math.test.ts`. Examples: Llama 3.1 405B's 30.84 million H100 GPU hours on up to 16,384 GPUs (Meta) gives about 3,520 years on one GPU and 11 weeks on 16,384. A 70B model in 16-bit takes 140 GB, which at the H100's 3.35 TB/s (NVIDIA) takes about 42 ms to read once. 16,384 GPUs at 700 W draw 11.5 MW for the GPUs alone.
- Illustrative values are labelled as such: token pieces, word positions, attention weights, candidate scores, the loss landscape, and the CPU and GPU core counts ("not to scale").
- The page lists 15 sources: papers (word2vec, GELU, transformer, backpropagation, scaling laws, ZeRO, Llama 3, ViT, DDPM), Meta's Llama 3.1 model card and announcement, NVIDIA's H100 specifications and Hopper whitepaper, OpenAI's token help article, and NASA Space Place for the answer.

## Implementation

- `src/pages/Descent.tsx`: the page, chapter rail, pause control, finale and sources.
- `src/pages/descent.css`: every rule scoped to `.dsc-page`. Loaded only on this route during prerendering.
- `src/components/descent/engine.ts`: one `requestAnimationFrame` loop for every canvas. Each picture is drawn from two numbers: eased progress through its steps (each step's picture is complete when that step reaches the reading line) and a looping clock. Nothing accumulates between frames, so scrolling back redraws exactly what was there. Scenes off screen do not draw, and the loop stops when everything has settled. Canvas density is capped at 2× (1.5× for full-screen light). One failing picture does not stop the others.
- `src/components/descent/Scene.tsx`: the chapter, interlude, opening and finale sections.
- `src/components/descent/chapters.tsx`: the text, controls and sources, in reading order.
- `src/components/descent/kit.ts`: palette and drawing helpers.
- `src/components/descent/scenes/`: one file per picture.

Pictures are laid out for their size, not only scaled: each draws its parts in bands from the top, sharing out only the space left over, and keeps its notes above the controls laid over it (the engine passes each picture the height the controls cover, as `reserve`). Captions wrap to the picture's width (`lines` in `kit.ts`). Labels that move, such as the words in the Meaning chapter, take their room in order of importance and fade as far as they would cover another (`crowd`). Where two parts of a picture follow one another, the first leaves before the next arrives.

Colour runs by depth: violet at the surface through blue, cyan, green and amber to red at the bottom. Categories use the validated sets in `kit.ts`, and adjacent spectrum colours are never paired as categories. Text stays neutral; colour sits in swatches and dots beside it.

With `prefers-reduced-motion`, each step shows its finished picture, with no gliding and no looping motion. Otherwise a Pause motion button stops the looping motion where it is. Without JavaScript, the prerendered text and sources remain readable. No new runtime dependency or paid service is used.

Measured in headless Chromium with software rendering at 2× and 1440×900, 17 of the 20 chapters draw within a 60 fps frame (16.7 ms). Images takes about 22 ms, training and the training bill about 17.6 ms, the opening about 24 ms and the interludes 18–22 ms. In phone emulation every scene draws within 16.7 ms. These are emulation measurements, not physical-device results.

## Verification

Run `npm run check`, then `E2E_PRODUCTION=1 npx playwright test tests/e2e/descent.spec.ts tests/e2e/descent-layout.spec.ts`. Stop any preview process before rebuilding.

`tests/e2e/descent.spec.ts`:

- every chapter, interlude and the finale draws without page errors;
- under reduced motion, each step's picture holds still and is identical when scrolled back to;
- the three controls change their pictures and announce their values;
- pausing stops the motion and playing resumes it;
- the chapter rail follows the reader and jumps to a chapter;
- axe finds no WCAG 2.1 AA violations, and there is no horizontal overflow at 320–1440px;
- the Resources menu leads to the page;
- the prerendered HTML carries the canonical address, indexing and every chapter with JavaScript disabled.

`tests/e2e/descent-layout.spec.ts` checks what the canvases draw, which the browser cannot see as text. It records every piece of text and every box each picture draws and fails if any text runs off its picture, lands on other text, straddles a box's edge or hides under the controls. It checks every step of every chapter at eight sizes (360×640, 375×548, 390×664, 430×740, 768×1024, 1024×768, 1280×720 and 1440×900), and the midpoints between steps, with the pictures moving, at 390×664.

The three projects cover desktop Chromium, mobile Chromium, and mobile WebKit. These are browser-emulation checks, not a claim of physical-device testing.
