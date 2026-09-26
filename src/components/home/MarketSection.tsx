import { Link } from 'react-router-dom';
import { makerLogo, makerColor } from '../../../shared/makers';
import type { ModelOverview } from '../../lib/overview';
import { ShareButton } from '../charts/ShareButton';
import { price } from '../profile/format';

const percent = (value: number) => `${Math.round(value * 100)}%`;

/** How the field looks as a whole: shares, prices, makers and availability. */
export function MarketSection({ overview }: { overview: ModelOverview }) {
  const { market } = overview;
  const topMaker = Math.max(1, ...market.makers.map((entry) => entry.models));
  const topHosts = Math.max(1, ...market.widest.map((entry) => entry.hosts));
  const stats: [string, string, string][] = [
    ['Open weights', percent(market.openWeights), 'can be downloaded and run locally'],
    ['Reasoning', percent(market.reasoning), 'think before they answer'],
    ['Reads images', percent(market.readsImages), 'accept images as input'],
    [
      'Median price',
      market.medianPrice === null ? '—' : price(market.medianPrice),
      'per 1M tokens, blended',
    ],
    ['1M+ context', market.millionContext.toLocaleString('en-US'), 'models take a million tokens'],
    ['Last 30 days', market.recent.toLocaleString('en-US'), 'new releases'],
  ];
  return (
    <div className="market">
      <ul className="market-stats" aria-label={`Across ${market.base} models from known makers`}>
        {stats.map(([label, value, detail]) => (
          <li key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
            <small>{detail}</small>
          </li>
        ))}
      </ul>
      <div className="market-panels">
        <section className="dash-panel" aria-labelledby="makers-title">
          <div className="dash-panel-head">
            <div>
              <h3 id="makers-title">Makers with the most models</h3>
              <p>Listed models per maker, with each maker’s best capability index score.</p>
            </div>
            <ShareButton
              title="AI makers with the most models"
              render={(tools) =>
                tools.listImage(
                  {
                    title: 'AI makers with the most models',
                    subtitle: 'Listed models per maker, with their best capability index score.',
                    source: 'models.dev (MIT) and Epoch AI (CC BY 4.0)',
                  },
                  market.makers.map((entry) => ({
                    label: entry.maker,
                    detail: entry.best
                      ? `Best: ${entry.best.name}, index ${entry.best.index.toFixed(1)}`
                      : 'Not on the index yet',
                    value: `${entry.models} models`,
                    fraction: entry.models / topMaker,
                    makerId: entry.makerId,
                  })),
                )
              }
            />
          </div>
          <ol className="market-list">
            {market.makers.map((entry) => (
              <li key={entry.makerId}>
                <img src={makerLogo(entry.makerId)} alt="" width="32" height="32" loading="lazy" />
                <div>
                  <b>
                    {entry.page ? (
                      <Link to={`/makers/${entry.page}`}>{entry.maker}</Link>
                    ) : (
                      entry.maker
                    )}
                  </b>
                  <small>
                    {entry.best ? (
                      <>
                        Best:{' '}
                        {entry.best.slug ? (
                          <Link to={`/models/${entry.best.slug}`}>{entry.best.name}</Link>
                        ) : (
                          entry.best.name
                        )}{' '}
                        ({entry.best.index.toFixed(1)})
                      </>
                    ) : (
                      'Not on the index yet'
                    )}
                  </small>
                </div>
                <span className="market-bar" aria-hidden="true">
                  <i
                    style={{
                      width: `${(entry.models / topMaker) * 100}%`,
                      background: makerColor(entry.makerId),
                    }}
                  />
                </span>
                <strong>{entry.models}</strong>
              </li>
            ))}
          </ol>
        </section>
        <section className="dash-panel" aria-labelledby="widest-title">
          <div className="dash-panel-head">
            <div>
              <h3 id="widest-title">Most widely available</h3>
              <p>
                Models offered by the most hosts, so they are easy to buy and to switch between.
              </p>
            </div>
            <ShareButton
              title="Most widely available AI models"
              render={(tools) =>
                tools.listImage(
                  {
                    title: 'Most widely available AI models',
                    subtitle: 'Models offered by the most hosts.',
                    source: 'models.dev (MIT)',
                  },
                  market.widest.map((entry) => ({
                    label: entry.name,
                    detail: entry.maker,
                    value: `${entry.hosts} hosts`,
                    fraction: entry.hosts / topHosts,
                    makerId: entry.makerId,
                  })),
                )
              }
            />
          </div>
          <ol className="market-list">
            {market.widest.map((entry) => (
              <li key={entry.slug}>
                <img src={makerLogo(entry.makerId)} alt="" width="32" height="32" loading="lazy" />
                <div>
                  <Link to={`/models/${entry.slug}`}>{entry.name}</Link>
                  <small>{entry.maker}</small>
                </div>
                <span className="market-bar" aria-hidden="true">
                  <i
                    style={{
                      width: `${(entry.hosts / topHosts) * 100}%`,
                      background: makerColor(entry.makerId),
                    }}
                  />
                </span>
                <strong>{entry.hosts}</strong>
              </li>
            ))}
          </ol>
        </section>
      </div>
      {market.gap && (
        <section className="market-gap" aria-label="Open and closed models">
          <div>
            <span>Best closed model</span>
            <p>
              <img src={makerLogo(market.gap.closed.makerId)} alt="" width="28" height="28" />
              {market.gap.closed.slug ? (
                <Link to={`/models/${market.gap.closed.slug}`}>{market.gap.closed.name}</Link>
              ) : (
                <b>{market.gap.closed.name}</b>
              )}
              <strong>{market.gap.closed.index.toFixed(1)}</strong>
            </p>
          </div>
          <div>
            <span>Best open-weights model</span>
            <p>
              <img src={makerLogo(market.gap.open.makerId)} alt="" width="28" height="28" />
              {market.gap.open.slug ? (
                <Link to={`/models/${market.gap.open.slug}`}>{market.gap.open.name}</Link>
              ) : (
                <b>{market.gap.open.name}</b>
              )}
              <strong>{market.gap.open.index.toFixed(1)}</strong>
            </p>
          </div>
          <div>
            <span>Gap on the capability index</span>
            <p>
              <strong>{(market.gap.closed.index - market.gap.open.index).toFixed(1)} points</strong>
            </p>
          </div>
        </section>
      )}
      <p className="explorer-note">
        Shares and counts cover the {market.base.toLocaleString('en-US')} models whose maker is
        known and that the maker sells, several hosts list, or a test covers. Scores are from the
        Epoch Capabilities Index.
      </p>
    </div>
  );
}
