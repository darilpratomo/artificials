import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { getCookie, setCookie } from 'hono/cookie';
import { HTTPException } from 'hono/http-exception';
import type { Ctx, Env } from './types';
export const configured = (e: Env) =>
  !!(e.SUPABASE_URL && e.SUPABASE_ANON_KEY && e.SUPABASE_SERVICE_ROLE_KEY);
export const securityChallengePath = (path: string) =>
  path === '/api/security' || path === '/api/security/verify';
export function auth(c: Ctx) {
  if (!configured(c.env))
    throw new HTTPException(503, { message: 'Account access is not available yet.' });
  return createServerClient(c.env.SUPABASE_URL, c.env.SUPABASE_ANON_KEY, {
    cookieOptions: {
      httpOnly: true,
      secure: c.env.ENVIRONMENT === 'production',
      sameSite: 'lax',
      path: '/',
    },
    cookies: {
      getAll: () => Object.entries(getCookie(c)).map(([name, value]) => ({ name, value })),
      setAll: (cookies) => {
        for (const { name, value, options } of cookies)
          setCookie(c, name, value, {
            ...options,
            httpOnly: true,
            secure: c.env.ENVIRONMENT === 'production',
            sameSite: 'Lax',
            path: '/',
          });
      },
    },
  });
}
export function db(e: Env) {
  if (!configured(e)) throw new HTTPException(503, { message: 'This service is being prepared.' });
  return createClient(e.SUPABASE_URL, e.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
export async function requireUser(c: Ctx) {
  const client = auth(c);
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) throw new HTTPException(401, { message: 'Please sign in to continue.' });
  if (!securityChallengePath(c.req.path)) {
    const { data: aal, error: aalError } = await client.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aalError) throw new HTTPException(503, { message: 'Unable to verify account security.' });
    if (aal?.nextLevel === 'aal2' && aal.currentLevel !== 'aal2')
      throw new HTTPException(403, {
        message: 'Verify your authenticator code in account security to continue.',
      });
  }
  return { client, user: data.user };
}
export async function requireAdmin(c: Ctx) {
  if (!c.env.CMS_PATH_TOKEN || c.req.param('token') !== c.env.CMS_PATH_TOKEN)
    throw new HTTPException(404, { message: 'Not found.' });
  const { client, user } = await requireUser(c);
  const { data: profile } = await db(c.env)
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  if (profile?.role !== 'admin') throw new HTTPException(404, { message: 'Not found.' });
  const { data, error } = await client.auth.mfa.getAuthenticatorAssuranceLevel();
  if (error || data?.currentLevel !== 'aal2')
    throw new HTTPException(403, {
      message: 'Verify two-factor authentication in your account before opening the CMS.',
    });
  return user;
}
export async function rate(c: Ctx, key: string, limit: number, seconds: number) {
  const { data, error } = await db(c.env).rpc('consume_rate', {
    p_key: key,
    p_limit: limit,
    p_seconds: seconds,
  });
  if (error) throw new HTTPException(503, { message: 'Please try again later.' });
  if (!data)
    throw new HTTPException(429, { message: 'Too many requests. Please wait and try again.' });
}
export async function captcha(c: Ctx, token: string) {
  if (!c.env.TURNSTILE_SECRET_KEY) {
    if (c.env.ENVIRONMENT === 'production')
      throw new HTTPException(503, { message: 'Sign-in protection is being configured.' });
    return;
  }
  const r = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    body: new URLSearchParams({
      secret: c.env.TURNSTILE_SECRET_KEY,
      response: token,
      remoteip: c.req.header('cf-connecting-ip') || '',
    }),
    signal: AbortSignal.timeout(10000),
  });
  const d = (await r.json()) as { success: boolean; hostname?: string };
  if (
    !d.success ||
    (c.env.ENVIRONMENT === 'production' && d.hostname !== new URL(c.env.APP_URL).hostname)
  )
    throw new HTTPException(400, { message: 'Please complete the security check again.' });
}
export async function hashedIp(c: Ctx) {
  const bytes = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(
      (c.req.header('cf-connecting-ip') || 'local') + new Date().toISOString().slice(0, 10),
    ),
  );
  return Array.from(new Uint8Array(bytes))
    .map((x) => x.toString(16).padStart(2, '0'))
    .join('');
}
