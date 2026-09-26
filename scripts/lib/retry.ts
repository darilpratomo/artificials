/**
 * Runs a network read again when it fails for a passing reason: a timeout, a
 * dropped connection or a server error (a thrown error with `status` 500 or
 * above). Anything else, such as a refused redirect or bad data, fails at once.
 * The final error names the address, so a failed refresh says which source.
 */
export async function retrying<T>(
  url: string,
  read: () => Promise<T>,
  { attempts = 3, pause = 4000 } = {},
): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await read();
    } catch (caught) {
      const error = caught as {
        name?: string;
        message?: string;
        status?: number;
        cause?: { message?: string; code?: string };
      };
      const detail = `${error?.message ?? ''} ${error?.cause?.message ?? ''} ${error?.cause?.code ?? ''}`;
      const passing =
        !/redirect/i.test(detail) &&
        (error?.name === 'TimeoutError' ||
          (error?.status ?? 0) >= 500 ||
          /fetch failed|ECONNRESET|ETIMEDOUT|EAI_AGAIN|socket|terminated/i.test(detail));
      if (!passing || attempt >= attempts)
        throw Error(
          `${error?.message ?? String(caught)} (${url}, attempt ${attempt} of ${attempts})`,
          {
            cause: caught,
          },
        );
      await new Promise((resolve) => setTimeout(resolve, pause * attempt));
    }
  }
}

/** An error for an unsuccessful response, carrying its status for `retrying`. */
export function statusError(message: string, status: number) {
  return Object.assign(Error(message), { status });
}
