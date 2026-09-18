import type { Article } from '../../shared/content';

export function ArticleCover({
  article,
  priority = false,
  decorative = false,
}: {
  article: Pick<Article, 'category'>;
  priority?: boolean;
  decorative?: boolean;
}) {
  const kind =
    article.category === 'Research'
      ? 'benchmarks'
      : article.category === 'AI models'
        ? 'context'
        : 'engineering';
  const descriptions = {
    benchmarks:
      'Silver towers connected by fine light threads, illustrating AI benchmark comparisons.',
    context:
      'Layers of translucent glass surrounding a silver orb, illustrating model memory and context.',
    engineering:
      'Floating metal and glass layers connected to a central core, illustrating application architecture.',
  };
  return (
    <img
      className="article-cover"
      src={`/editorial/${kind}.webp`}
      srcSet={`/editorial/${kind}-small.webp 640w, /editorial/${kind}.webp 1200w`}
      sizes={
        priority
          ? '(max-width: 760px) calc(100vw - 40px), 680px'
          : '(max-width: 639px) 100vw, (max-width: 999px) 50vw, 400px'
      }
      width="1200"
      height="800"
      alt={decorative ? '' : descriptions[kind]}
      loading={priority ? 'eager' : 'lazy'}
      decoding="async"
    />
  );
}
