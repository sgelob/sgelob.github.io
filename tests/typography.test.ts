import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';

// House style: curly apostrophes and quotes in everything a visitor reads (I’m, “so”), straight ones
// only in code, URLs and syntax. Checked at the source, where the fix is made.
const APOSTROPHE = /[A-Za-zÀ-ÿ]'[A-Za-zÀ-ÿ]/;
const QUOTED = /(^|[\s(])"[^"\n]+"(?=[\s.,;:)!?]|$)/;

/** Prose of a Markdown file: alt lines of the front matter and the body without code, tags and link targets. */
function prose(path: string): string[] {
  const [fm, body = ''] = readFileSync(path, 'utf8').split(/\n---\n/, 2);
  const lines = fm.split('\n').filter((l) => l.startsWith('    alt: ')).map((l) => l.slice(9));
  let fence = false;
  for (const line of body.split('\n')) {
    if (line.startsWith('```')) { fence = !fence; continue; }
    if (fence || /^\s*</.test(line)) continue;
    lines.push(line.replace(/`[^`]*`/g, '').replace(/\]\([^)]*\)/g, ']()'));
  }
  return lines;
}

const files = (dir: string) => readdirSync(dir).filter((f) => f.endsWith('.md')).map((f) => `${dir}/${f}`);

describe('typography', () => {
  test('galleries, pages and trips: no straight apostrophes or straight quotes in prose and alt texts', () => {
    for (const path of [...files('src/content/galleries'), ...files('src/content/pages'), ...files('src/content/outdoors')]) {
      for (const line of prose(path)) {
        expect(line, `${path}: ${line}`).not.toMatch(APOSTROPHE);
        expect(line, `${path}: ${line}`).not.toMatch(QUOTED);
      }
    }
  });

  test('posts: no straight apostrophes in prose', () => {
    for (const path of files('src/content/posts')) for (const line of prose(path)) expect(line, `${path}: ${line}`).not.toMatch(APOSTROPHE);
  });

  test('data files: no straight apostrophes in values', () => {
    for (const name of ['home', 'books', 'events', 'quotes', 'taxonomies']) {
      for (const line of readFileSync(`src/data/${name}.yaml`, 'utf8').split('\n')) expect(line, `${name}.yaml: ${line}`).not.toMatch(APOSTROPHE);
    }
  });
});
