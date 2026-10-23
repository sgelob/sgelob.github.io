import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';
import { parse } from 'yaml';
import { beforeEach, describe, expect, test } from 'vitest';
import { fixSizes } from '../scripts/photos/fill-sizes';
import { isSizeVariant, needsDownload } from '../scripts/photos/files';
import { processUploads } from '../scripts/photos/process';
import { R2Store, type ObjectStore } from '../scripts/photos/r2';
import { scaffoldGallery } from '../scripts/photos/scaffold';

const fixture = (name: string) => new URL(`./fixtures/${name}`, import.meta.url).pathname;

class MemoryStore implements ObjectStore {
  objects = new Map<string, { body: Buffer; contentType: string }>();
  listed: string[] = [];
  puts: string[] = [];
  async listKeys(prefix: string) {
    this.listed.push(prefix);
    return new Set([...this.objects.keys()].filter((k) => k.startsWith(prefix)));
  }
  async put(key: string, body: Buffer, contentType: string) {
    this.puts.push(key);
    this.objects.set(key, { body, contentType });
  }
}

const tmp = () => mkdtempSync(join(tmpdir(), 'photos-'));
const put = (root: string, rel: string, from?: string) => {
  mkdirSync(join(root, rel, '..'), { recursive: true });
  if (from) copyFileSync(from, join(root, rel));
  else writeFileSync(join(root, rel), 'not an image');
};

let uploads: string;
let store: MemoryStore;
const log = () => {};
beforeEach(() => {
  uploads = tmp();
  store = new MemoryStore();
});

describe('processUploads', () => {
  test('skips -WxH files and existing keys', async () => {
    put(uploads, '2012/08/a.jpg', fixture('sample-1620x1080.jpg'));
    put(uploads, '2012/08/a-768x512.jpg', fixture('sample-900x600.jpg'));
    put(uploads, '2012/08/b.jpg', fixture('sample-900x600.jpg'));
    store.objects.set('uploads/2012/08/b.jpg', { body: Buffer.from('x'), contentType: 'image/jpeg' });
    store.objects.set('uploads/2012/08/b-480.webp', { body: Buffer.from('x'), contentType: 'image/webp' });

    const r = await processUploads({ uploadsDir: uploads, store, log });

    expect(r.files).toBe(2); // the -768x512 file is ignored
    expect(r.skipped).toBe(2); // b.jpg and b-480.webp already exist
    expect(r.uploaded).toBe(7 + 1); // a: original + 6 variants, b: only b-480.jpg
    expect(r.errors).toEqual([]);
    expect([...store.objects.keys()].sort()).toEqual(
      [
        'uploads/2012/08/a.jpg',
        'uploads/2012/08/a-480.webp',
        'uploads/2012/08/a-480.jpg',
        'uploads/2012/08/a-960.webp',
        'uploads/2012/08/a-960.jpg',
        'uploads/2012/08/a-1600.webp',
        'uploads/2012/08/a-1600.jpg',
        'uploads/2012/08/b.jpg',
        'uploads/2012/08/b-480.webp',
        'uploads/2012/08/b-480.jpg',
      ].sort(),
    );
    expect(store.objects.get('uploads/2012/08/a.jpg')?.body.equals(readFileSync(fixture('sample-1620x1080.jpg')))).toBe(true);
    expect(store.listed).toEqual(['uploads/']); // listed once
    expect(r.sizes.get('2012/08/a.jpg')).toEqual({ width: 1620, height: 1080 });
    expect(r.sizes.get('2012/08/b.jpg')).toEqual({ width: 900, height: 600 });
  });

  test('content types follow the extension; non-images are uploaded as originals only', async () => {
    put(uploads, '2013/01/menu.pdf');
    put(uploads, '2013/01/data.bin');
    put(uploads, '2013/01/c.JPG', fixture('sample-900x600.jpg'));
    await processUploads({ uploadsDir: uploads, store, log });
    const type = (key: string) => store.objects.get(key)?.contentType;
    expect(type('uploads/2013/01/menu.pdf')).toBe('application/pdf');
    expect(type('uploads/2013/01/data.bin')).toBe('application/octet-stream');
    expect(type('uploads/2013/01/c.JPG')).toBe('image/jpeg');
    expect(type('uploads/2013/01/c-480.webp')).toBe('image/webp');
    expect(type('uploads/2013/01/c-480.jpg')).toBe('image/jpeg');
    expect([...store.objects.keys()].filter((k) => k.includes('menu') || k.includes('data')).sort()).toEqual(['uploads/2013/01/data.bin', 'uploads/2013/01/menu.pdf']);
  });

  test('dry run lists and plans but never writes', async () => {
    put(uploads, '2012/08/a.jpg', fixture('sample-1620x1080.jpg'));
    const r = await processUploads({ uploadsDir: uploads, store, dryRun: true, log });
    expect(store.objects.size).toBe(0);
    expect(store.listed).toEqual(['uploads/']);
    expect(r).toMatchObject({ files: 1, uploaded: 0, planned: 7 });
  });

  test('reports variant-key collisions between files that differ only by extension', async () => {
    put(uploads, '2026/01/x.jpg', fixture('sample-900x600.jpg'));
    const png = await sharp(readFileSync(fixture('sample-900x600.jpg'))).png().toBuffer();
    mkdirSync(join(uploads, '2026/01'), { recursive: true });
    writeFileSync(join(uploads, '2026/01/x.png'), png);

    const r = await processUploads({ uploadsDir: uploads, store, log });

    expect(r.errors).toHaveLength(1);
    expect(r.errors[0]).toContain('2026/01/x.png');
    expect(r.errors[0]).toContain('2026/01/x.jpg');
    expect(r.errors[0]).toContain('uploads/2026/01/x-480.webp');
    expect(store.objects.has('uploads/2026/01/x.jpg')).toBe(true);
    expect(store.objects.has('uploads/2026/01/x.png')).toBe(true);
    expect(store.puts.filter((k) => k.includes('x-480'))).toEqual(['uploads/2026/01/x-480.webp', 'uploads/2026/01/x-480.jpg']); // generated once
    expect(r.uploaded).toBe(4);

    const dry = await processUploads({ uploadsDir: uploads, store: new MemoryStore(), dryRun: true, log });
    expect(dry.planned).toBe(4); // two originals + one set of variants
  });

  test('an extra width produces extra variants', async () => {
    put(uploads, '2012/08/a.jpg', fixture('sample-1620x1080.jpg'));
    await processUploads({ uploadsDir: uploads, store, widths: [480, 960, 1600, 1200], log });
    expect(store.objects.has('uploads/2012/08/a-1200.webp')).toBe(true);
  });

  test('a broken image is reported, not fatal', async () => {
    put(uploads, '2012/08/broken.jpg');
    put(uploads, '2012/08/a.jpg', fixture('sample-900x600.jpg'));
    const r = await processUploads({ uploadsDir: uploads, store, log });
    expect(r.errors).toHaveLength(1);
    expect(r.errors[0]).toContain('2012/08/broken.jpg');
    expect(store.objects.has('uploads/2012/08/a-480.jpg')).toBe(true);
  });
});

