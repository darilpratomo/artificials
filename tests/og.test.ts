import { describe, expect, it } from 'vitest';
import { fileURLToPath } from 'node:url';
import {
  HEIGHT,
  WIDTH,
  compareCard,
  comparisonCard,
  homeCard,
  makerCard,
  makersCard,
  modelCard,
  setup,
  testCard,
  testsCard,
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
      makerCard(
        { name: 'OpenAI', makerId: 'openai', line: '103 models, 52 tested' },
        [
          { label: 'Best on the capability index', value: '166.6', note: 'GPT-6 Astra, #1 of 268' },
          { label: 'Open weights', value: '4 of 103', note: 'Models you can download' },
          { label: 'Newest release', value: 'GPT-6 Luna', note: 'Sep 22, 2026' },
        ],
        'Data: Epoch AI (CC BY 4.0), models.dev (MIT).',
      ),
      makersCard(27, [{ name: 'OpenAI', makerId: 'openai', value: '166.6' }], 'Data: X.'),
      testCard(
        {
          label: 'GPQA Diamond',
          area: 'Reasoning',
          color: '#9085e9',
          line: 'Published by Epoch AI, 216 models',
          text: 'Graduate-level questions in biology, chemistry and physics.',
        },
        [{ name: 'GPT-6 Astra (max)', makerId: 'openai', value: '95.8%' }],
        'Data: Epoch AI (CC BY 4.0).',
      ),
      testsCard(28, [{ name: 'GPQA Diamond', makerId: 'openai', value: '95.8%' }], 'Data: X.'),
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

  it('wraps a long test name and cuts a long description instead of spilling', async () => {
    const card = await testCard(
      {
        label: 'An Unusually Long Benchmark Name With Several Qualifying Words, Tier Four',
        area: 'Agents',
        color: '#c98500',
        line: 'Published by a publisher with a very long name indeed, 1,234 models',
        text: 'A description long enough to need more than three lines on the card, so that the last line it keeps ends with an ellipsis rather than running into the footer or off the edge of the image.',
      },
      [],
      'Data: X.',
    );
    expect(png(card)).toEqual({ signature: 'PNG', width: WIDTH, height: HEIGHT });
  });
});
