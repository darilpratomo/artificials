import type { ReactNode, CSSProperties } from 'react';
import { ArrowUpRight } from 'lucide-react';
import type { ModelRecord } from '../../lib/catalog';
import { blendedPrice, type ModelProfile, type ProfileCategory } from '../../lib/profiles';
import {
  DOMAINS,
  day,
  modalityList,
  price as cents,
  score,
  tokens,
  whole,
} from '../profile/format';
import { flop } from '../profile/Standing';
import { countryOf } from '../../../shared/trends';

/** One cell: its text, an optional second line, and the number rows compare. */
export interface Cell {
  text: string;
  detail?: string;
  value?: number;
}
export interface Line {
  label: string;
  cells: Cell[];
  /** Which way is better, so the best value in the row can be marked. */
  better?: 'higher' | 'lower';
}
export type Section = [title: string, lines: Line[]];

/** One compared listing: the saved record, and its model's profile once loaded. */
export interface Entry {
  record: ModelRecord;
  /** Undefined while loading; null when no profile groups this model. */
  profile: ModelProfile | null | undefined;
}

const LOADING = 'Loading…';
const DOMAIN_ORDER = Object.keys(DOMAINS);

function yesNo(value: boolean | undefined, yes = 'Yes', no = 'No') {
  return value === undefined ? 'Not reported' : value ? yes : no;
}

/** A list price with cents: $0.50, $0.435, $15.00. */
const usd = (value: number) => (value === 0 ? 'Free' : cents(value));
const listed = (value: number | null | undefined) =>
  value === null || value === undefined ? 'Not reported' : usd(value);

/**
 * Cells that mark the best value: only when two or more models report one and
 * they differ. Values that read the same, such as two "1M tokens", share it.
 */
function bestOf(line: Line) {
  if (!line.better) return [];
  const known = line.cells.filter((cell) => cell.value !== undefined);
  if (known.length < 2 || known.every((cell) => cell.text === known[0].text)) return [];
  const values = known.map((cell) => cell.value!);
  const best = line.better === 'higher' ? Math.max(...values) : Math.min(...values);
  const shown = known.find((cell) => cell.value === best)!.text;
  return line.cells.flatMap((cell, index) =>
    cell.value !== undefined && cell.text === shown ? [index] : [],
  );
}

