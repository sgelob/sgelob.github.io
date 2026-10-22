import { readFileSync } from 'node:fs';
import sharp from 'sharp';
import { describe, expect, test } from 'vitest';
import { IMG_BASE, variantUrl } from '../src/lib/images';
import { imageSize, resizeVariants } from '../scripts/photos/resize';

const fixture = (name: string) => readFileSync(new URL(`./fixtures/${name}`, import.meta.url));
const sample1620 = fixture('sample-1620x1080.jpg');
const sample900 = fixture('sample-900x600.jpg');

describe('resizeVariants', () => {
  test('variants never exceed the original width', async () => {
    const r = await resizeVariants(sample900, 'uploads/2020/01/s.jpg');
    expect(r.variants.map((v) => v.width)).toEqual([480, 480]); // webp + jpg at 480 only
    expect(r.variants.map((v) => v.format)).toEqual(['webp', 'jpg']);
    expect({ width: r.width, height: r.height }).toEqual({ width: 900, height: 600 });
  });

  test('1620 source yields 480, 960, 1600 in both formats', async () => {
    const r = await resizeVariants(sample1620, 'uploads/2012/08/a.jpg');
    expect(r.variants).toHaveLength(6);
    expect(r.variants.map((v) => v.key)).toEqual([
      'uploads/2012/08/a-480.webp',
      'uploads/2012/08/a-480.jpg',
      'uploads/2012/08/a-960.webp',
      'uploads/2012/08/a-960.jpg',
      'uploads/2012/08/a-1600.webp',
      'uploads/2012/08/a-1600.jpg',
    ]);
    const meta = await Promise.all(r.variants.map((v) => sharp(v.body).metadata()));
    expect(meta.map((m) => [m.format, m.width, m.height])).toEqual([
      ['webp', 480, 320],
      ['jpeg', 480, 320],
      ['webp', 960, 640],
      ['jpeg', 960, 640],
      ['webp', 1600, 1067],
      ['jpeg', 1600, 1067],
    ]);
  });

  test('variant keys agree with the URL builders of the site', async () => {
    const r = await resizeVariants(sample1620, 'uploads/2012/08/a.jpg');
    const webp960 = r.variants.find((v) => v.width === 960 && v.format === 'webp');
    expect(variantUrl('2012/08/a.jpg', 960, 'webp')).toBe(`${IMG_BASE}/${webp960?.key}`);
  });

  test('an extra width is honoured and keys keep the original basename', async () => {
    const r = await resizeVariants(sample1620, 'uploads/2012/08/photo.final.png', [1200]);
    expect(r.variants.map((v) => v.key)).toEqual(['uploads/2012/08/photo.final-1200.webp', 'uploads/2012/08/photo.final-1200.jpg']);
  });

  test('png with transparency becomes an opaque jpg', async () => {
    const png = await sharp({ create: { width: 600, height: 400, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).png().toBuffer();
    const r = await resizeVariants(png, 'uploads/2020/01/t.png');
    const jpg = r.variants.find((v) => v.format === 'jpg');
    expect((await sharp(jpg?.body).metadata()).hasAlpha).toBe(false);
  });
});

describe('imageSize', () => {
  test('reports displayed dimensions, honouring EXIF orientation', async () => {
    const rotated = await sharp(sample900).withMetadata({ orientation: 6 }).toBuffer();
    expect(await imageSize(rotated)).toEqual({ width: 600, height: 900 });
    const r = await resizeVariants(rotated, 'uploads/2020/01/r.jpg');
    expect({ width: r.width, height: r.height }).toEqual({ width: 600, height: 900 });
    expect((await sharp(r.variants[0].body).metadata()).height).toBe(720); // 480 wide, upright
  });
});
