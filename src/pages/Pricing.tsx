import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Check, ArrowUpRight, Plus, Minus, ShieldCheck } from 'lucide-react';
import { PLANS, type PlanKey } from '../../shared/plans';
import { PageHeading } from '../components/Layout';
import { useApp } from '../lib/context';
import { post } from '../lib/api';
const faqs = [
  [
    'What can I build?',
    'Create full-stack web apps with a React interface, a server API, user authentication, and a D1 database. Download the project, connect your own Supabase and Cloudflare accounts, and deploy it. External integrations, custom domains, and production review require your setup.',
  ],
  [
    'What counts as a generation?',
    'A new build or a revision uses one generation once the AI request starts. Each request has fixed input and output limits. Provider failures after submission may consume a generation. We do not retry paid AI requests automatically.',
  ],
  [
    'What happens at my limit?',
    'Generation stops until your next paid billing period. There are no automatic overage charges. Credits do not roll over. A shared daily service cap can temporarily pause generation before your personal monthly limit.',
  ],
  [
    'Do I own the code?',
    'You can download and modify your generated project. You are responsible for checking its security, functionality, licenses, and suitability before publishing. Hosting and third-party services for exported apps are managed in your own accounts.',
  ],
  [
    'Can I cancel?',
    'Yes. Use Manage subscription in your dashboard. Cancellation normally takes effect at the end of your paid period. Refund requests are reviewed under the terms and applicable consumer law.',
  ],
  [
    'Is the model directory free?',
    'Yes. The model directory, comparisons, rankings, and editorial guides are free to explore. Source coverage and update timing vary. A Studio subscription pays for app generation.',
  ],
];
export default function Pricing() {
  const { session, config } = useApp();
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState<number | null>(0);
  const navigate = useNavigate();
  async function choose(plan: PlanKey) {
    if (!session.user) {
      navigate('/login?next=/pricing');
      return;
    }
    setBusy(plan);
    setError('');
    try {
      const d = await post<{ url: string }>('/billing/checkout', { plan });
      location.assign(d.url);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy('');
    }
  }
  return (
    <div className="container page pricing-page">
      <PageHeading
        eyebrow="ARTIFICIALS STUDIO PLANS"
        title="Build more. Stay in control."
        text="Build real apps with AI. Clear monthly limits, your code to keep, and no surprise overages."
      />
      <div className="billing-pill">
        Monthly billing <span>Cancel anytime</span>
      </div>
      {!config.billing && (
        <div className="notice centered-notice">
          Studio subscriptions are coming soon. Explore the builder and plans before checkout opens.
        </div>
      )}
      <div role="alert" className={error ? 'error' : ''}>
        {error}
      </div>
      <div className="pricing-grid">
        {Object.entries(PLANS).map(([key, plan]) => (
          <div className={`price-card ${key === 'pro' ? 'featured' : ''}`} key={key}>
            {key === 'pro' && <span className="popular-tag">FOR REGULAR BUILDERS</span>}
            <span className="eyebrow">{plan.name}</span>
            <p>{plan.description}</p>
            <div className="price">
              ${plan.price}
              <span> / month</span>
            </div>
            <p className="tax-note">USD · applicable tax added at checkout</p>
            <button
              className={`btn full ${key === 'pro' ? '' : 'btn-outline'}`}
              disabled={!!busy || (!config.billing && !!session.user)}
              onClick={() => choose(key as PlanKey)}
            >
              {busy === key ? 'Opening checkout…' : `Choose ${plan.name}`}
              <ArrowUpRight size={16} />
            </button>
            <div className="price-divider" />
            <ul>
              {[
                `${plan.credits} AI generations / month`,
                `${plan.projects} saved projects`,
                'Full-stack app generation',
                'Authentication & database scaffold',
                'Download all source code',
                'Responsive design previews',
                'No automatic overage billing',
              ].map((x) => (
                <li key={x}>
                  <Check size={15} />
                  {x}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <p className="pricing-caption">
        <ShieldCheck size={15} /> Secure checkout through Paddle when available. Hosting for
        exported apps is configured separately.
      </p>
      <div className="faq-section">
        <div>
          <span className="eyebrow">BEFORE YOU SUBSCRIBE</span>
          <h2>
            Good questions.
            <br />
            Straight answers.
          </h2>
          <p>
            Still curious? <Link to="/contact">Get in touch.</Link>
          </p>
        </div>
        <div className="faq-list">
          {faqs.map(([q, a], i) => (
            <div className="faq" key={q}>
              <button
                aria-expanded={expanded === i}
                onClick={() => setExpanded(expanded === i ? null : i)}
              >
                {q}
                {expanded === i ? <Minus size={17} /> : <Plus size={17} />}
              </button>
              {expanded === i && <p>{a}</p>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