/** Everything the listings, the catalog and the published tests say, grouped for scanning. */
export function sections(entries: Entry[]): Section[] {
  // The host's listing as the latest catalog reports it; the saved copy fills
  // in only when the model has no profile.
  const hosts = entries.map(({ record, profile }) => {
    const offer = profile?.offerings.find((entry) => entry.id === record.id);
    const listing = offer ?? record;
    return {
      inputPrice: listing.inputPrice,
      outputPrice: listing.outputPrice,
      cacheReadPrice: listing.cacheReadPrice,
      cacheWritePrice: listing.cacheWritePrice,
      reasoningPrice: listing.reasoningPrice,
      audioInputPrice: listing.audioInputPrice,
      audioOutputPrice: listing.audioOutputPrice,
      longContext: listing.longContextPricing?.[0],
      contextWindow: listing.contextWindow,
      maxOutput: listing.maxOutput ?? profile?.maxOutput ?? undefined,
      toolCall: listing.toolCall ?? profile?.toolCall,
      structuredOutput: listing.structuredOutput ?? profile?.structuredOutput,
    };
  });
  type Host = (typeof hosts)[number];
  const text = (value: string, detail?: string): Cell => ({ text: value, detail });
  const line = (
    label: string,
    read: (entry: Entry, index: number) => Cell,
    better?: Line['better'],
  ): Line => ({ label, cells: entries.map(read), better });
  /** Reads the profile, or says it is loading or missing. */
  const profiled = (entry: Entry, read: (profile: ModelProfile) => Cell): Cell =>
    entry.profile === undefined
      ? text(LOADING)
      : entry.profile
        ? read(entry.profile)
        : text('Not reported');
  const reported = (read: (host: Host) => unknown) =>
    hosts.some((host) => read(host) !== undefined && read(host) !== null);
  const amount = (value: number | null | undefined, format: (value: number) => string): Cell =>
    value === null || value === undefined ? text('Not reported') : { text: format(value), value };

  const model: Line[] = [
    line('Maker', (entry) => profiled(entry, (profile) => text(profile.maker || 'Not reported'))),
    line('Sold here by', (entry) => text(entry.record.provider)),
    line('API model ID', (entry) => text(entry.record.modelId)),
    line('Released', (entry) => text(day(entry.profile?.releaseDate ?? entry.record.releaseDate))),
    line('Knowledge cutoff', (entry) =>
      profiled(entry, (profile) => text(day(profile.knowledge ?? entry.record.knowledge))),
    ),
    line('Weights', (entry) =>
      text(
        (entry.profile?.openWeights ?? entry.record.openWeights)
          ? 'Open: downloadable'
          : 'Closed: hosted access only',
      ),
    ),
    line('Developer’s country', (entry) =>
      profiled(entry, (profile) => text(countryOf(profile.facts?.country) ?? 'Not reported')),
    ),
    line('Hosts selling it', (entry) =>
      profiled(entry, (profile) =>
        text(
          whole(profile.offerings.length),
          profile.official ? `including ${profile.maker} directly` : undefined,
        ),
      ),
    ),
    ...(entries.some((entry) => entry.profile?.facts?.trainingCompute)
      ? [
          line('Training compute', (entry) =>
            profiled(entry, (profile) =>
              profile.facts?.trainingCompute
                ? text(flop(profile.facts.trainingCompute), 'Epoch AI estimate')
                : text('Not published'),
            ),
          ),
        ]
      : []),
  ];

  // Every test any of the models has a result on: the capability index first,
  // then grouped by skill area.
  const categories = new Map<string, ProfileCategory>();
  for (const entry of entries)
    for (const category of entry.profile?.categories ?? [])
      if (!categories.has(category.id)) categories.set(category.id, category);
  const tests: Line[] = [...categories.values()]
    .sort(
      (a, b) =>
        Number(b.id === 'capability-index') - Number(a.id === 'capability-index') ||
        DOMAIN_ORDER.indexOf(a.domain) - DOMAIN_ORDER.indexOf(b.domain),
    )
    .map((category) =>
      line(
        category.label,
        (entry) =>
          profiled(entry, (profile) => {
            const result = profile.results.find((entry) => entry.category === category.id);
            return result
              ? {
                  text: score(result.score, category.unit),
                  detail: `#${whole(result.rank)} of ${whole(result.total)}`,
                  value: result.score,
                }
              : text('Not tested');
          }),
        'higher',
      ),
    );

  const price = (label: string, read: (host: Host) => number | null | undefined) =>
    line(label, (_, index) => amount(read(hosts[index]), usd), 'lower');
  const prices: Line[] = [
    price('Input', (host) => host.inputPrice),
    price('Output', (host) => host.outputPrice),
    price('Blended, 3 input to 1 output', (host) =>
      blendedPrice(host.inputPrice, host.outputPrice),
    ),
    ...(reported((host) => host.cacheReadPrice)
      ? [price('Cached input', (host) => host.cacheReadPrice)]
      : []),
    ...(reported((host) => host.cacheWritePrice)
      ? [price('Writing to the cache', (host) => host.cacheWritePrice)]
      : []),
    ...(reported((host) => host.reasoningPrice)
      ? [price('Reasoning tokens', (host) => host.reasoningPrice)]
      : []),
    ...(reported((host) => host.audioInputPrice)
      ? [price('Audio input', (host) => host.audioInputPrice)]
      : []),
    ...(reported((host) => host.audioOutputPrice)
      ? [price('Audio output', (host) => host.audioOutputPrice)]
      : []),
    ...(reported((host) => host.longContext)
      ? [
          line('Long requests', (_, index) => {
            const long = hosts[index].longContext;
            return long
              ? text(
                  `${listed(long.input)} in, ${listed(long.output)} out`,
                  `above ${tokens(long.threshold)} tokens`,
                )
              : text('No separate price reported');
          }),
        ]
      : []),
    ...(entries.some((entry) => entry.profile?.official)
      ? [
          line('The maker’s own price', (entry) =>
            profiled(entry, (profile) => {
              const official = profile.offerings.find((offer) => offer.id === profile.official);
              if (!official) return text('Not sold directly');
              if (official.id === entry.record.id) return text('This listing');
              return text(`${listed(official.inputPrice)} in, ${listed(official.outputPrice)} out`);
            }),
          ),
        ]
      : []),
  ];

  const limits: Line[] = [
    line(
      'Context window',
      (_, index) => amount(hosts[index].contextWindow, (value) => `${tokens(value)} tokens`),
      'higher',
    ),
    ...(entries.some((entry) => entry.profile?.maxInput)
      ? [
          line(
            'Max input',
            (entry) =>
              profiled(entry, (profile) =>
                amount(profile.maxInput, (value) => `${tokens(value)} tokens`),
              ),
            'higher',
          ),
        ]
      : []),
    line(
      'Max output',
      (_, index) => amount(hosts[index].maxOutput, (value) => `${tokens(value)} tokens`),
      'higher',
    ),
  ];

  const features: Line[] = [
    line('Reads', (entry) =>
      text(
        modalityList(entry.profile?.inputModalities ?? entry.record.inputModalities ?? []) ||
          'Not reported',
      ),
    ),
    line('Produces', (entry) =>
      text(
        modalityList(entry.profile?.outputModalities ?? entry.record.outputModalities ?? []) ||
          'Not reported',
      ),
    ),
    line('Reasoning', (entry) => {
      const profile = entry.profile;
      if (!(profile?.reasoning ?? entry.record.reasoning)) return text('No');
      const notes = [
        profile?.reasoningEfforts?.length ? `effort ${profile.reasoningEfforts.join(', ')}` : '',
        profile?.reasoningToggle ? 'can be switched off' : '',
        profile?.reasoningBudget ? 'thinking budget can be set' : '',
      ].filter(Boolean);
      return text('Yes', notes.join('; ') || undefined);
    }),
    line('Tool calling', (_, index) => text(yesNo(hosts[index].toolCall))),
    line('Structured output', (_, index) =>
      text(yesNo(hosts[index].structuredOutput, 'Yes, such as JSON')),
    ),
    line('File attachments', (entry) =>
      text(yesNo(entry.profile?.attachment ?? entry.record.attachment)),
    ),
    line('Temperature setting', (entry) =>
      profiled(entry, (profile) =>
        text(yesNo(profile.temperature, 'Supported', 'Fixed by the provider')),
      ),
    ),
  ];

  return [
    ['Model', model],
    [
      'Test results',
      tests.length
        ? tests
        : [line('Published tests', (entry) => profiled(entry, () => text('Not tested yet')))],
    ],
    ['Price per million tokens', prices],
    ['Limits', limits],
    ['Features', features],
  ];
}

