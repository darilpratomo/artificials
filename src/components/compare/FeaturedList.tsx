import { Link } from 'react-router-dom';
import { makerLogo } from '../../../shared/makers';
import { comparisonPath, type FeaturedComparison } from '../../lib/compare';

/** Links to comparisons, each with both makers' logos. */
export function FeaturedList({ pairs }: { pairs: FeaturedComparison[] }) {
  return (
    <ul className="featured-comparisons">
      {pairs.map((pair) => (
        <li key={pair.slugs.join()}>
          <Link to={comparisonPath(pair.slugs)}>
            <span className="featured-logos" aria-hidden="true">
              {pair.makerIds.map((makerId, index) => (
                <img key={index} src={makerLogo(makerId)} alt="" width="28" height="28" />
              ))}
            </span>
            <span className="featured-names">
              <b>{pair.names.join(' vs ')}</b>
              <small>{pair.makers.join(' and ')}</small>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
