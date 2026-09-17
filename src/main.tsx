import { Component, lazy, Suspense, useEffect, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import './styles.css';
import { Provider } from './lib/context';
import { Layout, EmptyState } from './components/Layout';
import Home from './pages/Home';
const Models = lazy(() => import('./pages/Models'));
const Compare = lazy(() => import('./pages/Compare'));
const Leaderboard = lazy(() => import('./pages/Leaderboard'));
const Academy = lazy(() => import('./pages/Academy'));
const AcademyLesson = lazy(() => import('./pages/AcademyLesson'));
const Learn = lazy(() => import('./pages/Learn'));
const Studio = lazy(() => import('./pages/Studio'));
const Pricing = lazy(() => import('./pages/Pricing'));
const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Info = lazy(() => import('./pages/Info'));
const Cms = lazy(() => import('./pages/Cms'));
const Checkout = lazy(() => import('./pages/Checkout'));
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
function Metadata() {
  const { pathname } = useLocation();
  useEffect(() => {
    const names: Record<string, string> = {
      '/': 'Intelligence, in perspective',
      '/models': 'AI model directory',
      '/leaderboard': 'Model rankings',
      '/compare': 'Compare models',
      '/news': 'AI insights and guides',
      '/learn': 'Learn AI — Artificials Academy',
      '/studio': 'AI Studio',
      '/pricing': 'Plans & pricing',
      '/login': 'Welcome back',
      '/dashboard': 'Your workspace',
      '/about': 'Our story',
      '/privacy': 'Privacy policy',
      '/terms': 'Terms & conditions',
      '/contact': 'Get in touch',
    };
    document.title = (names[pathname] || 'Explore') + ' — Artificials';
    let robots = document.querySelector<HTMLMetaElement>('meta[name="robots"]');
    if (!robots) {
      robots = document.createElement('meta');
      robots.name = 'robots';
      document.head.appendChild(robots);
    }
    robots.content = /^\/(dashboard|login|checkout|_private)/.test(pathname)
      ? 'noindex,nofollow'
      : 'index,follow';
  }, [pathname]);
  return null;
}
createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <BrowserRouter>
      <Provider>
        <Metadata />
        <Suspense fallback={<div className="loading-panel">Loading Artificials…</div>}>
          <Routes>
            <Route element={<Layout />}>
              <Route index element={<Home />} />
              <Route path="models" element={<Models />} />
              <Route path="leaderboard" element={<Leaderboard />} />
              <Route path="compare" element={<Compare />} />
              <Route path="learn" element={<Academy />} />
              <Route path="learn/:slug" element={<AcademyLesson />} />
              <Route path="news" element={<Learn />} />
              <Route path="news/:slug" element={<Learn />} />
              <Route path="studio" element={<Studio />} />
              <Route path="pricing" element={<Pricing />} />
              <Route path="login" element={<Login />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="checkout" element={<Checkout />} />
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
  </ErrorBoundary>,
);
