import { renderToString } from 'react-dom/server';
import { StaticRouter, Routes, Route } from 'react-router-dom';
import { Provider } from './lib/context';
import { Layout } from './components/Layout';
import Home from './pages/Home';
import Models from './pages/Models';
import Leaderboard from './pages/Leaderboard';
import Leaders from './pages/Leaders';
import ScorePriceTime from './pages/ScorePriceTime';
import Market from './pages/Market';
import Releases from './pages/Releases';
import Compare from './pages/Compare';
import Learn from './pages/Learn';
import Tools from './pages/Tools';
import Academy from './pages/Academy';
import { LessonReader } from './pages/AcademyLesson';
import Studio from './pages/Studio';
import Pricing from './pages/Pricing';
import Info from './pages/Info';
import type { Lesson } from './lib/academy';
import type { ModelOverview } from './lib/overview';
export function renderPage(path: string, lesson?: Lesson, overview?: ModelOverview) {
  return renderToString(
    <StaticRouter location={path}>
      <Provider>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Home initial={overview} />} />
            <Route path="models" element={<Models />} />
            <Route path="leaders" element={<Leaders />} />
            <Route path="score-price-time" element={<ScorePriceTime />} />
            <Route path="market" element={<Market />} />
            <Route path="leaderboard" element={<Leaderboard />} />
            <Route path="releases" element={<Releases />} />
            <Route path="compare" element={<Compare />} />
            <Route path="news" element={<Learn />} />
            <Route path="news/:slug" element={<Learn />} />
            <Route path="tools" element={<Tools />} />
            <Route path="tools/:toolId" element={<Tools />} />
            <Route path="learn" element={<Academy />} />
            {lesson && <Route path="learn/:slug" element={<LessonReader lesson={lesson} />} />}
            <Route path="studio" element={<Studio />} />
            <Route path="pricing" element={<Pricing />} />
            {['about', 'contact', 'privacy', 'terms'].map((path) => (
              <Route key={path} path={path} element={<Info />} />
            ))}
          </Route>
        </Routes>
      </Provider>
    </StaticRouter>,
  );
}
