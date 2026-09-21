import { fileURLToPath } from 'node:url';

// Vite turns `?url` imports into a served path string. Under Node that path does
// not exist, so tests alias the import here to a real filesystem path. This lets
// the document tests exercise PDF rendering and text extraction for real.
//
// The legacy build is deliberate. PDF.js calls `Uint8Array.prototype.toHex`,
// which exists in Node 25 but not in Node 24, and only the legacy bundle ships
// the polyfill for it. The standard build therefore passes locally and fails on
// older Node, so tests must use the build that works on both. The browser keeps
// using the standard build, which the shipped app imports directly.
export default fileURLToPath(
  new URL('../../node_modules/pdfjs-dist/legacy/build/pdf.worker.min.mjs', import.meta.url),
);
