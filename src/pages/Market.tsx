import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { PageHeading } from '../components/Layout';
import { MarketSection } from '../components/home/MarketSection';
import { useOverview } from '../lib/overview';
import '../components/home/dashboard.css';

export default function Market() {
  const [attempt, setAttempt] = useState(0);
  const { data, error } = useOverview(attempt);

  return (
    <div className="container page detail-page">
      <PageHeading
        eyebrow="MODEL MARKET"
        title="Understand the AI model market."
        text="See which makers publish the most models, which models are easiest to buy, and how open and closed models compare."
      >
        <Link className="text-link" to="/models">
          Open model directory <ArrowUpRight size={15} aria-hidden="true" />
        </Link>
      </PageHeading>

      {error && !data ? (
        <div className="dash-state" role="alert">
          <p>{error}</p>
          <button className="btn btn-small" onClick={() => setAttempt((value) => value + 1)}>
            Try again
          </button>
        </div>
      ) : !data ? (
        <div className="dash-state dash-pending is-tall" role="status">
          Loading market data…
        </div>
      ) : (
        <MarketSection overview={data} />
      )}
    </div>
  );
}
