import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';
import { writeMarkdown } from '../scripts/lib/frontmatter';
import { galleryFrontmatter } from '../scripts/photos/gallery';

/** Top-level frontmatter keys of a written Markdown file, in file order. */
const keysOf = (file: string): string[] => {
  const front = readFileSync(file, 'utf8').split('---\n')[1];
  return front.split('\n').flatMap((l) => (/^([A-Za-z]+):/.exec(l) ? [/^([A-Za-z]+):/.exec(l)![1]] : []));
};

describe('gallery front matter', () => {
  const dir = mkdtempSync(join(tmpdir(), 'olegs-gallery-'));
  const gallery = {
    slug: 'g', title: 'T', date: '2012-08-11T09:00:31', genre: 'cities', country: 'italy', cover: 'a.jpg', darkHeader: true,
    photos: [{ src: 'a.jpg', width: 1, height: 2 }], coverHeight: 2, coverWidth: 1, seoDescription: 'D', seoTitle: 'S', oldSlugs: ['x', '', 'x', 'y'], body: '',
  };

  test('keys in their fixed order; old slugs without empty or repeated entries', () => {
    writeMarkdown(dir, 'g', galleryFrontmatter(gallery), '');
    expect(keysOf(join(dir, 'g.md'))).toEqual(['title', 'date', 'genre', 'country', 'cover', 'coverWidth', 'coverHeight', 'darkHeader', 'seoTitle', 'seoDescription', 'oldSlugs', 'photos']);
    expect(galleryFrontmatter(gallery).oldSlugs).toEqual(['x', 'y']);
  });

  test('photos: src, width, height, then an optional alt', () => {
    const photos = [{ alt: 'A red tram', height: 2, src: 'a.jpg', width: 1 }, { src: 'b.jpg', width: 3, height: 4, alt: undefined }];
    const written = galleryFrontmatter({ ...gallery, photos }).photos;
    expect(written.map((photo) => Object.keys(photo))).toEqual([['src', 'width', 'height', 'alt'], ['src', 'width', 'height']]);
    expect(written[0]).toEqual({ src: 'a.jpg', width: 1, height: 2, alt: 'A red tram' });
  });
});
