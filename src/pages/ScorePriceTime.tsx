import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { PageHeading } from '../components/Layout';
import { ValueSection } from '../components/home/ValueSection';
import { useOverview } from '../lib/overview';
import '../components/home/dashboard.css';

export default function ScorePriceTime() {
  const [attempt, setAttempt] = useState(0);
  const { data, error } = useOverview(attempt);

  return (
    <div className="container page detail-page">
      <PageHeading
        eyebrow="SCORE / PRICE / TIME"
        title="Map capability against cost, time and context."
        text="Filter the chart by model labels to compare specific models, switch the axis, or open the table view for exact values."
      >
        <Link className="text-link" to="/compare">
          Compare specifications <ArrowUpRight size={15} aria-hidden="true" />
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
          Loading score, price and time…
        </div>
      ) : (
        <ValueSection index={data.index} releases={data.releases} detailed />
      )}
    </div>
  );
}
