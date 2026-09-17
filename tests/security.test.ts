import { paidPeriod } from '../worker/billing';
import { describe, it, expect } from 'vitest';
import { verifyPaddleSignature, sameOrigin, safePreview } from '../worker/security';
import { artifactSchema } from '../shared/schema';
import { DEMO } from '../src/lib/demo';
import { projectFiles } from '../shared/export';
import {
  PLANS,
  MAX_INPUT_BYTES,
  MAX_OUTPUT_TOKENS,
  RESERVATION_MICROS,
  PROTOCOL_TOKEN_ALLOWANCE,
  dailyBudgetMicros,
} from '../shared/plans';
import { app } from '../worker/index';
import { securityChallengePath, aiReady } from '../worker/auth';
import { billingReady } from '../worker/billing';
import type { Env } from '../worker/types';
async function signature(raw: string, ts: number, secret = 'webhook-secret') {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const value = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(ts + ':' + raw));
  return `ts=${ts};h1=${Array.from(new Uint8Array(value))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')}`;
}
describe('billing trust boundary', () => {
  it('accepts authentic signatures and rejects modified payloads', async () => {
    const raw = '{"event_id":"evt_123"}';
    const ts = Math.floor(Date.now() / 1000);
    const header = await signature(raw, ts);
    expect(await verifyPaddleSignature(raw, header, 'webhook-secret')).toBe(true);
    expect(await verifyPaddleSignature(raw + ' ', header, 'webhook-secret')).toBe(false);
  });
  it('rejects stale, missing and malformed signatures', async () => {
    const ts = Math.floor(Date.now() / 1000) - 301;
    expect(await verifyPaddleSignature('{}', await signature('{}', ts), 'webhook-secret')).toBe(
      false,
    );
    for (const header of [null, 'ts=NaN;h1=00', 'ts=0;h1=oops'])
      expect(await verifyPaddleSignature('{}', header, 'webhook-secret')).toBe(false);
  });
  it('reserves more than twice the conservative token bill', () => {
    const upper = (MAX_INPUT_BYTES + PROTOCOL_TOKEN_ALLOWANCE) * 0.25 + MAX_OUTPUT_TOKENS * 2;
    expect(RESERVATION_MICROS).toBeGreaterThan(upper * 2);
    for (const plan of Object.values(PLANS)) {
      expect(plan.budget).toBe(plan.credits * RESERVATION_MICROS);
      expect(plan.price * 0.95 - 0.5 - plan.budget / 1e6).toBeGreaterThan(plan.price * 0.5);
    }
  });
});
describe('request and artifact security', () => {
  it('compares exact origins', () => {
    expect(sameOrigin('https://artificials.net', 'https://artificials.net')).toBe(true);
    expect(sameOrigin('https://artificials.net.evil.com', 'https://artificials.net')).toBe(false);
    expect(sameOrigin(undefined, 'https://artificials.net')).toBe(false);
  });
  it('rejects injectable identifiers and duplicate columns', () => {
    const bad = structuredClone(DEMO);
    bad.collections[0].name = 'books; DROP TABLE users';
    expect(artifactSchema.safeParse(bad).success).toBe(false);
    const duplicate = structuredClone(DEMO);
    duplicate.collections[0].fields.push(duplicate.collections[0].fields[0]);
    expect(artifactSchema.safeParse(duplicate).success).toBe(false);
  });
  it('exports a runnable scaffold without runtime credentials', () => {
    const files = projectFiles(DEMO);
    expect(Object.keys(files)).toEqual(
      expect.arrayContaining([
        'src/App.tsx',
        'worker/index.ts',
        'schema.sql',
        'README.md',
        'src/platform.tsx',
      ]),
    );
    expect(files['schema.sql']).toContain('user_id TEXT NOT NULL');
    expect(files['worker/index.ts']).toContain('WHERE id=? AND user_id=?');
    expect(JSON.stringify(files)).not.toContain('SERVICE_ROLE');
    expect(JSON.parse(files['package.json']).scripts.build).toContain('tsc');
    expect(safePreview('<script>alert(1)</script>')).toContain("default-src 'none'");
  });
  it('fails closed without infrastructure configuration', async () => {
    const env = { APP_URL: 'https://artificials.net', ENVIRONMENT: 'production' } as Env;
    const config = await app.request('/api/config', {}, env);
    expect(((await config.json()) as { billing: boolean }).billing).toBe(false);
    const generated = await app.request(
      '/api/generate',
      {
        method: 'POST',
        headers: { origin: 'https://artificials.net', 'Content-Type': 'application/json' },
        body: '{}',
      },
      env,
    );
    expect(generated.status).toBe(503);
    const evil = await app.request(
      '/api/generate',
      { method: 'POST', headers: { origin: 'https://evil.test' } },
      env,
    );
    expect(evil.status).toBe(403);
    const cms = await app.request('/api/cms/guessed/articles', {}, env);
    expect(cms.status).toBe(404);
    for (const path of ['/admin', '/admin/', '/admin.md', '/Admin.MD', '/admin/users']) {
      expect((await app.request(path, {}, env)).status).toBe(404);
    }
    const privatePage = await app.request('/_private/guess', {}, env);
    expect(privatePage.status).toBe(404);
  });
});

