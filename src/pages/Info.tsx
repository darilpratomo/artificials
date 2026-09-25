import { AnalyticsPreferencesButton } from '../components/Analytics';
import { Link, useLocation } from 'react-router-dom';
import { ArrowUpRight, Globe2, BookOpen, HeartHandshake, Mail } from 'lucide-react';
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
          text="A free, independent, non-commercial guide to AI models and the technology behind them."
        />
        <div className="about-quote">
          <span>Understand. Compare. Learn.</span>
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
            For people exploring AI. <br />
            For people building with it.
          </h2>
          <div>
            <p>
              Artificials brings together an AI model directory, clear comparisons, editorial
              guides, a free AI course and free file tools. Our focus is making the information
              useful, understandable, and traceable to its source.
            </p>
            <p>
              Artificials is a free, non-commercial project to help people understand AI. Everything
              on the site is free, with no paid plans, no advertising and no sponsored listings. No
              model maker pays to appear or to rank.
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
              HeartHandshake,
              'Free for everyone.',
              'Rankings, guides, lessons and tools are free, without ads, accounts or paid plans.',
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
            Capability rankings use published results from Epoch AI, LiveBench, T2I-CoReBench,
            SWE-bench, and DeepSWE and CursorBench as compiled by Epoch AI, refreshed every two hours. Coding agent results come from Terminal-Bench 2.0 and SWE-bench. Each view
            identifies its dataset, evaluation scope, aggregation method and source-check time.
            Missing evaluations are not scored zero. Benchmark results remain separate from
            specification and price rankings; a larger context window does not establish higher
            intelligence. See the <Link to="/leaderboard">leaderboard</Link> for the current metric
            and coverage.
          </p>
          <p>
            Charts, highlights and the release timeline on the home page are calculated by
            Artificials from these sources. Each highlight names the test it comes from and says
            whether it is a test result, listing data or a calculation. Prices are list prices, not
            the cost of a particular task. Speed and latency are not shown, because no reliable
            public source is available for us to republish.
          </p>
        </section>
        <div className="closing-banner">
          <h2>Find the right model.</h2>
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
          text="Spotted a mistake, have a question, or want to help? We’d like to hear from you."
        />
        <div className="contact-card">
          <Mail size={32} />
          <h2>Corrections & feedback</h2>
          <p>
            {config.supportEmail
              ? 'For corrections, questions or feedback, email us. Never include passwords, authentication codes or API keys.'
              : 'Our contact address is being prepared.'}
          </p>
          {config.supportEmail && (
            <a className="btn" href={'mailto:' + config.supportEmail}>
              {config.supportEmail}
              <ArrowUpRight size={16} />
            </a>
          )}
          <p className="caption">Replies can take a few days.</p>
        </div>
      </div>
    );
  const privacy = pathname === '/privacy';
  return (
    <div className="container page legal-page">
      <PageHeading
        eyebrow="LEGAL & TRUST"
        title={privacy ? 'Privacy policy.' : 'Terms & conditions.'}
        text="Last updated September 25, 2026"
      />
      {!config.legalReady && (
        <div className="notice">Operator and contact details are being finalized.</div>
      )}
      <div className="prose">
        {privacy ? (
          <>
            <h2>1. Who operates this service</h2>
            <p>
              {config.operatorName
                ? `${config.operatorName}, ${config.operatorAddress}, operates Artificials at artificials.net.`
                : 'The operator’s identity and address will be published here.'}{' '}
              {config.privacyEmail
                ? `Privacy questions: ${config.privacyEmail}.`
                : 'A privacy contact will be provided before launch.'}
            </p>
            <h2>2. Information we use</h2>
            <p>
              Artificials is free and non-commercial, and you can use all of it without an account.
              Only the people who edit the site’s articles sign in; for them we use an email
              address, authentication identifiers and security settings. Our infrastructure
              providers may process technical information such as IP addresses, browser information,
              security events and request logs.
            </p>
            <h2>3. Why we process information</h2>
            <p>
              The free file utilities in Tools process selected files locally in your browser. File
              contents and file names are not uploaded to Artificials or sent to analytics. They are
              held temporarily in the active workspace; clearing it or leaving the page releases
              that workspace. Files you download remain on your device. Normal website delivery and
              optional page-view analytics still work as described in this policy.
            </p>
            <p>
              We use editor account data to let editors manage articles, and limited technical
              information for security, abuse prevention and service reliability. When an editor
              chooses Google sign-in, we use the identity information needed to access the account.
              We do not sell information or use it for advertising.
            </p>
            <h2>4. Service providers and international processing</h2>
            <p>
              Cloudflare provides hosting and security, and Cloudflare Web Analytics counts page
              views and measures how quickly pages load, without cookies or other storage on your
              device. Supabase provides editor sign-in and stores articles. Google processes sign-in
              information if an editor chooses Google sign-in. Cloudflare Turnstile helps protect
              sign-in from automated abuse. These providers may process information outside your
              country; the applicable arrangements depend on their processing locations, terms, and
              transfer safeguards.
            </p>
            <p>
              Model data is fetched and cached by our server, so browsing the catalog sends nothing
              about you to its sources. Links to provider documentation open external websites with
              their own privacy practices.
            </p>
            <h2>5. Cookies and device storage</h2>
            <p>
              Essential HTTP-only cookies keep an editor signed in. Your selected model comparisons
              and Academy lesson completion are saved in your browser’s local storage so they remain
              available as you navigate. Academy progress stays on this device and is not
              synchronized to an account. Sign-in and security providers may use their own essential
              storage. With your permission, Google Analytics uses first-party cookies to measure
              visits to public pages, including device/browser information and approximate location.
              Google processes this information under its own privacy policy. Google Analytics is
              optional and stays off until you accept; advertising features are disabled. We do not
              include email addresses, query strings, account pages or private editor URLs in our
              page-view events. Your analytics choice is saved on this device.
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
              You can allow or decline Google Analytics below. Declining stops further collection
              and removes Google Analytics cookies from this browser; it does not erase data
              previously received by Google.
            </p>
            <AnalyticsPreferencesButton />
            <p>
              You can clear the model comparison saved on this device below. You can also clear site
              storage through your browser settings.
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
              Editor accounts are kept while the editor helps with the site. Database backup copies
              may persist until the provider’s retention period expires. Analytics data is kept
              under Google’s and Cloudflare’s retention settings.
            </p>
            <p>
              To request deletion, a copy of your information, or a correction, contact the privacy
              address above. We will verify your identity and apply your local privacy rights,
              including access, erasure, restriction, portability, objection, and withdrawing
              consent where applicable. You may also complain to your local data protection
              authority.
            </p>
            <h2>8. Changes</h2>
            <p>
              We may update this policy when the site or legal obligations change. Material changes
              will be disclosed on the site before taking effect where required.
            </p>
          </>
        ) : (
          <>
            <h2>1. The service</h2>
            <p>
              {config.operatorName
                ? `${config.operatorName}, ${config.operatorAddress}, provides Artificials.`
                : 'Operator details are being finalized.'}{' '}
              Artificials is a free, non-commercial website: an AI model directory, comparisons,
              rankings, editorial guides, lessons and file tools. There are no paid plans. By using
              the site you agree to these terms.
            </p>
            <h2>2. Model information and rankings</h2>
            <p>
              Model information is aggregated from the sources identified on the site and may be
              delayed, incomplete, or unavailable. Automatic refreshes depend on those sources
              publishing data; we cannot guarantee complete or immediate coverage of every release.
              Check exact model versions, capabilities, licenses, and pricing with the provider
              before relying on them. Rankings describe their stated metric and are not a promise
              that a model will be best for your task. Results from other projects keep their
              creators’ licences, which each page names; some allow only non-commercial reuse.
            </p>
            <h2>3. Lessons and free tools</h2>
            <p>
              Lessons and code examples are for learning; review and test code before you use it.
              The file tools process files in your browser, and you are responsible for the files
              you choose and for having the right to process them.
            </p>
            <h2>4. Editor accounts</h2>
            <p>
              Only site editors sign in. Editors must protect their email and authentication factors
              and tell us about suspected unauthorized access.
            </p>
            <h2>5. Acceptable use</h2>
            <p>
              Do not use the site for unlawful activity, fraud, phishing, malware, harassment,
              rights infringement, or collecting data without appropriate permission. Do not disrupt
              the service or attempt to access data that is not yours. We may restrict access when
              reasonably necessary to protect the site and its visitors.
            </p>
            <h2>6. Availability and responsibility</h2>
            <p>
              Artificials runs on free infrastructure, so we cannot guarantee uninterrupted
              availability or error-free information. To the extent allowed by law, the site is
              provided as available. Nothing in these terms excludes rights or liability that cannot
              legally be excluded.
            </p>
            <h2>7. Changes and contact</h2>
            <p>
              We may update these terms when the site changes.{' '}
              {config.supportEmail
                ? `For questions, contact ${config.supportEmail}.`
                : 'A contact address will be published here.'}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
