# Artificials Tools

`/tools` is a free directory of fifteen file utilities. Each utility has its own public URL, accessible from the header and footer. No account, paid conversion API, storage bucket or new backend service is required. Cloudflare serves the application and its bundled libraries; the visitor's browser processes the selected files.

## Supported operations

| Route under `/tools/` | Input and output                              | Important behavior                                                                                                                                                                              |
| --------------------- | --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `compress-image`      | JPEG, PNG or WebP → the same format           | Optional resizing and re-encoding. Quality affects JPEG/WebP; PNG encoding is lossless after any resizing. If dimensions are unchanged and encoding is not smaller, the original is returned.   |
| `convert-image`       | JPEG, PNG or WebP → JPEG, PNG or WebP         | Keeps aspect ratio without upscaling. JPEG fills transparency with white; PNG/WebP can keep it. Unsupported browser encoders produce an error rather than a mislabeled download.                |
| `crop-image`          | JPEG, PNG or WebP → the same format           | Percentage crop applied to every file in the batch, with optional locked ratios. Drag or keyboard editing; a ratio accounts for the image's own proportions. Never upscales the cropped region. |
| `watermark-image`     | JPEG, PNG or WebP → the same format           | Draws text into the pixels at a chosen corner, centre, or tiled. Size scales with each image. Not removable and not a security control.                                                         |
| `compress-pdf`        | PDF → PDF                                     | Lossless mode rewrites PDF structure without rasterizing pages. Image mode renders pages to JPEG and builds a new PDF. Either mode returns the original when the candidate is not smaller.      |
| `merge-pdf`           | Two or more PDFs → one PDF                    | Copies pages in the order shown in the file list. Use the arrows to change file order. Combined output is limited to 120 pages.                                                                 |
| `extract-pdf`         | PDF → PDF                                     | Copies selected pages without rasterizing them. Ranges such as `1-3, 5` are accepted; duplicates are removed while preserving the specified order. An empty selection means all pages.          |
| `remove-pdf-pages`    | PDF → PDF                                     | Copies every page except the selection. Refuses a selection covering all pages, so a document cannot be emptied. Text stays selectable.                                                         |
| `reorder-pdf`         | PDF → PDF                                     | Copies pages in the listed order, then appends any unlisted pages in their original order so no page is dropped by an incomplete list.                                                          |
| `split-pdf`           | PDF → several PDFs                            | One file per page, fixed-size groups, or splits at chosen page numbers. Groups are contiguous and cover every page exactly once. Individual or ZIP download.                                    |
| `rotate-pdf`          | PDF → PDF                                     | Rotates selected pages clockwise by 90°, 180° or 270°. An empty selection changes every page.                                                                                                   |
| `pdf-to-images`       | PDF → JPEG or PNG files                       | Renders selected pages, with individual downloads and a ZIP option for multiple results. Up to 40 pages per job.                                                                                |
| `images-to-pdf`       | JPEG, PNG or WebP → PDF                       | One image per A4 page, with orientation matched to the image and a margin. Images fit without cropping. Transparent regions appear on the white page.                                           |
| `pdf-to-word`         | PDF with selectable text → DOCX               | Extracts text with bold, italic, type sizes and inferred heading levels, plus bullets and source-page breaks. Up to 40 selected pages per job. Reading order and pagination need review.        |
| `word-to-pdf`         | DOCX → downloadable PDF, plus a print preview | Renders a real PDF with selectable text via `pdf-lib`, and also offers the sanitized preview for browser printing. Flowed text, not a Word layout engine.                                       |

Compression does not guarantee a smaller file. Resizing and lossy encoding may reduce detail; quality settings are encoder hints, not a promised visual score. Compare the sizes and preview the result before replacing an original.

PDF image compression removes selectable text, links, form behavior, bookmarks, accessibility structure and digital signatures. PDF page copying may not preserve document-level bookmarks or interactive forms. Rewriting a signed PDF can invalidate its signature even when page appearance is unchanged. Originals remain untouched.

PDF to Word recovers character formatting, not page layout. Weight and slant come from the embedded font name; heading levels are inferred from glyph size relative to the document's dominant body size, so they are a reasonable guess and must be reviewed. It does not reproduce tables, columns, images, equations or exact positioning, and it includes no OCR. Entirely scanned documents are rejected with an explanation; mixed documents mark pages without extractable text.