describe('paid billing periods', () => {
  const first = { starts_at: '2026-08-17T12:00:00Z', ends_at: '2026-09-17T12:00:00Z' };
  it('accepts API-created initial subscriptions even when transaction period is null', () => {
    expect(
      paidPeriod(
        { origin: 'api', billing_period: null },
        { first_billed_at: first.starts_at, current_billing_period: first },
      ),
    ).toEqual(first);
  });
  it('does not turn an old initial payment into a new period', () => {
    expect(
      paidPeriod(
        { origin: 'api', billing_period: null },
        { first_billed_at: '2026-07-17T12:00:00Z', current_billing_period: first },
      ),
    ).toBe(null);
  });
  it('rejects proration-sized or invalid periods', () => {
    expect(
      paidPeriod(
        {
          origin: 'subscription_recurring',
          billing_period: { starts_at: '2026-09-01', ends_at: '2026-09-05' },
        },
        {},
      ),
    ).toBe(null);
    expect(
      paidPeriod(
        { origin: 'subscription_recurring', billing_period: { starts_at: 'oops', ends_at: 'bad' } },
        {},
      ),
    ).toBe(null);
    expect(paidPeriod({ origin: 'subscription_recurring', billing_period: first }, {})).toEqual(
      first,
    );
  });
});

describe('configuration and MFA fail closed', () => {
  it('permits an MFA challenge without allowing an unverified session to enroll replacements', () => {
    expect(securityChallengePath('/api/security')).toBe(true);
    expect(securityChallengePath('/api/security/verify')).toBe(true);
    expect(securityChallengePath('/api/security/enroll')).toBe(false);
    expect(securityChallengePath('/api/security/anything-else')).toBe(false);
  });
  it('rejects malformed, zero and excessive daily spend settings', () => {
    expect(dailyBudgetMicros(undefined)).toBe(10000000);
    expect(dailyBudgetMicros('100000')).toBe(100000);
    for (const value of ['', '0', '-1', 'NaN', 'Infinity', '100000.5', '100000001']) {
      expect(dailyBudgetMicros(value)).toBeNull();
      expect(
        aiReady({
          AI_ENABLED: 'true',
          OPENAI_API_KEY: 'test',
          SUPABASE_URL: 'https://example.supabase.co',
          SUPABASE_ANON_KEY: 'test',
          SUPABASE_SERVICE_ROLE_KEY: 'test',
          GLOBAL_DAILY_AI_BUDGET_MICROS: value,
        } as Env),
      ).toBe(false);
    }
  });
  it('does not open production checkout when the sign-in protection is missing', () => {
    const env = {
      ENVIRONMENT: 'production',
      AI_ENABLED: 'true',
      BILLING_ENABLED: 'true',
      LEGAL_READY: 'true',
      OPENAI_API_KEY: 'test',
      SUPABASE_URL: 'https://example.supabase.co',
      SUPABASE_ANON_KEY: 'test',
      SUPABASE_SERVICE_ROLE_KEY: 'test',
      OPERATOR_NAME: 'Test',
      OPERATOR_ADDRESS: 'Test',
      SUPPORT_EMAIL: 'support@example.test',
      PRIVACY_EMAIL: 'privacy@example.test',
      PADDLE_API_KEY: 'test',
      PADDLE_CLIENT_TOKEN: 'test',
      PADDLE_WEBHOOK_SECRET: 'test',
      PADDLE_PRICE_STARTER: 'test',
      PADDLE_PRICE_PRO: 'test',
      PADDLE_PRICE_STUDIO: 'test',
    } as Env;
    expect(billingReady(env)).toBe(false);
    expect(billingReady({ ...env, TURNSTILE_SITE_KEY: 'test', TURNSTILE_SECRET_KEY: 'test' })).toBe(
      true,
    );
  });
});
