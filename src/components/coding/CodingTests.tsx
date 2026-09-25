import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import type { CodingTest } from '../../lib/overview';
import { RankChart, type RankItem } from '../charts/RankChart';
import { ShareButton } from '../charts/ShareButton';
import { Select } from '../Select';
import { day, indexValue, price } from '../profile/format';
import { percent } from './analysis';

const SHOWN = 20;

/** Models ranked on one coding test at a time; different tests are never mixed. */
export function CodingTests({
  tests,
  credits,
}: {
  tests: CodingTest[];
  /** Data credit per source id, such as "LiveBench (Apache-2.0)". */
  credits: Record<string, string>;
}) {
  const [testId, setTestId] = useState(tests[0]?.id);
  const test = tests.find((entry) => entry.id === testId) ?? tests[0];
  if (!test) return null;
  // Open-ended scores, such as Arena's, are drawn and written as ratings.
  const unit = test.unit;
  const format = unit === 'index' ? indexValue : percent;
  const items: RankItem[] = test.rows.slice(0, SHOWN).map((row, index) => ({
    key: `${row.name}|${row.configuration}`,
    name: row.name,
    makerId: row.makerId,
    maker: row.maker,
    value: row.score,
    rank: index + 1,
    href: row.slug ? `/models/${row.slug}` : undefined,
    details: [
      row.stderr !== undefined ? `Standard error ±${row.stderr.toFixed(1)}` : '',
      row.ciLow !== undefined && row.ciHigh !== undefined
        ? `95% range ${indexValue(row.ciLow)} to ${indexValue(row.ciHigh)}`
        : '',
      row.releasedAt ? `Released ${day(row.releasedAt)}` : '',
      row.price !== undefined ? `${price(row.price)} per 1M tokens, blended` : '',
    ].filter(Boolean),
  }));
  const credit = credits[test.sourceId] ?? 'published results';
  const title = `${test.label}: top ${items.length} models`;
  return (
    <div className="dash-panel">
      <div className="dash-panel-head">
        <div>
          <h3>{test.label}</h3>
          <p>{test.description}</p>
        </div>
        <div className="dash-controls">
          <Select
            value={test.id}
            onValueChange={setTestId}
            aria-label="Choose a coding test to rank"
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
              tools.rankImage(
                { title, subtitle: test.description, source: credit },
                items.map((item) => ({
                  name: item.name,
                  makerId: item.makerId,
                  value: item.value,
                })),
                unit,
                format,
              )
            }
          />
        </div>
      </div>
      <RankChart
        items={items}
        unit={unit}
        format={format}
        label={`${test.label}, top ${items.length} models, highest first`}
      />
      <div className="dash-foot">
        <p>
          Each model shows its best tested configuration. A test runs every model the same way, so
          these charts compare models, not agents. Results published by {credit}.
        </p>
        <Link className="text-link" to={`/leaderboard?category=${test.id}`}>
          All {test.rows.length} results <ArrowUpRight size={15} aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}
