import { useMemo, useState, type ReactNode } from 'react';
import { makerColor, makerLogo } from '../../shared/makers';
import { PageHeading } from '../components/Layout';
import { MetricBars } from '../components/charts/MetricBars';
import { TrendChart, type TrendChartSeries } from '../components/charts/TrendChart';
import { ImageBoard, ScoreRows, scoreScale, type ScoreRow } from '../components/images/ImageBoard';
import { whole } from '../components/profile/format';
import { useImages, type ImageBoard as Board, type ImageEntry, type Images } from '../lib/overview';
import '../components/home/dashboard.css';
import './models.css';
import './images.css';

const SECTIONS: [string, string][] = [
  ['text-to-image', 'Text to image'],
  ['categories', 'Categories'],
  ['makers', 'Makers'],
  ['progress', 'Progress'],
  ['image-editing', 'Image editing'],
  ['test', 'Automated test'],
  ['faq', 'Questions'],
];

const time = (date: string) => new Date(`${date}T00:00:00Z`).getTime();
const list = (names: string[]) =>
  names.length <= 1 ? names.join('') : `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`;

/** The overall ranking of a board, best first. */
const overallOf = (board: Board) =>
  board.categories.find((category) => category.id === 'overall')?.entries ?? [];

function ModelName({ board, entry }: { board: Board; entry: ImageEntry }) {
  const model = board.models[entry.model];
  return (
    <span className="glance-model">
      <img src={makerLogo(model.makerId)} alt="" width="22" height="22" loading="lazy" />
      <b>{model.name}</b>
    </span>
  );
}

function Summary({ images }: { images: Images }) {
  const [text, edit] = [
    images.boards.find((board) => board.id === 'text-to-image'),
    images.boards.find((board) => board.id === 'image-edit'),
  ];
  const rows: [string, ReactNode][] = [];
  if (text) {
    const [first, second] = overallOf(text);
    if (first && second)
      rows.push([
        'Leader',
        <p key="leader">
          <ModelName board={text} entry={first} /> leads text to image at {Math.round(first.rating)}
          , {Math.round(first.rating - second.rating)} points ahead of{' '}
          {text.models[second.model].name}.{' '}
          {first.lower <= second.upper
            ? 'Their 95% ranges overlap, so the order at the top is not settled.'
            : 'Their 95% ranges do not overlap: a clear lead.'}
        </p>,
      ]);
    const open = overallOf(text).find((entry) => text.models[entry.model].open);
    if (open && first)
      rows.push([
        'Open weights',
        <p key="open">
          The best open-weights model, <ModelName board={text} entry={open} /> (
          {text.models[open.model].license}), ranks #{open.rank} at {Math.round(open.rating)},{' '}
          {Math.round(first.rating - open.rating)} points behind the leader.
        </p>,
      ]);
    const leaders = text.categories
      .filter((category) => category.id !== 'overall')
      .map((category) => ({ category, entry: category.entries[0] }))
      .filter(({ entry }) => entry);
    const others = leaders.filter(({ entry }) => entry.model !== first?.model);
    if (first && leaders.length)
      rows.push([
        'Categories',
        <p key="categories">
          {text.models[first.model].name} also leads{' '}
          {others.length
            ? `${leaders.length - others.length} of the ${leaders.length}`
            : `all ${leaders.length}`}{' '}
          categories
          {others.length
            ? `; ${list(
                others.map(
                  ({ category, entry }) =>
                    `${text.models[entry.model].name} leads ${category.label.toLowerCase()}`,
                ),
              )}`
            : ''}
          .
        </p>,
      ]);
    const fresh = overallOf(text).filter((entry) => text.models[entry.model].isNew);
    if (fresh.length)
      rows.push([
        'New',
        <p key="new">
          New on the board in the last month:{' '}
          {list(fresh.map((entry) => text.models[entry.model].name))}.
        </p>,
      ]);
  }
  if (edit) {
    const [first] = overallOf(edit);
    if (first)
      rows.push([
        'Editing',
        <p key="editing">
          <ModelName board={edit} entry={first} /> leads image editing at {Math.round(first.rating)}
          , out of {edit.models.length} models.
        </p>,
      ]);
  }
  return (
    <dl className="glance-sentences">
      {rows.map(([label, sentence]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>{sentence}</dd>
        </div>
      ))}
    </dl>
  );
}

