import type { Term } from './taxonomies';

/** A category is a filter on /blog/ once it has this many posts, so the row grows with the blog. */
export const FILTER_MIN_POSTS = 3;

/** Categories that keep their page but never become a filter: old WordPress posts, and the fallback. */
export const FILTER_EXCLUDED = new Set(['wordpress', 'uncategorized']);

export interface BlogFilter {
  slug: string;
  name: string;
  href: string;
  count: number;
}

/**
 * The filter row of /blog/ and the category pages: All, then the main categories, most posts first.
 * The counts are of every post, whichever page shows the row, as on /outdoors/ and /records/.
 */
export function blogFilters(posts: { data: { categories: string[] } }[], categories: Term[]): BlogFilter[] {
  const main = categories
    .filter((c) => !FILTER_EXCLUDED.has(c.slug))
    .map((c) => ({
      slug: c.slug,
      name: c.name,
      href: `/category/${c.slug}/`,
      count: posts.filter((p) => p.data.categories.includes(c.slug)).length,
    }))
    .filter((c) => c.count >= FILTER_MIN_POSTS)
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  return [{ slug: 'all', name: 'All', href: '/blog/', count: posts.length }, ...main];
}
