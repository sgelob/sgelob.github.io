export type Section = 'photos' | 'outdoors' | 'blog' | 'about' | 'search';

export const ABOUT_PATH = '/about/';
export const SEARCH_PATH = '/search/';

export const NAV_LINKS: readonly { section: Section; label: string; href: string }[] = [
  { section: 'about', label: 'About', href: ABOUT_PATH },
  { section: 'photos', label: 'Photos', href: '/photos/' },
  { section: 'outdoors', label: 'Outdoors', href: '/outdoors/' },
  { section: 'blog', label: 'Blog', href: '/blog/' },
  { section: 'search', label: 'Search', href: SEARCH_PATH },
];

/** The top-level section a path belongs to, for highlighting the nav. */
export function sectionFor(pathname: string): Section | undefined {
  if (/^\/(photos|gallery)\//.test(pathname)) return 'photos';
  if (pathname.startsWith('/outdoors/')) return 'outdoors';
  if (/^\/(blog|category)\//.test(pathname) || /^\/\d{4}\//.test(pathname)) return 'blog';
  if (pathname.startsWith(ABOUT_PATH)) return 'about';
  if (pathname.startsWith(SEARCH_PATH)) return 'search';
  return undefined;
}
