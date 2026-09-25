import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { TaskUsage } from '../../../shared/benchmarks';
import type { CodingTest } from '../../lib/overview';
import { ScatterChart } from '../charts/ScatterChart';
import { ShareButton } from '../charts/ShareButton';
import { compactUsd } from '../charts/scale';
import { Select } from '../Select';
import { percent } from './analysis';

const COST_AXIS = {
  kind: 'log' as const,
  label: 'Average cost per task (USD, log scale)',
  format: compactUsd,
};
/** Usage columns, in order, with the label each source's measure deserves. */
const COLUMNS: [keyof TaskUsage, string][] = [
  ['tokens', 'Tokens per task'],
  ['outputTokens', 'Output tokens per task'],
  ['steps', 'Agent steps per task'],
  ['calls', 'Model calls per task'],
];
const whole = (value: number) =>
  value >= 1000 ? `${Number((value / 1000).toFixed(value >= 100000 ? 0 : 1))}K` : `${value}`;
const dollars = (value: number) =>
  value >= 1 ? `$${value.toFixed(2)}` : `$${Number(value.toPrecision(2))}`;

/**
 * Score against what a task cost, for the agent tests whose publishers measure
 * cost, tokens and steps. Each test's figures stay on its own chart.
 */
export function TaskCost({
  tests,
  credits,
}: {
  tests: CodingTest[];
  credits: Record<string, string>;
}) {
  const measured = tests.filter(
    (test) => test.rows.filter((row) => row.usage?.cost !== undefined).length >= 5,
  );
  const [testId, setTestId] = useState(measured[0]?.id);
  const test = measured.find((entry) => entry.id === testId) ?? measured[0];
  const rows = useMemo(
    () => (test?.rows ?? []).filter((row) => row.usage?.cost !== undefined),
    [test],
  );
  if (!test) return null;
  const columns = COLUMNS.filter(([key]) => rows.some((row) => row.usage?.[key] !== undefined));
  const points = rows.map((row) => ({
    key: `${row.name}|${row.configuration}`,
    name: row.name,
    makerId: row.makerId,
    maker: row.maker,
    x: row.usage!.cost!,
    y: row.score,
    href: row.slug ? `/models/${row.slug}` : undefined,
  }));
  const y = { label: `${test.label} (%)`, format: (value: number) => `${Math.round(value)}%` };
  const credit = credits[test.sourceId] ?? 'published results';
  const title = `${test.label}: score against cost per task`;
  const table = rows.slice(0, 12);
  return (
    <div className="dash-panel">
      <div className="dash-panel-head">
        <div>
          <h3>{title}</h3>
          <p>
            What one task cost on average, against the share of tasks solved. Up and to the left is
            better value; the line joins the models no cheaper run beats.
          </p>
        </div>
        <div className="dash-controls">
          <Select
            value={test.id}
            onValueChange={setTestId}
            aria-label="Choose a test with task costs"
          >
            {measured.map((entry) => (
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
                  subtitle: 'Average API cost per task against the share of tasks solved.',
                  source: credit,
                },
                points.map((point) => ({
                  name: point.name,
                  makerId: point.makerId,
                  maker: point.maker,
                  x: point.x,
                  y: point.y,
                })),
                COST_AXIS,
                { label: y.label, format: percent },
                { frontier: 'cheapest', quadrant: true },
              )
            }
          />
        </div>
      </div>
      <ScatterChart
        points={points}
        x={COST_AXIS}
        y={y}
        frontier={{ kind: 'cheapest', label: 'Best score at each cost' }}
        quadrant="Above-median score, below-median cost"
        label={`${test.label}: score against average cost per task, ${points.length} models`}
      />
      <div className="chart-table-wrap task-cost-table">
        <table className="chart-table">
          <caption className="sr-only">{`${test.label}: the ${table.length} highest scores with their cost per task`}</caption>
          <thead>
            <tr>
              <th scope="col">Model</th>
              <th scope="col">Score</th>
              <th scope="col">Cost per task</th>
              {columns.map(([key, label]) => (
                <th key={key} scope="col">
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.map((row) => (
              <tr key={`${row.name}|${row.configuration}`}>
                <th scope="row">
                  {row.slug ? <Link to={`/models/${row.slug}`}>{row.name}</Link> : row.name}
                </th>
                <td>{percent(row.score)}</td>
                <td>{dollars(row.usage!.cost!)}</td>
                {columns.map(([key]) => (
                  <td key={key}>{row.usage?.[key] !== undefined ? whole(row.usage[key]!) : '—'}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="dash-foot">
        <p>
          Measured and published by {credit}. Cost is the API cost of the tokens a run used, at list
          prices. Tasks and agents differ between tests, so compare costs within one test only.
        </p>
      </div>
    </div>
  );
}
