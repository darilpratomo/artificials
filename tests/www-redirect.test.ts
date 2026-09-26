import { describe, expect, it } from 'vitest';
import www from '../worker/www';

describe('www redirect', () => {
  it('sends every path and query to the same place on artificials.net', () => {
    const response = www.fetch(
      new Request('https://www.artificials.net/models/claude-opus-5-5?tab=pricing'),
    );
    expect(response.status).toBe(301);
    expect(response.headers.get('Location')).toBe(
      'https://artificials.net/models/claude-opus-5-5?tab=pricing',
    );
  });

  it('moves plain HTTP and the bare host to HTTPS on the main address', () => {
    const response = www.fetch(new Request('http://www.artificials.net'));
    expect(response.headers.get('Location')).toBe('https://artificials.net/');
  });
});