describe('scaffoldGallery', () => {
  test('renames the photos <slug>-NN in natural file-name order and writes frontmatter with sizes', async () => {
    const folder = tmp();
    put(folder, 'shot 10.JPG', fixture('sample-900x600.jpg'));
    put(folder, 'shot 2.jpg', fixture('sample-1620x1080.jpg'));
    put(folder, 'notes.txt');
    const contentDir = tmp();
    const date = new Date(2024, 4, 3, 10, 20, 30);

    const path = await scaffoldGallery({ slug: 'lake-como-italy', folder, store, contentDir, uploadsDir: uploads, date });

    expect(path).toBe(join(contentDir, 'lake-como-italy.md'));
    expect(readdirSync(join(uploads, '2024/05')).sort()).toEqual(['lake-como-italy-01.jpg', 'lake-como-italy-02.jpg']);
    expect(store.objects.has('uploads/2024/05/lake-como-italy-01.jpg')).toBe(true);
    expect(store.objects.has('uploads/2024/05/lake-como-italy-02-480.webp')).toBe(true);

    const text = readFileSync(path, 'utf8');
    expect(text.indexOf('title:')).toBeLessThan(text.indexOf('date:'));
    expect(text).toContain('date: "2024-05-03T10:20:30"');
    const fm = parse(text.split('---')[1]);
    expect(fm).toEqual({
      title: 'Lake Como Italy',
      date: '2024-05-03T10:20:30',
      genre: 'world-places',
      country: 'world',
      cover: '2024/05/lake-como-italy-01.jpg',
      darkHeader: false,
      oldSlugs: [],
      photos: [
        { src: '2024/05/lake-como-italy-01.jpg', width: 1620, height: 1080 }, // shot 2 before shot 10
        { src: '2024/05/lake-como-italy-02.jpg', width: 900, height: 600 },
      ],
    });
  });

  test('rejects a different file already sitting at the target name', async () => {
    const folder = tmp();
    put(folder, 'a.jpg', fixture('sample-900x600.jpg'));
    put(uploads, '2024/05/s-01.jpg', fixture('sample-1620x1080.jpg'));
    await expect(scaffoldGallery({ slug: 's', folder, store, contentDir: tmp(), uploadsDir: uploads, date: new Date(2024, 4, 3) })).rejects.toThrow(/already exists/);
  });

  test('refuses to overwrite an existing gallery file, before copying or uploading anything', async () => {
    const folder = tmp();
    put(folder, 'a.jpg', fixture('sample-900x600.jpg'));
    const contentDir = tmp();
    writeFileSync(join(contentDir, 'lake-como-italy.md'), 'edited by hand');
    const before = store.objects.size;
    await expect(
      scaffoldGallery({ slug: 'lake-como-italy', folder, store, contentDir, uploadsDir: uploads, date: new Date(2023, 0, 9) }),
    ).rejects.toThrow(/lake-como-italy\.md already exists/);
    expect(readFileSync(join(contentDir, 'lake-como-italy.md'), 'utf8')).toBe('edited by hand');
    expect(existsSync(join(uploads, '2023/01'))).toBe(false);
    expect(store.objects.size).toBe(before);
  });

  test('rejects a folder without images', async () => {
    const folder = tmp();
    put(folder, 'notes.txt');
    await expect(scaffoldGallery({ slug: 's', folder, store, contentDir: tmp(), uploadsDir: uploads })).rejects.toThrow(/no images/i);
  });
});

