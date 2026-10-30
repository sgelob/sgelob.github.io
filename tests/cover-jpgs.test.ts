import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';
import { describe, expect, test } from 'vitest';
import { coverImages, ensureCoverJpgs, jpgVariantsToDelete, keptJpgKeys, linkedJpgKeys } from '../scripts/photos/covers';
import type { ObjectStore } from '../scripts/photos/r2';

const fixture = (name: string) => readFileSync(new URL(`./fixtures/${name}`, import.meta.url));

/** A project root with one gallery, one trip, one post and two records. */
function project(): string {
  const root = mkdtempSync(join(tmpdir(), 'covers-'));
  const write = (rel: string, text: string) => {
    mkdirSync(join(root, rel, '..'), { recursive: true });
    writeFileSync(join(root, rel), text);
  };
  write('src/content/galleries/g.md', '---\ntitle: G\ncover: 2012/08/g-03.jpg\ncoverWidth: 1620\ncoverHeight: 1080\nphotos: []\n---\nText.\n');
  write('src/content/outdoors/t.md', '---\ntitle: T\ncover: 2026/06/t-02.jpg\ncoverWidth: 900\ncoverHeight: 600\n---\nStory.\n');
  write(
    'src/content/posts/p.md',
    '---\ntitle: P\ncover: 2016/10/p.png\n---\n[![x](https://img.olegs.be/uploads/2016/10/shot-960.jpg)](https://img.olegs.be/uploads/2016/10/shot.jpg)\n',
  );
  write('src/data/records.yaml', '- title: R\n  cover:\n    src: 2026/10/record-r.jpg\n    width: 600\n    height: 600\n- title: No cover\n');
  return root;
}

describe('covers', () => {
  test('coverImages: gallery, trip and record covers with their widths', () => {
    expect(coverImages(project())).toEqual([
      { path: '2012/08/g-03.jpg', width: 1620 },
      { path: '2026/06/t-02.jpg', width: 900 },
      { path: '2026/10/record-r.jpg', width: 600 },
    ]);
  });

  test('linkedJpgKeys: jpg variants written by hand in the content', () => {
    expect([...linkedJpgKeys(project())]).toEqual(['uploads/2016/10/shot-960.jpg']);
  });

  test('keptJpgKeys: every jpg variant of a cover, plus the linked ones', () => {
    expect([...keptJpgKeys(project())].sort()).toEqual([
      'uploads/2012/08/g-03-1600.jpg',
      'uploads/2012/08/g-03-480.jpg',
      'uploads/2012/08/g-03-960.jpg',
      'uploads/2016/10/shot-960.jpg',
      'uploads/2026/06/t-02-480.jpg',
      'uploads/2026/10/record-r-480.jpg',
    ]);
  });
});

describe('ensureCoverJpgs', () => {
  const memory = (keys: string[]) => {
    const objects = new Map(keys.map((k) => [k, 'x']));
    const store: ObjectStore = {
      listKeys: async (prefix) => new Set([...objects.keys()].filter((k) => k.startsWith(prefix))),
      put: async (key, _body, contentType) => void objects.set(key, contentType),
    };
    return { objects, store };
  };
  const log = () => {};

  test('makes the missing jpg variants of a cover from its original, and leaves complete covers alone', async () => {
    const { objects, store } = memory(['uploads/a/done.jpg', 'uploads/a/done-480.jpg', 'uploads/a/big.jpg', 'uploads/a/big-480.jpg']);
    const read: string[] = [];
    const r = await ensureCoverJpgs({
      covers: [{ path: 'a/done.jpg', width: 900 }, { path: 'a/big.jpg', width: 1620 }],
      store,
      readOriginal: async (path) => (read.push(path), fixture('sample-1620x1080.jpg')),
      log,
    });
    expect(read).toEqual(['a/big.jpg']);
    expect(r).toMatchObject({ created: 2, errors: [] });
    expect(objects.get('uploads/a/big-960.jpg')).toBe('image/jpeg');
    expect(objects.get('uploads/a/big-1600.jpg')).toBe('image/jpeg');
    expect([...objects.keys()].filter((k) => k.endsWith('.webp'))).toEqual([]); // webp is the upload's job
  });

  test('a dry run only counts, and an unreadable original is reported', async () => {
    const { objects, store } = memory([]);
    const r = await ensureCoverJpgs({
      covers: [{ path: 'a/new.jpg', width: 1000 }, { path: 'a/gone.jpg', width: 500 }],
      store,
      readOriginal: async (path) => (path === 'a/new.jpg' ? sharp(fixture('sample-1620x1080.jpg')).toBuffer() : Promise.reject(new Error('404'))),
      dryRun: true,
      log,
    });
    expect(objects.size).toBe(0);
    expect(r.planned).toBe(3); // new: 480 + 960; gone: 480
    expect(r.created).toBe(0);
  });
});

describe('jpgVariantsToDelete', () => {
  test('only jpg variants of an original in the bucket, and never a kept one', () => {
    const keys = new Set([
      'uploads/2012/08/a.jpg',
      'uploads/2012/08/a-480.jpg',
      'uploads/2012/08/a-960.jpg',
      'uploads/2012/08/a-960.webp',
      'uploads/2012/08/b.png',
      'uploads/2012/08/b-1600.jpg',
      'uploads/2012/08/scan-960.jpg', // an original whose name happens to end in -960: no scan.* beside it
      'uploads/2012/08/c-480.jpg', // its original is gone: not a variant we know how to rebuild, left alone
      'uploads/2012/08/g-01.jpg', // gallery photos are numbered: still originals
      'uploads/2012/08/g-01-480.jpg',
      'uploads/2012/08/g-01-480.webp',
    ]);
    expect(jpgVariantsToDelete(keys, new Set(['uploads/2012/08/a-960.jpg']))).toEqual([
      'uploads/2012/08/a-480.jpg',
      'uploads/2012/08/b-1600.jpg',
      'uploads/2012/08/g-01-480.jpg',
    ]);
  });
});
