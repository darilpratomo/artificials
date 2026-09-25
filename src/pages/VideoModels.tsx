import { useMemo, useState, type ReactNode } from 'react';
import { makerColor } from '../../shared/makers';
import { PageHeading } from '../components/Layout';
import { TrendChart, type TrendChartSeries } from '../components/charts/TrendChart';
import {
  ArenaBoard,
  MakerBests,
  ModelName,
  list,
  overallOf,
  time,
} from '../components/arena/ArenaBoard';
import { whole } from '../components/profile/format';
import { useVideos, type Board, type BoardEntry, type Videos } from '../lib/overview';
import '../components/home/dashboard.css';
import './models.css';

const SECTIONS: [string, string][] = [
  ['text-to-video', 'Text to video'],
  ['image-to-video', 'Image to video'],
  ['makers', 'Makers'],
  ['progress', 'Progress'],
  ['video-editing', 'Video editing'],
  ['faq', 'Questions'],
];

const boardOf = (videos: Videos, id: string) => videos.boards.find((board) => board.id === id);

function Summary({ videos }: { videos: Videos }) {
  const text = boardOf(videos, 'text-to-video');
  const image = boardOf(videos, 'image-to-video');
  const edit = boardOf(videos, 'video-edit');
  const rows: [string, ReactNode][] = [];
  if (text) {
    const [first, second] = overallOf(text);
    if (first && second)
      rows.push([
        'Text to video',
        <p key="text">
          <ModelName board={text} entry={first} /> leads at {Math.round(first.rating)},{' '}
          {Math.round(first.rating - second.rating)} points ahead of{' '}
          {text.models[second.model].name}.{' '}
          {first.lower <= second.upper
            ? 'Their 95% ranges overlap, so the order at the top is not settled.'
            : 'Their 95% ranges do not overlap: a clear lead.'}
        </p>,
      ]);
  }
  if (image) {
    const [first, second] = overallOf(image);
    if (first && second)
      rows.push([
        'Image to video',
        <p key="image">
          <ModelName board={image} entry={first} /> leads at {Math.round(first.rating)}, ahead of{' '}
          {image.models[second.model].name} at {Math.round(second.rating)}.
        </p>,
      ]);
  }
  if (text) {
    const [first] = overallOf(text);
    const open = overallOf(text).find((entry) => text.models[entry.model].open);
    if (open && first)
      rows.push([
        'Open weights',
        <p key="open">
          The best open-weights model, <ModelName board={text} entry={open} /> (
          {text.models[open.model].license}), ranks #{open.rank} in text to video at{' '}
          {Math.round(open.rating)}, {Math.round(first.rating - open.rating)} points behind the
          leader.
        </p>,
      ]);
    // The maker, or makers, with the most models in the top ten.
    const counts = new Map<string, number>();
    for (const entry of overallOf(text).slice(0, 10)) {
      const { maker } = text.models[entry.model];
      counts.set(maker, (counts.get(maker) ?? 0) + 1);
    }
    const most = Math.max(0, ...counts.values());
    const leaders = [...counts].filter(([, count]) => count === most).map(([maker]) => maker);
    if (most > 1)
      rows.push([
        'Makers',
        <p key="makers">
          {leaders.length === 1
            ? `${leaders[0]} has ${most} of the top ten text-to-video models, more than any other maker.`
            : `${list(leaders)} each have ${most} of the top ten text-to-video models; no maker has more.`}
        </p>,
      ]);
    const fresh = overallOf(text).filter((entry) => text.models[entry.model].isNew);
    if (fresh.length)
      rows.push([
        'New',
        <p key="new">
          New on the text-to-video board in the last month:{' '}
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
          <ModelName board={edit} entry={first} /> leads video editing at {Math.round(first.rating)}
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

function questions(videos: Videos): [string, string][] {
  const out: [string, string][] = [];
  const name = (board: Board, entry: BoardEntry) => board.models[entry.model].name;
  const text = boardOf(videos, 'text-to-video');
  const image = boardOf(videos, 'image-to-video');
  const edit = boardOf(videos, 'video-edit');
  if (text) {
    const [first, second, third] = overallOf(text);
    if (first && second && third)
      out.push([
        'Which is the best AI video generator?',
        `On Arena’s text-to-video board, ${name(text, first)} scores highest at ${Math.round(first.rating)}, from ${whole(first.votes)} votes, ahead of ${name(text, second)} (${Math.round(second.rating)}) and ${name(text, third)} (${Math.round(third.rating)}).`,
      ]);
  }
  if (image) {
    const [first, second] = overallOf(image);
    if (first && second)
      out.push([
        'Which AI is best at turning a picture into a video?',
        `${name(image, first)} leads Arena’s image-to-video board at ${Math.round(first.rating)}, ahead of ${name(image, second)} (${Math.round(second.rating)}). People compare two videos made from the same starting image and prompt.`,
      ]);
  }
  if (text) {
    const open = overallOf(text).filter((entry) => text.models[entry.model].open);
    if (open[0])
      out.push([
        'What is the best open-weights video model?',
        `${name(text, open[0])} ranks highest among models with downloadable weights, #${open[0].rank} for text to video at ${Math.round(open[0].rating)}, under the ${text.models[open[0].model].license}.${open[1] ? ` Next is ${name(text, open[1])} at #${open[1].rank}.` : ''} Check each licence before you use a model.`,
      ]);
  }
  if (edit) {
    const [first] = overallOf(edit);
    if (first)
      out.push([
        'Which AI is best at editing videos?',
        `${name(edit, first)} leads Arena’s video-editing board at ${Math.round(first.rating)}. The board is still small, ${edit.models.length} models, so its order can change as more are added.`,
      ]);
  }
  out.push([
    'How are the video models ranked?',
    'Arena shows a visitor two videos made from the same prompt, or the same starting image, by two anonymous models and asks which is better. Only after voting are the models named. The votes give each model a score on a scale like chess ratings: a higher score wins more often. The 95% range shows how sure the score is.',
  ]);
  out.push([
    'Does Artificials run these votes?',
    'No. The votes and scores come from Arena’s published leaderboard dataset. Artificials tidies the model names, matches models to their makers and builds the summaries, maker comparison and progress lines from that data.',
  ]);
  return out;
}

function VideosContent({ videos }: { videos: Videos }) {
  const text = boardOf(videos, 'text-to-video');
  const image = boardOf(videos, 'image-to-video');
  const edit = boardOf(videos, 'video-edit');
  const arena = videos.sources.find((source) => source.id === 'arena');
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
  const faq = useMemo(() => questions(videos), [videos]);
  const schema = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faq.map(([question, answer]) => ({
      '@type': 'Question',
      name: question,
      acceptedAnswer: { '@type': 'Answer', text: answer },
    })),
  }).replace(/</g, '\\u003c');
  const present: Record<string, unknown> = {
    'text-to-video': text,
    'image-to-video': image,
    makers: text,
    progress: progress.length ? text : undefined,
    'video-editing': edit,
    faq: true,
  };
  if (!text && !image && !edit)
    return (
      <div className="dash-state" role="status">
        <p>The video leaderboards are not available yet. Please check back soon.</p>
      </div>
    );
  return (
    <div className="models-hub">
      <nav className="hub-sections" aria-label="On this page">
        {SECTIONS.filter(([id]) => present[id]).map(([id, label]) => (
          <a key={id} href={`#${id}`}>
            {label}
          </a>
        ))}
      </nav>
      <section className="dash-panel" aria-labelledby="glance-title">
        <div className="dash-panel-head">
          <div>
            <h2 id="glance-title">At a glance</h2>
            <p>What people’s votes say about today’s video models.</p>
          </div>
        </div>
        <Summary videos={videos} />
      </section>

      {text && (
        <section id="text-to-video" aria-labelledby="text-title" className="hub-section">
          <header className="dash-heading">
            <h2 id="text-title">Text to video</h2>
            <p>{text.models.length} models, ranked by blind votes on the same prompt.</p>
          </header>
          <ArenaBoard
            board={text}
            text="Arena score, higher is better. Show every model, or only those with downloadable weights."
            vote="Blind votes between two videos for the same prompt."
            credit={credit}
          />
        </section>
      )}

      {image && (
        <section id="image-to-video" aria-labelledby="image-title" className="hub-section">
          <header className="dash-heading">
            <h2 id="image-title">Image to video</h2>
            <p>
              {image.models.length} models bringing a still picture to life, ranked the same way.
            </p>
          </header>
          <ArenaBoard
            board={image}
            text="Arena score for videos made from the same starting image, higher is better."
            vote="Blind votes between two videos made from the same image."
            credit={credit}
          />
        </section>
      )}

      {text && (
        <section id="makers" aria-labelledby="makers-title" className="hub-section">
          <header className="dash-heading">
            <h2 id="makers-title">Makers</h2>
            <p>Where each company’s best text-to-video model stands.</p>
          </header>
          <MakerBests board={text} title="Each maker’s best text-to-video model" credit={credit} />
        </section>
      )}

      {text && progress.length > 0 && (
        <section id="progress" aria-labelledby="progress-title" className="hub-section">
          <header className="dash-heading">
            <h2 id="progress-title">Progress</h2>
            <p>How the leading makers’ best scores have moved, month by month.</p>
          </header>
          <div className="dash-panel">
            <div className="dash-panel-head">
              <div>
                <h3>Best text-to-video score, by maker</h3>
                <p>
                  Each point is a maker’s best model at the end of a month. Select a maker in the
                  legend to hide or show it.
                </p>
              </div>
            </div>
            <TrendChart
              series={progress}
              mode="line"
              y={{ label: 'Arena score', format: (value) => `${Math.round(value)}` }}
              label="Best text-to-video Arena score by maker, month by month"
            />
            <div className="dash-foot">
              <p>
                Arena recomputes every score at each publication, and the scale shifts as models
                join, so read the lines for who led and when more than for exact gains. {credit}.
              </p>
            </div>
          </div>
        </section>
      )}

      {edit && (
        <section id="video-editing" aria-labelledby="edit-title" className="hub-section">
          <header className="dash-heading">
            <h2 id="edit-title">Video editing</h2>
            <p>
              {edit.models.length} models changing a video on instruction. A young board: its order
              can move as models join.
            </p>
          </header>
          <ArenaBoard
            board={edit}
            text="Arena score for edits of the same video and instruction, higher is better."
            vote="Blind votes between two edits of the same video and instruction."
            credit={credit}
          />
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
            Artificials does not run these votes. Scores, ranges, votes and licences come from
            Arena’s published leaderboard dataset; Artificials tidies the model names for reading,
            matches each model to its maker, and builds the summaries, maker comparison and progress
            lines.
          </p>
          <ul>
            {videos.sources.map((source) => (
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

export default function VideoModels({ initial }: { initial?: Videos }) {
  const [attempt, setAttempt] = useState(0);
  const { data, error } = useVideos(attempt, initial);
  return (
    <div className="container page models-page arena-page videos-page">
      <PageHeading
        eyebrow="VIDEO MODELS"
        title="The best AI video models, ranked by people."
        text="Arena shows people two videos made from the same prompt or picture, without naming the models, and asks which is better. Those votes decide these rankings."
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
          Loading video models…
        </div>
      ) : (
        <VideosContent videos={data} />
      )}
    </div>
  );
}