/**
 * Every category's top model from each of its three leading makers, overall
 * first. One maker's versions often fill a whole top three, which would hide
 * how the categories differ.
 */
function CategoryLeaders({ board }: { board: Board }) {
  const leadersOf = (entries: ImageEntry[]) => {
    const seen = new Set<string>();
    return entries.filter((entry) => {
      const { makerId } = board.models[entry.model];
      if (seen.has(makerId) || seen.size === 3) return false;
      seen.add(makerId);
      return true;
    });
  };
  return (
    <div className="image-categories">
      {board.categories.map((category) => (
        <div key={category.id} className="dash-panel image-category">
          <h3>{category.label}</h3>
          <ol aria-label={`${category.label}: the leading three makers’ best models`}>
            {leadersOf(category.entries).map((entry) => {
              const model = board.models[entry.model];
              return (
                <li key={model.arenaName}>
                  <span className="image-category-place">
                    <span className="sr-only">Rank </span>
                    {entry.rank}
                  </span>
                  <img
                    src={makerLogo(model.makerId)}
                    alt=""
                    width="20"
                    height="20"
                    loading="lazy"
                  />
                  <span className="image-category-name">{model.name}</span>
                  <b>{Math.round(entry.rating)}</b>
                </li>
              );
            })}
          </ol>
        </div>
      ))}
    </div>
  );
}

/** Each maker's best model on the board. */
function MakerBests({ board, credit }: { board: Board; credit: string }) {
  const rows = useMemo(() => {
    const seen = new Set<string>();
    const out: ScoreRow[] = [];
    for (const entry of overallOf(board)) {
      const model = board.models[entry.model];
      if (model.makerId === 'unknown' || seen.has(model.makerId)) continue;
      seen.add(model.makerId);
      out.push({
        key: model.makerId,
        name: model.maker,
        detail: model.name,
        makerId: model.makerId,
        rating: entry.rating,
        lower: entry.lower,
        upper: entry.upper,
      });
    }
    return out.slice(0, 12);
  }, [board]);
  if (!rows.length) return null;
  return (
    <div className="dash-panel image-board">
      <div className="dash-panel-head">
        <div>
          <h3>Each maker’s best text-to-image model</h3>
          <p>The highest-scoring model from each of the {rows.length} leading makers.</p>
        </div>
      </div>
      <ScoreRows
        rows={rows}
        scale={scoreScale(rows)}
        label="Each maker’s best text-to-image model, highest first"
      />
      <div className="dash-foot">
        <p>Dots mark the Arena score; the line is its 95% range. {credit}.</p>
      </div>
    </div>
  );
}

function questions(images: Images): [string, string][] {
  const text = images.boards.find((board) => board.id === 'text-to-image');
  const edit = images.boards.find((board) => board.id === 'image-edit');
  const out: [string, string][] = [];
  const name = (board: Board, entry: ImageEntry) => board.models[entry.model].name;
  if (text) {
    const [first, second, third] = overallOf(text);
    if (first && second && third)
      out.push([
        'Which is the best AI image generator?',
        `On Arena’s text-to-image board, ${name(text, first)} scores highest at ${Math.round(first.rating)}, from ${whole(first.votes)} votes, ahead of ${name(text, second)} (${Math.round(second.rating)}) and ${name(text, third)} (${Math.round(third.rating)}). The best model for your work can differ by category, such as photos, portraits or text in images.`,
      ]);
    const open = overallOf(text).filter((entry) => text.models[entry.model].open);
    if (open[0])
      out.push([
        'What is the best open-weights image model?',
        `${name(text, open[0])} ranks highest among models with downloadable weights, #${open[0].rank} overall at ${Math.round(open[0].rating)}, under the ${text.models[open[0].model].license}.${open[1] ? ` Next is ${name(text, open[1])} at #${open[1].rank}.` : ''} Check each licence: several allow only non-commercial use.`,
      ]);
    for (const [id, question] of [
      ['photorealistic', 'Which AI makes the most realistic photos?'],
      ['text_rendering', 'Which AI is best at putting text in images?'],
      ['portraits', 'Which AI is best for portraits?'],
    ] as const) {
      const leader = text.categories.find((category) => category.id === id)?.entries[0];
      if (leader)
        out.push([
          question,
          `${name(text, leader)} leads Arena’s ${text.categories.find((category) => category.id === id)!.label.toLowerCase()} category at ${Math.round(leader.rating)}. Categories use only the votes on prompts of that kind.`,
        ]);
    }
  }
  if (edit) {
    const [first, second] = overallOf(edit);
    if (first && second)
      out.push([
        'Which AI is best at editing images?',
        `${name(edit, first)} leads Arena’s image-editing board at ${Math.round(first.rating)}, ahead of ${name(edit, second)} (${Math.round(second.rating)}). People compare two edits of the same image and instruction.`,
      ]);
  }
  out.push([
    'How are the image models ranked?',
    'Arena shows a visitor two images made from the same prompt by two anonymous models and asks which is better. Only after voting are the models named. Millions of these votes give each model a score, on a scale like chess ratings: a higher score wins more often. The 95% range shows how sure the score is; where two ranges overlap, their order is not settled.',
  ]);
  out.push([
    'Does Artificials run these votes?',
    'No. The votes and scores come from Arena’s published leaderboard dataset. Artificials tidies the model names, matches models to their makers and builds the charts, category summaries and progress lines from that data.',
  ]);
  return out;
}

