import { describe, expect, it, vi } from 'vitest';
import { retrying, statusError } from '../scripts/lib/retry.ts';

const timeout = () =>
  Object.assign(Error('The operation was aborted due to timeout'), {
    name: 'TimeoutError',
  });

describe('network reads that fail for a passing reason', () => {
  it('tries a timeout or a server error again, then succeeds', async () => {
    const read = vi
      .fn()
      .mockRejectedValueOnce(timeout())
      .mockRejectedValueOnce(statusError('Source returned 503', 503))
      .mockResolvedValue('data');
    expect(await retrying('https://source.test/a', read, { pause: 0 })).toBe('data');
    expect(read).toHaveBeenCalledTimes(3);
  });

  it('names the source when every attempt fails', async () => {
    const read = vi.fn().mockRejectedValue(timeout());
    await expect(retrying('https://source.test/b', read, { pause: 0 })).rejects.toThrow(
      'The operation was aborted due to timeout (https://source.test/b, attempt 3 of 3)',
    );
  });

  it('does not retry bad data, client errors or refused redirects', async () => {
    for (const error of [
      Error('Benchmark response too large'),
      statusError('Source returned 404', 404),
      Object.assign(new TypeError('fetch failed'), { cause: Error('unexpected redirect') }),
    ]) {
      const read = vi.fn().mockRejectedValue(error);
      await expect(retrying('https://source.test/c', read, { pause: 0 })).rejects.toThrow(
        'attempt 1 of 3',
      );
      expect(read).toHaveBeenCalledTimes(1);
    }
  });
});
