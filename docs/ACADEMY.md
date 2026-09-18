# Artificials Academy

`/learn` is a free, English-language curriculum with 36 original lessons in nine modules: foundations, Python, mathematics, machine learning, neural networks, language AI, AI engineering, responsible AI, and projects. The four final projects are a Naive Bayes support classifier, TF–IDF note search, an XOR neural network, and a local prediction API with SQLite.

Every lesson contains objectives, two theory sections, one standalone Python example, a practice assignment, expected behavior, a suggested solution, and an explained multiple-choice check. Copy and `.py` downloads are generated from the same displayed source. Examples and teaching datasets are original; the curriculum does not reproduce another course. Optional primary-documentation links are for further reading. No guarantee of exhaustive coverage or certification is implied.

All examples use the Python standard library and were executed in verification. The small HTTP service is a local teaching project, explicitly bound to loopback, not a public deployment template. Its default mode runs a self-test; `--serve` starts the server. The browser does not execute arbitrary Python or call paid AI. Two mathematical concept labs (classification threshold and sigmoid neuron) run directly in the browser.

## Content and delivery

- `shared/academy-index.json`: ordered modules, summaries, estimates, and primary references; also used to include lesson URLs in the sitemap.
- `src/content/academy/lessons/*.json`: complete original lesson content. Match the `Lesson` type in `src/lib/academy.ts`.
- `src/pages/Academy.tsx`: search, topic filtering, module path, progress, FAQ, and concept lab.
- `src/pages/AcademyLesson.tsx`: lesson reader, local downloads, quiz feedback, suggested solutions, completion, and navigation.
- `src/components/ConceptLab.tsx`: deterministic interactive math demonstrations using explicitly synthetic data.
- `src/academy.css`: separate route-loaded styles. Vite loads each lesson as a separate JSON-derived module, keeping the curriculum out of the homepage JavaScript.

To add a lesson, add a JSON content file and a matching summary in the index. Keep its slug stable and ensure its module exists. The integrity test catches missing files, metadata mismatches, incomplete sections, and invalid quiz answers. Adjust the intentionally fixed example-count guard in `scripts/check-academy.py` when adding lessons. Curriculum count labels are calculated from the index.

## Progress

Completion requires the user to check that they practiced and answer the quiz correctly. This is self-reported learning progress, not proctored assessment. Completed lesson slugs are stored in `artificials-academy-progress-v1` in localStorage. They are validated against the current curriculum; corrupt, duplicate, and removed entries are ignored. There is no account sync or server write. Clearing site storage clears progress. With storage blocked, only current-page memory remains.

Public lessons and editorial articles omit author names and verification badges, as requested by the owner.

## Verification

`npm run check:academy` requires Python 3 and executes all 36 standalone examples in temporary folders, then sends valid/invalid requests to the local API project and verifies SQLite inserts. It creates no repository database, makes no external model call, and leaves no server running. GitHub CI runs it as a separate required step after `npm run check`; run both commands locally when modifying course content. Cloudflare builds use the Node-only `npm run check` so Python example execution does not add a build-runtime dependency to the website.

Production-build browser coverage checks radio/checkbox label geometry at 320, 375, 768, and 1440px, curriculum filtering, incorrect/correct quiz attempts, completion gating and persistence, code download content, next-lesson navigation, lab boundary behavior, accessibility, and mobile layouts. Existing public-route regression coverage remains in place.
