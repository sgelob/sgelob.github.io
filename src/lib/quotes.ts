import { parse } from 'yaml';
import raw from '../data/quotes.yaml?raw';

export interface QuoteAuthor {
  name: string;
  slug: string;
}

export interface Quote {
  text: string;
  author: QuoteAuthor;
}

/** Sorted by author, then text, as the file is written. */
export const quotes = parse(raw) as Quote[];

/** Groups quotes by author slug, keeping the order of first appearance. */
export function groupByAuthor(list: readonly Quote[]): { author: QuoteAuthor; quotes: Quote[] }[] {
  const groups = new Map<string, { author: QuoteAuthor; quotes: Quote[] }>();
  for (const quote of list) {
    const group = groups.get(quote.author.slug);
    if (group) group.quotes.push(quote);
    else groups.set(quote.author.slug, { author: quote.author, quotes: [quote] });
  }
  return [...groups.values()];
}

export const quoteAuthorPath = (author: Pick<QuoteAuthor, 'slug'>): string => `/quote-author/${author.slug}/`;
