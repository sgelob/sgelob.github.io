export type Section = 'photos' | 'blog' | 'about' | 'search';

export const ABOUT_PATH = '/about/';
export const SEARCH_PATH = '/search/';

export const NAV_LINKS: readonly { section: Section; label: string; href: string }[] = [
  { section: 'photos', label: 'Photos', href: '/photos/' },
  { section: 'blog', label: 'Blog', href: '/blog/' },
  { section: 'about', label: 'About', href: ABOUT_PATH },
  { section: 'search', label: 'Search', href: SEARCH_PATH },
];

/** The top-level section a path belongs to, for highlighting the nav. */
export function sectionFor(pathname: string): Section | undefined {
  if (/^\/(photos|gallery)\//.test(pathname)) return 'photos';
  if (/^\/(blog|category)\//.test(pathname) || /^\/\d{4}\//.test(pathname)) return 'blog';
  if (pathname.startsWith(ABOUT_PATH)) return 'about';
  if (pathname.startsWith(SEARCH_PATH)) return 'search';
  return undefined;
}