describe('fixSizes', () => {
  test('fills width 0 photos from the measured file and leaves the rest alone', async () => {
    put(uploads, '2012/08/a.jpg', fixture('sample-1620x1080.jpg'));
    put(uploads, '2012/08/b.jpg', fixture('sample-900x600.jpg'));
    const contentDir = tmp();
    const broken = `---
title: Broken sizes
date: "2012-08-11T09:00:31"
genre: world-places
country: italy
cover: 2012/08/a.jpg
darkHeader: false
oldSlugs: []
photos:
  - src: 2012/08/a.jpg
    width: 0
    height: 0
  - src: 2012/08/b.jpg
    width: 900
    height: 600
  - src: 2012/08/missing.jpg
    width: 0
    height: 0
---

Body text.
`;
    const fine = '---\ntitle: Fine\ndate: "2012-08-11T09:00:31"\nphotos:\n  - src: 2012/08/b.jpg\n    width: 900\n    height: 600\n---\n';
    writeFileSync(join(contentDir, 'broken.md'), broken);
    writeFileSync(join(contentDir, 'fine.md'), fine);

    const r = await fixSizes({ contentDir, uploadsDir: uploads, log });

    expect(r).toEqual({ files: 1, photos: 1, missing: ['2012/08/missing.jpg'] });
    const text = readFileSync(join(contentDir, 'broken.md'), 'utf8');
    expect(text).toContain('date: "2012-08-11T09:00:31"');
    expect(text.endsWith('\nBody text.\n')).toBe(true);
    expect(parse(text.split('---')[1]).photos).toEqual([
      { src: '2012/08/a.jpg', width: 1620, height: 1080 },
      { src: '2012/08/b.jpg', width: 900, height: 600 },
      { src: '2012/08/missing.jpg', width: 0, height: 0 },
    ]);
    expect(readFileSync(join(contentDir, 'fine.md'), 'utf8')).toBe(fine);
    expect(existsSync(join(contentDir, 'broken.md'))).toBe(true);
  });
});

describe('upload file filters', () => {
  test('isSizeVariant matches WordPress -WxH raster names only', () => {
    expect(isSizeVariant('a-768x512.jpg')).toBe(true);
    expect(isSizeVariant('A-150X150.PNG')).toBe(true);
    expect(isSizeVariant('a.jpg')).toBe(false);
    expect(isSizeVariant('plan-800x600.pdf')).toBe(false);
  });

  test('needsDownload skips size variants and files already present with the same size', () => {
    expect(needsDownload('a-768x512.jpg', 10, undefined)).toBe(false);
    expect(needsDownload('a.jpg', 10, 10)).toBe(false);
    expect(needsDownload('a.jpg', 10, 7)).toBe(true);
    expect(needsDownload('a.jpg', 10, undefined)).toBe(true);
  });
});

describe('R2Store', () => {
  const env = { accountId: 'acc', accessKeyId: 'k', secretAccessKey: 's', bucket: 'bkt' };

  test('listKeys follows continuation tokens', async () => {
    const calls: Record<string, unknown>[] = [];
    const pages = [
      { Contents: [{ Key: 'uploads/a.jpg' }], IsTruncated: true, NextContinuationToken: 't1' },
      { Contents: [{ Key: 'uploads/b.jpg' }], IsTruncated: false },
    ];
    const client = { send: async (cmd: { input: Record<string, unknown> }) => (calls.push(cmd.input), pages[calls.length - 1]) };
    const keys = await new R2Store(env, client).listKeys('uploads/');
    expect([...keys]).toEqual(['uploads/a.jpg', 'uploads/b.jpg']);
    expect(calls).toEqual([
      { Bucket: 'bkt', Prefix: 'uploads/', ContinuationToken: undefined },
      { Bucket: 'bkt', Prefix: 'uploads/', ContinuationToken: 't1' },
    ]);
  });

  test('put sends content type and an immutable cache header', async () => {
    const calls: Record<string, unknown>[] = [];
    const client = { send: async (cmd: { input: Record<string, unknown> }) => void calls.push(cmd.input) };
    await new R2Store(env, client).put('uploads/a.webp', Buffer.from('x'), 'image/webp');
    expect(calls).toEqual([
      { Bucket: 'bkt', Key: 'uploads/a.webp', Body: Buffer.from('x'), ContentType: 'image/webp', CacheControl: 'public, max-age=31536000, immutable' },
    ]);
  });
});
