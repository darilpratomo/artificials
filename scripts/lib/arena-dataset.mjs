/**
 * Reads Arena's leaderboard dataset on Hugging Face (CC BY 4.0) for the sync
 * scripts. The licence is checked before anything is read, and every table
 * is read at the revision that check saw.
 */
import { parquetReadObjects } from 'hyparquet';
import { retrying, statusError } from './retry.ts';

export const DATASET = 'lmarena-ai/leaderboard-dataset';
export const DATASET_URL = `https://huggingface.co/datasets/${DATASET}`;

/** Hugging Face serves dataset files from its own CDN hosts. */
const HOSTS = /(^|\.)(huggingface\.co|hf\.co)$/;

/**
 * Downloads a file, following redirects only to Hugging Face's own hosts, and
 * refuses anything larger than `maxBytes`. A timeout, dropped connection or
 * server error is tried again.
 */
export const download = (url, maxBytes) => retrying(url, () => downloadOnce(url, maxBytes));

async function downloadOnce(url, maxBytes, hops = 4) {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(30000),
    redirect: 'manual',
    headers: { 'user-agent': 'Artificials-arena/1.0 (+https://artificials.net/about)' },
  });
  if (response.status >= 300 && response.status < 400) {
    const next = new URL(response.headers.get('location') ?? '', url);
    if (next.protocol !== 'https:' || !HOSTS.test(next.hostname) || hops === 0)
      throw Error(`Refused a redirect to ${next.hostname}`);
    return downloadOnce(next.href, maxBytes, hops - 1);
  }
  if (!response.ok)
    throw statusError(`Arena dataset returned ${response.status}: ${url}`, response.status);
  const reader = response.body.getReader();
  const chunks = [];
  let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > maxBytes) throw Error(`Arena file too large: ${url}`);
      chunks.push(value);
    }
  } finally {
    await reader.cancel();
  }
  return Buffer.concat(chunks);
}

const text = (value) => (typeof value === 'string' ? value.trim() : '');

/** The dataset revision to read, once its card still says CC BY 4.0. */
export async function arenaRevision() {
  const meta = JSON.parse(
    (
      await download(
        `https://huggingface.co/api/datasets/${DATASET}?expand%5B%5D=cardData&expand%5B%5D=sha`,
        1_000_000,
      )
    ).toString('utf8'),
  );
  if (meta.cardData?.license !== 'cc-by-4.0')
    throw Error('Arena leaderboard licence changed; review before republishing');
  if (!/^[0-9a-f]{40}$/.test(meta.sha ?? '')) throw Error('Arena dataset revision missing');
  return meta.sha;
}

/**
 * One table of the dataset, such as `text_style_control` `latest`. Every row
 * must carry what the site shows; anything else means the format changed and
 * needs a look before it is published.
 */
export async function readTable(config, split, revision, maxBytes) {
  const bytes = await download(
    `https://huggingface.co/datasets/${DATASET}/resolve/${revision}/${config}/${split}-00000-of-00001.parquet`,
    maxBytes,
  );
  const rows = await parquetReadObjects({
    file: bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
  });
  for (const row of rows) {
    if (
      !text(row.model_name) ||
      !text(row.category) ||
      !/^\d{4}-\d{2}-\d{2}$/.test(text(row.leaderboard_publish_date)) ||
      ![row.rating, row.rating_lower, row.rating_upper].every(Number.isFinite)
    )
      throw Error(`Unexpected ${config} ${split} row: ${JSON.stringify(row).slice(0, 200)}`);
  }
  return rows;
}
