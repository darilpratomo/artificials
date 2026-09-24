import { Check, X } from 'lucide-react';
import type { ModelProfile, ProfileBucket } from '../../lib/profiles';
import { cheapestOffering } from './Overview';
import {
  WORDS_PER_PAGE,
  WORDS_PER_TOKEN,
  approxPages,
  approxWords,
  cost,
  day,
  tokens,
  whole,
} from './format';
import { Explainer, Sources } from './parts';

/** Everyday reference sizes, converted with the same rule of thumb shown on the page. */
const EXAMPLES = [
  { label: 'A one-page email', pages: 1 },
  { label: 'A 20-page report', pages: 20 },
  { label: 'A 300-page book', pages: 300 },
  { label: 'A shelf of five books', pages: 1500 },
].map((example) => ({
  ...example,
  tokens: Math.round((example.pages * WORDS_PER_PAGE) / WORDS_PER_TOKEN),
}));

export default function Tokens({
  profile,
  bucket,
}: {
  profile: ModelProfile;
  bucket: ProfileBucket;
}) {
  const context = profile.contextWindow;
  const cheapest = cheapestOffering(profile);
  const perThousandWords = 1000 / WORDS_PER_TOKEN / 1_000_000;
  return (
    <div className="profile-panel-body">
      <Explainer>
        Models read and write in tokens, small pieces of words. As a rule of thumb, 1,000 tokens is
        about {whole(1000 * WORDS_PER_TOKEN)} English words, or one and a half pages. Other
        languages and code usually need more tokens per word.
      </Explainer>

      <section className="profile-card" aria-labelledby="fits-heading">
        <div className="profile-card-head">
          <h2 id="fits-heading">What fits in one request</h2>
          <p>
            {context
              ? `The context window is ${tokens(context)} tokens: everything the model can read at once, including your instructions, earlier messages and its own reply.`
              : 'This model’s context window is not reported.'}
          </p>
        </div>
        {context ? (
          <ul className="fit-list">
            {EXAMPLES.map((example) => {
              const share = example.tokens / context;
              // The window also holds the reply, so input that fills it completely does not fit.
              const fits = share < 1;
              const used = share < 0.01 ? '<1%' : `${Math.round(share * 100)}%`;
              return (
                <li key={example.label} className={fits ? 'is-fit' : 'is-over'}>
                  <span className="fit-label">
                    {fits ? (
                      <Check size={16} aria-hidden="true" />
                    ) : (
                      <X size={16} aria-hidden="true" />
                    )}
                    {example.label}
                    <small>about {tokens(example.tokens)} tokens</small>
                  </span>
                  <span
                    className="fit-track"
                    role="img"
                    aria-label={
                      fits
                        ? `Uses ${used} of the context window`
                        : `Too long: needs ${share.toFixed(1)} times the context window, with no room left for a reply`
                    }
                  >
                    <span
                      className="fit-fill"
                      style={{ width: `${Math.min(100, Math.max(1, share * 100))}%` }}
                    />
                  </span>
                  <span className="fit-value">{fits ? `${used} used` : 'Too long'}</span>
                </li>
              );
            })}
          </ul>
        ) : null}
      </section>

      <div className="profile-duo">
        <section className="profile-card" aria-labelledby="answer-heading">
          <div className="profile-card-head">
            <h2 id="answer-heading">Longest single answer</h2>
          </div>
          <p className="duo-figure">
            {profile.maxOutput ? `${tokens(profile.maxOutput)} tokens` : 'Not reported'}
          </p>
          <p className="duo-text">
            {profile.maxOutput
              ? `About ${approxWords(profile.maxOutput)} words, or ${approxPages(profile.maxOutput)}, in one reply.`
              : 'The provider has not published an output limit.'}
          </p>
        </section>
        <section className="profile-card" aria-labelledby="words-heading">
          <div className="profile-card-head">
            <h2 id="words-heading">Cost per 1,000 words</h2>
          </div>
          {cheapest ? (
            <>
              <p className="duo-figure">{cost(cheapest.inputPrice! * perThousandWords)} to read</p>
              <p className="duo-text">
                {cost(cheapest.outputPrice! * perThousandWords)} to write, at {cheapest.provider}’s
                list price.
              </p>
            </>
          ) : (
            <p className="duo-text">No listed price.</p>
          )}
        </section>
      </div>

      <section className="profile-card" aria-labelledby="knowledge-heading">
        <div className="profile-card-head">
          <h2 id="knowledge-heading">What it knows about</h2>
          <p>
            {profile.knowledge
              ? `Its training data runs to ${day(profile.knowledge)}. It will not know about later events unless you give it the information, for example through web search.`
              : 'The training-data cutoff is not reported. Assume it does not know about recent events unless you give it the information.'}
          </p>
        </div>
      </section>
      <Sources bucket={bucket} />
    </div>
  );
}
