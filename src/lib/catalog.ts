import { useEffect, useState } from 'react';
import type { CatalogPage, CatalogSummary, ModelRecord } from '../../shared/catalog';
export { providerLogo } from '../../shared/catalog';
export type { ModelRecord, CatalogSummary, CatalogPage } from '../../shared/catalog';
const summaryCache: { value?: CatalogSummary } = {};
const pageCache = new Map<string, CatalogPage>();
const pageRequests = new Map<string, Promise<CatalogPage>>();

function catalogPage(params: string) {
  const cached = pageCache.get(params);
  if (cached) return Promise.resolve(cached);
  const request =
    pageRequests.get(params) ??
    fetch('/api/catalog?' + params)
      .then(async (r) => {
        if (!r.ok) throw new Error('The model catalog could not load. Please try again.');
        return r.json() as Promise<CatalogPage>;
      })
      .then((page) => {
        pageCache.set(params, page);
        return page;
      })
      .finally(() => pageRequests.delete(params));
  pageRequests.set(params, request);
  return request;
}

export function useCatalogSummary() {
  const [data, setData] = useState<CatalogSummary | undefined>(summaryCache.value);
  const [error, setError] = useState('');
  useEffect(() => {
    if (summaryCache.value) return;
    const controller = new AbortController();
    fetch('/api/catalog/summary', { signal: controller.signal })
      .then(async (r) => {
        if (!r.ok) throw new Error('The model catalog is temporarily unavailable.');
        return r.json() as Promise<CatalogSummary>;
      })
      .then((d) => {
        summaryCache.value = d;
        setData(d);
      })
      .catch((e) => {
        if (e.name !== 'AbortError') setError(e.message);
      });
    return () => controller.abort();
  }, []);
  return { data, error };
}
export function useCatalogPage(params: string) {
  const [data, setData] = useState<CatalogPage | undefined>(() => pageCache.get(params));
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(() => !pageCache.has(params));
  useEffect(() => {
    let active = true;
    const cached = pageCache.get(params);
    if (cached) {
      setData(cached);
      setError('');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    const timer = setTimeout(() => {
      catalogPage(params)
        .then((page) => {
          if (active) setData(page);
        })
        .catch((e) => {
          if (active) setError(e.message);
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }, 160);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [params]);
  return { data, error, loading };
}
const compareKey = 'artificials-compare';
let memoryComparison: ModelRecord[] = [];
let storageUnavailable = false;
export function readComparison(): ModelRecord[] {
  if (typeof window === 'undefined') return [];
  if (storageUnavailable) return memoryComparison;
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(compareKey) || '[]');
    return Array.isArray(parsed)
      ? parsed
          .filter(
            (m): m is ModelRecord =>
              m &&
              typeof m.id === 'string' &&
              typeof m.name === 'string' &&
              typeof m.providerId === 'string' &&
              Array.isArray(m.modalities),
          )
          .slice(0, 3)
      : [];
  } catch {
    return [];
  }
}
export function useComparison() {
  const [models, setModels] = useState(readComparison);
  useEffect(() => {
    const sync = () => setModels(readComparison());
    window.addEventListener('artificials-compare-change', sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener('artificials-compare-change', sync);
      window.removeEventListener('storage', sync);
    };
  }, []);
  function toggle(model: ModelRecord) {
    const current = readComparison();
    const next = current.some((m) => m.id === model.id)
      ? current.filter((m) => m.id !== model.id)
      : [...current, model].slice(0, 3);
    try {
      localStorage.setItem(compareKey, JSON.stringify(next));
    } catch {
      storageUnavailable = true;
    }
    memoryComparison = next;
    setModels(next);
    window.dispatchEvent(new Event('artificials-compare-change'));
  }
  function clear() {
    try {
      localStorage.removeItem(compareKey);
    } catch {}
    memoryComparison = [];
    setModels([]);
    window.dispatchEvent(new Event('artificials-compare-change'));
  }
  return { models, toggle, clear };
}
export const compactNumber = (n: number | null | undefined) =>
  n == null
    ? 'Not reported'
    : Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(n);
export const tokenPrice = (n: number | null | undefined) =>
  n == null
    ? 'Not reported'
    : new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 3,
      }).format(n);
export const updatedDate = (date?: string) =>
  date && Number.isFinite(Date.parse(date))
    ? new Date(date).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'UTC',
      }) + ' UTC'
    : 'Checking source';
