/**
 * artificials.net/rekrutmen is the owner's staff-recruitment app (Indonesian). It
 * runs on its own PHP server, which keeps its database and uploads; this Worker
 * forwards each request there and streams the answer back, so visitors only ever
 * see artificials.net. Paths are the same on both sides (/rekrutmen/...).
 *
 * Two Cloudflare Secrets configure it; the repository is public, so neither the
 * server's address nor the secret belongs in code:
 *   REKRUTMEN_ORIGIN        https address of the PHP server, no trailing slash
 *   REKRUTMEN_PROXY_SECRET  the same value as `kunci` in the server's
 *                           rekrutmen/includes/proxy-config.php
 * The server trusts the visitor IP header only alongside the secret, and sends
 * anyone who opens it directly to artificials.net/rekrutmen.
 */
import type { Env } from './types';

// Only the recruitment app's own cookies travel to its server; the site's editor
// sign-in cookies stay on artificials.net.
const APP_COOKIE = /^(?:REKSESSID|rek_[A-Za-z0-9_]+)$/;

// Headers that describe this hop, or that the Worker sets itself, are not forwarded
// from the visitor: a visitor must not be able to supply the secret or their own IP.
const DROPPED = new Set([
  'host',
  'cookie',
  'cdn-loop',
  'cf-connecting-ip',
  'cf-connecting-ipv6',
  'cf-ew-via',
  'cf-ipcountry',
  'cf-ray',
  'cf-visitor',
  'cf-worker',
  'true-client-ip',
  'x-forwarded-for',
  'x-forwarded-host',
  'x-forwarded-proto',
  'x-real-ip',
  'x-rek-client-ip',
  'x-rek-proxy',
]);

export function rekrutmenCookies(header: string | null): string {
  if (!header) return '';
  return header
    .split(';')
    .map((part) => part.trim())
    .filter((part) => {
      const eq = part.indexOf('=');
      return eq > 0 && APP_COOKIE.test(part.slice(0, eq));
    })
    .join('; ');
}

function unavailable(status: number, message: string): Response {
  return new Response(
    '<!doctype html><html lang="id"><head><meta charset="utf-8">' +
      '<meta name="viewport" content="width=device-width, initial-scale=1">' +
      '<meta name="robots" content="noindex, nofollow"><title>Rekrutmen</title></head>' +
      '<body style="font-family:system-ui,sans-serif;max-width:32rem;margin:15vh auto;padding:0 16px;color:#1f2937;background:#fff">' +
      '<h1 style="font-size:1.3rem">Halaman rekrutmen belum dapat dibuka</h1><p>' +
      message +
      '</p></body></html>',
    {
      status,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store',
        'X-Robots-Tag': 'noindex, nofollow',
      },
    },
  );
}

export async function proxyRekrutmen(
  request: Request,
  env: Pick<Env, 'REKRUTMEN_ORIGIN' | 'REKRUTMEN_PROXY_SECRET'>,
  send: typeof fetch = fetch,
): Promise<Response> {
  const secret = env.REKRUTMEN_PROXY_SECRET || '';
  let origin: URL;
  try {
    origin = new URL((env.REKRUTMEN_ORIGIN || '').trim().replace(/\/+$/, ''));
  } catch {
    return unavailable(503, 'Layanan sedang disiapkan. Silakan coba lagi nanti.');
  }
  if (origin.protocol !== 'https:' || secret.length < 32)
    return unavailable(503, 'Layanan sedang disiapkan. Silakan coba lagi nanti.');

  const url = new URL(request.url);
  const target = new URL(url.pathname + url.search, origin);
  const headers = new Headers();
  for (const [name, value] of request.headers) if (!DROPPED.has(name)) headers.set(name, value);
  const cookies = rekrutmenCookies(request.headers.get('cookie'));
  if (cookies) headers.set('Cookie', cookies);
  headers.set('X-Rek-Proxy', secret);
  const ip = request.headers.get('cf-connecting-ip');
  if (ip) headers.set('X-Rek-Client-IP', ip);
  headers.set('X-Forwarded-Host', url.host);
  headers.set('X-Forwarded-Proto', 'https');

  let upstream: Response;
  try {
    upstream = await send(target.toString(), {
      method: request.method,
      headers,
      body: ['GET', 'HEAD'].includes(request.method) ? undefined : request.body,
      redirect: 'manual',
      // Pages carry personal data and per-visitor sessions: never keep a shared copy.
      cache: 'no-store',
    });
  } catch {
    return unavailable(
      502,
      'Server rekrutmen tidak menjawab. Silakan coba lagi beberapa saat lagi.',
    );
  }

  const out = new Headers(upstream.headers);
  // A redirect the server spells with its own address stays on artificials.net.
  const location = out.get('location');
  if (location) {
    try {
      const to = new URL(location, target);
      if (to.hostname === origin.hostname)
        out.set('location', url.origin + to.pathname + to.search + to.hash);
    } catch {
      // A malformed Location is passed on as the server sent it.
    }
  }
  out.delete('x-powered-by');
  out.set('X-Robots-Tag', 'noindex, nofollow');
  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: out,
  });
}
