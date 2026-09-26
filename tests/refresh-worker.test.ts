import { afterEach, describe, expect, it, vi } from 'vitest';
import { refresh, type RefreshEnv } from '../worker/refresh';

const env: RefreshEnv = {
  GITHUB_TOKEN: 'token',
  GITHUB_REPOSITORY: 'owner/repo',
  REFRESH_WORKFLOW: 'sync-catalog.yml',
};

/** Answers GitHub API calls in order, recording each request. */
function github(...responses: Response[]) {
  const calls: { url: string; method: string; body?: string }[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init: RequestInit = {}) => {
      calls.push({ url, method: init.method ?? 'GET', body: init.body as string | undefined });
      return responses.shift() ?? new Response(null, { status: 500 });
    }),
  );
  return calls;
}

afterEach(() => vi.unstubAllGlobals());

describe('scheduled refresh', () => {
  it('does nothing without a token', async () => {
    const calls = github();
    expect(await refresh({ ...env, GITHUB_TOKEN: undefined })).toMatch(/nothing dispatched/);
    expect(calls).toHaveLength(0);
  });

  it('dispatches the workflow on main and hands the schedule over', async () => {
    const calls = github(
      new Response(null, { status: 204 }),
      new Response('{}', { status: 404 }),
      new Response(null, { status: 201 }),
    );
    expect(await refresh(env)).toBe('Refresh started.');
    expect(calls[0]).toEqual({
      url: 'https://api.github.com/repos/owner/repo/actions/workflows/sync-catalog.yml/dispatches',
      method: 'POST',
      body: '{"ref":"main"}',
    });
    expect(calls[2]).toMatchObject({
      url: 'https://api.github.com/repos/owner/repo/actions/variables',
      method: 'POST',
      body: '{"name":"REFRESH_TRIGGER","value":"cloudflare"}',
    });
  });

  it('leaves the variable alone once it is set', async () => {
    const calls = github(
      new Response(null, { status: 204 }),
      Response.json({ name: 'REFRESH_TRIGGER', value: 'cloudflare' }),
    );
    expect(await refresh(env)).toBe('Refresh started.');
    expect(calls).toHaveLength(2);
  });

  it('says so when the token cannot manage variables, and fails when GitHub refuses', async () => {
    github(new Response(null, { status: 204 }), new Response('{}', { status: 403 }));
    expect(await refresh(env)).toMatch(/could not be stood down/);
    github(new Response('{}', { status: 401 }));
    await expect(refresh(env)).rejects.toThrow('HTTP 401');
  });
});