DOCX to PDF produces a downloadable PDF with selectable text, retaining headings, emphasis, underline and strikethrough, lists with nesting, block quotes, tables, horizontal rules and supported embedded raster images. It is a flowed-text renderer: columns, floats, text boxes, original fonts, headers and footers, and the source pagination are not reproduced, and page breaks will differ from Word. Standard PDF fonts use WinAnsi encoding, so characters outside it (for example CJK and emoji) are replaced with `?` rather than failing the export; common typographic punctuation is mapped to its ASCII equivalent. Output is capped at 200 pages. The separate print preview remains available; its Save as PDF support depends on the browser and operating system, which is why the direct download exists.

Legacy `.doc`, password-protected/encrypted documents, SVG, HEIC and animated standalone images are not supported. Embedded DOCX images are restricted to PNG, JPEG and GIF; unsupported or oversized images are omitted with a notice.

## Resource limits

Limits are enforced in the UI and processing modules to bound memory use. Values shown as MB in the UI use binary byte limits. A device may still run out of memory below these ceilings.

| Resource                                                    | Current ceiling                                                                                 |
| ----------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Selected file                                               | 25 MiB; empty files are rejected                                                                |
| Batch                                                       | 12 files, 60 MiB combined                                                                       |
| Source PDF                                                  | 120 pages; merged output also limited to 120 pages                                              |
| PDF raster export, image compression or text-to-DOCX export | 40 processed pages per job; compression always processes the full document                      |
| Standalone input image                                      | 40 million pixels; dimensions are checked before decoding                                       |
| Compressed/converted image output                           | 4096 px longest edge and 16 million pixels; aspect ratio is retained                            |
| PDF-rendered or image-to-PDF canvas                         | 4096 px longest edge and 6 million pixels                                                       |
| PDF render resolution                                       | UI choices of 96, 144 or 200 DPI; canvas limits may reduce effective resolution                 |
| Generated batch/output                                      | 100 MiB before ZIP packaging                                                                    |
| PDF-to-Word text                                            | 500,000 extracted characters                                                                    |
| DOCX-to-PDF output                                          | 200 pages; images above 16 million pixels or 20 MB are omitted with a count                     |
| Split output                                                | 48 generated documents per job                                                                  |
| Watermark text                                              | 120 characters; size 1–20% of the smaller edge; opacity above 0 and up to 100%                  |
| Crop selection                                              | Minimum 5% of each edge; clamped inside the image and never upscaled                            |
| DOCX archive                                                | 1,500 entries, 48 MiB total expanded bytes, 16 MiB per entry, 6 MiB per XML/relationships entry |
| Embedded DOCX images                                        | 8192 px per edge, 16 million pixels per image, 40 million pixels and 20 MiB combined            |
| DOCX preview HTML                                           | 32 MiB                                                                                          |
| DOCX conversion time                                        | Worker terminated after 45 seconds                                                              |

Default image output size is a maximum 2048 px longest edge, quality 82%, and PDF rendering defaults to 144 DPI. “Keep dimensions” still obeys safety limits and never upscales an image. Raising limits requires testing on constrained mobile devices, not only a desktop browser.

## Code and loading behavior

- `shared/utilities.ts` defines the directory entries and route metadata. `shared/seo.ts` includes `/tools` and all fifteen utility URLs in prerendering and the sitemap, so adding a utility there is enough to make it discoverable.
- `src/lib/tools/types.ts` also exports `DEFAULT_OPTIONS`, the single source of option defaults shared by the page and the tests.
- `src/pages/Tools.tsx` routes work by an explicit `imageTools` set and an `inputKind` map rather than inferring behaviour from the tool id, so a new tool cannot silently reach the wrong engine or accept the wrong file type.
- `src/pages/Tools.tsx` owns selection, ordering, validation, options, progress, cancellation, local previews and downloads. `src/pages/tools.css` contains responsive styling.
- `src/lib/tools/types.ts` defines common contracts and file limits.
- `src/lib/tools/images.ts` inspects signatures/dimensions, decodes images, fits dimensions and encodes with the browser's canvas APIs.
- `src/lib/tools/pdf.ts` uses `pdf-lib` for document operations, PDF.js for rendering/text extraction, and `docx` for editable text export. PDF.js workers, character maps and standard-font assets are bundled locally.
- `src/components/tools/WordToPdf.tsx` manages the PDF build, download and the isolated print preview. `src/lib/tools/word.ts`, `word.worker.ts` and `word-archive.ts` handle conversion, archive validation and sanitization.
- `src/lib/tools/docx-pdf.ts` turns the sanitized preview HTML into a real PDF. It parses only the DOMPurify allowlist output, so the PDF is built from already-sanitized content.
- `src/components/tools/CropEditor.tsx` provides the pointer and keyboard crop selection. It is route-lazy, so it loads only on the crop tool.
- Result cards offer a before/after comparison for tools that map one input image to one output image.

