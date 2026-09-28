import { describe, it, expect } from 'vitest';
import { sameOrigin } from '../worker/security';
import { app } from '../worker/index';
import { securityChallengePath } from '../worker/auth';
import type { Env } from '../worker/types';

const env = { APP_URL: 'https://artificials.net', ENVIRONMENT: 'production' } as Env;

describe('request security', () => {
  it('compares exact origins', () => {
    expect(sameOrigin('https://artificials.net', 'https://artificials.net')).toBe(true);
    expect(sameOrigin('https://artificials.net.evil.com', 'https://artificials.net')).toBe(false);
    expect(sameOrigin(undefined, 'https://artificials.net')).toBe(false);
  });

  it('fails closed without infrastructure configuration', async () => {
    const config = (await (await app.request('/api/config', {}, env)).json()) as Record<
      string,
      unknown
    >;
    expect(config.auth).toBe(false);
    // Nothing about payments or paid AI remains in the public configuration.
    for (const key of ['billing', 'ai', 'paddleClientToken', 'paddleSandbox'])
      expect(config).not.toHaveProperty(key);
    const signIn = await app.request(
      '/api/auth/otp',
      {
        method: 'POST',
        headers: { origin: 'https://artificials.net', 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'editor@example.test' }),
      },
      env,
    );
    expect(signIn.status).toBe(503);
    const evil = await app.request(
      '/api/auth/otp',
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

  it('has no paid features left: their endpoints are gone and old pages redirect home', async () => {
    const headers = { origin: 'https://artificials.net', 'Content-Type': 'application/json' };
    for (const path of ['/api/generate', '/api/billing/checkout', '/api/billing/webhook'])
      expect((await app.request(path, { method: 'POST', headers, body: '{}' }, env)).status).toBe(
        404,
      );
    expect((await app.request('/api/projects/1', {}, env)).status).toBe(404);
    for (const path of ['/studio', '/pricing', '/checkout']) {
      const response = await app.request(path, {}, env);
      expect(response.status).toBe(301);
      expect(response.headers.get('location')).toBe('/');
    }
  });

  it('sends the retired second guide to How AI works', async () => {
    const response = await app.request('/how-ai-works-2', {}, env);
    expect(response.status).toBe(301);
    expect(response.headers.get('location')).toBe('/how-ai-works');
  });
});

describe('MFA fails closed', () => {
  it('permits an MFA challenge without allowing an unverified session to enroll replacements', () => {
    expect(securityChallengePath('/api/security')).toBe(true);
    expect(securityChallengePath('/api/security/verify')).toBe(true);
    expect(securityChallengePath('/api/security/enroll')).toBe(false);
    expect(securityChallengePath('/api/security/anything-else')).toBe(false);
  });
});
