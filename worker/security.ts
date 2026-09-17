export async function verifyPaddleSignature(
  raw: string,
  signature: string | null,
  secret: string,
  now = Date.now(),
): Promise<boolean> {
  if (!signature || !secret) return false;
  const pieces = signature.split(';').map((x) => x.trim().split('='));
  const ts = pieces.find(([k]) => k === 'ts')?.[1];
  const hashes = pieces.filter(([k]) => k === 'h1').map(([, v]) => v);
  if (!ts || !/^\d+$/.test(ts) || Math.abs(now / 1000 - Number(ts)) > 300) return false;
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify'],
  );
  for (const hash of hashes) {
    if (!/^[a-f0-9]{64}$/i.test(hash)) continue;
    const bytes = Uint8Array.from(hash.match(/../g)!, (x) => parseInt(x, 16));
    if (await crypto.subtle.verify('HMAC', key, bytes, new TextEncoder().encode(ts + ':' + raw)))
      return true;
  }
  return false;
}
export function safePreview(html: string) {
  return `<!doctype html><html><head><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src data:; font-src data:; base-uri 'none'; form-action 'none'"><meta name="referrer" content="no-referrer"></head><body>${html}</body></html>`;
}
export function sameOrigin(origin: string | undefined, appUrl: string) {
  return !!origin && origin === new URL(appUrl).origin;
}
