import { htmlToMarkdown, rewriteUploadUrls } from '../lib/html';
import type { WpDb, WpPost } from '../lib/wp';
import { optionalMeta } from './galleries';
import { uploadWidths } from './posts';

export type PageDoc = {
  slug: string;
  /** Public URL path, with leading and trailing slash. */
  path: string;
  title: string;
  lang: 'it' | 'en';
  seoTitle?: string;
  seoDescription?: string;
  body: string;
};

export type EventYear = { year: number; entries: string[] };
export type BookSection = { title: string; entries: string[] };
export type AboutPage = PageDoc & { events: EventYear[]; books: BookSection[] };

export const ABOUT_ID = 9;
/** The About page lives at `/about/`; its old WordPress keyword slug redirects there (amended 2026-10-22). */
export const ABOUT_PATH = '/about/';
export const ABOUT_OLD_PATH = '/agile-scrum-product-owner-manager-turin-italy/';
/** Pages whose content-file slug differs from `post_name`, by post ID. */
const SLUG_OVERRIDES: ReadonlyMap<number, string> = new Map([
  [ABOUT_ID, 'about'],
  [743, 'quotes'],
]);
/**
 * WordPress pages the site no longer has: it sets no cookies, so the Privacy and Cookie policies were dropped
 * (spec §5.2, amended 2026-10-22). Their URLs redirect to the home.
 */
export const DROPPED_PAGES: readonly string[] = ['privacy-policy', 'cookie-policy'];

export const isDroppedPage = (post: Pick<WpPost, 'post_name'>): boolean => DROPPED_PAGES.includes(post.post_name);

const EXCERPT_DIV = /<div\s+class=["']excerpt["']\s*>\s*<\/div>/gi;
const EVENTS_HEADING = /<h2\b[^>]*\bid=["']events["'][^>]*>[\s\S]*?<\/h2>/i;
const BOOKS_HEADING = /<h2\b[^>]*\bid=["']books["'][^>]*>[\s\S]*?<\/h2>/i;
const ANY_H2 = /<h2\b/i;
const YEAR_LIST = /<h3[^>]*>\s*(\d{4})\s*<\/h3>\s*<ul\b[^>]*>([\s\S]*?)<\/ul>/gi;
const SECTION_LIST = /<h3[^>]*>([\s\S]*?)<\/h3>\s*<(ol|ul)\b[^>]*>([\s\S]*?)<\/\2>/gi;
const LIST_ITEM = /<li\b[^>]*>([\s\S]*?)<\/li>/gi;

const listEntries = (listHtml: string): string[] => [...listHtml.matchAll(LIST_ITEM)].map((m) => htmlToMarkdown(m[1].trim()));

function sectionAt(html: string, heading: RegExp, name: string): { start: number; end: number } {
  const m = heading.exec(html);
  if (!m) throw new Error(`about: no ${name} heading`);
  return { start: m.index, end: m.index + m[0].length };
}

/**
 * Splits the About page into its prose (`intro`, `outro`) and the two lists that become their own pages.
 * `outro` is the closing paragraph of the events section (text after the last year's list) followed by the
 * section after the books list, starting at its heading ("How May I Help You?").
 */
export function splitAbout(html: string): { intro: string; events: EventYear[]; books: BookSection[]; outro: string } {
  const clean = html.replace(EXCERPT_DIV, '');
  const events = sectionAt(clean, EVENTS_HEADING, 'events');
  const books = sectionAt(clean, BOOKS_HEADING, 'books');
  if (books.start < events.end) throw new Error('about: books heading before events heading');

  const eventsHtml = clean.slice(events.end, books.start);
  const years = [...eventsHtml.matchAll(YEAR_LIST)];
  if (years.length === 0) throw new Error('about: no event years found');
  const closing = eventsHtml.slice(years.at(-1)!.index + years.at(-1)![0].length).trim();

  const afterBooks = clean.slice(books.end);
  const nextH2 = afterBooks.search(ANY_H2);
  const booksHtml = nextH2 < 0 ? afterBooks : afterBooks.slice(0, nextH2);
  const help = nextH2 < 0 ? '' : afterBooks.slice(nextH2).trim();

  return {
    intro: clean.slice(0, events.start).trim(),
    events: years.map((m) => ({ year: Number(m[1]), entries: listEntries(m[2]) })),
    books: [...booksHtml.matchAll(SECTION_LIST)].map((m) => ({ title: htmlToMarkdown(m[1].trim()), entries: listEntries(m[3]) })),
    outro: [closing, help].filter(Boolean).join('\n\n'),
  };
}

function baseDoc(db: WpDb, post: WpPost, body: string): PageDoc {
  const slug = SLUG_OVERRIDES.get(post.ID) ?? post.post_name;
  const doc: PageDoc = {
    slug,
    path: post.ID === ABOUT_ID ? ABOUT_PATH : `/${post.post_name}/`,
    title: post.post_title,
    lang: 'en',
    body,
  };
  const seoTitle = optionalMeta(db, post.ID, '_yoast_wpseo_title');
  const seoDescription = optionalMeta(db, post.ID, '_yoast_wpseo_metadesc');
  if (seoTitle) doc.seoTitle = seoTitle;
  if (seoDescription) doc.seoDescription = seoDescription;
  return doc;
}

/** The About page: `body` is intro + outro, the events and books lists are returned separately. */
export function buildAboutPage(db: WpDb, post: WpPost): AboutPage {
  const { intro, events, books, outro } = splitAbout(post.post_content);
  const prose = `${intro}\n\n${outro}`.replace(/href="#events"/g, 'href="/events/"').replace(/href="#books"/g, 'href="/books/"');
  return { ...baseDoc(db, post, htmlToMarkdown(prose)), events, books };
}

/** Any page. The About page loses its events and books here: use `buildAboutPage` to get them. */
export function buildPage(db: WpDb, post: WpPost): PageDoc {
  if (post.ID === ABOUT_ID) {
    const { events: _events, books: _books, ...doc } = buildAboutPage(db, post);
    return doc;
  }
  return baseDoc(db, post, htmlToMarkdown(rewriteUploadUrls(post.post_content, uploadWidths(db))));
}
