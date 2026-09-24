import { Analytics } from './components/Analytics';
import { Metadata } from './components/Metadata';
import { Component, lazy, Suspense, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './styles.css';
import { Provider } from './lib/context';
import { Layout, EmptyState } from './components/Layout';
import Home from './pages/Home';
const Models = lazy(() => import('./pages/Models'));
const ModelProfile = lazy(() => import('./pages/ModelProfile'));
const Compare = lazy(() => import('./pages/Compare'));
const Leaderboard = lazy(() => import('./pages/Leaderboard'));
const Releases = lazy(() => import('./pages/Releases'));
const Academy = lazy(() => import('./pages/Academy'));
const AcademyLesson = lazy(() => import('./pages/AcademyLesson'));
const Learn = lazy(() => import('./pages/Learn'));
const Tools = lazy(() => import('./pages/Tools'));
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
createRoot(document.getElementById('root')!).render(
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
              <Route path="leaderboard" element={<Leaderboard />} />
              <Route path="releases" element={<Releases />} />
              <Route path="compare" element={<Compare />} />
              <Route path="learn" element={<Academy />} />
              <Route path="learn/:slug" element={<AcademyLesson />} />
              <Route path="news" element={<Learn />} />
              <Route path="news/:slug" element={<Learn />} />
              <Route path="tools" element={<Tools />} />
              <Route path="tools/:toolId" element={<Tools />} />
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
