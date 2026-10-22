import type { WpDb } from '../lib/wp';
import { decodeEntities } from './posts';

export type Quote = { text: string; author: { name: string; slug: string } };

const TAG = /<[^>]*>/g;

const byAuthorThenText = (a: Quote, b: Quote): number => a.author.name.localeCompare(b.author.name, 'en') || a.text.localeCompare(b.text, 'en');

/** Published `quotes` posts: the text is `post_content` without tags (entities decoded, trimmed), the author its `quote-author` term. */
export function buildQuotes(db: WpDb, warn: (msg: string) => void): Quote[] {
  const quotes: Quote[] = [];
  for (const post of db.posts({ type: 'quotes', status: 'publish' })) {
    const author = db.terms(post.ID, 'quote-author')[0];
    if (!author) {
      warn(`quote ${post.ID}: no quote-author term, skipped`);
      continue;
    }
    quotes.push({
      text: decodeEntities(post.post_content.replace(TAG, '')).replace(/\r\n?/g, '\n').trim(),
      author: { name: decodeEntities(author.name), slug: author.slug },
    });
  }
  return quotes.sort(byAuthorThenText);
}
