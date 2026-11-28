import { beforeEach, describe, expect, it } from 'vitest';
import { app } from '../worker/index';
import { resetPesanRate, setPesanStore, type PesanStore, type SecretMessage } from '../worker/pesan';
import type { Env } from '../worker/types';

const KEY = 'k'.repeat(40);
const env = {
  APP_URL: 'https://artificials.net',
  ENVIRONMENT: 'development',
  PESAN_OPERATOR_KEY: KEY,
} as Env;
const LOCAL = 'http://127.0.0.1:5199';

function memoryStore() {
  const s = {
    open: false,
    inserted: [] as Record<string, unknown>[],
    rows: [] as SecretMessage[],
    patches: [] as { id: string; patch: Record<string, unknown> }[],
  };
  const store: PesanStore = {
    async isOpen() {
      return s.open;
    },
    async setOpen(open) {
      s.open = open;
    },
    async insert(row) {
      s.inserted.push({ ...row });
    },
    async list() {
      return s.rows;
    },
    async patch(id, patch) {
      s.patches.push({ id, patch: { ...patch } });
    },
  };
  return { s, store };
}

let mem = memoryStore();
beforeEach(() => {
  mem = memoryStore();
  setPesanStore(() => mem.store);
  resetPesanRate();
});

const post = (body: unknown, ip = '36.71.5.9') =>
  app.request(
    '/api/pesan',
    {
      method: 'POST',
      headers: { origin: 'https://artificials.net', 'Content-Type': 'application/json', 'CF-Connecting-IP': ip },
      body: JSON.stringify(body),
    },
    { ...env, APP_URL: 'https://artificials.net' },
  );
const admin = (path: string, init: RequestInit = {}, key: string | null = KEY, e: Env = env) =>
  app.request(
    path,
    { ...init, headers: { origin: LOCAL, 'Content-Type': 'application/json', ...(key ? { Authorization: `Bearer ${key}` } : {}), ...(init.headers ?? {}) } },
    e,
  );

describe('secret messages: sending', () => {
  it('refuses messages while the session is closed', async () => {
    const r = await post({ to: 'Bu Sari', body: 'Terima kasih!', captcha: '' });
    expect(r.status).toBe(403);
    expect(mem.s.inserted).toHaveLength(0);
  });

  it('stores only the recipient and the message, nothing about the sender', async () => {
    mem.s.open = true;
    const r = await post({ to: '  Bu Sari ', body: 'Terima kasih!', captcha: '', name: 'Budi', email: 'x@y.z' });
    expect(r.status).toBe(200);
    expect(mem.s.inserted).toEqual([{ to_name: 'Bu Sari', body: 'Terima kasih!' }]);
  });

  it('rejects empty or too long input', async () => {
    mem.s.open = true;
    expect((await post({ to: 'x'.repeat(61), body: 'hai', captcha: '' })).status).toBe(400);
    expect((await post({ to: 'Bu Sari', body: 'x'.repeat(281), captcha: '' })).status).toBe(400);
    expect((await post({ to: '   ', body: 'hai', captcha: '' })).status).toBe(400);
    expect(mem.s.inserted).toHaveLength(0);
  });

  it('limits how fast one connection can send', async () => {
    mem.s.open = true;
    const codes = [];
    for (let i = 0; i < 9; i++) codes.push((await post({ to: 'A', body: `pesan ${i}`, captcha: '' }, '1.2.3.4')).status);
    expect(codes.slice(0, 8).every((c) => c === 200)).toBe(true);
    expect(codes[8]).toBe(429);
    expect((await post({ to: 'A', body: 'lain', captcha: '' }, '5.6.7.8')).status).toBe(200);
  });

  it('reports whether the session is open', async () => {
    mem.s.open = true;
    const r = await app.request('/api/pesan/status', {}, env);
    expect(await r.json()).toEqual({ open: true });
  });

  it('serves the send page without a sender field', async () => {
    const r = await app.request('/pesan', {}, { ...env, TURNSTILE_SITE_KEY: 'site-key' } as Env);
    expect(r.status).toBe(200);
    const html = await r.text();
    expect(html).toContain('Pesan Rahasia');
    expect(html).toContain('name="to"');
    expect(html).toContain('name="body"');
    expect(html).not.toMatch(/name="(from|sender|pengirim|nama)"/i);
    expect(r.headers.get('content-security-policy')).toContain('challenges.cloudflare.com');
  });
});

describe('secret messages: operator API', () => {
  it('needs the operator key', async () => {
    expect((await admin('/api/pesan/admin', {}, null)).status).toBe(401);
    expect((await admin('/api/pesan/admin', {}, 'wrong')).status).toBe(401);
    expect((await admin('/api/pesan/admin', {}, KEY, { ...env, PESAN_OPERATOR_KEY: undefined } as Env)).status).toBe(503);
  });

  it('lists messages with the session state and CORS for the local console', async () => {
    mem.s.rows = [{ id: '7d3c4b8e-0a1b-4c2d-9e8f-001122334455', to_name: 'A', body: 'B', status: 'pending', created_at: '2026-11-28T10:00:00Z' }];
    const r = await admin('/api/pesan/admin');
    expect(r.status).toBe(200);
    expect(r.headers.get('access-control-allow-origin')).toBe(LOCAL);
    expect(await r.json()).toEqual({ messages: mem.s.rows, open: false });
  });

  it('answers the CORS preflight only for allowed origins', async () => {
    const ok = await app.request('/api/pesan/admin/abc', { method: 'OPTIONS', headers: { origin: LOCAL, 'Access-Control-Request-Method': 'PATCH' } }, env);
    expect(ok.status).toBe(204);
    expect(ok.headers.get('access-control-allow-origin')).toBe(LOCAL);
    expect(ok.headers.get('access-control-allow-headers')).toMatch(/authorization/i);
    const bad = await app.request('/api/pesan/admin', { method: 'OPTIONS', headers: { origin: 'https://evil.example' } }, env);
    expect(bad.headers.get('access-control-allow-origin')).toBeNull();
  });

  it('lets the local console change status in production', async () => {
    const prod = { ...env, ENVIRONMENT: 'production' } as Env;
    const id = '7d3c4b8e-0a1b-4c2d-9e8f-001122334455';
    const r = await admin(`/api/pesan/admin/${id}`, { method: 'PATCH', body: JSON.stringify({ status: 'approved', body: 'Dikoreksi' }) }, KEY, prod);
    expect(r.status).toBe(200);
    expect(mem.s.patches).toEqual([{ id, patch: { status: 'approved', body: 'Dikoreksi' } }]);
    const bad = await admin(`/api/pesan/admin/${id}`, { method: 'PATCH', body: JSON.stringify({ status: 'deleted' }) }, KEY, prod);
    expect(bad.status).toBe(400);
  });

  it('opens and closes the session', async () => {
    const r = await admin('/api/pesan/admin/session', { method: 'POST', body: JSON.stringify({ open: true }) });
    expect(await r.json()).toEqual({ open: true });
    expect(mem.s.open).toBe(true);
  });

  it('keeps other cross-origin API writes blocked', async () => {
    const prod = { ...env, ENVIRONMENT: 'production' } as Env;
    const r = await app.request('/api/pesan', { method: 'POST', headers: { origin: LOCAL, 'Content-Type': 'application/json' }, body: '{}' }, prod);
    expect(r.status).toBe(403);
  });
});
