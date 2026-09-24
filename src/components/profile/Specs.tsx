import { isNoChargeOffer, isPaidOffer, type ModelProfile } from '../../lib/profiles';
import { ShareButton } from '../charts/ShareButton';
import { day, modalityList, money, tokens, whole } from './format';

type Row = [label: string, value: string];

function yesNo(value: boolean | undefined, yes: string, no: string) {
  return value === undefined ? 'Not reported' : value ? yes : no;
}

/** Everything the listings report about the model, grouped for scanning. */
export function specGroups(profile: ModelProfile): [string, Row[]][] {
  const official = profile.offerings.find((offer) => offer.id === profile.official);
  const paid = profile.offerings.filter(isPaidOffer);
  const lowest = paid[0];
  const highest = paid.at(-1);
  const ids = [
    ...new Set(profile.offerings.map((offer) => offer.id.slice(offer.providerId.length + 1))),
  ];
  const contexts = profile.offerings
    .map((offer) => offer.contextWindow)
    .filter((value): value is number => value !== null);
  const free = profile.offerings.filter(isNoChargeOffer).length;
  const longContext = (official ?? lowest)?.longContextPricing?.[0];
  const reasoning = profile.reasoning
    ? [
        'Yes',
        profile.reasoningEfforts?.length ? `effort ${profile.reasoningEfforts.join(', ')}` : '',
        profile.reasoningToggle ? 'can be switched off' : '',
        profile.reasoningBudget ? 'thinking budget can be set' : '',
      ]
        .filter(Boolean)
        .join('; ')
    : 'No';

  const identity: Row[] = [
    ['Maker', profile.maker || 'Not reported'],
    [
      'API model ID',
      official ? official.id.slice(official.providerId.length + 1) : (ids[0] ?? 'Not reported'),
    ],
    ...(ids.length > 1 ? [['IDs across hosts', `${whole(ids.length)} different IDs`] as Row] : []),
    ...(profile.family ? [['Family', profile.family] as Row] : []),
    ['Released', day(profile.releaseDate)],
    ...(profile.lastUpdated ? [['Listing last updated', day(profile.lastUpdated)] as Row] : []),
    ['Knowledge cutoff', profile.knowledge ? day(profile.knowledge) : 'Not reported'],
    ['Weights', profile.openWeights ? 'Open: downloadable' : 'Closed: hosted access only'],
  ];
  const limits: Row[] = [
    [
      'Context window',
      profile.contextVaries && contexts.length
        ? `${tokens(profile.contextWindow)} (hosts list ${tokens(Math.min(...contexts))} to ${tokens(Math.max(...contexts))})`
        : `${tokens(profile.contextWindow)} tokens`,
    ],
    ...(profile.maxInput ? [['Max input', `${tokens(profile.maxInput)} tokens`] as Row] : []),
    ['Max output', profile.maxOutput ? `${tokens(profile.maxOutput)} tokens` : 'Not reported'],
  ];
  const capabilities: Row[] = [
    ['Reads', modalityList(profile.inputModalities) || 'Not reported'],
    ['Produces', modalityList(profile.outputModalities) || 'Not reported'],
    ['Reasoning', reasoning],
    ['Tool calling', yesNo(profile.toolCall, 'Yes', 'No')],
    ['Structured output', yesNo(profile.structuredOutput, 'Yes, such as JSON', 'No')],
    ['File attachments', yesNo(profile.attachment, 'Yes', 'No')],
    ['Temperature setting', yesNo(profile.temperature, 'Supported', 'Fixed by the provider')],
  ];
  const pair = (input: number | null, output: number | null) =>
    `${money(input)} in, ${money(output)} out`;
  const pricing: Row[] = [
    ...(official && isPaidOffer(official)
      ? [[`${profile.maker}'s price`, pair(official.inputPrice, official.outputPrice)] as Row]
      : []),
    ...(lowest
      ? [
          [
            `Lowest listed`,
            `${pair(lowest.inputPrice, lowest.outputPrice)} (${lowest.provider})`,
          ] as Row,
        ]
      : []),
    ...(highest && highest !== lowest
      ? [
          [
            `Highest listed`,
            `${pair(highest.inputPrice, highest.outputPrice)} (${highest.provider})`,
          ] as Row,
        ]
      : []),
    ...((official ?? lowest)?.cacheReadPrice !== undefined
      ? [
          [
            'Cached input',
            `${money((official ?? lowest)!.cacheReadPrice)} to read${
              (official ?? lowest)!.cacheWritePrice !== undefined
                ? `, ${money((official ?? lowest)!.cacheWritePrice)} to write`
                : ''
            }`,
          ] as Row,
        ]
      : []),
    ...((official ?? lowest)?.reasoningPrice !== undefined
      ? [['Reasoning tokens', money((official ?? lowest)!.reasoningPrice)] as Row]
      : []),
    ...((official ?? lowest)?.audioInputPrice !== undefined
      ? [
          [
            'Audio',
            `${money((official ?? lowest)!.audioInputPrice)} in${
              (official ?? lowest)!.audioOutputPrice !== undefined
                ? `, ${money((official ?? lowest)!.audioOutputPrice)} out`
                : ''
            }`,
          ] as Row,
        ]
      : []),
    ...(longContext
      ? [
          [
            `Above ${tokens(longContext.threshold)} tokens`,
            pair(longContext.input, longContext.output),
          ] as Row,
        ]
      : []),
    ...(free
      ? [['Free tiers or plans', `${free} ${free === 1 ? 'listing' : 'listings'}`] as Row]
      : []),
  ];
  const availability: Row[] = [
    [
      'Hosts',
      `${whole(profile.offerings.length)}${profile.official ? `, including ${profile.maker} directly` : ''}`,
    ],
    [
      'Tests covering it',
      profile.categories.length ? whole(profile.categories.length) : 'None yet',
    ],
  ];
  return [
    ['Identity', identity],
    ['Limits', limits],
    ['Capabilities', capabilities],
    ['Pricing per 1M tokens', pricing.length ? pricing : [['List price', 'Not listed']]],
    ['Availability', availability],
  ];
}

export function Specs({ profile }: { profile: ModelProfile }) {
  const groups = specGroups(profile);
  return (
    <section className="profile-card" aria-labelledby="specs-heading">
      <div className="profile-card-head has-action">
        <div>
          <h2 id="specs-heading">Specifications</h2>
          <p>Everything the listings report about {profile.name}, in one place.</p>
        </div>
        <ShareButton
          title={`${profile.name} specifications`}
          render={(tools) =>
            tools.listImage(
              {
                title: `${profile.name} specifications`,
                subtitle: 'As listed by the maker and hosts.',
                source: 'models.dev (MIT)',
              },
              groups
                .flatMap(([, rows]) => rows)
                .filter(([, value]) => value !== 'Not reported')
                .slice(0, 16)
                .map(([label, value]) => ({ label, value })),
            )
          }
        />
      </div>
      <div className="spec-groups">
        {groups.map(([title, rows]) => (
          <div key={title} className="spec-group">
            <h3>{title}</h3>
            <dl>
              {rows.map(([label, value]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
          </div>
        ))}
      </div>
    </section>
  );
}
