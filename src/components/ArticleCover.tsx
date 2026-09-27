import type { Article } from '../../shared/content';
import { articleCover } from '../../shared/editorial-covers';

export function ArticleCover({
  article,
  priority = false,
  decorative = false,
}: {
  article: Pick<Article, 'slug' | 'category'>;
  priority?: boolean;
  decorative?: boolean;
}) {
  const { file: kind, alt } = articleCover(article);
  return (
    <img
      className="article-cover"
      src={`/editorial/${kind}.webp`}
      srcSet={`/editorial/${kind}-small.webp 640w, /editorial/${kind}.webp 1200w`}
      sizes={
        priority
          ? '(max-width: 940px) calc(100vw - 40px), 900px'
          : '(max-width: 639px) 100vw, (max-width: 999px) 50vw, 400px'
      }
      width="1200"
      height="800"
      alt={decorative ? '' : alt}
      loading={priority ? 'eager' : 'lazy'}
      decoding="async"
    />
  );
}
