import { describe, expect, test } from 'vitest';
import { WpDb } from '../scripts/lib/wp';
import { buildGallery } from '../scripts/migrate/galleries';

const FIXTURE = 'tests/fixtures/wp-galleries.sql';

async function build(id: number) {
  const db = await WpDb.fromDump(FIXTURE);
  const warnings: string[] = [];
  const gallery = buildGallery(db, db.post(id)!, (m) => warnings.push(m));
  return { gallery, warnings };
}

describe('buildGallery (fixture)', () => {
  test('photos follow content order with attachment sizes', async () => {
    const { gallery, warnings } = await build(10);
    expect(gallery.photos).toEqual([
      { src: '2012/08/a.jpg', width: 1620, height: 1080 },
      { src: '2012/08/b.jpg', width: 1080, height: 1620 },
    ]);
    expect(warnings).toEqual([]);
  });

  test('maps metadata, taxonomies and date', async () => {
    const { gallery } = await build(10);
    expect(gallery).toEqual({
      slug: 'venezia-italy',
      title: 'Venezia',
      shortTitle: 'Venice',
      date: '2012-08-11T09:00:31',
      genre: 'cities', // primary genre, not the first genre term
      country: 'italy',
      cover: '2012/08/b.jpg', // from _thumbnail_id
      darkHeader: true,
      photos: expect.any(Array),
      seoTitle: 'Venezia, Italy | Olegs',
      seoDescription: 'Gondolas and fog.',
      oldSlugs: ['lubitel-любитель', 'venice'],
      body: '',
    });
  });

  test('cover falls back to first photo', async () => {
    // 11: _thumbnail_id points to a deleted attachment; 12: no _thumbnail_id at all.
    expect((await build(11)).gallery.cover).toBe('2012/08/a.jpg');
    expect((await build(12)).gallery.cover).toBe('2012/08/b.jpg');
  });

  test('old slugs decoded', async () => {
    const { gallery } = await build(10);
    expect(gallery.oldSlugs).toContain('lubitel-любитель');
    expect((await build(12)).gallery.oldSlugs).toEqual([]);
  });

  test('defaults: first genre term, country world, optionals omitted, text body kept', async () => {
    const { gallery } = await build(11);
    expect(gallery.genre).toBe('abandoned-places');
    expect(gallery.country).toBe('world');
    expect(gallery.darkHeader).toBe(false);
    expect(gallery).not.toHaveProperty('shortTitle');
    expect(gallery).not.toHaveProperty('seoTitle');
    expect(gallery).not.toHaveProperty('seoDescription');
    expect(gallery.body).toBe('Camera: Lubitel');
  });

  test('size suffix stripped before the attachment lookup', async () => {
    const { gallery, warnings } = await build(12);
    expect(gallery.photos).toEqual([{ src: '2012/08/b.jpg', width: 1080, height: 1620 }]);
    expect(warnings).toEqual([]);
  });

  test('a photo without an attachment row or dimensions is kept as 0x0 with a warning', async () => {
    const { gallery, warnings } = await build(11);
    expect(gallery.photos).toEqual([
      { src: '2012/08/a.jpg', width: 1620, height: 1080 },
      { src: '2012/08/missing.jpg', width: 0, height: 0 },
      { src: '2012/08/nodims.jpg', width: 0, height: 0 },
    ]);
    expect(warnings).toEqual([
      'gallery lubitel: no attachment for 2012/08/missing.jpg',
      'gallery lubitel: no dimensions for 2012/08/nodims.jpg',
    ]);
  });

  test('a gallery without any genre is an error', async () => {
    await expect(build(13)).rejects.toThrow(/draft-no-genre.*genre/);
  });
});

describe('buildGallery (real dump)', () => {
  test.skipIf(!process.env.DUMP_PATH)('all 85 galleries, 3638 photos, <=1 size warning', async () => {
    const db = await WpDb.fromDump(process.env.DUMP_PATH!);
    const warnings: string[] = [];
    const galleries = db
      .posts({ type: 'galleries', status: 'publish' })
      .map((p) => buildGallery(db, p, (m) => warnings.push(m)));
    console.log(`galleries: ${galleries.length}, photos: ${galleries.reduce((n, g) => n + g.photos.length, 0)}, warnings:`, warnings);
    expect(galleries).toHaveLength(85);
    expect(galleries.reduce((n, g) => n + g.photos.length, 0)).toBe(3638);
    expect(warnings.length).toBeLessThanOrEqual(1);
    for (const g of galleries) {
      expect(g.cover, g.slug).toBeTruthy();
      expect(g.genre, g.slug).toBeTruthy();
    }
    const venezia = galleries.find((g) => g.slug === 'venezia-italy')!;
    expect(venezia.photos).toHaveLength(81); // the brief said 60, but the post holds 81 <img> tags (the 3638 total agrees)
    expect(venezia.photos[0]).toEqual({ src: '2012/08/venezia-italy-01.jpg', width: 1620, height: 1080 });
  });
});
