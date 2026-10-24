import { mkdtempSync, mkdirSync, copyFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';
import type { ObjectStore } from '../scripts/photos/r2';
import { bookKey, enrichBooks, parseEntry, type LookupEntry } from '../scripts/books/entries';

describe('book entries', () => {
  test('parseEntry reads “Title – *Author*”, an entry without author, and Markdown escapes', () => {
    expect(parseEntry('Rework – *Jason Fried & David Heinemeier Hansson*')).toEqual({ title: 'Rework', author: 'Jason Fried & David Heinemeier Hansson' });
    expect(parseEntry('Remote: Office Not Required – *Jason Fried*')).toEqual({ title: 'Remote: Office Not Required', author: 'Jason Fried' });
    expect(parseEntry('The Smashing Book 1')).toEqual({ title: 'The Smashing Book 1' });
    expect(parseEntry('The Subtle Art of Not Giving a F\\*ck – *Mark Manson*')).toEqual({ title: 'The Subtle Art of Not Giving a F*ck', author: 'Mark Manson' });
  });

  test('bookKey ignores case, accents, punctuation and co-authors', () => {
    expect(bookKey('It Doesn’t Have to Be Crazy at Work', 'Jason Fried & David Heinemeier Hansson')).toBe(bookKey("It doesn't have to be crazy at work", 'Jason Fried'));
    expect(bookKey('Le leggi della semplicità', 'John Maeda')).not.toBe(bookKey('The Laws of Simplicity', 'John Maeda'));
  });
});

describe('enrichBooks', () => {
  const lookup: LookupEntry[] = [
    { title: 'Rework', authors: ['Jason Fried', 'David Heinemeier Hansson'], confidence: 'high', match: { year: 2010 }, coverFile: 'COVER' },
    { title: 'Unknown Book', authors: ['Nobody'], confidence: 'none' },
    { title: 'Uncertain', authors: ['Someone'], confidence: 'medium', match: { year: 1999 }, coverFile: 'COVER' },
  ];
  const sections = [{ title: 'Favourite Books', entries: ['Rework – *Jason Fried & David Heinemeier Hansson*', 'Unknown Book – *Nobody*', 'Uncertain – *Someone*'] }];

  function world() {
    const base = mkdtempSync(join(tmpdir(), 'books-'));
    const cover = join(base, 'rework.jpg');
    copyFileSync(new URL('./fixtures/sample-900x600.jpg', import.meta.url).pathname, cover);
    mkdirSync(join(base, 'uploads'), { recursive: true });
    const put: string[] = [];
    const store: ObjectStore = { listKeys: async () => new Set(put), put: async (key) => { put.push(key); } };
    const withCover = lookup.map((x) => (x.coverFile ? { ...x, coverFile: cover } : x));
    return { base, put, store, withCover };
  }

  test('confident matches get their year and cover; the rest stay as they are, in order', async () => {
    const w = world();
    const { books, problems } = await enrichBooks({ sections, lookup: w.withCover, store: w.store, uploadsDir: join(w.base, 'uploads'), month: '2026/10', log: () => {} });
    expect(books).toEqual([{ title: 'Favourite Books', books: [
      { title: 'Rework', author: 'Jason Fried & David Heinemeier Hansson', year: 2010, cover: { src: '2026/10/book-rework.jpg', width: 900, height: 600 } },
      { title: 'Unknown Book', author: 'Nobody' },
      { title: 'Uncertain', author: 'Someone' }, // only confident matches are used
    ] }]);
    expect(problems).toEqual([]);
    expect(w.put).toContain('uploads/2026/10/book-rework.jpg');
    expect(w.put).toContain('uploads/2026/10/book-rework-480.webp');
  });

  test('a second run keeps what the entries already have and uploads nothing again', async () => {
    const w = world();
    const first = await enrichBooks({ sections, lookup: w.withCover, store: w.store, uploadsDir: join(w.base, 'uploads'), month: '2026/10', log: () => {} });
    const uploads = w.put.length;
    const second = await enrichBooks({ sections: first.books, lookup: w.withCover, store: w.store, uploadsDir: join(w.base, 'uploads'), month: '2026/11', log: () => {} });
    expect(second.books).toEqual(first.books);
    expect(w.put.length).toBe(uploads);
  });
});
