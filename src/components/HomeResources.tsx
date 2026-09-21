import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Check,
  Clock3,
  Code2,
  Cpu,
  Crop,
  FileImage,
  FileText,
  Files,
  ImageDown,
  Image as ImageIcon,
  Layers,
  LockKeyhole,
  Minimize2,
  RotateCw,
  Scissors,
  Stamp,
  Terminal,
  Trash2,
  Wrench,
  type LucideIcon,
} from 'lucide-react';
import academy from '../../shared/academy-index.json';
import { UTILITIES } from '../../shared/utilities';
import type { UtilityId } from '../lib/tools/types';
import { Reveal } from './Motion';

const toolIcons: Record<UtilityId, LucideIcon> = {
  'compress-image': ImageDown,
  'convert-image': ImageIcon,
  'crop-image': Crop,
  'watermark-image': Stamp,
  'compress-pdf': Minimize2,
  'merge-pdf': Layers,
  'extract-pdf': Scissors,
  'remove-pdf-pages': Trash2,
  'reorder-pdf': Files,
  'split-pdf': Scissors,
  'rotate-pdf': RotateCw,
  'pdf-to-images': FileImage,
  'images-to-pdf': Files,
  'pdf-to-word': FileText,
  'word-to-pdf': FileText,
};
const featuredIds = [
  'compress-image',
  'compress-pdf',
  'pdf-to-word',
  'word-to-pdf',
  'crop-image',
  'merge-pdf',
];
const paths = [
  {
    label: 'Start from zero',
    slug: 'what-ai-actually-does',
    icon: BookOpen,
    detail: 'Build your intuition before your first line of code.',
  },
  {
    label: 'Get hands-on with Python',
    slug: 'python-values-and-collections',
    icon: Code2,
    detail: 'Small programs. Clear explanations. Real practice.',
  },
  {
    label: 'Build your first AI project',
    slug: 'project-search-your-notes',
    icon: Terminal,
    detail: 'Turn your own study notes into a searchable collection.',
  },
] as const;

export function HomeLaunchpad() {
  return (
    <nav className="container home-launchpad" aria-label="Find your starting point">
      {[
        {
          to: '#home-tools',
          title: 'Tools',
          text: `${UTILITIES.length} free file utilities`,
          icon: Wrench,
          n: '01',
        },
        {
          to: '#home-academy',
          title: 'Learn AI',
          text: `${academy.lessons.length} lessons. Learn by doing.`,
          icon: BookOpen,
          n: '02',
        },
        {
          to: '#intelligence',
          title: 'Explore models',
          text: 'Find your next AI model',
          icon: Cpu,
          n: '03',
        },
      ].map(({ to, title, text, icon: Icon, n }) => (
        <a href={to} key={to}>
          <span className="home-launch-icon">
            <Icon size={22} strokeWidth={1.5} />
          </span>
          <span>
            <small className="mono">{n} / YOUR NEXT STEP</small>
            <strong>{title}</strong>
            <span>{text}</span>
          </span>
          <ArrowUpRight size={19} aria-hidden="true" />
        </a>
      ))}
    </nav>
  );
}

export function HomeTools() {
  const [category, setCategory] = useState('Essentials');
  const tools =
    category === 'Essentials'
      ? featuredIds.flatMap((id) => UTILITIES.filter((tool) => tool.id === id))
      : UTILITIES.filter((tool) => tool.category === category);
  return (
    <section
      id="home-tools"
      className="home-resources container"
      aria-labelledby="home-tools-title"
    >
      <Reveal>
        <div className="home-section-label mono">
          <span>01 / THE EVERYDAY TOOLKIT</span>
          <span>{String(UTILITIES.length).padStart(2, '0')} TOOLS. ZERO SUBSCRIPTIONS.</span>
        </div>
      </Reveal>
      <div className="home-tools-layout">
        <Reveal from="left" className="home-tools-intro">
          <span className="home-label">
            <Wrench size={15} /> ARTIFICIALS TOOLS
          </span>
          <h2 id="home-tools-title">
            Big ideas.
            <br />
            <span>Smaller files.</span>
          </h2>
          <p>
            A little less busywork. Compress, convert and organize your images and documents in a
            few clicks.
          </p>
          <Link className="btn" to="/tools">
            Explore all tools <ArrowUpRight size={17} />
          </Link>
          <div className="home-file-art" aria-hidden="true">
            <div className="home-file-sheet">
              <FileImage size={33} strokeWidth={1} />
              <span>IMAGE</span>
              <i />
              <i />
            </div>
            <div className="home-file-sheet">
              <FileText size={33} strokeWidth={1} />
              <span>DOCUMENT</span>
              <i />
              <i />
            </div>
            <span className="home-file-orbit" />
          </div>
          <div className="home-local-promise">
            <LockKeyhole size={17} />
            <span>
              <strong>Your files stay yours.</strong>Processed in your browser. No uploads.
            </span>
          </div>
        </Reveal>
        <Reveal from="right" className="home-tools-browser">
          <div className="home-tool-filters" role="group" aria-label="Choose a tool category">
            {['Essentials', 'Images', 'PDF', 'Documents'].map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={value === category}
                onClick={() => setCategory(value)}
              >
                {value}
              </button>
            ))}
          </div>
          <p className="sr-only" role="status">
            {tools.length} {category.toLowerCase()} tools
          </p>
          <div className="home-tool-grid">
            {tools.map((tool) => {
              const Icon = toolIcons[tool.id];
              return (
                <Link className="home-tool-link" to={'/tools/' + tool.id} key={tool.id}>
                  <span className="home-tool-top">
                    <Icon size={23} strokeWidth={1.4} />
                    <ArrowUpRight size={17} aria-hidden="true" />
                  </span>
                  <h3>{tool.title}</h3>
                  <p>{tool.description}</p>
                  <span className="home-tool-type mono">{tool.category}</span>
                </Link>
              );
            })}
          </div>
          <div className="home-tools-foot">
            <span>
              <Check size={14} /> Free, without an account
            </span>
            <Link to="/tools">
              View the full toolkit <ArrowRight size={15} />
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

