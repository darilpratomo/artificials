# Event pages: /awards and /pesan

Pages for the owner's office event (Indonesian), separate from the AI directory.

- `/awards/` is the built projector app (source lives outside this repository). It is static: winners' names and photos entered in its operator panel stay in that browser's IndexedDB and are never uploaded. `screen.html?demo` plays the show with sample data. The onnxruntime `.wasm` file is left out on purpose: the background-removal library loads its own copy from its CDN.
- `/pesan` lets attendees send an anonymous message (to whom + message). Only those two fields are stored; no IP, user agent or cookie. See `worker/pesan.ts`.

Setup for `/pesan` (once):

1. Run `supabase/012_secret_messages.sql` in the Supabase SQL editor.
2. Set the operator key: `npx wrangler secret put PESAN_OPERATOR_KEY --env production` (a long random string). Paste the same key in the projector app: Pengaturan → Kunci operator.
3. Optional: `PESAN_OPERATOR_ORIGINS` (comma-separated) if the console runs somewhere other than `http://127.0.0.1:5199`.

Until then the page shows "Sesi pesan belum dibuka" and the operator API answers 503.
