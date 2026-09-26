import { describe, expect, it } from 'vitest';
import { fileURLToPath } from 'node:url';
import {
  HEIGHT,
  WIDTH,
  compareCard,
  comparisonCard,
  homeCard,
  modelCard,
  setup,
} from '../scripts/lib/og';

setup(fileURLToPath(new URL('../', import.meta.url)));

/** Width and height from a PNG's header, and whether it is one. */
function png(bytes: Uint8Array) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return {
    signature: String.fromCharCode(...bytes.subarray(1, 4)),
    width: view.getUint32(16),
    height: view.getUint32(20),
  };
}

describe('link previews', () => {
  const model = { name: 'GPT-6 Astra', maker: 'OpenAI', makerId: 'openai' };

  it('draws each card as a 1200 by 630 PNG, small enough for every platform', async () => {
    const cards = await Promise.all([
      modelCard(
        model,
        [
          { label: 'Capability index', value: '166.6', note: 'Epoch AI' },
          { label: 'Price per 1M tokens', value: null, note: 'No listed price' },
          { label: 'Context window', value: '1.1M', note: 'Tokens in one request' },
        ],
        'Data: Epoch AI (CC BY 4.0), models.dev (MIT).',
      ),
      comparisonCard(
        [model, { name: 'Unknown maker model', maker: '', makerId: 'unknown' }],
        [{ label: 'Capability index', values: ['166.6', null], best: [0] }],
        'Data: Epoch AI (CC BY 4.0), models.dev (MIT).',
      ),
      homeCard(1938, [{ name: 'GPT-6 Astra', makerId: 'openai', value: '166.6' }], 'Data: X.'),
      compareCard([{ names: ['A', 'B'], makerIds: ['openai', 'anthropic'] }]),
    ]);
    for (const card of cards) {
      expect(png(card)).toEqual({ signature: 'PNG', width: WIDTH, height: HEIGHT });
      expect(card.length).toBeLessThan(300_000);
    }
  });

  it('fits a very long model name instead of spilling off the card', async () => {
    const card = await modelCard(
      { ...model, name: 'An Extraordinarily Long Model Name 17B 128E Instruct FP8 Preview' },
      [],
      'Data: models.dev (MIT).',
    );
    expect(png(card).width).toBe(WIDTH);
  });
});
