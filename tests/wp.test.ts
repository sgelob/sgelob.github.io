import { describe, expect, test } from 'vitest';
import { WpDb } from '../scripts/lib/wp';

const MINI = 'tests/fixtures/wp-mini.sql';

describe('WpDb (mini fixture)', () => {
  test('posts filter and sort', async () => {
    const db = await WpDb.fromDump(MINI);
    const published = db.posts({ type: 'galleries', status: 'publish' });
    expect(published.map((p) => p.ID)).toEqual([2, 1]);
    expect(published[0]).toEqual({
      ID: 2,
      post_name: 'newer-gallery',
      post_title: 'Newer gallery',
      post_content: 'Body of the newer gallery',
      post_excerpt: '',
      post_type: 'galleries',
      post_status: 'publish',
      post_date: '2015-09-12 08:30:00',
      post_parent: 0,
      guid: 'https://olegs.be/?post_type=galleries&p=2',
      post_mime_type: '',
      menu_order: 3,
    });
  });

  test('status accepts arrays and defaults to any', async () => {
    const db = await WpDb.fromDump(MINI);
    expect(db.posts({ type: 'galleries', status: ['publish', 'draft'] }).map((p) => p.ID)).toEqual([3, 2, 1]);
    expect(db.posts({ type: 'galleries' }).map((p) => p.ID)).toEqual([3, 2, 1]);
    expect(db.posts({ type: 'galleries', status: 'trash' })).toEqual([]);
  });

  test('post looks up by id', async () => {
    const db = await WpDb.fromDump(MINI);
    expect(db.post(7)?.post_title).toBe('Quote');
    expect(db.post(999)).toBeUndefined();
  });

  test('meta and terms', async () => {
    const db = await WpDb.fromDump(MINI);
    expect(db.meta(1, 'home_short_title')).toBe('Short');
    expect(db.meta(1, 'empty_value')).toBe('');
    expect(db.meta(2, 'null_value')).toBeUndefined();
    expect(db.meta(1, 'missing')).toBeUndefined();
    expect(db.meta(99, 'home_short_title')).toBeUndefined();
    expect(db.metaAll('home_short_title')).toEqual(
      new Map([
        [1, 'Short'],
        [2, 'Other'],
      ]),
    );
    expect(db.metaAll('nope').size).toBe(0);

    const genre = db.terms(1, 'genre');
    expect(genre[0].slug).toBe('abandoned-places');
    expect(genre.map((t) => t.slug)).toEqual(['abandoned-places', 'cities']);
    expect(genre[0]).toEqual({
      term_id: 10,
      name: 'Abandoned places',
      slug: 'abandoned-places',
      taxonomy: 'genre',
      description: 'Decay and nature',
      count: 1,
    });
    expect(db.terms(1, 'quote-author').map((t) => t.name)).toEqual(['Zeno']);
    expect(db.terms(2, 'genre')).toEqual([]);
  });

  test('metaValues returns every row of a repeated key', async () => {
    const db = await WpDb.fromDump('tests/fixtures/wp-galleries.sql');
    expect(db.metaValues(10, '_wp_old_slug')).toEqual(['lubitel-%d0%bb%d1%8e%d0%b1%d0%b8%d1%82%d0%b5%d0%bb%d1%8c', 'venice']);
    expect(db.meta(10, '_wp_old_slug')).toBe('lubitel-%d0%bb%d1%8e%d0%b1%d0%b8%d1%82%d0%b5%d0%bb%d1%8c');
    expect(db.metaValues(12, '_wp_old_slug')).toEqual([]);
    expect(db.metaValues(10, 'nope')).toEqual([]);
  });

  test('allTerms sorted by name and option', async () => {
    const db = await WpDb.fromDump(MINI);
    expect(db.allTerms('quote-author').map((t) => t.name)).toEqual(['Aristotle', 'Zeno']);
    expect(db.allTerms('missing')).toEqual([]);
    expect(db.option('siteurl')).toBe('https://olegs.be');
    expect(db.option('nope')).toBeUndefined();
  });

  test('attachments keyed by upload path', async () => {
    const db = await WpDb.fromDump(MINI);
    const att = db.attachments();
    expect(att.get('2012/08/a.jpg')).toEqual({ path: '2012/08/a.jpg', width: 1620, height: 1080, mime: 'image/jpeg' });
    expect(att.get('2012/08/b.jpg')).toEqual({ path: '2012/08/b.jpg', width: null, height: null, mime: 'image/jpeg' });
    expect([...att.keys()]).toEqual(['2012/08/a.jpg', '2012/08/b.jpg']);
  });

  test('numeric fields are numbers even when a dump quotes them', async () => {
    const db = await WpDb.fromDump('tests/fixtures/wp-quoted.sql');
    const p = db.post(5)!;
    expect(p.ID).toBe(5);
    expect(p.post_parent).toBe(2);
    expect(p.menu_order).toBe(7);
    expect(db.allTerms('genre')[0].term_id).toBe(9);
    expect(db.allTerms('genre')[0].count).toBe(4);
    expect(db.meta(5, 'k')).toBe('v');
    expect(db.terms(5, 'genre').map((t) => t.term_id)).toEqual([9]);
  });
});

describe('WpDb (real dump)', () => {
  test.skipIf(!process.env.DUMP_PATH)('real dump counts', async () => {
    const started = performance.now();
    const db = await WpDb.fromDump(process.env.DUMP_PATH!);
    console.log(`WpDb.fromDump in ${(performance.now() - started).toFixed(0)} ms`);
    expect(db.posts({ type: 'galleries', status: 'publish' })).toHaveLength(85);
    expect(db.posts({ type: 'post', status: 'publish' })).toHaveLength(39);
    expect(db.posts({ type: 'quotes', status: 'publish' })).toHaveLength(188);
    expect(db.posts({ type: 'attachment' })).toHaveLength(3785);
    expect(db.allTerms('quote-author')).toHaveLength(141);
  });
});
