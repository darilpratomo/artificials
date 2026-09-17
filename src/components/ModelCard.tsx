import { ArrowUpRight, Check, Plus, Brain, ScanEye } from 'lucide-react';
import { compactNumber, tokenPrice, providerLogo, type ModelRecord } from '../lib/catalog';
export default function ModelCard({
  model,
  selected = false,
  disabled = false,
  onCompare,
}: {
  model: ModelRecord;
  selected?: boolean;
  disabled?: boolean;
  onCompare?: (m: ModelRecord) => void;
}) {
  return (
    <article className="model-card">
      <div className="model-card-top">
        <img
          className="provider-mark"
          src={providerLogo(model.providerId)}
          width="36"
          height="36"
          alt=""
        />
        <span className="mono">{model.provider}</span>
        <a
          className="icon-btn"
          href={model.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Source for ${model.name}`}
        >
          <ArrowUpRight size={16} />
        </a>
      </div>
      <h3>{model.name}</h3>
      <p className="model-identifier">{model.modelId}</p>
      <div className="capability-tags">
        {model.reasoning && (
          <span>
            <Brain size={12} /> Reasoning
          </span>
        )}
        {model.modalities.includes('image') && (
          <span>
            <ScanEye size={12} /> Vision
          </span>
        )}
        <span>{model.openWeights ? 'Open weights' : 'Hosted model'}</span>
      </div>
      <dl className="model-metrics">
        <div>
          <dt>Context</dt>
          <dd>{compactNumber(model.contextWindow)}</dd>
        </div>
        <div>
          <dt>Input / 1M tokens</dt>
          <dd>{tokenPrice(model.inputPrice)}</dd>
        </div>
      </dl>
      <div className="model-card-bottom">
        <span>
          {model.releaseDate ? `Released ${model.releaseDate}` : 'Release date not reported'}
        </span>
        {onCompare && (
          <button
            className={`compare-button ${selected ? 'selected' : ''}`}
            onClick={() => onCompare(model)}
            disabled={!selected && disabled}
            aria-pressed={selected}
            aria-label={`${selected ? 'Remove' : 'Compare'} ${model.name}`}
          >
            {selected ? <Check size={14} /> : <Plus size={14} />} {selected ? 'Added' : 'Compare'}
          </button>
        )}
      </div>
    </article>
  );
}
