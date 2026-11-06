import { afterEach, describe, expect, it, vi } from 'vitest';
import { app } from '../worker/index';
import { proxyRekrutmen, rekrutmenCookies } from '../worker/rekrutmen';
import type { Env } from '../worker/types';

const SECRET = 'x'.repeat(48);
const config = { REKRUTMEN_ORIGIN: 'https://office.example', REKRUTMEN_PROXY_SECRET: SECRET };

function recorder(response: () => Response = () => new Response('ok')) {
  const calls: { url: string; init: RequestInit }[] = [];
  const send = (async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    return response();
  }) as unknown as typeof fetch;
  return { calls, send };
}

afterEach(() => vi.unstubAllGlobals());

describe('recruitment proxy', () => {
  it('forwards the path, query, method and body with the secret and visitor IP', async () => {
    const { calls, send } = recorder();
    await proxyRekrutmen(
      new Request('https://artificials.net/rekrutmen/lamar.php?posisi=driver', {
        method: 'POST',
        body: 'nama=Budi',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'CF-Connecting-IP': '36.71.5.9',
          Cookie: 'REKSESSID=abc; sb-auth-token=editor; rek_perangkat=dev1; other=1',
          'X-Rek-Proxy': 'forged',
          'X-Rek-Client-IP': '1.2.3.4',
        },
      }),
      config,
      send,
    );
    expect(calls).toHaveLength(1);
    const [{ url, init }] = calls;
    expect(url).toBe('https://office.example/rekrutmen/lamar.php?posisi=driver');
    expect(init.method).toBe('POST');
    expect(init.redirect).toBe('manual');
    expect(await new Response(init.body).text()).toBe('nama=Budi');
    const headers = new Headers(init.headers);
    expect(headers.get('x-rek-proxy')).toBe(SECRET);
    expect(headers.get('x-rek-client-ip')).toBe('36.71.5.9');
    expect(headers.get('cookie')).toBe('REKSESSID=abc; rek_perangkat=dev1');
    expect(headers.get('content-type')).toBe('application/x-www-form-urlencoded');
    expect(headers.get('cf-connecting-ip')).toBeNull();
  });

  it('sends only the app cookies and none when there are none', () => {
    expect(rekrutmenCookies('sb-a=1; theme=dark')).toBe('');
    expect(rekrutmenCookies(null)).toBe('');
    expect(rekrutmenCookies('REKSESSIDX=1; REKSESSID=ok')).toBe('REKSESSID=ok');
  });

  it("keeps the server's redirects on artificials.net and leaves other sites alone", async () => {
    const own = recorder(
      () =>
        new Response(null, {
          status: 301,
          headers: { Location: 'http://office.example/rekrutmen/?x=1' },
        }),
    );
    const moved = await proxyRekrutmen(
      new Request('https://artificials.net/rekrutmen'),
      config,
      own.send,
    );
    expect(moved.status).toBe(301);
    expect(moved.headers.get('location')).toBe('https://artificials.net/rekrutmen/?x=1');

    const away = recorder(
      () => new Response(null, { status: 302, headers: { Location: 'https://wa.me/?text=hi' } }),
    );
    const external = await proxyRekrutmen(
      new Request('https://artificials.net/rekrutmen/admin/share.php'),
      config,
      away.send,
    );
    expect(external.headers.get('location')).toBe('https://wa.me/?text=hi');
  });

  it('passes every session cookie and the server security headers through', async () => {
    const { send } = recorder(() => {
      const headers = new Headers({ 'X-Frame-Options': 'SAMEORIGIN', 'X-Powered-By': 'PHP' });
      headers.append('Set-Cookie', 'REKSESSID=new; path=/; secure; HttpOnly');
      headers.append('Set-Cookie', 'rek_perangkat=dev; path=/; secure; HttpOnly');
      return new Response('<p>ok</p>', { headers });
    });
    const response = await proxyRekrutmen(
      new Request('https://artificials.net/rekrutmen/masuk.php'),
      config,
      send,
    );
    expect(response.headers.getSetCookie()).toHaveLength(2);
    expect(response.headers.get('x-frame-options')).toBe('SAMEORIGIN');
    expect(response.headers.get('x-powered-by')).toBeNull();
    expect(response.headers.get('x-robots-tag')).toBe('noindex, nofollow');
    expect(await response.text()).toBe('<p>ok</p>');
  });

  it('answers with a notice instead of calling anything when not configured', async () => {
    const { calls, send } = recorder();
    for (const env of [
      {},
      { REKRUTMEN_ORIGIN: 'https://office.example', REKRUTMEN_PROXY_SECRET: 'short' },
      { REKRUTMEN_ORIGIN: 'http://office.example', REKRUTMEN_PROXY_SECRET: SECRET },
      { REKRUTMEN_ORIGIN: 'not a url', REKRUTMEN_PROXY_SECRET: SECRET },
    ]) {
      const response = await proxyRekrutmen(
        new Request('https://artificials.net/rekrutmen/'),
        env,
        send,
      );
      expect(response.status).toBe(503);
    }
    expect(calls).toHaveLength(0);
  });

  it('says so when the server does not answer', async () => {
    const send = (async () => {
      throw new TypeError('connection refused');
    }) as unknown as typeof fetch;
    const response = await proxyRekrutmen(
      new Request('https://artificials.net/rekrutmen/'),
      config,
      send,
    );
    expect(response.status).toBe(502);
    expect(await response.text()).toContain('Server rekrutmen tidak menjawab');
  });

  it('is routed by the main Worker without the site-wide frame and cache headers', async () => {
    const urls: string[] = [];
    vi.stubGlobal('fetch', async (url: string) => {
      urls.push(url);
      return new Response('ok', { headers: { 'X-Frame-Options': 'SAMEORIGIN' } });
    });
    const assets = { fetch: async () => new Response('asset') } as unknown as Fetcher;
    const env = { ...config, ASSETS: assets, ENVIRONMENT: 'production' } as unknown as Env;
    for (const path of ['/rekrutmen', '/rekrutmen/', '/rekrutmen/user/berkas.php?id=3']) {
      const response = await app.fetch(new Request('https://artificials.net' + path), env);
      expect(response.headers.get('x-frame-options')).toBe('SAMEORIGIN');
      expect(response.headers.get('cache-control')).toBeNull();
    }
    expect(urls).toEqual([
      'https://office.example/rekrutmen',
      'https://office.example/rekrutmen/',
      'https://office.example/rekrutmen/user/berkas.php?id=3',
    ]);
    const other = await app.fetch(new Request('https://artificials.net/rekrutmenx'), env);
    expect(await other.text()).toBe('asset');
    expect(urls).toHaveLength(3);
  });
});
