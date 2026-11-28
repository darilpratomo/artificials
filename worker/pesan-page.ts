import { escapeHtml } from '../shared/seo';
import { PESAN_LIMITS } from './pesan';

/** Self-contained Indonesian send page for /pesan (event attendees, mobile first). */
export function pesanPage({ siteKey, nonce }: { siteKey: string; nonce: string }) {
  const key = escapeHtml(siteKey);
  return `<!doctype html>
<html lang="id">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="robots" content="noindex, nofollow">
<meta name="theme-color" content="#14061f">
<title>Pesan Rahasia</title>
<style nonce="${nonce}">
*{box-sizing:border-box}
html,body{margin:0;min-height:100%;background:#14061f;color:#fbefff;font:16px/1.5 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
body{background:linear-gradient(180deg,#14061f 0%,#2a0838 52%,#5a0f4f 72%,#14061f 72.4%);background-attachment:fixed}
body:after{content:"";position:fixed;left:0;right:0;bottom:0;height:28vh;pointer-events:none;
background:linear-gradient(transparent 0 0),repeating-linear-gradient(90deg,rgba(255,79,216,.35) 0 1px,transparent 1px 64px);
transform:perspective(220px) rotateX(58deg);transform-origin:50% 100%;opacity:.55}
main{position:relative;z-index:1;max-width:520px;margin:0 auto;padding:max(28px,env(safe-area-inset-top)) 20px 48px}
.eyebrow{font-size:12px;letter-spacing:.32em;text-transform:uppercase;color:#7ff0ff}
h1{margin:6px 0 4px;font-size:44px;line-height:1;font-weight:900;letter-spacing:.02em;text-transform:uppercase;font-style:italic;
background:linear-gradient(180deg,#fff 0%,#cfeaff 40%,#3b2a7a 50%,#ff9be8 56%,#fff 100%);-webkit-background-clip:text;background-clip:text;color:transparent}
.lead{margin:0 0 22px;color:#e6cfee}
form,.card{background:rgba(20,4,32,.78);border:1px solid rgba(255,79,216,.55);border-radius:18px;padding:18px;backdrop-filter:blur(6px)}
label{display:block;font-weight:700;font-size:14px;margin:0 0 6px}
.hint{font-weight:400;color:#bfa6c9;font-size:13px}
input,textarea{width:100%;border-radius:12px;border:1px solid #5a2a6e;background:#0e0318;color:#fff;font:inherit;padding:12px 14px;outline:none}
input:focus,textarea:focus{border-color:#7ff0ff;box-shadow:0 0 0 3px rgba(127,240,255,.2)}
textarea{min-height:140px;resize:vertical}
.field{margin-bottom:16px}
.count{float:right;font-weight:400;color:#bfa6c9;font-size:12px}
.lock{display:flex;gap:10px;align-items:flex-start;padding:12px;border-radius:12px;background:rgba(127,240,255,.08);color:#d6fbff;font-size:14px;margin:4px 0 16px}
.lock svg{flex:none;margin-top:2px}
button{width:100%;border:0;border-radius:12px;padding:14px;font:inherit;font-weight:800;letter-spacing:.04em;text-transform:uppercase;cursor:pointer;color:#1a0622;background:linear-gradient(90deg,#7ff0ff,#ff4fd8)}
button:disabled{opacity:.55;cursor:wait}
.err{color:#ffb3c1;font-size:14px;margin:10px 0 0;min-height:1.2em}
.cf-turnstile{margin:0 0 14px;min-height:65px}
.done{text-align:center}
.done h2{margin:6px 0;font-size:24px}
.again{margin-top:14px;background:transparent;color:#fbefff;border:1px solid #7ff0ff}
[hidden]{display:none!important}
@media (prefers-reduced-motion:reduce){*{transition:none!important}}
</style>
${key ? '<script nonce="' + nonce + '" src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>' : ''}
</head>
<body>
<main>
  <div class="eyebrow">Malam ini</div>
  <h1>Pesan Rahasia</h1>
  <p class="lead">Tulis pesan untuk rekan kerjamu. Pesan yang lolos pilihan operator akan tampil di layar.</p>

  <div id="closed" class="card" hidden>
    <strong>Sesi pesan belum dibuka atau sudah ditutup.</strong>
    <p class="hint">Halaman ini akan terbuka sendiri begitu sesi dimulai.</p>
  </div>

  <form id="f" novalidate hidden>
    <div class="field">
      <label for="to">Untuk siapa? <span class="hint">(nama atau panggilan)</span></label>
      <input id="to" name="to" maxlength="${PESAN_LIMITS.to}" autocomplete="off" required>
    </div>
    <div class="field">
      <label for="body">Pesanmu <span class="count" id="n">0/${PESAN_LIMITS.body}</span></label>
      <textarea id="body" name="body" maxlength="${PESAN_LIMITS.body}" required></textarea>
    </div>
    <div class="lock">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>
      <span>Namamu tidak diminta dan tidak disimpan. Penerima dan penonton tidak akan tahu siapa pengirimnya. Tetap sopan, ya.</span>
    </div>
    ${key ? `<div class="cf-turnstile" data-sitekey="${key}" data-theme="dark" data-language="id"></div>` : ''}
    <button id="send" type="submit">Kirim pesan</button>
    <p class="err" id="err" role="alert"></p>
  </form>

  <div id="done" class="card done" hidden>
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#7ff0ff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>
    <h2>Pesan terkirim</h2>
    <p class="hint">Identitasmu tetap rahasia. Pantau layar, siapa tahu pesanmu muncul.</p>
    <button class="again" id="again" type="button">Kirim pesan lain</button>
  </div>
</main>
<script nonce="${nonce}">
(() => {
  const $ = (id) => document.getElementById(id);
  const f = $('f'), closed = $('closed'), done = $('done'), err = $('err'), send = $('send');
  const body = $('body'), to = $('to');
  let timer = 0;
  body.addEventListener('input', () => { $('n').textContent = body.value.length + '/${PESAN_LIMITS.body}'; });
  async function check() {
    clearTimeout(timer);
    try {
      const r = await fetch('/api/pesan/status', { cache: 'no-store' });
      const d = await r.json();
      const open = !!d.open;
      closed.hidden = open;
      if (!open) { f.hidden = true; } else if (done.hidden) { f.hidden = false; }
      if (!open) timer = setTimeout(check, 8000);
    } catch { closed.hidden = false; timer = setTimeout(check, 8000); }
  }
  f.addEventListener('submit', async (e) => {
    e.preventDefault();
    err.textContent = '';
    if (!to.value.trim() || !body.value.trim()) { err.textContent = 'Isi untuk siapa dan pesannya dulu.'; return; }
    const token = (window.turnstile && window.turnstile.getResponse && window.turnstile.getResponse()) || '';
    send.disabled = true;
    try {
      const r = await fetch('/api/pesan', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ to: to.value, body: body.value, captcha: token }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) {
        err.textContent = d.error || 'Pesan belum terkirim. Coba lagi.';
        if (r.status === 403) check();
      } else {
        f.hidden = true; done.hidden = false; to.value = ''; body.value = ''; $('n').textContent = '0/${PESAN_LIMITS.body}';
      }
    } catch { err.textContent = 'Koneksi bermasalah. Coba lagi.'; }
    send.disabled = false;
    if (window.turnstile && window.turnstile.reset) window.turnstile.reset();
  });
  $('again').addEventListener('click', () => { done.hidden = true; check(); });
  check();
})();
</script>
</body>
</html>`;
}
