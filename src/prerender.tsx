import { renderToString } from 'react-dom/server';
import { StaticRouter, Routes, Route } from 'react-router-dom';
import { Provider } from './lib/context';
import { Layout } from './components/Layout';
import Home from './pages/Home';
import Models from './pages/Models';
import CodingAgents from './pages/CodingAgents';
import Trends from './pages/Trends';
import ImageModels from './pages/ImageModels';
import VideoModels from './pages/VideoModels';
import ModelFinder from './pages/ModelFinder';
import Leaderboard from './pages/Leaderboard';
import Leaders from './pages/Leaders';
import ScorePriceTime from './pages/ScorePriceTime';
import Market from './pages/Market';
import Releases from './pages/Releases';
import Compare from './pages/Compare';
import Changes from './pages/Changes';
import Learn from './pages/Learn';
import Tools from './pages/Tools';
import Academy from './pages/Academy';
import { LessonReader } from './pages/AcademyLesson';
import Info from './pages/Info';
import type { Lesson } from './lib/academy';
import type {
  Coding,
  Images as ImagesData,
  Videos as VideosData,
  Finder as FinderData,
  ModelOverview,
  Trends as TrendsData,
  Changes as ChangesData,
} from './lib/overview';
import type { ComparisonData, Comparisons } from './lib/compare';

/** The data a page renders from, written into its HTML as well. */
export interface PageData {
  lesson?: Lesson;
  overview?: ModelOverview;
  coding?: Coding;
  trends?: TrendsData;
  images?: ImagesData;
  videos?: VideosData;
  finder?: FinderData;
  comparison?: ComparisonData;
  comparisons?: Comparisons;
  changes?: ChangesData;
}

export function renderPage(
  path: string,
  {
    lesson,
    overview,
    coding,
    trends,
    images,
    videos,
    finder,
    comparison,
    comparisons,
    changes,
  }: PageData = {},
) {
  return renderToString(
    <StaticRouter location={path}>
      <Provider>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Home initial={overview} />} />
            <Route path="models" element={<Models initial={overview} />} />
            <Route path="coding-agents" element={<CodingAgents initial={coding} />} />
            <Route path="trends" element={<Trends initial={trends} />} />
            <Route path="image-models" element={<ImageModels initial={images} />} />
            <Route path="video-models" element={<VideoModels initial={videos} />} />
            <Route path="model-finder" element={<ModelFinder initial={finder} />} />
            <Route path="leaders" element={<Leaders />} />
            <Route path="score-price-time" element={<ScorePriceTime />} />
            <Route path="market" element={<Market />} />
            <Route path="leaderboard" element={<Leaderboard />} />
            <Route path="releases" element={<Releases />} />
            <Route path="changes" element={<Changes initial={changes} />} />
            <Route path="compare" element={<Compare featured={comparisons} />} />
            <Route path="compare/:pair" element={<Compare initial={comparison} />} />
            <Route path="news" element={<Learn />} />
            <Route path="news/:slug" element={<Learn />} />
            <Route path="tools" element={<Tools />} />
            <Route path="tools/:toolId" element={<Tools />} />
            <Route path="learn" element={<Academy />} />
            {lesson && <Route path="learn/:slug" element={<LessonReader lesson={lesson} />} />}
            {['about', 'contact', 'privacy', 'terms'].map((path) => (
              <Route key={path} path={path} element={<Info />} />
            ))}
          </Route>
        </Routes>
      </Provider>
    </StaticRouter>,
  );
}
