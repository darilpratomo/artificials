import { Link } from 'react-router-dom';
import { Plus, X, ArrowUpRight, GitCompareArrows } from 'lucide-react';
import { PageHeading } from '../components/Layout';
import {
  useComparison,
  compactNumber,
  tokenPrice,
  providerLogo,
  type ModelRecord,
} from '../lib/catalog';
export default function Compare() {
  const { models, toggle, clear } = useComparison();
  const rows: [string, (m: ModelRecord) => string][] = [
    ['API provider', (m) => m.provider],
    ['Model identifier', (m) => m.modelId],
    ['Context window', (m) => compactNumber(m.contextWindow) + ' tokens'],
    ['Input / 1M tokens', (m) => tokenPrice(m.inputPrice)],
    ['Output / 1M tokens', (m) => tokenPrice(m.outputPrice)],
    ['Input modalities', (m) => (m.inputModalities || []).join(', ') || 'Not reported'],
    ['Output modalities', (m) => (m.outputModalities || []).join(', ') || 'Not reported'],
    ['Reasoning', (m) => (m.reasoning ? 'Reported' : 'Not reported')],
    ['Open weights', (m) => (m.openWeights ? 'Reported' : 'Not reported')],
    ['Release date', (m) => m.releaseDate || 'Not reported'],
    ['Intelligence benchmark', () => 'Not available in this source'],
  ];
  return (
    <div className="container page comparison-page">
      <PageHeading
        eyebrow="SEE THE DIFFERENCE"
        title="Side by side. Beyond the hype."
        text="Pick up to three model offerings. Compare the capabilities and costs that matter to your next project."
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
                      <h2>{m.name}</h2>
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
              <tbody>
                {rows.map(([label, read]) => (
                  <tr key={label}>
                    <th scope="row">{label}</th>
                    {models.map((m) => (
                      <td key={m.id}>{read(m)}</td>
                    ))}
                    {models.length < 3 && <td aria-label="No model selected">—</td>}
                  </tr>
                ))}
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
            Your shortlist is stored on this device. Model data reflects the snapshot when you
            selected it; remove and re-add a model for the latest values. Context size is not an
            intelligence score. Confirm pricing with the provider before use.
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