export function HomeAcademy() {
  const [selected, setSelected] = useState(0);
  const path = paths[selected];
  const lesson = academy.lessons.find((item) => item.slug === path.slug)!;
  return (
    <section
      id="home-academy"
      className="container home-academy"
      aria-labelledby="home-academy-title"
    >
      <Reveal className="home-academy-surface">
        <div className="home-academy-top mono">
          <span>02 / ARTIFICIALS ACADEMY</span>
          <span>
            <BookOpen size={14} /> FREE TO LEARN
          </span>
        </div>
        <div className="home-academy-layout">
          <div className="home-academy-copy">
            <h2 id="home-academy-title">
              Don’t just use AI.
              <br />
              <span>Understand it.</span>
            </h2>
            <p>
              Go from “how does that work?” to “I built this.” Learn the ideas, write the code, and
              put it into practice.
            </p>
            <div className="home-academy-stats" aria-label="Academy at a glance">
              <span>
                <strong>{academy.lessons.length}</strong> original lessons
              </span>
              <span>
                <strong>{academy.modules.length}</strong> learning modules
              </span>
              <span>
                <strong>
                  {academy.lessons.filter((item) => item.module === 'projects').length}
                </strong>{' '}
                hands-on projects
              </span>
            </div>
            <div
              className="home-learning-paths"
              role="group"
              aria-label="Choose your learning starting point"
            >
              {paths.map(({ label, icon: Icon, detail }, index) => (
                <button
                  key={label}
                  type="button"
                  aria-pressed={selected === index}
                  onClick={() => setSelected(index)}
                >
                  <Icon size={19} strokeWidth={1.5} />
                  <span>
                    <strong>{label}</strong>
                    <small>{detail}</small>
                  </span>
                  <ArrowRight size={18} aria-hidden="true" />
                </button>
              ))}
            </div>
            <Link className="home-academy-link" to="/learn">
              Explore Learn AI <ArrowUpRight size={17} />
            </Link>
          </div>
          <div className="home-lesson-preview">
            <div className="home-preview-bar">
              <span>
                <Terminal size={15} /> LEARN BY DOING
              </span>
              <span className="home-window-dots" aria-hidden="true">
                <i />
                <i />
                <i />
              </span>
            </div>
            <div
              className="home-code-preview"
              aria-label="Python example of a prediction threshold"
            >
              <span className="mono">PYTHON / A SMALL FIRST STEP</span>
              <pre>
                <code>
                  <span className="home-code-comment"># Start with a prediction.</span>
                  {'\n'}confidence = <b>0.92</b>
                  {'\n'}threshold = <b>0.80</b>
                  {'\n\n'}
                  <em>if</em> confidence &gt;= threshold:{'\n'} print(
                  <span className="home-code-string">"Ready to review"</span>){'\n'}
                  <em>else</em>:{'\n'} print(
                  <span className="home-code-string">"Need more evidence"</span>)
                </code>
              </pre>
              <div className="home-code-output">
                <span className="mono">OUTPUT</span>
                <span>
                  <Check size={14} /> Ready to review
                </span>
              </div>
            </div>
            <div className="home-lesson-details" aria-live="polite" aria-atomic="true">
              <span className="home-lesson-meta">
                <span>{lesson.level}</span>
                <span>
                  <Clock3 size={13} /> {lesson.minutes} min with practice
                </span>
              </span>
              <h3>{lesson.title}</h3>
              <p>{lesson.summary}</p>
              <Link className="btn" to={'/learn/' + lesson.slug}>
                Open this lesson <ArrowUpRight size={16} />
              </Link>
            </div>
            <div className="home-preview-bottom">
              <Check size={13} /> Theory, runnable code and a challenge in every lesson.
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
