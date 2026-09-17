import '../academy.css';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Check,
  CheckCircle2,
  Clock3,
  Code2,
  Copy,
  Download,
  ChevronDown,
  List,
  Terminal,
} from 'lucide-react';
import { academy, loadLesson, useAcademyProgress, type Lesson } from '../lib/academy';
import { EmptyState } from '../components/Layout';
import { AuthorBadge } from '../components/AuthorBadge';
import { ConceptLab } from '../components/ConceptLab';

export default function AcademyLesson() {
  const { slug = '' } = useParams();
  const [state, setState] = useState<{
    slug: string;
    lesson: Lesson | null;
    error?: boolean;
  } | null>(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    void loadLesson(slug)
      .then((lesson) => {
        if (active) setState({ slug, lesson });
      })
      .catch(() => {
        if (active) setState({ slug, lesson: null, error: true });
      });
    return () => {
      active = false;
    };
  }, [slug, attempt]);
  if (!state || state.slug !== slug)
    return (
      <div className="loading-panel" role="status">
        Opening your lesson…
      </div>
    );
  if (state.error)
    return (
      <div className="empty-state">
        <h1>The lesson could not load.</h1>
        <p>Check your connection and try again.</p>
        <button
          className="btn"
          onClick={() => {
            setState(null);
            setAttempt((n) => n + 1);
          }}
        >
          Try again
        </button>
      </div>
    );
  if (!state.lesson)
    return (
      <EmptyState
        title="Lesson not found."
        text="Choose a lesson from the Academy curriculum."
        link="/learn"
        label="Explore Learn AI"
      />
    );
  return <LessonReader key={slug} lesson={state.lesson} />;
}
function LessonReader({ lesson }: { lesson: Lesson }) {
  const { completed, update } = useAcademyProgress();
  const [selected, setSelected] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [practiced, setPracticed] = useState(false);
  const [copyStatus, setCopyStatus] = useState('Copy code');
  const module = academy.modules.find((item) => item.id === lesson.module)!;
  const position = academy.lessons.findIndex((item) => item.slug === lesson.slug);
  const previous = academy.lessons[position - 1];
  const next = academy.lessons[position + 1];
  const done = completed.includes(lesson.slug);
  const correct = submitted && selected === lesson.quiz.answer;
  useEffect(() => {
    document.title = `${lesson.title} — Artificials Academy`;
  }, [lesson.title]);
  async function copyCode() {
    try {
      await navigator.clipboard.writeText(lesson.code.source);
      setCopyStatus('Copied');
    } catch {
      setCopyStatus('Copy unavailable — select the code or download');
    }
  }
  function downloadCode() {
    const blob = new Blob(
      [
        `# Artificials Academy — ${lesson.title}\n# Original educational example; run locally with Python 3.11+.\n\n${lesson.code.source}`,
      ],
      { type: 'text/x-python;charset=utf-8' },
    );
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = lesson.code.filename;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  const moduleLessons = academy.lessons.filter((item) => item.module === lesson.module);
  return (
    <div className="container lesson-page">
      <div className="lesson-breadcrumb">
        <Link to="/learn">
          <ArrowLeft size={14} /> Learn AI
        </Link>
        <span>/</span>
        <span>{module.label}</span>
      </div>
      <div className="lesson-layout">
        <aside className="lesson-sidebar" aria-label="Module lessons">
          <details open>
            <summary>
              <List size={16} /> In this module <ChevronDown size={14} />
            </summary>
            <span className="eyebrow">
              MODULE {String(academy.modules.indexOf(module) + 1).padStart(2, '0')}
            </span>
            <h2>{module.title}</h2>
            <nav>
              {moduleLessons.map((item, i) => (
                <Link
                  key={item.slug}
                  to={`/learn/${item.slug}`}
                  aria-current={item.slug === lesson.slug ? 'page' : undefined}
                >
                  <span>
                    {completed.includes(item.slug) ? (
                      <Check size={13} />
                    ) : (
                      String(i + 1).padStart(2, '0')
                    )}
                  </span>
                  {item.title}
                </Link>
              ))}
            </nav>
            <div className="lesson-sidebar-progress">
              <progress
                aria-label="Module completion"
                max={moduleLessons.length}
                value={moduleLessons.filter((item) => completed.includes(item.slug)).length}
              />
              <span>
                {moduleLessons.filter((item) => completed.includes(item.slug)).length} of{' '}
                {moduleLessons.length} completed
              </span>
            </div>
            <Link className="text-link" to="/learn#curriculum">
              View all modules
              <ArrowUpRight size={13} />
            </Link>
          </details>
        </aside>
        <article className="lesson-content">
          <header className="lesson-header">
            <div className="lesson-tags">
              <span className="eyebrow">
                LESSON {String(position + 1).padStart(2, '0')} / {academy.lessons.length}
              </span>
              <span className="academy-level">{lesson.level}</span>
              <span>
                <Clock3 size={13} /> {lesson.minutes} min with practice
              </span>
            </div>
            <h1>{lesson.title}</h1>
            <p>{lesson.summary}</p>
            <AuthorBadge />
          </header>
          <nav className="lesson-anchor-nav" aria-label="Lesson sections">
            <a href="#theory">Theory</a>
            <a href="#code">Code</a>
            <a href="#practice">Practice</a>
            <a href="#knowledge-check">Knowledge check</a>
          </nav>
          <section className="lesson-objectives">
            <span className="eyebrow">
              <BookOpen size={15} /> WHAT YOU WILL LEARN
            </span>
            <ul>
              {lesson.objectives.map((objective) => (
                <li key={objective}>
                  <Check size={15} />
                  {objective}
                </li>
              ))}
            </ul>
          </section>
          <div className="lesson-theory" id="theory">
            {lesson.sections.map((section) => (
              <section key={section.title}>
                <h2>{section.title}</h2>
                {section.paragraphs.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </section>
            ))}
          </div>
          {(lesson.slug === 'precision-recall-and-thresholds' ||
            lesson.slug === 'neurons-and-activations') && (
            <ConceptLab type={lesson.slug === 'neurons-and-activations' ? 'neuron' : 'threshold'} />
          )}
          <section className="lesson-code-section" id="code">
            <span className="eyebrow">
              <Code2 size={16} /> PUT THE IDEA INTO CODE
            </span>
            <h2>A small experiment you can run.</h2>
            <p>{lesson.code.explanation}</p>
            <div className="lesson-code">
              <div className="code-toolbar">
                <span>
                  <Terminal size={15} />
                  {lesson.code.filename}
                </span>
                <button onClick={() => void copyCode()} aria-label="Copy Python code">
                  <Copy size={14} />
                  <span>{copyStatus === 'Copied' ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <pre tabIndex={0} aria-label="Python example">
                <code>{lesson.code.source}</code>
              </pre>
              <div className="code-footer">
                <span>PYTHON 3.11+ · STANDARD LIBRARY</span>
                <button className="text-link" onClick={downloadCode}>
                  <Download size={14} />
                  Download .py
                </button>
              </div>
            </div>
            <span className="sr-only" role="status">
              {copyStatus}
            </span>
            <div className="run-instructions">
              <Terminal size={17} />
              <p>
                Save the file, open your terminal in that folder, and run{' '}
                <code>python {lesson.code.filename}</code>. Use <code>python3</code> or{' '}
                <code>py</code> if required by your installation.{' '}
                <Link to="/learn/your-python-workspace">
                  Setup guide <ArrowUpRight size={12} />
                </Link>
              </p>
            </div>
            <div className="lesson-expected">
              <strong>What to expect</strong>
              <p>{lesson.practice.expected}</p>
            </div>
          </section>
          <section className="lesson-practice" id="practice">
            <span className="eyebrow">YOUR TURN</span>
            <h2>{lesson.practice.goal}</h2>
            <ol>
              {lesson.practice.steps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
            <details className="lesson-solution">
              <summary>
                Compare with a suggested solution
                <ChevronDown size={16} />
              </summary>
              <p>{lesson.practice.solution}</p>
            </details>
            <label className="practice-confirm">
              <input
                type="checkbox"
                checked={practiced}
                onChange={(e) => setPracticed(e.target.checked)}
              />
              I have worked through the practice task.
            </label>
          </section>
          <section className="lesson-quiz" id="knowledge-check">
            <span className="eyebrow">CHECK YOUR UNDERSTANDING</span>
            <h2>One idea to take with you.</h2>
            <fieldset>
              <legend>{lesson.quiz.question}</legend>
              {lesson.quiz.options.map((option, i) => (
                <label
                  className={selected === i ? 'quiz-option is-selected' : 'quiz-option'}
                  key={option}
                >
                  <input
                    type="radio"
                    name={`quiz-${lesson.slug}`}
                    checked={selected === i}
                    onChange={() => {
                      setSelected(i);
                      setSubmitted(false);
                    }}
                  />
                  <span>{option}</span>
                </label>
              ))}
            </fieldset>
            <button
              className="btn btn-outline"
              disabled={selected === null}
              onClick={() => setSubmitted(true)}
            >
              Check answer
              <ArrowRight size={15} />
            </button>
            {submitted && (
              <div className={correct ? 'quiz-feedback is-correct' : 'quiz-feedback'} role="status">
                <strong>{correct ? 'That’s right.' : 'Not quite. Try again.'}</strong>
                <p>
                  {correct
                    ? lesson.quiz.explanation
                    : 'Revisit the theory above and choose another answer. You can retry as often as you need.'}
                </p>
              </div>
            )}
          </section>
          <section className="lesson-completion">
            <div>
              <CheckCircle2 size={23} />
              <h2>{done ? 'One more idea, understood.' : 'Make it part of your progress.'}</h2>
              <p>
                {done
                  ? 'This lesson is marked complete in this browser.'
                  : 'Finish the practice and answer the knowledge check to mark this lesson complete.'}
              </p>
            </div>
            <button
              className={done ? 'btn btn-outline' : 'btn'}
              disabled={!done && (!correct || !practiced)}
              onClick={() => update(lesson.slug, !done)}
            >
              {done ? 'Mark as incomplete' : 'Mark lesson complete'}
              <Check size={16} />
            </button>
            <span className="sr-only" role="status">
              {done ? 'Lesson completed' : ''}
            </span>
          </section>
          <div className="lesson-pagination">
            {previous ? (
              <Link to={`/learn/${previous.slug}`}>
                <ArrowLeft size={16} />
                <span>
                  <small>PREVIOUS LESSON</small>
                  {previous.title}
                </span>
              </Link>
            ) : (
              <span />
            )}
            {next ? (
              <Link to={`/learn/${next.slug}`}>
                <span>
                  <small>NEXT LESSON</small>
                  {next.title}
                </span>
                <ArrowRight size={16} />
              </Link>
            ) : (
              <Link to="/learn">
                <span>
                  <small>YOUR LEARNING PATH</small>Back to the Academy
                </span>
                <ArrowRight size={16} />
              </Link>
            )}
          </div>
          <details className="lesson-references">
            <summary>Go deeper with primary documentation</summary>
            <p>
              Optional references for further study. This lesson and its examples were written for
              Artificials.
            </p>
            {module.references.map((reference) => (
              <a href={reference.url} key={reference.url} target="_blank" rel="noopener noreferrer">
                {reference.title}
                <ArrowUpRight size={13} />
              </a>
            ))}
          </details>
        </article>
      </div>
    </div>
  );
}
