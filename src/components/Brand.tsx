import { PixelLogo } from './PixelLogo';
import '../brand.css';

type BrandProps = { className?: string; animate?: boolean };

/** The mark is decorative; the live wordmark gives links their accessible name. */
export function Brand({ className = '', animate = false }: BrandProps) {
  return (
    <span className={`brand-lockup ${className}`.trim()}>
      {animate ? (
        <PixelLogo
          className="brand-mark"
          animate
          repeatEvery={10000}
          downloadable
          soften
        />
      ) : (
        <img
          className="brand-mark brand-mark-image"
          src="/brand/artificials-symbol.png"
          width="32"
          height="32"
          alt=""
          aria-hidden="true"
          decoding="async"
          loading="lazy"
          draggable
        />
      )}
      <span className="brand-name">Artificials</span>
    </span>
  );
}
