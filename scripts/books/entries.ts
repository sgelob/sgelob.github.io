// Fills the books of src/data/books.yaml with what a lookup found: the first publication year and the cover.
// Titles and authors stay as written in the list; only confident matches are used.
import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import type { Book, BookShelf } from '../../src/lib/books';
import { processUploads } from '../photos/process';
import type { ObjectStore } from '../photos/r2';
import { slugify } from '../trip/wizard';

/** One book of the lookup file (olegs-be-data/books/lookup.json). */
export interface LookupEntry {
  title: string;
  authors: string[];
  confidence: 'high' | 'original-edition' | 'medium' | 'low' | 'none';
  match?: { year?: number };
  /** The downloaded cover, a local file. */
  coverFile?: string;
}

const unescape = (s: string): string => s.replace(/\\([\\`*_{}[\]()#+\-.!])/g, '$1').trim();

/** A list line “Title – *Author*” (Markdown) as a title and an author; a line without author is a title alone. */
export function parseEntry(entry: string): Book {
  const m = /^(.*?)\s+–\s+\*(.+)\*\s*$/.exec(entry);
  return m ? { title: unescape(m[1]), author: unescape(m[2]) } : { title: unescape(entry.replace(/\s+–\s*$/, '')) };
}

const fold = (s: string): string =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[’'‘`]/g, '').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();

/** The key a book is matched by: its title and the surname of its first author, without case, accents or punctuation. */
export function bookKey(title: string, author = ''): string {
  const first = author.split(/\s*(?:,|&|\band\b)\s*/)[0] ?? '';
  return `${fold(title)}|${fold(first).split(' ').at(-1) ?? ''}`;
}

export interface EnrichOptions {
  /** The shelves as the data file has them: old list lines (`entries`) or books (`books`). */
  sections: { title: string; entries?: (string | Book)[]; books?: Book[] }[];
  lookup: LookupEntry[];
  store: ObjectStore;
  uploadsDir: string;
  /** The uploads folder for new covers, `yyyy/mm`. */
  month: string;
  log: (line: string) => void;
}

export async function enrichBooks(opts: EnrichOptions): Promise<{ books: BookShelf[]; problems: string[] }> {
  const { lookup, store, uploadsDir, month, log } = opts;
  const found = new Map(lookup.filter((x) => x.confidence === 'high' || x.confidence === 'original-edition').map((x) => [bookKey(x.title, x.authors.join(' & ')), x]));
  const usedSlugs = new Set<string>();
  const uploads: { book: Book; path: string }[] = [];
  mkdirSync(join(uploadsDir, month), { recursive: true });

  const shelves: BookShelf[] = opts.sections.map((section) => ({
    title: section.title,
    books: (section.books ?? section.entries ?? []).map((item) => {
      const book: Book = typeof item === 'string' ? parseEntry(item) : { ...item };
      const hit = found.get(bookKey(book.title, book.author));
      if (hit?.match?.year && !book.year) book.year = hit.match.year;
      if (!book.cover && hit?.coverFile && existsSync(hit.coverFile)) {
        let slug = slugify(book.title) || 'book';
        if (usedSlugs.has(slug)) slug = `${slug}-${slugify(book.author ?? '') || usedSlugs.size}`;
        usedSlugs.add(slug);
        const path = `${month}/book-${slug}.jpg`;
        const file = join(uploadsDir, path);
        if (!existsSync(file)) copyFileSync(hit.coverFile, file);
        uploads.push({ book, path });
      }
      return book;
    }),
  }));

  const problems: string[] = [];
  if (uploads.length) {
    const { sizes, errors } = await processUploads({ uploadsDir, store, files: uploads.map((u) => u.path), log });
    problems.push(...errors);
    for (const { book, path } of uploads) {
      const size = sizes.get(path);
      if (size) book.cover = { src: path, width: size.width, height: size.height };
    }
  }
  // Key order in the written file: title, author, year, cover.
  const ordered = shelves.map((s) => ({ title: s.title, books: s.books.map(({ title, author, year, cover }) => ({ title, ...(author ? { author } : {}), ...(year ? { year } : {}), ...(cover ? { cover } : {}) })) }));
  return { books: ordered, problems };
}
