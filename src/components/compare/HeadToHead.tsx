import { useEffect, useState, type CSSProperties } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowLeftRight, Plus, X } from 'lucide-react';
import { makerLogo } from '../../../shared/makers';
import { comparisonMetadata } from '../../../shared/seo';
import { EmptyState } from '../Layout';
import { applyPageMetadata } from '../Metadata';
import { ShareButton } from '../charts/ShareButton';
import { ModelSearch } from '../home/ModelSearch';
import { score } from '../profile/format';
import {
  MAX_COMPARED,
  comparisonPath,
  comparisonRecord,
  useComparedProfiles,
  type ComparisonData,
} from '../../lib/compare';
import { useComparisons } from '../../lib/overview';
import type { ModelProfile } from '../../lib/profiles';
import { FeaturedList } from './FeaturedList';
import { headToHead, margin } from './analysis';
import { ShareLink } from './ShareLink';
import { ComparisonTable } from './table';

/** A shared comparison of two or three models, at /compare/a-vs-b. */
export function HeadToHead({ slugs, initial }: { slugs: string[]; initial?: ComparisonData }) {
  const navigate = useNavigate();
  const { profiles, sources, done } = useComparedProfiles(slugs, initial);
  const models = profiles.filter((profile): profile is ModelProfile => profile !== null);
  const found = done && models.length === slugs.length;
  const featured = useComparisons(found).data?.featured ?? [];
  // Which model is being replaced; its count means one is being added.
  const [picking, setPicking] = useState<number | null>(null);
  const key = slugs.join();

  useEffect(() => setPicking(null), [key]);
  useEffect(() => {
    if (done)
      applyPageMetadata(
        comparisonMetadata(
          found ? models.map(({ slug, name, maker }) => ({ slug, name, maker })) : null,
          slugs,
        ),
      );
    // The models follow from the address, so the address is the dependency.
  }, [done, found, key]);

  if (!done)
    return (
      <div className="container page comparison-page">
        <p className="profile-loading" role="status">
          Loading comparison…
        </p>
      </div>
    );
  if (!found)
    return (
      <EmptyState
        title="We couldn’t find one of these models."
        text="It may have been renamed or retired. Pick the models again to compare them side by side."
        link="/compare"
        label="Compare models"
      />
    );

  const count = models.length;
  const title = models.map((model) => model.name).join(' vs ');
  const analysis = headToHead(models);
  const go = (next: string[]) => navigate(comparisonPath(next));
  const choose = (slug: string) =>
    go(picking === count ? [...slugs, slug] : slugs.map((old, i) => (i === picking ? slug : old)));
  const entries = models.map((profile) => ({ record: comparisonRecord(profile), profile }));
  const tested = new Set(models.flatMap((model) => model.categories.map((c) => c.sourceId)));
  const credited = sources.filter((source) => tested.has(source.id));
  const credit = [
    ...credited.map((source) => `${source.name} (${source.license})`),
    'models.dev (MIT)',
  ].join(', ');
  const ties = analysis.shared.filter((test) => test.leader === null);
  const related = featured.filter(
    (pair) =>
      pair.slugs.some((slug) => slugs.includes(slug)) &&
      !(count === 2 && pair.slugs.every((slug) => slugs.includes(slug))),
  );
  const both = count > 2 ? 'all' : 'both';

  return (
    <div className="container page comparison-page vs-page">
      <Link to="/compare" className="text-link profile-back">
        <ArrowLeft size={16} aria-hidden="true" /> Compare models
      </Link>
      <header className="vs-header">
        <div>
          <span className="eyebrow">HEAD TO HEAD</span>
          <h1>{title}</h1>
          <p>
            Published test results, prices, limits and features, side by side. Share the link to
            show someone exactly this comparison.
          </p>
        </div>
        <div className="vs-share">
          <ShareLink title={title} />
          <ShareButton
            title={title}
            render={(tools) =>
              tools.compareImage(
                {
                  title,
                  subtitle: 'Published test results, prices and limits, side by side.',
                  source: credit,
                },
                models.map(({ name, maker, makerId }) => ({ name, maker, makerId })),
                [
                  ...analysis.measures.map(({ label, values, best }) => ({ label, values, best })),
                  ...analysis.shared.map((test) => ({
                    label: test.category.label,
                    values: test.scores.map((value) => score(value, test.category.unit)),
                    best: test.leader === null ? [] : [test.leader],
                  })),
                ],
              )
            }
          />
        </div>
      </header>

      <ol className="vs-models" style={{ '--models': count } as CSSProperties}>
        {models.map((model, index) => (
          <li key={model.slug} className="vs-model">
            <img src={makerLogo(model.makerId)} alt="" width="44" height="44" />
            <div className="vs-model-name">
              <Link to={`/models/${model.slug}`}>{model.name}</Link>
              <small>{model.maker || 'Maker not reported'}</small>
            </div>
            <div className="vs-model-actions">
              <button
                type="button"
                className="text-link"
                aria-label={`Change ${model.name}`}
                onClick={() => setPicking(index)}
              >
                Change
              </button>
              {count > 2 && (
                <button
                  type="button"
                  className="text-link"
                  aria-label={`Remove ${model.name}`}
                  onClick={() => go(slugs.filter((_, i) => i !== index))}
                >
                  Remove
                </button>
              )}
            </div>
          </li>
        ))}
      </ol>
      <div className="vs-toolbar">
        {count === 2 && (
          <button
            type="button"
            className="btn btn-small btn-outline"
            onClick={() => go([...slugs].reverse())}
          >
            <ArrowLeftRight size={15} aria-hidden="true" /> Swap sides
          </button>
        )}
        {count < MAX_COMPARED && (
          <button
            type="button"
            className="btn btn-small btn-outline"
            onClick={() => setPicking(count)}
          >
            <Plus size={15} aria-hidden="true" /> Add a model
          </button>
        )}
      </div>
      {picking !== null && (
        <div className="vs-picker">
          <p>{picking === count ? 'Add a model' : `Replace ${models[picking].name}`}</p>
          <ModelSearch
            total={0}
            label={picking === count ? 'Add a model' : `Replace ${models[picking].name}`}
            placeholder="Search for a model"
            exclude={slugs}
            autoFocus
            onChoose={(row) => choose(row[0])}
          />
          <button
            type="button"
            className="icon-btn"
            aria-label="Cancel"
            onClick={() => setPicking(null)}
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>
      )}

      <section className="vs-section" aria-labelledby="vs-glance">
        <h2 id="vs-glance">At a glance</h2>
        <ul className="vs-tiles">
          {analysis.measures.map((measure) => (
            <li key={measure.label} className="vs-tile">
              <h3>{measure.label}</h3>
              <ul>
                {measure.values.map((value, index) => (
                  <li
                    key={models[index].slug}
                    className={measure.best.includes(index) ? 'is-best' : undefined}
                  >
                    <img src={makerLogo(models[index].makerId)} alt="" width="22" height="22" />
                    <span>{models[index].name}</span>
                    <b>{value}</b>
                  </li>
                ))}
              </ul>
              <p>{measure.sentence}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="vs-section" aria-labelledby="vs-leads">
        <h2 id="vs-leads">Where each scores higher</h2>
        {analysis.shared.length ? (
          <>
            <p className="vs-intro">
              {`On the ${analysis.shared.length} ${
                analysis.shared.length === 1 ? 'test' : 'tests'
              } ${both} have taken, each on its own scale. A gap of a point or two can sit within a test’s margin of error.`}
            </p>
            <div className="vs-leads" style={{ '--models': count } as CSSProperties}>
              {models.map((model, index) => {
                const leads = analysis.shared.filter((test) => test.leader === index);
                return (
                  <div key={model.slug} className="vs-lead">
                    <h3>
                      <img src={makerLogo(model.makerId)} alt="" width="24" height="24" />
                      {model.name}
                    </h3>
                    {leads.length ? (
                      <ul>
                        {leads.map((test) => (
                          <li key={test.category.id}>
                            <span>{test.category.label}</span>
                            <b>{`+${margin(test)}`}</b>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p>No shared test where it scores higher.</p>
                    )}
                  </div>
                );
              })}
            </div>
            {ties.length > 0 && (
              <p className="vs-intro">
                {`Level on ${ties.map((test) => test.category.label).join(', ')}.`}
              </p>
            )}
          </>
        ) : (
          <p className="vs-intro">
            {`These models have no test in common yet. The table below shows each one’s own results.`}
          </p>
        )}
        {analysis.unshared > 0 && (
          <p className="vs-intro">
            {`${analysis.unshared} more ${
              analysis.unshared === 1 ? 'test has' : 'tests have'
            } results for only ${count > 2 ? 'some' : 'one'} of them; the table below lists every result.`}
          </p>
        )}
      </section>

      <section className="vs-section" aria-labelledby="vs-all">
        <h2 id="vs-all">Everything side by side</h2>
        <ComparisonTable
          caption={`Comparison of ${title}`}
          entries={entries}
          heads={models.map((model) => (
            <span className="vs-head" key={model.slug}>
              <img src={makerLogo(model.makerId)} alt="" width="28" height="28" />
              <Link to={`/models/${model.slug}`}>{model.name}</Link>
              <span>{model.maker}</span>
            </span>
          ))}
        />
        <p className="data-footnote">
          Bold marks the better value in each row. Prices are each model’s own list price, or the
          middle price across hosts when the maker does not sell it, blended as three input tokens
          for every output token. Test results as published by{' '}
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
      </section>

      {related.length > 0 && (
        <section className="vs-section" aria-labelledby="vs-more">
          <div className="vs-section-head">
            <h2 id="vs-more">More comparisons</h2>
            <Link className="text-link" to="/compare#featured">
              All leading comparisons
            </Link>
          </div>
          <FeaturedList pairs={related.slice(0, 6)} />
        </section>
      )}
    </div>
  );
}
