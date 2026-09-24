import { describe, expect, it } from 'vitest';
import { fileName } from '../src/components/charts/share-image';

describe('share image names', () => {
  it('turns a chart title into a safe, branded file name', () => {
    expect(fileName('Epoch Capabilities Index: top 25 models')).toBe(
      'artificials-epoch-capabilities-index-top-25-models.png',
    );
    expect(fileName('GPT-6 Astra (max) vs. price / 1M tokens')).toBe(
      'artificials-gpt-6-astra-max-vs-price-1m-tokens.png',
    );
    expect(fileName('   ')).toBe('artificials-chart.png');
    expect(fileName('../../etc/passwd')).toBe('artificials-etc-passwd.png');
  });
});
