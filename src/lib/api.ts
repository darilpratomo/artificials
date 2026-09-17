export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch('/api' + path, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers },
    credentials: 'same-origin',
  });
  const body = (await response
    .json()
    .catch(() => ({ error: 'The service is temporarily unavailable. Please try again.' }))) as T & {
    error?: string;
  };
  if (!response.ok) throw new Error(body.error || 'Something went wrong. Please try again.');
  return body as T;
}
export function post<T>(path: string, body: unknown = {}) {
  return api<T>(path, { method: 'POST', body: JSON.stringify(body) });
}
export const money = (n: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(n);
