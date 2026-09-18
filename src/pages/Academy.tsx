import { Select } from '../components/Select';
import '../academy.css';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Check,
  Clock3,
  Code2,
  Layers3,
  Search,
  Terminal,
  GraduationCap,
} from 'lucide-react';
import { academy, learningTime, totalMinutes, useAcademyProgress } from '../lib/academy';
import { Reveal } from '../components/Motion';
import { ConceptLab } from '../components/ConceptLab';
export default function Academy() {
  const [query, setQuery] = useState('');
  const [track, setTrack] = useState('all');
  const { completed } = useAcademyProgress();
  const next =
    academy.lessons.find((lesson) => !completed.includes(lesson.slug)) || academy.lessons[0];
  const matches = academy.lessons.filter(
    (lesson) =>
      (track === 'all' || lesson.module === track) &&
      `${lesson.title} ${lesson.summary} ${lesson.level}`
        .toLowerCase()
        .includes(query.trim().toLowerCase()),
  );
  return (
    <div className="academy-page">
      <section className="academy-hero container">
        <div className="academy-intro">
          <span className="eyebrow">
            <GraduationCap size={16} /> ARTIFICIALS ACADEMY
          </span>
          <h1>
            Understand it.
            <br />
            <span>Then build it.</span>
          </h1>
          <p>
            Go from your first line of Python to your first working AI system. Clear explanations,
            real code, and room to experiment.
          </p>
          <div className="hero-actions">
            <Link className="btn" to={`/learn/${next.slug}`}>
              {completed.length ? 'Continue learning' : 'Start learning'}
              <ArrowUpRight size={17} />
            </Link>
            <a className="btn btn-outline" href="#curriculum">
              Explore the curriculum
              <ArrowRight size={16} />
            </a>
          </div>
          <div className="academy-promises">
            <span>
              <Check size={13} /> Free, without an account
            </span>
            <span>
              <Check size={13} /> No paid API required
            </span>
          </div>
        </div>
        <div className="academy-terminal" aria-label="A preview of your learning journey">
          <div className="terminal-top">
            <span>
              <Terminal size={15} /> YOUR NEXT CHAPTER
            </span>
            <span className="terminal-dots">
              <i />
              <i />
              <i />
            </span>
          </div>
          <div className="academy-terminal-art">
            <img
              src="/editorial/engineering-small.webp"
              alt="Floating silver layers around a computational core"
              width="640"
              height="427"
            />
            <span className="mono">FROM FIRST PRINCIPLES TO FIRST PROJECT</span>
          </div>
          <div className="terminal-code">
            <span className="code-comment"># curiosity is the prerequisite</span>
            <code>
              <b>for</b> idea <b>in</b> your_curiosity:
              <br />
              &nbsp;&nbsp;&nbsp;&nbsp;understand(idea)
              <br />
              &nbsp;&nbsp;&nbsp;&nbsp;experiment(idea)
              <br />
              &nbsp;&nbsp;&nbsp;&nbsp;<span>build_something_real()</span>
            </code>
          </div>
          <div className="terminal-bottom">
            <span className="signal-light" /> YOUR LEARNING ENVIRONMENT IS READY
          </div>
        </div>
      </section>
      <div className="academy-stats container">
        {[
          [BookOpen, String(academy.lessons.length), 'Original lessons'],
          [Layers3, String(academy.modules.length), 'Learning modules'],
          [
            Code2,
            String(academy.lessons.filter((lesson) => lesson.module === 'projects').length),
            'Complete projects',
          ],
          [Clock3, learningTime(totalMinutes), 'Estimated with practice'],
        ].map(([Icon, value, label]) => {
          const I = Icon as typeof BookOpen;
          return (
            <div key={String(label)}>
              <I size={19} strokeWidth={1.4} />
              <strong>{String(value)}</strong>
              <span>{String(label)}</span>
            </div>
          );
        })}
      </div>
      <section className="container academy-curriculum" id="curriculum">
        <div className="section-kicker mono">
          <span>01 / YOUR LEARNING PATH</span>
          <span>FOUNDATIONS → APPLIED AI</span>
        </div>
        <div className="section-heading">
          <div>
            <h2>
              A little theory.
              <br />
              <span>A lot of understanding.</span>
            </h2>
            <p>Follow the path in order, or find the concept you need today.</p>
          </div>
          <div className="academy-progress">
            <span>
              <strong>{completed.length}</strong> / {academy.lessons.length} completed
            </span>
            <progress
              aria-label="Overall learning progress"
              value={completed.length}
              max={academy.lessons.length}
            />
            <small>Saved in this browser. No account sync.</small>
          </div>
        </div>
        <div className="academy-controls">
          <label className="search-field">
            <Search size={17} />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Find a lesson, concept, or project"
              aria-label="Search academy lessons"
            />
          </label>
          <label className="academy-select">
            Topic
            <Select
              value={track}
              onValueChange={(value) => setTrack(value)}
              aria-label="Filter academy by topic"
            >
              <option value="all">All modules</option>
              {academy.modules.map((module) => (
                <option key={module.id} value={module.id}>
                  {module.label}
                </option>
              ))}
            </Select>
          </label>
        </div>
        <p className="academy-result-count" aria-live="polite">
          {matches.length} lessons · Every lesson includes theory, Python code, a practice task, and
          a knowledge check.
        </p>
        <div className="academy-module-grid">
          {academy.modules.map((module, i) => {
            const lessons = matches.filter((lesson) => lesson.module === module.id);
            if (!lessons.length) return null;
            const moduleLessons = academy.lessons.filter((lesson) => lesson.module === module.id);
            const done = moduleLessons.filter((lesson) => completed.includes(lesson.slug)).length;
            return (
              <Reveal key={module.id}>
                <article className="academy-module">
                  <div className="module-topline">
                    <span className="module-number">{String(i + 1).padStart(2, '0')}</span>
                    <span className="academy-level">{module.level}</span>
                    <span className="module-completion">
                      {done} / {moduleLessons.length}
                    </span>
                  </div>
                  <div className="module-title">
                    <span className="eyebrow">{module.label}</span>
                    <h3>{module.title}</h3>
                    <p>{module.description}</p>
                  </div>
                  <ol className="module-lessons">
                    {lessons.map((lesson) => (
                      <li key={lesson.slug}>
                        <Link to={`/learn/${lesson.slug}`}>
                          <span
                            className={
                              completed.includes(lesson.slug)
                                ? 'lesson-status is-done'
                                : 'lesson-status'
                            }
                          >
                            {completed.includes(lesson.slug) ? (
                              <Check size={12} aria-label="Completed" />
                            ) : (
                              <span />
                            )}
                          </span>
                          <span>
                            {lesson.title}
                            <small>
                              {lesson.minutes} min ·{' '}
                              {lesson.module === 'projects'
                                ? 'Guided project'
                                : 'Theory + practice'}
                            </small>
                          </span>
                          <ArrowUpRight size={15} />
                        </Link>
                      </li>
                    ))}
                  </ol>
                </article>
              </Reveal>
            );
          })}
        </div>
        {!matches.length && (
          <div className="empty-state">
            <Search size={24} />
            <h2>No lessons found.</h2>
            <p>Try Python, neural, privacy, or search.</p>
            <button
              className="btn btn-outline"
              onClick={() => {
                setQuery('');
                setTrack('all');
              }}
            >
              Clear filters
            </button>
          </div>
        )}
      </section>
      <section className="container academy-experiment">
        <div>
          <span className="section-kicker mono">02 / LEARN BY CHANGING SOMETHING</span>
          <h2>
            Less passive reading.
            <br />
            <span>More “now I get it.”</span>
          </h2>
          <p>
            What happens when a model becomes more selective? Move the slider and see the answer.
            Our interactive labs make abstract ideas tangible.
          </p>
          <Link className="text-link" to="/learn/precision-recall-and-thresholds">
            Explore the full lesson
            <ArrowUpRight size={15} />
          </Link>
        </div>
        <ConceptLab />
      </section>
      <section className="container academy-faq">
        <div>
          <span className="eyebrow">BEFORE YOU BEGIN</span>
          <h2>
            Bring curiosity.
            <br />
            We’ll bring the structure.
          </h2>
        </div>
        <div>
          {[
            [
              'Do I need coding experience?',
              'No. Start with Foundations, then Python. Later modules build on that knowledge. Every example is explained, and every practice task includes a solution to compare with your own approach.',
            ],
            [
              'What do I need to run the code?',
              'Python 3.11 or newer, a text editor, and a terminal on your own computer. All 36 examples use the standard library. No GPU, paid API, or package downloads are required for the lessons.',
            ],
            [
              'Can I run Python inside the website?',
              'The interactive concept labs run directly in your browser. Python examples have copy and download controls for local execution; the site does not run uploaded code on a server.',
            ],
            [
              'How is my progress saved?',
              'Completion is stored locally in this browser, without an account. Clearing site data removes it, and it does not automatically sync to another device. If browser storage is blocked, progress lasts only for the current page session.',
            ],
            [
              'What will I build?',
              'A support-message classifier, a study-note search engine, a neural network that learns XOR, and a local prediction API backed by SQLite. These are complete educational projects with explicit limits and extension exercises.',
            ],
          ].map(([question, answer]) => (
            <details key={question}>
              <summary>{question}</summary>
              <p>{answer}</p>
            </details>
          ))}
        </div>
      </section>
      <div className="container academy-editorial-note">
        <BookOpen size={17} />
        <p>
          Original lessons and examples by Artificials. Synthetic datasets are labeled throughout.
          Optional primary references are provided for deeper study; estimated times include the
          exercises.
        </p>
      </div>
    </div>
  );
}
