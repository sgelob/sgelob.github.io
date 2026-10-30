import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';
import { keptJpgKeys } from '../scripts/photos/covers';
import { read } from './helpers/dist';

const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : /\.(html|xml)$/.test(p) ? [p] : [];
  });

describe('images after issue #69: jpg variants only for covers', () => {
  const urls = new Set(walk('dist').flatMap((f) => readFileSync(f, 'utf8').match(/https:\/\/img\.olegs\.be\/uploads\/[^\s"'<>)&]+/g) ?? []));

  test('every jpg variant the site links (pages and feed) is one the bucket keeps', () => {
    const kept = keptJpgKeys('.');
    const jpgVariants = [...urls].filter((u) => /-(480|960|1600)\.jpg$/.test(u)).map((u) => u.replace('https://img.olegs.be/', ''));
    expect(jpgVariants.length).toBeGreaterThan(0); // og:image, search results and the feed still use them
    expect(jpgVariants.filter((k) => !kept.has(k))).toEqual([]);
  }, 30_000); // reads every gallery, trip and record: slow while the rest of the suite runs

  test('the lightbox opens the 1600 webp; the grid falls back to the original', () => {
    const page = read('dist/gallery/moscow-russia/index.html');
    const lightbox = [...page.matchAll(/data-pswp-src="([^"]+)"/g)].map((m) => m[1]!);
    expect(lightbox.length).toBeGreaterThan(0);
    for (const src of lightbox) expect(src).toMatch(/-1600\.webp$/);
    const fallbacks = [...page.matchAll(/<img src="([^"]+)"/g)].map((m) => m[1]!);
    for (const src of fallbacks) expect(src).not.toMatch(/-(480|960|1600)\.jpg$/);
  });
});
