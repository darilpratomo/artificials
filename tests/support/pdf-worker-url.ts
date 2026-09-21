import { fileURLToPath } from 'node:url';

// Vite turns `?url` imports into a served path string. Under Node that path does
// not exist, so tests alias the import here to a real filesystem path. This lets
// the document tests exercise PDF rendering and text extraction for real.
export default fileURLToPath(
  new URL('../../node_modules/pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url),
);
