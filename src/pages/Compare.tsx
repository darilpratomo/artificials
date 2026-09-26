import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Plus, X, GitCompareArrows, Link2 } from 'lucide-react';
import { EmptyState, PageHeading } from '../components/Layout';
import { ModelSearch } from '../components/home/ModelSearch';
import { FeaturedList } from '../components/compare/FeaturedList';
import { HeadToHead } from '../components/compare/HeadToHead';
import { ComparisonTable, type Entry } from '../components/compare/table';
import { makerLogo } from '../../shared/makers';
import { useComparison, providerLogo } from '../lib/catalog';
import {
  MAX_COMPARED,
  comparisonPath,
  parseComparison,
  type ComparisonData,
  type Comparisons,
} from '../lib/compare';
import { useComparisons, type ExplorerRow } from '../lib/overview';
import { modelSlug, useProfiles } from '../lib/profiles';
import './compare.css';

/** Pick two or three models from the whole catalog and open their comparison. */
function Picker() {
  const [chosen, setChosen] = useState<ExplorerRow[]>([]);
  const navigate = useNavigate();
  const slugs = chosen.map((row) => row[0]);
  return (
    <section className="compare-picker" aria-labelledby="picker-title">
      <div className="compare-picker-head">
        <h2 id="picker-title">Compare any models</h2>
        <p>Pick two or three. Every comparison has its own page, with a link to share.</p>
      </div>
      <div className="compare-picker-row">
        {chosen.map((row, index) => (
          <span className="compare-chip" key={row[0]}>
            <img src={makerLogo(row[2])} alt="" width="28" height="28" />
            <span>
              <b>{row[1]}</b>
              <small>{row[3] || 'Maker not reported'}</small>
            </span>
            <button
              type="button"
              className="icon-btn"
              aria-label={`Remove ${row[1]}`}
              onClick={() => setChosen((rows) => rows.filter((_, i) => i !== index))}
            >
              <X size={15} aria-hidden="true" />
            </button>
          </span>
        ))}
        {chosen.length < MAX_COMPARED && (
          <ModelSearch
            total={0}
            label={['First model', 'Second model', 'Third model'][chosen.length]}
            placeholder={
              ['Search the first model', 'Search the second model', 'Add a third (optional)'][
                chosen.length
              ]
            }
            exclude={slugs}
            onChoose={(row) => setChosen((rows) => [...rows, row])}
          />
        )}
        <button
          type="button"
          className="btn"
          disabled={chosen.length < 2}
          onClick={() => navigate(comparisonPath(slugs))}
        >
          <GitCompareArrows size={16} aria-hidden="true" /> Compare
        </button>
      </div>
    </section>
  );
}

/** Leading models compared, prerendered and linked from the sitemap. */
function Featured({ initial }: { initial?: Comparisons }) {
  const { data } = useComparisons(true, 0, initial);
  const [all, setAll] = useState(false);
  if (!data?.featured.length) return null;
  const shown = all ? data.featured : data.featured.slice(0, 12);
  return (
    <section className="compare-featured" id="featured" aria-labelledby="featured-title">
      <div className="compare-featured-head">
        <h2 id="featured-title">Leading models compared</h2>
        <p>
          The best model of each of the ten makers that score highest on the capability index, in
          pairs.
        </p>
      </div>
      <FeaturedList pairs={shown} />
      {data.featured.length > shown.length && (
        <button type="button" className="btn btn-small btn-outline" onClick={() => setAll(true)}>
          {`Show all ${data.featured.length} comparisons`}
        </button>
      )}
    </section>
  );
}

/** The shortlist of listings saved on this device, with the picker and featured pairs. */
function Shortlist({ featured }: { featured?: Comparisons }) {
  const { models, toggle, clear } = useComparison();
  const { profiles, sources } = useProfiles(models.map((m) => modelSlug(m.modelId)));
  const entries: Entry[] = models.map((record) => ({
    record,
    profile: profiles[modelSlug(record.modelId)],
  }));
  // Credit only the tests that appear in the table.
  const tested = new Set(
    entries.flatMap(
      (entry) => entry.profile?.categories.map((category) => category.sourceId) ?? [],
    ),
  );
  const credited = sources.filter((source) => tested.has(source.id));
  // A shortlist becomes a shareable page when each listing has a profile of its own.
  const slugs = entries.map((entry) => entry.profile?.slug);
  const shareable =
    slugs.length >= 2 &&
    slugs.every((slug): slug is string => Boolean(slug)) &&
    new Set(slugs).size === slugs.length;
  return (
    <div className="container page comparison-page">
      <PageHeading
        eyebrow="SEE THE DIFFERENCE"
        title="Side by side. Beyond the hype."
        text="Compare two or three models: test results, prices, limits and features, row by row. Every comparison has its own link to share."
      />
      <Picker />
      {models.length > 0 && (
        <section className="compare-shortlist" aria-labelledby="shortlist-title">
          <div className="comparison-toolbar">
            <span>
              <GitCompareArrows size={16} aria-hidden="true" />
              <b id="shortlist-title">Your shortlist</b>
              {`${models.length} of 3 slots used`}
            </span>
            <span className="comparison-toolbar-actions">
              {shareable && (
                <Link className="text-link" to={comparisonPath(slugs as string[])}>
                  <Link2 size={14} aria-hidden="true" /> Share this comparison
                </Link>
              )}
              {models.length < 3 && (
                <Link className="text-link comparison-add" to="/models">
                  <Plus size={14} aria-hidden="true" /> Add a model
                </Link>
              )}
              <button className="text-link" onClick={clear}>
                Clear comparison
              </button>
            </span>
          </div>
          <ComparisonTable
            caption="Comparison of selected AI model offerings"
            entries={entries}
            heads={models.map((m) => (
              <span className="vs-head" key={m.id}>
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
                <Link className="model-card-link" to={`/models/${modelSlug(m.modelId)}`}>
                  {m.name}
                </Link>
                <span>{m.provider}</span>
              </span>
            ))}
            trailing={
              models.length < 3
                ? {
                    head: (
                      <Link className="add-model" to="/models">
                        <Plus size={24} />
                        Add a model
                      </Link>
                    ),
                    cell: '—',
                  }
                : undefined
            }
            sourceLinks={models.map((m) =>
              /^https:\/\//.test(m.sourceUrl) ? m.sourceUrl : 'https://models.dev',
            )}
          />
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
        </section>
      )}
      <Featured initial={featured} />
    </div>
  );
}

/**
 * /compare is the picker, the saved shortlist and the featured comparisons;
 * /compare/a-vs-b is one comparison, with its own link.
 */
export default function Compare({
  initial,
  featured,
}: {
  initial?: ComparisonData;
  featured?: Comparisons;
}) {
  const { pair } = useParams();
  if (pair === undefined) return <Shortlist featured={featured} />;
  const slugs = parseComparison(pair);
  return slugs ? (
    <HeadToHead slugs={slugs} initial={initial} />
  ) : (
    <EmptyState
      title="This comparison address is not valid."
      text="A comparison names two or three different models, such as /compare/model-a-vs-model-b."
      link="/compare"
      label="Compare models"
    />
  );
}
