import { cleanOldSlugs } from './frontmatter-order';
import type { GalleryDoc } from './galleries';
import { ABOUT_OLD_PATH, ABOUT_PATH, DROPPED_PAGES } from './pages';
import type { PostDoc } from './posts';

export type Redirect = { from: string; to: string };

/**
 * Old slugs are already percent-decoded by the builders and are written as-is. Quotes have no public URL.
 * The dropped pages (`DROPPED_PAGES`) redirect to the home, the old About slug to `/about/`.
 */
export function buildRedirects(
  galleries: readonly Pick<GalleryDoc, 'slug' | 'oldSlugs'>[],
  posts: readonly Pick<PostDoc, 'slug' | 'date' | 'oldSlugs'>[],
): Redirect[] {
  const redirects = new Map<string, Redirect>();
  const add = (from: string, to: string) => {
    if (from !== to && !redirects.has(from)) redirects.set(from, { from, to });
  };

  for (const g of galleries) {
    for (const old of cleanOldSlugs(g.oldSlugs)) add(`/gallery/${old}/`, `/gallery/${g.slug}/`);
  }
  for (const p of posts) {
    const month = `/${p.date.slice(0, 4)}/${p.date.slice(5, 7)}`;
    for (const old of cleanOldSlugs(p.oldSlugs)) add(`${month}/${old}/`, `${month}/${p.slug}/`);
  }
  for (const slug of DROPPED_PAGES) add(`/${slug}/`, '/');
  add(ABOUT_OLD_PATH, ABOUT_PATH);
  return [...redirects.values()];
}