function ImagesContent({ images }: { images: Images }) {
  const text = images.boards.find((board) => board.id === 'text-to-image');
  const edit = images.boards.find((board) => board.id === 'image-edit');
  const arena = images.sources.find((source) => source.id === 'arena');
  const corebench = images.sources.find((source) => source.id === 'corebench');
  const credit = arena ? `${arena.name} (${arena.license})` : 'Arena';
  const progress = useMemo(
    (): TrendChartSeries[] =>
      (text?.progress ?? []).map((entry) => ({
        id: entry.makerId,
        label: entry.maker,
        color: makerColor(entry.makerId),
        makerId: entry.makerId,
        points: entry.points.map((point) => ({
          x: time(point.date),
          y: point.value,
          name: point.name,
        })),
      })),
    [text],
  );
  const faq = useMemo(() => questions(images), [images]);
  const schema = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faq.map(([question, answer]) => ({
      '@type': 'Question',
      name: question,
      acceptedAnswer: { '@type': 'Answer', text: answer },
    })),
  }).replace(/</g, '\\u003c');
  const sections = SECTIONS.filter(
    ([id]) =>
      (id !== 'image-editing' || edit) &&
      (id !== 'test' || images.test.length) &&
      (!['text-to-image', 'categories', 'makers', 'progress'].includes(id) || text),
  );
  return (
    <div className="models-hub">
      <nav className="hub-sections" aria-label="On this page">
        {sections.map(([id, label]) => (
          <a key={id} href={`#${id}`}>
            {label}
          </a>
        ))}
      </nav>
      {text && (
        <section className="dash-panel" aria-labelledby="glance-title">
          <div className="dash-panel-head">
            <div>
              <h2 id="glance-title">At a glance</h2>
              <p>What people’s votes say about today’s image models.</p>
            </div>
          </div>
          <Summary images={images} />
        </section>
      )}

      {text && (
        <>
          <section id="text-to-image" aria-labelledby="text-title" className="hub-section">
            <header className="dash-heading">
              <h2 id="text-title">Text to image</h2>
              <p>{text.models.length} models, ranked by blind votes on the same prompt.</p>
            </header>
            <ImageBoard
              board={text}
              text="Arena score, higher is better. Pick a kind of image, or show only models with downloadable weights."
              credit={credit}
            />
          </section>

          <section id="categories" aria-labelledby="categories-title" className="hub-section">
            <header className="dash-heading">
              <h2 id="categories-title">The best model for each kind of image</h2>
              <p>
                The top model from each of the three leading makers, with its rank, from the votes
                on prompts of that kind.
              </p>
            </header>
            <CategoryLeaders board={text} />
          </section>

          <section id="makers" aria-labelledby="makers-title" className="hub-section">
            <header className="dash-heading">
              <h2 id="makers-title">Makers</h2>
              <p>Where each company’s best image model stands.</p>
            </header>
            <MakerBests board={text} credit={credit} />
          </section>

          {progress.length > 0 && (
            <section id="progress" aria-labelledby="progress-title" className="hub-section">
              <header className="dash-heading">
                <h2 id="progress-title">Progress</h2>
                <p>How the leading makers’ best scores have moved, month by month.</p>
              </header>
              <div className="dash-panel">
                <div className="dash-panel-head">
                  <div>
                    <h3>Best text-to-image score, by maker</h3>
                    <p>
                      Each point is a maker’s best model at the end of a month. Select a maker in
                      the legend to hide or show it.
                    </p>
                  </div>
                </div>
                <TrendChart
                  series={progress}
                  mode="line"
                  y={{ label: 'Arena score', format: (value) => `${Math.round(value)}` }}
                  label="Best text-to-image Arena score by maker, month by month"
                />
                <div className="dash-foot">
                  <p>
                    Arena recomputes every score at each publication, and the scale shifts as models
                    join, so read the lines for who led and when more than for exact gains. {credit}
                    .
                  </p>
                </div>
              </div>
            </section>
          )}
        </>
      )}

      {edit && (
        <section id="image-editing" aria-labelledby="edit-title" className="hub-section">
          <header className="dash-heading">
            <h2 id="edit-title">Image editing</h2>
            <p>
              {edit.models.length} models changing a picture on instruction, ranked the same way.
            </p>
          </header>
          <ImageBoard
            board={edit}
            text="Arena score for edits of the same image and instruction, higher is better."
            credit={credit}
          />
        </section>
      )}

      {images.test.length > 0 && (
        <section id="test" aria-labelledby="test-title" className="hub-section">
          <header className="dash-heading">
            <h2 id="test-title">An automated test</h2>
            <p>
              Votes measure what people prefer. T2I-CoReBench checks something else: whether a model
              draws exactly what a complex prompt asks for.
            </p>
          </header>
          <div className="dash-panel">
            <MetricBars
              title="Composition and reasoning"
              caption="T2I-CoReBench score, higher is better. Its models and versions can differ from Arena’s."
              rows={images.test.slice(0, 12).map((row) => ({
                key: row.name,
                label: row.name,
                detail: row.maker,
                makerId: row.makerId,
                value: row.score,
              }))}
              format={(value) => value.toFixed(1)}
              share={{
                title: 'Text-to-image composition and reasoning: T2I-CoReBench',
                subtitle:
                  'Whether a model draws exactly what a complex prompt asks for. Higher is better.',
                source: corebench ? `${corebench.name} (${corebench.license})` : 'T2I-CoReBench',
              }}
            />
          </div>
        </section>
      )}

      <section id="faq" aria-labelledby="faq-title" className="hub-section">
        <header className="dash-heading">
          <h2 id="faq-title">Frequently asked questions</h2>
          <p>Answered from the data on this page.</p>
        </header>
        <div className="dash-panel faq-items hub-faq">
          {faq.map(([question, answer]) => (
            <details key={question}>
              <summary>{question}</summary>
              <p>{answer}</p>
            </details>
          ))}
        </div>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: schema }} />
      </section>

      <details className="profile-sources coding-sources">
        <summary>Sources and method</summary>
        <div>
          <p>
            Artificials does not run these votes or tests. Scores, ranges, votes and licences come
            from the sources below; Artificials tidies the model names for reading, matches each
            model to its maker, and builds the category summaries, maker comparison and progress
            lines. Categories that cover fewer than twenty models are left out.
          </p>
          <ul>
            {images.sources.map((source) => (
              <li key={source.id}>
                <a href={source.url} target="_blank" rel="noopener noreferrer">
                  {source.name}
                </a>
                {source.dataUrl && (
                  <>
                    {' '}
                    (
                    <a href={source.dataUrl} target="_blank" rel="noopener noreferrer">
                      leaderboard dataset
                    </a>
                    )
                  </>
                )}
                ,{' '}
                <a href={source.licenseUrl} target="_blank" rel="noopener noreferrer">
                  {source.license}
                </a>
                .
              </li>
            ))}
          </ul>
        </div>
      </details>
    </div>
  );
}

export default function ImageModels({ initial }: { initial?: Images }) {
  const [attempt, setAttempt] = useState(0);
  const { data, error } = useImages(attempt, initial);
  return (
    <div className="container page models-page images-page">
      <PageHeading
        eyebrow="IMAGE MODELS"
        title="The best AI image models, ranked by people."
        text="Arena shows people two images made from the same prompt, without naming the models, and asks which is better. Millions of those votes decide these rankings."
      />
      {error && !data ? (
        <div className="dash-state" role="alert">
          <p>{error}</p>
          <button className="btn btn-small" onClick={() => setAttempt((value) => value + 1)}>
            Try again
          </button>
        </div>
      ) : !data ? (
        <div className="dash-state dash-pending is-tall" role="status">
          Loading image models…
        </div>
      ) : (
        <ImagesContent images={data} />
      )}
    </div>
  );
}
