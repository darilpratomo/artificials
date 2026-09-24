import { PixelLogo } from './PixelLogo';
import '../brand.css';

type BrandProps = { className?: string; animate?: boolean };

/** The mark is decorative; the live wordmark gives links their accessible name. */
export function Brand({ className = '', animate = false }: BrandProps) {
  return (
    <span className={`brand-lockup ${className}`.trim()}>
      <PixelLogo
        className="brand-mark"
        animate={animate}
        repeatEvery={animate ? 10000 : 0}
        downloadable
      />
      <span className="brand-name">Artificials</span>
    </span>
  );
}
