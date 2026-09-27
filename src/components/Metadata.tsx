import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { pageMetadata, type FeedLink } from '../../shared/seo';
export function Metadata() {
  const { pathname } = useLocation();
  useEffect(() => {
    applyPageMetadata(pageMetadata(pathname));
  }, [pathname]);
  return null;
}

export function applyPageMetadata(meta: ReturnType<typeof pageMetadata> & { feed?: FeedLink }) {
  document.title = meta.title;
  const values = {
    description: meta.description,
    robots: meta.robots,
    'og:site_name': 'Artificials',
    'og:title': meta.title,
    'og:description': meta.description,
    'og:url': meta.canonical,
    'og:type': meta.type,
    'og:image': meta.image,
    'twitter:card': 'summary_large_image',
    'twitter:title': meta.title,
    'twitter:description': meta.description,
    'twitter:image': meta.image,
  };
  for (const [key, value] of Object.entries(values)) {
    const attr = key.startsWith('og:') ? 'property' : 'name';
    let tag = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
    if (!tag) {
      tag = document.createElement('meta');
      tag.setAttribute(attr, key);
      document.head.appendChild(tag);
    }
    tag.content = value;
  }
  let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!canonical) {
    canonical = document.createElement('link');
    canonical.rel = 'canonical';
    document.head.appendChild(canonical);
  }
  canonical.href = meta.canonical;
  // A page with an RSS feed of its own names it for feed readers, beside the
  // site's feed that every page names; other pages name only the site's.
  let feed = document.getElementById('page-feed') as HTMLLinkElement | null;
  if (meta.feed) {
    if (!feed) {
      feed = document.createElement('link');
      feed.id = 'page-feed';
      feed.rel = 'alternate';
      feed.type = 'application/rss+xml';
      document.head.appendChild(feed);
    }
    feed.title = meta.feed.title;
    feed.href = meta.feed.href;
  } else feed?.remove();
  document.getElementById('page-schema')?.remove();
  if (meta.structured) {
    const script = document.createElement('script');
    script.id = 'page-schema';
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify(meta.structured);
    document.head.appendChild(script);
  }
}
