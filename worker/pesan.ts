/**
 * artificials.net/pesan: anonymous "secret messages" for the owner's office event
 * (Indonesian). Attendees send "to whom" + a message from their phone; the event
 * operator's local console (http://127.0.0.1:5199) reads them with a bearer key,
 * approves each one and shows it on the projector.
 *
 * Privacy: only the recipient and the message are stored. No IP, user agent,
 * account or cookie is saved; the send rate is limited in memory only.
 *
 * Secrets (Cloudflare): PESAN_OPERATOR_KEY (required for the operator API) and
 * optionally PESAN_OPERATOR_ORIGINS, a comma-separated list of extra console origins.
 * Database: supabase/012_secret_messages.sql.
 */
import type { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { z } from 'zod';
import { captcha, db } from './auth';
import type { Ctx, Env } from './types';
import { pesanPage } from './pesan-page';

export type MessageStatus = 'pending' | 'approved' | 'rejected' | 'shown';
export interface SecretMessage {
  id: string;
  to_name: string;
  body: string;
  status: MessageStatus;
  created_at: string;
}
export interface PesanStore {
  isOpen(): Promise<boolean>;
  setOpen(open: boolean): Promise<void>;
  insert(row: { to_name: string; body: string }): Promise<void>;
  list(): Promise<SecretMessage[]>;
  patch(id: string, patch: Partial<Pick<SecretMessage, 'status' | 'to_name' | 'body'>>): Promise<void>;
}

export const PESAN_LIMITS = { to: 60, body: 280 } as const;
const LOCAL_CONSOLE = ['http://127.0.0.1:5199', 'http://localhost:5199'];
export const PESAN_ADMIN_PREFIX = '/api/pesan/admin';

function fail(error: { message: string } | null) {
  if (error) throw new HTTPException(503, { message: 'Layanan pesan sedang bermasalah. Coba lagi.' });
}

export const supabaseStore = (env: Env): PesanStore => {
  const client = () => db(env);
  return {
    async isOpen() {
      const { data, error } = await client().from('secret_message_session').select('open').eq('id', 1).maybeSingle();
      fail(error);
      return !!data?.open;
    },
    async setOpen(open) {
      const { error } = await client()
        .from('secret_message_session')
        .upsert({ id: 1, open, updated_at: new Date().toISOString() });
      fail(error);
    },
    async insert(row) {
      const { error } = await client().from('secret_messages').insert(row);
      fail(error);
    },
    async list() {
      const { data, error } = await client()
        .from('secret_messages')
        .select('id,to_name,body,status,created_at')
        .order('created_at', { ascending: true })
        .limit(1000);
      fail(error);
      return (data ?? []) as SecretMessage[];
    },
    async patch(id, patch) {
      const { error } = await client().from('secret_messages').update(patch).eq('id', id);
      fail(error);
    },
  };
};

let makeStore: (env: Env) => PesanStore = supabaseStore;
/** Tests swap the database for an in-memory store. */
export function setPesanStore(f: (env: Env) => PesanStore) {
  makeStore = f;
}

// Per-isolate, in-memory only: nothing about senders is written anywhere.
const hits = new Map<string, number[]>();
export function resetPesanRate() {
  hits.clear();
}
export function allowSend(ip: string, now = Date.now(), limit = 8, windowMs = 10 * 60_000) {
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= limit) {
    hits.set(ip, recent);
    return false;
  }
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) for (const k of hits.keys()) if (k !== ip) hits.delete(k);
  return true;
}

