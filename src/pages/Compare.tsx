import { Link } from 'react-router-dom';
import { Plus, X, ArrowUpRight, GitCompareArrows } from 'lucide-react';
import { PageHeading } from '../components/Layout';
import { useComparison, providerLogo, type ModelRecord } from '../lib/catalog';
import {
  blendedPrice,
  modelSlug,
  useProfiles,
  type ModelProfile,
  type ProfileCategory,
} from '../lib/profiles';
import {
  DOMAINS,
  day,
  modalityList,
  price as cents,
  score,
  tokens,
  whole,
} from '../components/profile/format';
import { flop } from '../components/profile/Standing';
import { countryOf } from '../../shared/trends';
import './compare.css';

/** One cell: its text, an optional second line, and the number rows compare. */
interface Cell {
  text: string;
  detail?: string;
  value?: number;
}
interface Line {
  label: string;
  cells: Cell[];
  /** Which way is better, so the best value in the row can be marked. */
  better?: 'higher' | 'lower';
}
type Section = [title: string, lines: Line[]];

/** One compared listing: the saved record, and its model's profile once loaded. */
interface Entry {
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
function sections(entries: Entry[]): Section[] {
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

export default function Compare() {
  const { models, toggle, clear } = useComparison();
  const { profiles, sources } = useProfiles(models.map((m) => modelSlug(m.modelId)));
  const entries: Entry[] = models.map((record) => ({
    record,
    profile: profiles[modelSlug(record.modelId)],
  }));
  const groups = sections(entries);
  const columns = models.length + (models.length < 3 ? 2 : 1);
  // Credit only the tests that appear in the table.
  const tested = new Set(
    entries.flatMap(
      (entry) => entry.profile?.categories.map((category) => category.sourceId) ?? [],
    ),
  );
  const credited = sources.filter((source) => tested.has(source.id));
  return (
    <div className="container page comparison-page">
      <PageHeading
        eyebrow="SEE THE DIFFERENCE"
        title="Side by side. Beyond the hype."
        text="Pick up to three model offerings. Compare their test results, prices, limits and features, row by row."
      />
      {models.length ? (
        <>
          <div className="comparison-toolbar">
            <span>
              <GitCompareArrows size={16} /> {models.length} of 3 slots used
            </span>
            <button className="text-link" onClick={clear}>
              Clear comparison
            </button>
          </div>
          <div className="comparison-scroll">
            <table className="comparison-table">
              <caption className="sr-only">Comparison of selected AI model offerings</caption>
              <thead>
                <tr>
                  <th scope="col">Your shortlist</th>
                  {models.map((m) => (
                    <th scope="col" key={m.id}>
                      <button
                        className="remove-model icon-btn"
                        aria-label={`Remove ${m.name}`}
                        onClick={() => toggle(m)}
                      >
                        <X size={14} />
                      </button>
                      <img
                        className="provider-mark"
                        src={providerLogo(m.providerId)}
                        width="35"
                        height="35"
                        alt=""
                      />
                      <h2>
                        <Link className="model-card-link" to={`/models/${modelSlug(m.modelId)}`}>
                          {m.name}
                        </Link>
                      </h2>
                      <span>{m.provider}</span>
                    </th>
                  ))}
                  {models.length < 3 && (
                    <th scope="col">
                      <Link className="add-model" to="/models">
                        <Plus size={24} />
                        Add a model
                      </Link>
                    </th>
                  )}
                </tr>
              </thead>
              {groups.map(([title, lines]) => (
                <tbody key={title}>
                  <tr className="comparison-section">
                    <th scope="rowgroup" colSpan={columns}>
                      <span>{title}</span>
                    </th>
                  </tr>
                  {lines.map((row) => {
                    const best = bestOf(row);
                    return (
                      <tr key={row.label}>
                        <th scope="row">{row.label}</th>
                        {row.cells.map((cell, index) => (
                          <td
                            key={models[index].id}
                            className={best.includes(index) ? 'is-best' : undefined}
                          >
                            {cell.text}
                            {best.includes(index) && (
                              <span className="sr-only"> (best of these models)</span>
                            )}
                            {cell.detail && <small>{cell.detail}</small>}
                          </td>
                        ))}
                        {models.length < 3 && <td aria-label="No model selected">—</td>}
                      </tr>
                    );
                  })}
                </tbody>
              ))}
              <tbody>
                <tr>
                  <th scope="row">Verify the source</th>
                  {models.map((m) => (
                    <td key={m.id}>
                      <a
                        className="text-link"
                        href={/^https:\/\//.test(m.sourceUrl) ? m.sourceUrl : 'https://models.dev'}
                        rel="noopener noreferrer"
                        target="_blank"
                      >
                        Source data <ArrowUpRight size={13} />
                      </a>
                    </td>
                  ))}
                  {models.length < 3 && <td>—</td>}
                </tr>
              </tbody>
            </table>
          </div>
          <p className="data-footnote">
            Your shortlist is stored on this device. Bold marks the best value among these models in
            each row; a larger context window is not a higher intelligence score. Test results as
            published by{' '}
            {credited.length
              ? credited.map((source, index) => (
                  <span key={source.id}>
                    {index ? ', ' : ''}
                    <a href={source.url} target="_blank" rel="noopener noreferrer">
                      {source.name}
                    </a>{' '}
                    ({source.license})
                  </span>
                ))
              : 'their test makers'}
            ; model details and prices from{' '}
            <a href="https://models.dev" target="_blank" rel="noopener noreferrer">
              models.dev
            </a>{' '}
            (MIT). Confirm pricing with the provider before use.
          </p>
        </>
      ) : (
        <div className="compare-empty">
          <div className="compare-empty-slots">
            {[1, 2, 3].map((i) => (
              <Link key={i} to="/models" aria-label={`Select model ${i}`}>
                <span className="mono">MODEL / 0{i}</span>
                <Plus size={28} strokeWidth={1} />
                <span>Select a model</span>
              </Link>
            ))}
          </div>
          <h2>Make room for a clearer decision.</h2>
          <p>Add models from the directory to start your comparison.</p>
          <Link className="btn" to="/models">
            Explore models <ArrowUpRight size={16} />
          </Link>
        </div>
      )}
    </div>
  );
}
