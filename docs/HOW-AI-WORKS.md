# How AI works

`/how-ai-works` is an original visual field guide with eight chapters and seven browser-based experiments. It is linked from Resources and the footer, included in site search and the sitemap, and prerendered for readers and crawlers.

## Content and simulation boundaries

- Token pieces, the semantic map, and attention weights are illustrative, not measurements of a commercial model. The causal mask is explicit.
- The temperature experiment computes a numerically stable softmax over four fixed teaching logits. Sampling runs locally; no model endpoint is called.
- Training uses actual gradient descent for `y = w × x`, mean squared error, six points on `y = 2x`, and a learning rate of `0.045`. The displayed loss is training error, not evidence of generalization.
- The museum document and both retrieval responses are authored examples. Adding a source does not call an AI service.
- Vision, audio, and diffusion art is original SVG/CSS illustration. It is not a visualization of a running production model.
- The final knowledge checks distinguish context from training, likelihood from truth, and tool availability from authorization.

Primary references are linked within the page: the transformer and RAG papers, Hugging Face tokenization and diffusion documentation, and Google's gradient-descent lesson.

## Implementation

- `src/pages/HowAIWorks.tsx`: page, local interactions, visibility and scroll handling.
- `src/pages/how-ai-works.css`: scoped styling, orbital/scan/wave animations, responsive layouts.
- `src/lib/ai-lab.ts`: pure probability and training arithmetic.

The page is lazy-loaded. Its stylesheet is included only on this route during prerendering. Scroll updates use `requestAnimationFrame`; ambient animations pause outside visible scenes and when the document is hidden. Readers can pause motion, and the page honors `prefers-reduced-motion`. No paid API or new runtime dependency is required.

## Verification

Run `npm run check`, then `E2E_PRODUCTION=1 npx playwright test tests/e2e/how-ai-works.spec.ts`. Stop any preview process before rebuilding.

Browser tests cover the experiments, keyboard navigation, reduced motion, accessibility, page overflow at 320/390/768/1440 px, and prerendered content with JavaScript disabled. The three projects cover desktop Chromium, mobile Chromium, and mobile WebKit. These are browser-emulation checks, not a claim of physical-device testing.
