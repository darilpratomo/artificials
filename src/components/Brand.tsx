import '../brand.css';

type BrandProps = { className?: string };

/** The supplied mark is decorative; the live wordmark gives links their accessible name. */
export function Brand({ className = '' }: BrandProps) {
  return (
    <span className={`brand-lockup ${className}`.trim()}>
      <img
        className="brand-mark"
        src="/brand/artificials-mark-small.webp"
        width="36"
        height="32"
        alt=""
        aria-hidden="true"
        decoding="async"
      />
      <span className="brand-name">Artificials</span>
    </span>
  );
}
