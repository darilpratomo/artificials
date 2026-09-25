import type { Coding } from '../../lib/overview';
import { MetricBars } from '../charts/MetricBars';

/** 90 → "1h 30m"; 1044.8 → "17h 25m"; 12.4 → "12 min". */
export function duration(minutes: number) {
  const total = Math.max(1, Math.round(minutes));
  if (total < 60) return `${total} min`;
  const hours = Math.floor(total / 60);
  const rest = total % 60;
  return rest ? `${hours}h ${rest}m` : `${hours}h`;
}

/** METR's time horizons: how long a task each model completes half the time. */
export function TimeHorizons({ horizons }: { horizons: NonNullable<Coding['timeHorizons']> }) {
  const rows = horizons.results.slice(0, 15);
  const top = rows[0];
  const source = horizons.source;
  const credit = `${source.name} (${source.compiledBy ? `compiled by ${source.compiledBy.name}, ${source.compiledBy.license}` : source.license})`;
  return (
    <div className="dash-panel">
      <MetricBars
        title="Task length completed half the time"
        caption="How long the task takes a skilled person. Longer is better. Log scale."
        rows={rows.map((row) => ({
          key: row.id,
          label: row.name,
          detail:
            row.low !== undefined && row.high !== undefined
              ? `95% interval ${duration(row.low)} to ${duration(row.high)}`
              : row.maker,
          makerId: row.makerId,
          value: row.minutes,
          ...(row.slug ? { href: `/models/${row.slug}` } : {}),
        }))}
        format={duration}
        scale="log"
        share={{
          title: 'How long a task AI models complete half the time',
          subtitle: `METR time horizons (${source.version}): task length in the time a skilled person needs.`,
          source: credit,
        }}
      />
      <div className="dash-foot">
        <p>
          METR times software tasks with skilled people, then finds the length of task each model
          completes half the time. The ranges are wide: for {top.name} the 95% interval runs from{' '}
          {top.low !== undefined ? duration(top.low) : 'not reported'} to{' '}
          {top.high !== undefined ? duration(top.high) : 'not reported'}
          {top.minutes80 !== undefined
            ? `, and the task length it completes four times out of five is ${duration(top.minutes80)}`
            : ''}
          . Only results from the latest method, {source.version}, are shown. Data: {credit}.
        </p>
      </div>
    </div>
  );
}
