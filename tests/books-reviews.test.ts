import { readdirSync, readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import { parse } from 'yaml';
import { books } from '../src/lib/books';

/** `/YYYY/MM/<slug>/` of every post, from its frontmatter date and file name. */
function postPaths(): Set<string> {
  const dir = 'src/content/posts';
  return new Set(
    readdirSync(dir)
      .filter((f) => f.endsWith('.md'))
      .map((f) => {
        const front = /^---\n([\s\S]*?)\n---/.exec(readFileSync(`${dir}/${f}`, 'utf8'))?.[1] ?? '';
        const date = String((parse(front) as { date: string }).date);
        return `/${date.slice(0, 4)}/${date.slice(5, 7)}/${f.replace(/\.md$/, '')}/`;
      }),
  );
}

test('a book’s review link points to a published post', () => {
  const posts = postPaths();
  const reviews = books.flatMap((s) => s.books).filter((b) => b.review);
  for (const book of reviews) expect(posts, `${book.title}: ${book.review}`).toContain(book.review);
});
