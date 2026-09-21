import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const pdfWorkerUrlShim = fileURLToPath(
  new URL('./tests/support/pdf-worker-url.ts', import.meta.url),
);

export default defineConfig({
  test: { include: ['tests/**/*.test.ts'], testTimeout: 15000 },
  resolve: {
    // `?url` has no meaning in Node; the shim supplies a real worker file path so
    // PDF text extraction and rendering are covered by tests instead of skipped.
    alias: [
      { find: /^pdfjs-dist\/build\/pdf\.worker\.min\.mjs\?url$/, replacement: pdfWorkerUrlShim },
    ],
  },
});
