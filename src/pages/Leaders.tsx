import { useState } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PageHeading } from '../components/Layout';
import { ShareButton } from '../components/charts/ShareButton';
import { Highlights, highlightValue } from '../components/home/Highlights';
import { RankingSection } from '../components/home/RankingSection';
import { useOverview } from '../lib/overview';
import '../components/home/dashboard.css';

export default function Leaders() {
  const [attempt, setAttempt] = useState(0);
  const { data, error } = useOverview(attempt);

  return (
    <div className="container page detail-page">
      <PageHeading
        eyebrow="LEADERS RIGHT NOW"
        title="Explore the leading AI models."
        text="Start with the current leaders for each capability, then open the full ranking table to see the rest of the field."
      >
        <Link className="text-link" to="/leaderboard">
          Benchmark leaderboard <ArrowUpRight size={15} aria-hidden="true" />
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
          Loading leaders…
        </div>
      ) : (
        <div className="detail-stack">
          <section aria-labelledby="leaders-now-title">
            <div className="dash-heading">
              <div>
                <h2 id="leaders-now-title">Current leaders</h2>
                <p>Each card names the model, maker, metric and source behind the result.</p>
              </div>
              <ShareButton
                title="AI model leaders"
                render={(tools) =>
                  tools.listImage(
                    {
                      title: 'AI model leaders',
                      subtitle: 'The top model on each test, from published results.',
                      source:
                        'Epoch AI (CC BY 4.0), LiveBench (Apache-2.0), T2I-CoReBench (CC BY-SA 4.0), models.dev (MIT)',
                    },
                    data.highlights.map((item) => ({
                      label: item.title,
                      detail: `${item.name}${item.maker ? `, ${item.maker}` : ''}. ${item.detail}`,
                      value: highlightValue(item),
                      makerId: item.makerId,
                    })),
                  )
                }
              />
            </div>
            <Highlights items={data.highlights} />
          </section>

          <section aria-labelledby="full-ranking-title">
            <div className="dash-heading">
              <div>
                <h2 id="full-ranking-title">Full rankings</h2>
                <p>Choose an overall index or a specific benchmark, then expand the count.</p>
              </div>
            </div>
            <RankingSection overview={data} />
          </section>
        </div>
      )}
    </div>
  );
}