The Tools page is route-lazy, and conversion engines load on demand. Opening an ordinary editorial page should not download the PDF or DOCX engines. Word conversion runs in a terminable Web Worker. PDF.js uses its own worker; PDF page assembly and canvas encoding also involve the main thread. Images/pages are processed sequentially, with yields and cancellation checks between operations. Do not describe every operation as background-thread processing or promise a fixed conversion speed.

Redistributed dependency and PDF font/character-map notices are served from `/licenses/tools.txt`. Refresh these notices when upgrading the conversion dependencies or bundled assets.

## File handling and isolation

Selected file bytes and generated outputs are held in browser memory. These utilities do not upload files, persist them in local storage or send filenames/content to analytics. Optional site analytics still observes public page views after consent under the site's existing policy. Local library/font requests may appear in the network panel during processing; these are downloads from the site, not file uploads.

Clear workspace or leave the utility to discard application references to selected files/results. This is not a secure-memory-erasure guarantee. Downloads already saved by the visitor remain on their device. Blob URLs are revoked when no longer needed; temporary ZIP download URLs are revoked after a short delay. Re-encoded standalone images lose original camera metadata; when compression returns an original file unchanged, its metadata remains.

Image format checks inspect bytes rather than trusting extensions. PDF parsing rejects encrypted files. DOCX processing checks ZIP structure, declared and actual expanded sizes, CRCs and entry paths, rejects encrypted/multidisk/ZIP64 archives, and normalizes the archive before Mammoth parses it. The worker blocks external file access and does not execute macros.

DOCX HTML is sanitized using a narrow DOMPurify allowlist before rendering. The preview iframe permits same-origin access for printing and print dialogs, but does not permit scripts. Its own CSP blocks scripts, network connections, remote images, nested frames, forms and objects; only validated embedded raster data images are allowed. Page CSP in `public/_headers` permits local/blob workers, local/blob/data previews and necessary bundled font resources without adding `unsafe-eval`. Keep dependency versions and these boundaries under review when changing conversion libraries.

## Verification

Run the project's normal check before publishing:

```sh
npm run check
```

Focused conversion tests:

```sh
npm test -- tests/tool-images.test.ts tests/pdf-tools.test.ts tests/word-tools.test.ts tests/docx-pdf.test.ts tests/crop-editor.test.ts tests/tools-seo.test.ts
E2E_PRODUCTION=1 npx playwright test tests/e2e/tools.spec.ts tests/e2e/word-tools.spec.ts tests/e2e/pdf-text.spec.ts
```

`vitest.config.ts` aliases the PDF.js worker `?url` import to `tests/support/pdf-worker-url.ts`, which resolves a real file path. Without it PDF rendering and text extraction cannot be tested under Node. The DOM-dependent parts of `docx-pdf.ts` are covered by the Playwright suite, which runs in a real browser; the unit test covers its text encoding rules.

Rebuild before running the production Playwright suite. `npm run preview` serves `dist`, so a stale build silently tests old code.

The Playwright production setting uses the built application. Vite preview does not itself apply Cloudflare `_headers`; CSP-sensitive cases must supply equivalent response headers or also be checked on the Worker deployment. Use synthetic fixtures with visible text and distinct pages. Check actual downloaded dimensions, MIME types, PDF page count/order, text content and DOCX content, not just a success message. Confirm the built app loads its PDF worker/fonts successfully.

Verify JPEG/PNG/WebP encoding and transparency, PDF extraction/rotation/merge, both compression modes, scanned-PDF handling, and DOCX preview/print readiness. Test malformed or oversized files, invalid page ranges, cancellation, replacing files and leaving a conversion. Check that document links cannot fetch external resources and that conversion does not send file data over the network. Include keyboard navigation, long filenames, horizontal overflow and a narrow mobile viewport in visual checks. Browser-specific print output should be reviewed manually in at least one desktop browser and a mobile browser.

Dependency upgrades or changes to limits require rerunning these checks. The build provides discoverable static descriptions for the tools; processing still requires JavaScript and supported browser APIs.
