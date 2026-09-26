import { Analytics } from './components/Analytics';
import { Metadata } from './components/Metadata';
import { Component, lazy, Suspense, type ReactNode } from 'react';
import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './styles.css';
import { Provider } from './lib/context';
import { Layout, EmptyState } from './components/Layout';
import Home from './pages/Home';

/**
 * A page whose code loads on first use. `preload` fetches it ahead of time;
 * once loaded, the page renders without suspending, so no loading panel shows.
 */
function page(load: Parameters<typeof lazy>[0]) {
  let loaded: Awaited<ReturnType<typeof load>> | undefined;
  const preload = () => load().then((module) => (loaded = module));
  return Object.assign(
    lazy(() =>
      loaded
        ? // A thenable that resolves at once lets React use the page straight away.
          ({
            then: (resolve: (module: typeof loaded) => void) => resolve(loaded),
          } as unknown as ReturnType<typeof load>)
        : preload(),
    ),
    { preload },
  );
}
const Models = page(() => import('./pages/Models'));
const CodingAgents = page(() => import('./pages/CodingAgents'));
const Trends = page(() => import('./pages/Trends'));
const ImageModels = page(() => import('./pages/ImageModels'));
const VideoModels = page(() => import('./pages/VideoModels'));
const ModelFinder = page(() => import('./pages/ModelFinder'));
const ModelProfile = page(() => import('./pages/ModelProfile'));
const Compare = page(() => import('./pages/Compare'));
const Leaderboard = page(() => import('./pages/Leaderboard'));
const Leaders = page(() => import('./pages/Leaders'));
const ScorePriceTime = page(() => import('./pages/ScorePriceTime'));
const Market = page(() => import('./pages/Market'));
const Releases = page(() => import('./pages/Releases'));
const Academy = page(() => import('./pages/Academy'));
const AcademyLesson = page(() => import('./pages/AcademyLesson'));
const Learn = page(() => import('./pages/Learn'));
const Tools = page(() => import('./pages/Tools'));
const Login = page(() => import('./pages/Login'));
const Dashboard = page(() => import('./pages/Dashboard'));
const Info = page(() => import('./pages/Info'));
const Cms = page(() => import('./pages/Cms'));

/** The lazily loaded page an address opens, if any. The home page is always bundled. */
function pageAt(path: string) {
  const [first = '', second] = path.split('/').slice(1);
  if (first === 'models') return second ? ModelProfile : Models;
  if (first === 'learn') return second ? AcademyLesson : Academy;
  return new Map([
    ['coding-agents', CodingAgents],
    ['trends', Trends],
    ['image-models', ImageModels],
    ['video-models', VideoModels],
    ['model-finder', ModelFinder],
    ['leaders', Leaders],
    ['score-price-time', ScorePriceTime],
    ['market', Market],
    ['leaderboard', Leaderboard],
    ['releases', Releases],
    ['compare', Compare],
    ['news', Learn],
    ['tools', Tools],
    ['login', Login],
    ['dashboard', Dashboard],
    ['about', Info],
    ['privacy', Info],
    ['terms', Info],
    ['contact', Info],
    ['_private', Cms],
  ]).get(first);
}
class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <div className="empty-state">
        <h1>Let’s give that another try.</h1>
        <p>This page could not load.</p>
        <button className="btn" onClick={() => location.reload()}>
          Reload page
        </button>
      </div>
    ) : (
      this.props.children
    );
  }
}
const container = document.getElementById('root')!;
const app = (
  <ErrorBoundary>
    <BrowserRouter>
      <Provider>
        <Metadata />
        <Analytics />
        <Suspense fallback={<div className="loading-panel">Loading Artificials…</div>}>
          <Routes>
            <Route element={<Layout />}>
              <Route index element={<Home />} />
              <Route path="models" element={<Models />} />
              <Route path="models/:slug" element={<ModelProfile />} />
              <Route path="coding-agents" element={<CodingAgents />} />
              <Route path="trends" element={<Trends />} />
              <Route path="image-models" element={<ImageModels />} />
              <Route path="video-models" element={<VideoModels />} />
              <Route path="model-finder" element={<ModelFinder />} />
              <Route path="leaders" element={<Leaders />} />
              <Route path="score-price-time" element={<ScorePriceTime />} />
              <Route path="market" element={<Market />} />
              <Route path="leaderboard" element={<Leaderboard />} />
              <Route path="releases" element={<Releases />} />
              <Route path="compare" element={<Compare />} />
              <Route path="compare/:pair" element={<Compare />} />
              <Route path="learn" element={<Academy />} />
              <Route path="learn/:slug" element={<AcademyLesson />} />
              <Route path="news" element={<Learn />} />
              <Route path="news/:slug" element={<Learn />} />
              <Route path="tools" element={<Tools />} />
              <Route path="tools/:toolId" element={<Tools />} />
              <Route path="login" element={<Login />} />
              <Route path="dashboard" element={<Dashboard />} />
              {['about', 'privacy', 'terms', 'contact'].map((p) => (
                <Route key={p} path={p} element={<Info />} />
              ))}
              <Route path="_private/:token" element={<Cms />} />
              <Route
                path="*"
                element={
                  <EmptyState
                    title="A little off the beaten path."
                    text="This page doesn’t exist. Let’s find your way back."
                    link="/"
                    label="Back to home"
                  />
                }
              />
            </Route>
          </Routes>
        </Suspense>
      </Provider>
    </BrowserRouter>
  </ErrorBoundary>
);
const root = createRoot(container);
// The live page replaces the prerendered one in a single step, so a tap made
// meanwhile waits and lands on the live page rather than the static copy.
const start = () => flushSync(() => root.render(app));
// A prerendered page stays on screen while its code loads, instead of giving way
// to the loading panel for a moment. Pages without prerendered HTML render at once.
const current = container.hasChildNodes() ? pageAt(location.pathname) : undefined;
if (current) current.preload().then(start, start);
else start();
