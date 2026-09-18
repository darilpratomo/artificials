import { renderToString } from 'react-dom/server';
import { StaticRouter, Routes, Route } from 'react-router-dom';
import { Provider } from './lib/context';
import { Layout } from './components/Layout';
import Home from './pages/Home';
import Models from './pages/Models';
import Leaderboard from './pages/Leaderboard';
import Compare from './pages/Compare';
import Learn from './pages/Learn';
import Academy from './pages/Academy';
import { LessonReader } from './pages/AcademyLesson';
import Studio from './pages/Studio';
import Pricing from './pages/Pricing';
import Info from './pages/Info';
import type { Lesson } from './lib/academy';
export function renderPage(path: string, lesson?: Lesson) {
  return renderToString(
    <StaticRouter location={path}>
      <Provider>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="models" element={<Models />} />
            <Route path="leaderboard" element={<Leaderboard />} />
            <Route path="compare" element={<Compare />} />
            <Route path="news" element={<Learn />} />
            <Route path="news/:slug" element={<Learn />} />
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
