import { describe, expect, test } from 'vitest';
import { WpDb } from '../scripts/lib/wp';
import { buildPost } from '../scripts/migrate/posts';

const FIXTURE = 'tests/fixtures/wp-posts.sql';

async function build(id: number) {
  const db = await WpDb.fromDump(FIXTURE);
  return buildPost(db, db.post(id)!);
}

describe('buildPost (fixture)', () => {
  test('post body rewrites upload images and keeps iframes', async () => {
    const post = await build(101);
    expect(post.body).toContain('![Pic](https://img.olegs.be/uploads/2020/05/pic-960.jpg)');
    expect(post.body).toContain('[PDF](https://img.olegs.be/uploads/2020/05/doc.pdf)');
    expect(post.body).toContain('<iframe src="https://www.youtube.com/embed/abc" width="560" height="315"></iframe>');
    expect(post.body).toContain('Secondo paragrafo.');
  });

  test('post lang is it', async () => {
    expect((await build(101)).lang).toBe('it');
    expect((await build(102)).lang).toBe('it');
  });

  test('maps metadata, categories, cover and date', async () => {
    expect(await build(101)).toEqual({
      slug: 'post-con-media',
      title: 'Post con media',
      date: '2019-03-04T10:11:12',
      categories: ['viaggi', 'tech'], // post_tag terms are not categories
      cover: '2019/03/cover.jpg', // from _thumbnail_id, size suffix stripped
      lang: 'it',
      seoTitle: 'Titolo SEO',
      seoDescription: 'Descrizione SEO.',
      oldSlugs: ['vecchio-slug', 'altro-vecchio'], // empty and duplicate values dropped
      excerpt: 'Primo paragrafo con un PDF.',
      body: expect.any(String),
    });
  });

  test('defaults: no categories, no cover, empty seo meta omitted, hand-written excerpt wins', async () => {
    const post = await build(102);
    expect(post.categories).toEqual([]);
    expect(post.oldSlugs).toEqual([]);
    expect(post).not.toHaveProperty('cover');
    expect(post).not.toHaveProperty('seoTitle');
    expect(post).not.toHaveProperty('seoDescription');
    expect(post.excerpt).toBe('Estratto scritto a mano.');
  });

  test('generated excerpt skips iframes and images, strips markdown, cuts at a word boundary', async () => {
    const { excerpt } = await build(103);
    expect(excerpt.startsWith('Un paragrafo molto lungo che continua parola parola')).toBe(true);
    expect(excerpt.endsWith('parola…')).toBe(true);
    expect(excerpt.length).toBeLessThanOrEqual(201);
    expect(excerpt).not.toMatch(/[*\[\]<>]/);
  });
});

describe('buildPost title and seo title', () => {
  test('entities in the title are decoded', async () => {
    expect((await build(103)).title).toBe('Post lungo \u{1f4a9} & co');
  });

  test('the Yoast %%title%% variable is expanded to the post title', async () => {
    expect((await build(103)).seoTitle).toBe('Post lungo \u{1f4a9} & co | Olegs');
  });
});

describe('buildPost (real dump)', () => {
  test.skipIf(!process.env.DUMP_PATH)('39 published posts, all with title, slug, excerpt, a valid date and no unexpanded entities', async () => {
    const db = await WpDb.fromDump(process.env.DUMP_PATH!);
    const posts = db.posts({ type: 'post', status: 'publish' }).map((p) => buildPost(db, p));
    console.log(
      `posts: ${posts.length}, with cover: ${posts.filter((p) => p.cover).length}, with categories: ${posts.filter((p) => p.categories.length).length}, ` +
        `empty excerpts: ${posts.filter((p) => !p.excerpt).map((p) => p.slug)}`,
    );
    expect(posts).toHaveLength(39);
    for (const p of posts) {
      expect(p.slug, p.title).toBeTruthy();
      expect(p.date, p.slug).toMatch(/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d$/);
      expect(p.excerpt, p.slug).toBeTruthy();
      expect(p.title, p.slug).not.toMatch(/&[#a-z0-9]+;/i);
      expect(p.seoTitle ?? '', p.slug).not.toContain('%%');
      expect(p.lang).toBe('it');
    }
  });
});