/**
 * The comparison table. On wide screens a row label sits beside the values; on
 * phones it spans the row above them, so the table never scrolls sideways.
 * Roles are set explicitly because the phone layout changes how rows display.
 */
export function ComparisonTable({
  caption,
  entries,
  heads,
  trailing,
  sourceLinks,
}: {
  caption: string;
  entries: Entry[];
  /** One header cell's content per model. */
  heads: ReactNode[];
  /** An extra column on wide screens, such as a slot for another model. */
  trailing?: { head: ReactNode; cell: ReactNode };
  /** Where each listing's data can be checked, as a last row. */
  sourceLinks?: string[];
}) {
  const groups = sections(entries);
  const columns = entries.length + 1 + (trailing ? 1 : 0);
  return (
    <div className="comparison-scroll">
      <table
        className="comparison-table"
        role="table"
        style={{ '--models': entries.length } as CSSProperties}
      >
        <caption className="sr-only">{caption}</caption>
        <thead role="rowgroup">
          <tr role="row">
            <th scope="col" role="columnheader">
              <span className="sr-only">Measure</span>
            </th>
            {heads.map((head, index) => (
              <th scope="col" role="columnheader" key={entries[index].record.id}>
                {head}
              </th>
            ))}
            {trailing && (
              <th scope="col" role="columnheader" className="is-extra">
                {trailing.head}
              </th>
            )}
          </tr>
        </thead>
        {groups.map(([title, lines]) => (
          <tbody role="rowgroup" key={title}>
            <tr className="comparison-section" role="row">
              <th scope="rowgroup" role="rowheader" colSpan={columns}>
                <span>{title}</span>
              </th>
            </tr>
            {lines.map((row) => {
              const best = bestOf(row);
              return (
                <tr key={row.label} role="row">
                  <th scope="row" role="rowheader">
                    {row.label}
                  </th>
                  {row.cells.map((cell, index) => (
                    <td
                      role="cell"
                      key={entries[index].record.id}
                      className={best.includes(index) ? 'is-best' : undefined}
                    >
                      {cell.text}
                      {best.includes(index) && (
                        <span className="sr-only"> (best of these models)</span>
                      )}
                      {cell.detail && <small>{cell.detail}</small>}
                    </td>
                  ))}
                  {trailing && (
                    <td role="cell" className="is-extra">
                      {trailing.cell}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        ))}
        {sourceLinks && (
          <tbody role="rowgroup">
            <tr role="row">
              <th scope="row" role="rowheader">
                Verify the source
              </th>
              {sourceLinks.map((href, index) => (
                <td role="cell" key={entries[index].record.id}>
                  <a className="text-link" href={href} rel="noopener noreferrer" target="_blank">
                    Source data <ArrowUpRight size={13} aria-hidden="true" />
                  </a>
                </td>
              ))}
              {trailing && (
                <td role="cell" className="is-extra">
                  {trailing.cell}
                </td>
              )}
            </tr>
          </tbody>
        )}
      </table>
    </div>
  );
}
