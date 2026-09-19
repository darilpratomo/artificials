import { AnalyticsPreferencesButton } from '../components/Analytics';
import { Link, useLocation } from 'react-router-dom';
import { ArrowUpRight, Globe2, BookOpen, Sparkles, Mail } from 'lucide-react';
import { removeLocal } from '../lib/storage';
import { useState } from 'react';
import { PageHeading } from '../components/Layout';
import { useApp } from '../lib/context';
export default function Info() {
  const { pathname } = useLocation();
  const { config } = useApp();
  const [cleared, setCleared] = useState(false);
  if (pathname === '/about')
    return (
      <div className="container page about-page">
        <PageHeading
          eyebrow="THE IDEA BEHIND ARTIFICIALS"
          title="A clearer view of intelligence."
          text="An independent guide to AI models, the technology behind them, and the applications you can build."
        />
        <div className="about-quote">
          <span>Understand. Compare. Create.</span>
          <h2>
            Technology moves.
            <br />
            Keep your <em>perspective.</em>
          </h2>
          <div className="about-orbit" />
          <Globe2 size={130} strokeWidth={0.7} />
        </div>
        <div className="about-text">
          <h2>
            For people exploring AI.
            <br />
            For people building with it.
          </h2>
          <div>
            <p>
              Artificials connects an AI model directory with clear comparisons, editorial guides,
              and tools for creating applications. Our focus is making the information useful,
              understandable, and traceable to its source.
            </p>
            <p>
              The directory, comparisons, rankings, and editorial guides are free to explore. Studio
              is our subscription app builder: generate an interface, server API, and database
              structure, then download the code and deploy it in your own accounts.
            </p>
            <p>
              We are independent of the AI providers listed here. Provider names and logos identify
              their products and remain the property of their respective owners. A listing does not
              imply endorsement, partnership, or affiliation.
            </p>
          </div>
        </div>
        <div className="values-grid">
          {[
            [
              Globe2,
              'An open view of AI.',
              'Explore models across providers with clear source and freshness information.',
            ],
            [
              BookOpen,
              'Evidence before a headline.',
              'Read the methodology, distinguish missing data, and compare the metric that matters to you.',
            ],
            [
              Sparkles,
              'From understanding to building.',
              'Generate an application foundation with source code you can inspect, modify, and deploy.',
            ],
          ].map(([Icon, title, text]) => {
            const I = Icon as typeof Globe2;
            return (
              <div key={String(title)}>
                <I size={25} />
                <h3>{String(title)}</h3>
                <p>{String(text)}</p>
              </div>
            );
          })}
        </div>
        <section className="prose about-methodology" aria-labelledby="source-methodology">
          <h2 id="source-methodology">Where the information comes from</h2>
          <p>
            Our catalog brings together public model specifications and pricing. Updates are
            refreshed automatically and the directory shows when information was fetched. A fetch
            time tells you when we checked the source; it does not establish when every underlying
            fact was verified.
          </p>
          <p>
            Coverage follows the source and can lag behind provider announcements. Missing prices,
            release dates, or capabilities remain unknown. We do not fill gaps with guessed values
            or treat an unreported result as zero. Confirm important details with the provider.
          </p>
          <h2>How to read the rankings</h2>
          <p>
            Capability rankings use published LiveBench and T2I-CoReBench results, refreshed on a
            six-hour schedule. Each view identifies its dataset, evaluation scope, aggregation
            method and source-check time. Missing evaluations are not scored zero. Benchmark results
            remain separate from specification and price rankings; a larger context window does not
            establish higher intelligence. See the <Link to="/leaderboard">leaderboard</Link> for
            the current metric and coverage.
          </p>
        </section>
        <div className="closing-banner">
          <h2>Explore the AI landscape.</h2>
          <Link className="btn" to="/models">
            Explore models <ArrowUpRight size={16} />
          </Link>
        </div>
      </div>
    );
  if (pathname === '/contact')
    return (
      <div className="container page contact-page">
        <PageHeading
          eyebrow="CONTACT ARTIFICIALS"
          title="How can we help?"
          text="Questions about your account, a Studio project, or the platform? We’re here to help."
        />
        <div className="contact-card">
          <Mail size={32} />
          <h2>Support & feedback</h2>
          <p>
            {config.supportEmail
              ? 'For product support, billing questions, or feedback, email us. Never include passwords, authentication codes, API keys, or financial account details.'
              : 'Our support channel is being prepared before subscriptions open.'}
          </p>
          {config.supportEmail && (
            <a className="btn" href={'mailto:' + config.supportEmail}>
              {config.supportEmail}
              <ArrowUpRight size={16} />
            </a>
          )}
          <p className="caption">
            For an existing subscription, you can also manage billing through your account
            dashboard.
          </p>
        </div>
      </div>
    );
  const privacy = pathname === '/privacy';
  return (
    <div className="container page legal-page">
      <PageHeading
        eyebrow="LEGAL & TRUST"
        title={privacy ? 'Privacy policy.' : 'Terms & conditions.'}
        text="Last updated September 17, 2026"
      />
      {!config.legalReady && (
        <div className="notice">
          Pre-launch draft. Operator and contact details are being finalized before paid
          subscriptions become available.
        </div>
      )}
      <div className="prose">
        {privacy ? (
          <>
            <h2>1. Who operates this service</h2>
            <p>
              {config.operatorName
                ? `${config.operatorName}, ${config.operatorAddress}, operates Artificials at artificials.net.`
                : 'The operator’s legal identity and address will be published here before commercial launch.'}{' '}
              {config.privacyEmail
                ? `Privacy questions: ${config.privacyEmail}.`
                : 'A privacy contact will be provided before launch.'}
            </p>
            <h2>2. Information we use</h2>
            <p>
              For accounts, we use your email address, authentication identifiers, and security
              settings. If you use Studio, we process your prompts, generated code, project records,
              usage counts, and subscription status. Our infrastructure providers may process
              technical information such as IP addresses, browser information, security events, and
              request logs. You can browse the model directory and editorial guides without an
              account.
            </p>
            <p>
              Do not put passwords, API keys, sensitive personal information, or confidential
              third-party data into prompts. Prompts are sent to OpenAI to generate your
              application. We store generated projects and usage records; this application does not
              maintain a separate prompt-history table.
            </p>
            <h2>3. Why we process information</h2>
            <p>
              We use account and project data to provide the service and fulfill our agreement with
              you; billing records for subscription administration and legal obligations; and
              limited technical information for security, abuse prevention, and service reliability.
              When you choose Google sign-in, we use the identity information needed to create or
              access your account.
            </p>
            <h2>4. Service providers and international processing</h2>
            <p>
              Cloudflare provides hosting and security. Supabase provides authentication and
              database storage. OpenAI processes AI requests. Paddle handles checkout and
              subscription payments as merchant of record. We do not receive or store your full card
              number. Google processes sign-in information if you choose Google sign-in. Cloudflare
              Turnstile helps protect sign-in from automated abuse. These providers may process
              information outside your country; the applicable arrangements depend on their
              processing locations, terms, and transfer safeguards.
            </p>
            <p>
              Model metadata is fetched and cached by our server. Browsing the catalog does not send
              your Studio prompts to the catalog data source. Links to provider documentation open
              external websites with their own privacy practices.
            </p>
            <h2>5. Cookies and device storage</h2>
            <p>
              Essential HTTP-only cookies maintain your signed-in session. Your selected model
              comparisons and Academy lesson completion are saved in your browser’s local storage so
              they remain available as you navigate. Academy progress stays on this device and is
              not synchronized to an account. Authentication, payment, and security providers may
              use their own essential storage. With your permission, Google Analytics uses
              first-party cookies to measure visits to public pages, including device/browser
              information and approximate location. Google processes this information under its own
              privacy policy. Analytics is optional and stays off until you accept; advertising
              features are disabled. We do not include your email, Studio prompts, query strings,
              account pages or private CMS URLs in our page-view events. Your analytics choice is
              saved on this device.
            </p>
            <p>
              <a
                href="https://policies.google.com/privacy"
                target="_blank"
                rel="noopener noreferrer"
              >
                Google privacy policy
              </a>
            </p>
            <h2 id="preferences">6. Your preferences</h2>
            <p>
              You can allow or decline analytics below. Declining stops further analytics collection
              and removes Google Analytics cookies from this browser; it does not erase data
              previously received by Google.
            </p>
            <AnalyticsPreferencesButton />
            <p>
              You can clear the model comparison saved on this device below. This does not delete
              your account or saved Studio projects. You can also clear site storage through your
              browser settings, which may sign you out.
            </p>
            <button
              className="btn btn-outline"
              onClick={() => {
                removeLocal('artificials-compare');
                window.dispatchEvent(new Event('artificials-compare-change'));
                setCleared(true);
              }}
            >
              {cleared ? 'Saved comparison cleared' : 'Clear saved comparison'}
            </button>
            <h2>7. Retention and deletion</h2>
            <p>
              Saved projects remain while your account is active unless you delete them. Deleting a
              project removes its saved code; associated usage entries may remain for billing and
              abuse prevention. Subscription and payment records may need to be retained for tax,
              fraud prevention, dispute handling, and other legal obligations. Database backup
              copies may persist until the provider’s retention period expires.
            </p>
            <p>
              To request account deletion, a copy of your information, or a correction, contact the
              privacy address above. We will verify your identity and apply your local privacy
              rights, including access, erasure, restriction, portability, objection, and
              withdrawing consent where applicable. You may also complain to your local data
              protection authority.
            </p>
            <h2>8. Children and changes</h2>
            <p>
              The account and paid Studio service are intended for adults aged 18 and over. We may
              update this policy when our service or legal obligations change. Material changes will
              be disclosed on the site before taking effect where required.
            </p>
          </>
        ) : (
          <>
            <h2>1. Service and agreement</h2>
            <p>
              {config.operatorName
                ? `${config.operatorName}, ${config.operatorAddress}, provides Artificials.`
                : 'Operator details will be finalized before commercial launch.'}{' '}
              These terms cover the AI model directory, comparisons, rankings, editorial content,
              accounts, and Studio. By creating an account or purchasing a plan you agree to these
              terms. Account holders must be at least 18 and able to enter a contract.
            </p>
            <h2>2. Model information and rankings</h2>
            <p>
              Model information is aggregated from the sources identified on the site and may be
              delayed, incomplete, or unavailable. Automatic refreshes depend on those sources
              publishing data; we cannot guarantee complete or immediate coverage of every release.
              Check exact model versions, capabilities, licenses, and pricing with the provider
              before relying on them. Rankings describe their stated metric and are not a promise
              that a model will be best for your task.
            </p>
            <h2>3. Your account</h2>
            <p>
              Use accurate information, protect your email and authentication factors, and tell us
              about suspected unauthorized access. Do not share paid access, bypass quotas, resell
              access without permission, disrupt the service, or attempt to access another person’s
              data.
            </p>
            <h2>4. Studio plans and renewals</h2>
            <p>
              Plans are billed monthly in USD at the price shown at checkout, with applicable tax
              added. Subscriptions renew automatically until canceled through the billing portal.
              Each paid period includes the generation and saved-project limits shown on the pricing
              page. Unused generations do not roll over. There are no automatic overage charges.
            </p>
            <p>
              A generation or revision consumes one credit when the request is submitted to the AI
              provider, including attempts that later fail or are interrupted. Requests rejected
              before submission due to access or quota checks do not consume credits. Input length,
              output length, concurrent requests, and daily service capacity are limited. Reaching
              the shared daily capacity may temporarily pause generation until the next UTC day.
            </p>
            <h2>5. Canceling and refunds</h2>
            <p>
              You can cancel renewal in your dashboard’s billing portal. Access normally continues
              through the already paid period. Contact support or Paddle for billing issues and
              refund requests. Refund eligibility depends on the circumstances and applicable
              consumer law; these terms do not exclude mandatory cancellation or refund rights.
              Refunded, disputed, or overdue subscriptions may have generation access suspended.
            </p>
            <h2>6. Generated applications</h2>
            <p>
              Studio produces source code and a static design preview. You configure and deploy the
              downloaded application using your own hosting, database, authentication, and other
              provider accounts. Hosting costs and third-party charges are separate from your Studio
              subscription.
            </p>
            <p>
              You can use and modify generated output to the extent permitted by applicable law and
              third-party licenses. Output may be inaccurate, insecure, incomplete, or similar to
              output for others. You must review, test, and assess licensing and legal requirements
              before using or publishing an application. We do not promise that generated output
              will meet every requirement without engineering work.
            </p>
            <h2>7. Acceptable use</h2>
            <p>
              Do not use the service for unlawful activity, fraud, phishing, malware, harassment,
              rights infringement, or collecting data without appropriate permission. Do not submit
              secrets or data you lack permission to process. We may restrict access when reasonably
              necessary to protect the service and its users or meet legal obligations.
            </p>
            <h2>8. Availability and responsibility</h2>
            <p>
              We aim to provide a reliable service but do not guarantee uninterrupted availability
              or an error-free generated app. Free infrastructure and third-party dependencies
              impose capacity limits. To the extent allowed by law, the service is provided as
              available. Nothing in these terms excludes rights or liability that cannot legally be
              excluded, including applicable consumer protections.
            </p>
            <h2>9. Changes and contact</h2>
            <p>
              We may update these terms and plan offerings. Price changes apply prospectively with
              notice where required and do not retroactively change paid periods. Your mandatory
              local consumer rights remain applicable.{' '}
              {config.supportEmail
                ? `For questions or disputes, contact ${config.supportEmail}.`
                : 'A support address will be published before subscriptions open.'}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