export function consoleOrigins(env: Env) {
  const extra = (env.PESAN_OPERATOR_ORIGINS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return [...LOCAL_CONSOLE, ...extra];
}

function sameSecret(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

const text = (max: number) =>
  z
    .string()
    .transform((s) => s.replace(/\s+/g, ' ').trim())
    .pipe(z.string().min(1).max(max));
const multiline = (max: number) =>
  z
    .string()
    .transform((s) => s.replace(/\r\n?/g, '\n').replace(/\n{3,}/g, '\n\n').trim())
    .pipe(z.string().min(1).max(max));

const sendSchema = z.object({
  to: text(PESAN_LIMITS.to),
  body: multiline(PESAN_LIMITS.body),
  captcha: z.string().max(4096).default(''),
});
const patchSchema = z
  .object({
    status: z.enum(['pending', 'approved', 'rejected', 'shown']).optional(),
    to_name: text(PESAN_LIMITS.to).optional(),
    body: multiline(PESAN_LIMITS.body).optional(),
  })
  .strict()
  .refine((p) => Object.keys(p).length > 0);

function cors(c: Ctx) {
  const origin = c.req.header('origin') || '';
  if (!consoleOrigins(c.env).includes(origin)) return;
  c.header('Access-Control-Allow-Origin', origin);
  c.header('Vary', 'Origin');
  c.header('Access-Control-Allow-Methods', 'GET, POST, PATCH, OPTIONS');
  c.header('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  c.header('Access-Control-Max-Age', '600');
}

export function registerPesanRoutes(app: Hono<{ Bindings: Env }>) {
  app.get('/pesan', (c) => {
    c.header('X-Robots-Tag', 'noindex, nofollow');
    const nonce = crypto.randomUUID().replace(/-/g, '');
    c.header(
      'Content-Security-Policy',
      [
        "default-src 'none'",
        `script-src 'nonce-${nonce}' https://challenges.cloudflare.com`,
        `style-src 'nonce-${nonce}'`,
        'frame-src https://challenges.cloudflare.com',
        "connect-src 'self'",
        "img-src 'self' data:",
        "base-uri 'none'",
        "form-action 'self'",
        "frame-ancestors 'none'",
      ].join('; '),
    );
    return c.html(pesanPage({ siteKey: c.env.TURNSTILE_SITE_KEY || '', nonce }));
  });

  app.get('/api/pesan/status', async (c) => c.json({ open: await makeStore(c.env).isOpen() }));

  app.post('/api/pesan', async (c) => {
    const input = sendSchema.parse(await c.req.json());
    const store = makeStore(c.env);
    if (!(await store.isOpen()))
      throw new HTTPException(403, { message: 'Sesi pesan rahasia belum dibuka atau sudah ditutup.' });
    if (!allowSend(c.req.header('cf-connecting-ip') || 'local'))
      throw new HTTPException(429, { message: 'Terlalu banyak pesan. Tunggu sebentar lalu coba lagi.' });
    await captcha(c, input.captcha);
    await store.insert({ to_name: input.to, body: input.body });
    return c.json({ ok: true });
  });

  const guard = async (c: Ctx, next: () => Promise<void>) => {
    cors(c);
    if (c.req.method === 'OPTIONS') return c.body(null, 204);
    const key = c.env.PESAN_OPERATOR_KEY;
    if (!key) throw new HTTPException(503, { message: 'Operator key is not configured.' });
    const auth = c.req.header('authorization') || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
    if (!token || !sameSecret(token, key)) throw new HTTPException(401, { message: 'Unauthorized.' });
    await next();
  };
  app.use(PESAN_ADMIN_PREFIX, guard);
  app.use(`${PESAN_ADMIN_PREFIX}/*`, guard);

  app.get(PESAN_ADMIN_PREFIX, async (c) => {
    const store = makeStore(c.env);
    const [messages, open] = await Promise.all([store.list(), store.isOpen()]);
    return c.json({ messages, open });
  });

  app.post(`${PESAN_ADMIN_PREFIX}/session`, async (c) => {
    const { open } = z.object({ open: z.boolean() }).parse(await c.req.json());
    await makeStore(c.env).setOpen(open);
    return c.json({ open });
  });

  app.patch(`${PESAN_ADMIN_PREFIX}/:id`, async (c) => {
    const id = z.uuid().parse(c.req.param('id'));
    const patch = patchSchema.parse(await c.req.json());
    await makeStore(c.env).patch(id, patch);
    return c.json({ ok: true });
  });
}
