# How AI works

`/how-ai-works` starts with a reversible, eight-stage scroll journey following one question: “Why does the Moon shine?” A pinned instrument transforms the prompt into token pieces, vector columns, attention connections, a projected layer stack, a next-token distribution, an answer, and an independent evidence check. Eight detailed chapters and seven browser-based experiments follow. The page is linked from Resources and the footer, included in site search and the sitemap, and prerendered for readers and crawlers.

## Content and simulation boundaries

- Token pieces, the semantic map, and attention weights are illustrative, not measurements of a commercial model. The causal mask is explicit.
- The temperature experiment computes a numerically stable softmax over four fixed teaching logits. Sampling runs locally; no model endpoint is called.
- Training uses actual gradient descent for `y = w × x`, mean squared error, six points on `y = 2x`, and a learning rate of `0.045`. The displayed loss is training error, not evidence of generalization.
- The museum document and both retrieval responses are authored examples. Adding a source does not call an AI service.
- Vision, audio, and diffusion art is original SVG/CSS illustration. It is not a visualization of a running production model.
- The final knowledge checks distinguish context from training, likelihood from truth, and tool availability from authorization.

The opening journey is an authored illustration, not a running language model. Its token boundaries, connections, dimensions, layer count, and probabilities are illustrative. NASA's Moonlight explanation supports the final factual claim; verification is explicitly a separate step, not an automatic feature of every model.

Primary references are linked within the page: the transformer and RAG papers, Hugging Face tokenization and diffusion documentation, Google's gradient-descent lesson, and NASA's Moonlight explanation.

## Implementation

- `src/pages/HowAIWorks.tsx`: page, local interactions, visibility and scroll handling.
- `src/pages/how-ai-works.css`: scoped styling and scan/wave animations for the detailed labs.
- `src/lib/ai-lab.ts`: pure probability and training arithmetic.
- `src/components/ai-journey/SignalJourney.tsx`: sticky stage, scroll measurement, keyboard stage navigation, and motion preferences.
- `src/components/ai-journey/draw-signal.ts`: original Canvas 2D drawing, including perspective-projected layers. All geometry depends on scroll progress; no random values or elapsed-time animation is used.
- `src/lib/signal-journey.ts`: narrative, clamped timeline, interpolation, and scroll-coordinate mapping.

The page is lazy-loaded. Its stylesheets are included only on this route during prerendering. Native scrolling remains intact; no wheel/touch interception is used. `requestAnimationFrame` eases toward the current scroll position and stops once settled, offscreen, or hidden. Canvas resolution follows the viewport with a device-pixel-ratio cap of two.

Stepped motion displays a static representative drawing for each stage. With `prefers-reduced-motion`, the long scroll track becomes a compact manual stage viewer and the complete text transcript opens. Without JavaScript, the static poster, transcript, and full chapter text remain readable. No paid API or new runtime dependency is required.

## Verification

Run `npm run check`, then `E2E_PRODUCTION=1 npx playwright test tests/e2e/how-ai-works.spec.ts`. Stop any preview process before rebuilding.

Browser tests cover actual canvas changes during scrolling, identical canvas fingerprints when rewinding to the same position, a stable drawing at rest, all experiments, keyboard navigation, reduced motion, accessibility, portrait and landscape layouts including 320×568 and 844×390, and prerendered content with JavaScript disabled. The three projects cover desktop Chromium, mobile Chromium, and mobile WebKit. These are browser-emulation checks, not a claim of physical-device testing.
