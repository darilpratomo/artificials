import { useMemo, useState } from 'react';
import type { CodingTest } from '../../lib/overview';
import { ScatterChart } from '../charts/ScatterChart';
import { ShareButton } from '../charts/ShareButton';
import { Select } from '../Select';
import { compactUsd } from '../charts/scale';
import { percent } from './analysis';

const PRICE_AXIS = {
  kind: 'log' as const,
  label: 'Blended price per 1M tokens (USD, log scale)',
  format: compactUsd,
};

/** A coding test's score against each model's list price, with the best score at each price. */
export function CodingValue({
  tests,
  credits,
}: {
  tests: CodingTest[];
  credits: Record<string, string>;
}) {
  const [testId, setTestId] = useState(tests[0]?.id);
  const test = tests.find((entry) => entry.id === testId) ?? tests[0];
  const points = useMemo(
    () =>
      (test?.rows ?? [])
        .filter((row) => row.price !== undefined && row.price > 0)
        .map((row) => ({
          key: `${row.name}|${row.configuration}`,
          name: row.name,
          makerId: row.makerId,
          maker: row.maker,
          x: row.price!,
          y: row.score,
          href: row.slug ? `/models/${row.slug}` : undefined,
        })),
    [test],
  );
  if (!test) return null;
  const y = { label: `${test.label} (%)`, format: (value: number) => `${Math.round(value)}%` };
  const credit = `${credits[test.sourceId] ?? 'published results'} and models.dev (MIT)`;
  const title = `${test.label} against price`;
  return (
    <div className="dash-panel">
      <div className="dash-panel-head">
        <div>
          <h3>{title}</h3>
          <p>
            Up and to the left is better value: a higher score for a lower list price. The line
            joins the models no cheaper model beats.
          </p>
        </div>
        <div className="dash-controls">
          <Select
            value={test.id}
            onValueChange={setTestId}
            aria-label="Choose a coding test to compare with price"
          >
            {tests.map((entry) => (
              <option key={entry.id} value={entry.id}>
                {entry.label}
              </option>
            ))}
          </Select>
          <ShareButton
            title={title}
            render={(tools) =>
              tools.scatterImage(
                {
                  title,
                  subtitle:
                    'Score against blended list price per 1M tokens (three input to one output).',
                  source: credit,
                },
                points.map((point) => ({
                  name: point.name,
                  makerId: point.makerId,
                  maker: point.maker,
                  x: point.x,
                  y: point.y,
                })),
                PRICE_AXIS,
                { label: y.label, format: percent },
                { frontier: 'cheapest', quadrant: true },
              )
            }
          />
        </div>
      </div>
      <ScatterChart
        points={points}
        x={PRICE_AXIS}
        y={y}
        frontier={{ kind: 'cheapest', label: 'Best score at each price' }}
        quadrant="Above-median score, below-median price"
        label={`${test.label} against blended price, ${points.length} models`}
      />
      <div className="dash-foot">
        <p>
          Price is the model’s list price per 1M tokens, blending three input tokens with one output
          token. It is not the cost of a task: an agent can use many tokens on one task. Scores from{' '}
          {credit}.
        </p>
      </div>
    </div>
  );
}
