import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, expect, test } from 'vitest';
import { parse } from 'yaml';
import { writeMarkdown } from '../scripts/lib/frontmatter';

const dirs: string[] = [];
const tmp = () => {
  const d = mkdtempSync(join(tmpdir(), 'fm-'));
  dirs.push(d);
  return d;
};
afterEach(() => {
  for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true });
});

test('writes frontmatter in key order, blank line, body, trailing newline; creates dir; overwrites', () => {
  const dir = join(tmp(), 'nested', 'galleries');
  writeMarkdown(dir, 'x', { title: 'Old', date: '2012-08-11T09:00:31' }, 'old');
  writeMarkdown(dir, 'x', { title: 'A: b', date: '2012-08-11T09:00:31', oldSlugs: [], photos: [{ src: 'a.jpg', width: 1, height: 2 }] }, 'Body text');
  const text = readFileSync(join(dir, 'x.md'), 'utf8');
  expect(text).toBe(
    ['---', 'title: "A: b"', 'date: "2012-08-11T09:00:31"', 'oldSlugs: []', 'photos:', '  - src: a.jpg', '    width: 1', '    height: 2', '---', '', 'Body text', ''].join('\n'),
  );
  expect(parse(text.split('---\n')[1])).toEqual({ title: 'A: b', date: '2012-08-11T09:00:31', oldSlugs: [], photos: [{ src: 'a.jpg', width: 1, height: 2 }] });
});

test('empty body ends right after the closing fence', () => {
  const dir = tmp();
  writeMarkdown(dir, 'y', { title: 'T' }, '');
  expect(readFileSync(join(dir, 'y.md'), 'utf8')).toBe('---\ntitle: T\n---\n');
});
