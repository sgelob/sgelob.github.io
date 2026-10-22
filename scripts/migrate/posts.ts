import { htmlToMarkdown, rewriteUploadUrls } from '../lib/html';
import type { WpDb, WpPost } from '../lib/wp';
import { decodeSlug, optionalMeta, thumbnailPath } from './galleries';

export type PostDoc = {
  slug: string;
  title: string;
  date: string;
  categories: string[];
  cover?: string;
  lang: 'it' | 'en';
  seoTitle?: string;
  seoDescription?: string;
  oldSlugs: string[];
  excerpt: string;
  body: string;
};

const EXCERPT_MAX = 200;

const NAMED_ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };

/** WordPress stores some titles HTML-escaped (`&amp;`, `&#x1f4a9;`); Astro escapes on output, so store plain text. */
export function decodeEntities(text: string): string {
  return text.replace(/&(?:#x([0-9a-f]+)|#(\d+)|([a-z]+));/gi, (whole, hex?: string, dec?: string, name?: string) => {
    if (name) return NAMED_ENTITIES[name.toLowerCase()] ?? whole;
    const code = hex ? parseInt(hex, 16) : Number(dec);
    return code <= 0x10ffff ? String.fromCodePoint(code) : whole;
  });
}

/** Markdown inline and block syntax removed, whitespace collapsed. Empty for blocks that carry no text (images, iframes, rules). */
function plainText(block: string): string {
  return block
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/<[^>]+>/g, '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/^\s*(?:#{1,6}\s+|>\s?|[-*+]\s+|\d+\.\s+)/gm, '')
    .replace(/(\*{1,3}|_{1,3}|~~|`)/g, '')
    .replace(/\\([\\`*_{}[\]()#+\-.!|<>~])/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

/** The first Markdown block with any text in it, as plain text cut at `EXCERPT_MAX` characters on a word boundary. */
function firstParagraph(markdown: string): string {
  for (const block of markdown.split(/\n\s*\n/)) {
    const text = plainText(block);
    if (!text) continue;
    if (text.length <= EXCERPT_MAX) return text;
    const cut = text.slice(0, EXCERPT_MAX);
    const boundary = text[EXCERPT_MAX] === ' ' ? EXCERPT_MAX : cut.lastIndexOf(' ');
    return `${(boundary > 0 ? cut.slice(0, boundary) : cut).trimEnd()}…`;
  }
  return '';
}

export function buildPost(db: WpDb, post: WpPost): PostDoc {
  const body = htmlToMarkdown(rewriteUploadUrls(post.post_content));
  const oldSlugs = [...new Set(db.metaValues(post.ID, '_wp_old_slug').filter(Boolean).map(decodeSlug))];

  const title = decodeEntities(post.post_title);
  const doc: PostDoc = {
    slug: post.post_name,
    title,
    date: post.post_date.replace(' ', 'T'),
    categories: db.terms(post.ID, 'category').map((t) => t.slug),
    lang: 'it',
    oldSlugs,
    excerpt: post.post_excerpt.trim() || firstParagraph(body),
    body,
  };
  const cover = thumbnailPath(db, post);
  const seoTitle = optionalMeta(db, post.ID, '_yoast_wpseo_title');
  const seoDescription = optionalMeta(db, post.ID, '_yoast_wpseo_metadesc');
  if (cover) doc.cover = cover;
  if (seoTitle) doc.seoTitle = seoTitle.replaceAll('%%title%%', title); // Yoast template variable
  if (seoDescription) doc.seoDescription = seoDescription;
  return doc;
}
