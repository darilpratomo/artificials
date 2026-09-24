import { useSearchParams } from 'react-router-dom';
import { PageHeading } from '../components/Layout';
import { ModelsHub } from '../components/models/ModelsHub';
import { ProviderListings } from '../components/models/ProviderListings';
import type { ModelOverview } from '../lib/overview';
import '../components/home/dashboard.css';
import './models.css';

/** Filters that belong to the provider listings, so older links still open that view. */
const LISTING_KEYS = [
  'view',
  'provider',
  'modality',
  'page',
  'sort',
  'reasoning',
  'openWeights',
  'query',
];

export default function Models({ initial }: { initial?: ModelOverview }) {
  const [params, setParams] = useSearchParams();
  const listings = LISTING_KEYS.some((key) => params.has(key)) && params.get('view') !== 'models';
  return (
    <div className="container page models-page">
      <PageHeading
        eyebrow="MODEL COMPARISON"
        title="Compare AI models."
        text="Capability, price and context for every AI model we track. Open any model for its scores, prices and providers."
      />
      <div className="view-switch" role="group" aria-label="View">
        <button
          type="button"
          aria-pressed={!listings}
          onClick={() => setParams({}, { replace: true })}
        >
          Models
        </button>
        <button
          type="button"
          aria-pressed={listings}
          onClick={() => setParams({ view: 'listings' }, { replace: true })}
        >
          Provider listings
        </button>
      </div>
      {listings ? <ProviderListings /> : <ModelsHub initial={initial} />}
    </div>
  );
}
