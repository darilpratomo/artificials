import { Link, useSearchParams } from 'react-router-dom';
import BenchmarkRankings from './BenchmarkRankings';
import SpecificationRankings from './SpecificationRankings';
export default function Leaderboard() {
  const [params] = useSearchParams();
  const specs = params.get('view') === 'specs';
  return (
    <>
      <nav className="container ranking-view-switch" aria-label="Ranking type">
        <Link to="/leaderboard" aria-current={!specs ? 'page' : undefined}>
          Capability benchmarks
        </Link>
        <Link to="/leaderboard?view=specs" aria-current={specs ? 'page' : undefined}>
          Specifications & pricing
        </Link>
      </nav>
      {specs ? <SpecificationRankings /> : <BenchmarkRankings />}
    </>
  );
}
