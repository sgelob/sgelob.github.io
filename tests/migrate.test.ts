import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parse } from 'yaml';
import { describe, expect, test } from 'vitest';
import { writeMarkdown } from '../scripts/lib/frontmatter';
import { PATH_FIXUPS, applyPathFixups } from '../scripts/migrate/fixups';
import { draftFrontmatter, galleryFrontmatter, pageFrontmatter, postFrontmatter } from '../scripts/migrate/frontmatter-order';
import { buildRedirects } from '../scripts/migrate/redirects';
import { EXPECTED, mismatches, runMigration, type Summary } from '../scripts/migrate/run';

const FIXTURE = 'tests/fixtures/wp-migrate.sql';

const tmp = (): string => mkdtempSync(join(tmpdir(), 'olegs-migrate-'));
const read = (...parts: string[]): string => readFileSync(join(...parts), 'utf8');
const yaml = <T = unknown>(...parts: string[]): T => parse(read(...parts)) as T;
const ls = (dir: string): string[] => readdirSync(dir).sort();
/** Top-level frontmatter keys of a written Markdown file, in file order. */
const keysOf = (file: string): string[] => {
  const front = read(file).split('---\n')[1];
  return front.split('\n').flatMap((l) => (/^([A-Za-z]+):/.exec(l) ? [/^([A-Za-z]+):/.exec(l)![1]] : []));
};

let migrated: { out: string; drafts: string; summary: Summary } | undefined;
async function migrate() {
  if (!migrated) {
    const out = join(tmp(), 'src');
    const drafts = join(tmp(), 'drafts');
    migrated = { out, drafts, summary: await runMigration({ dump: FIXTURE, out, drafts, dryRun: false }) };
  }
  return migrated;
}

describe('path fixups', () => {
  test('the broken snow-covered-road-sign filename is mapped to the real one', () => {
    expect(PATH_FIXUPS).toEqual({
      '2007/01/snow-covered-road-sign-black-lake.jpg.jpg': '2007/01/snow-covered-road-sign-black-lake.jpg',
    });
    const html = '<img src="https://olegs.be/wp-content/uploads/2007/01/snow-covered-road-sign-black-lake.jpg.jpg" /> other.jpg.jpg';
    expect(applyPathFixups(html)).toBe('<img src="https://olegs.be/wp-content/uploads/2007/01/snow-covered-road-sign-black-lake.jpg" /> other.jpg.jpg');
  });

  test('the resized form WordPress writes into image sources is fixed too, the real file is left alone', () => {
    const html =
      '<img src="https://olegs.be/wp-content/uploads/2007/01/snow-covered-road-sign-black-lake.jpg-768x512.jpg" srcset="https://olegs.be/wp-content/uploads/2007/01/snow-covered-road-sign-black-lake.jpg 1620w">';
    expect(applyPathFixups(html)).toBe(
      '<img src="https://olegs.be/wp-content/uploads/2007/01/snow-covered-road-sign-black-lake.jpg" srcset="https://olegs.be/wp-content/uploads/2007/01/snow-covered-road-sign-black-lake.jpg 1620w">',
    );
  });
});

describe('frontmatter key order', () => {
  const dir = tmp();
  const gallery = {
    slug: 'g', title: 'T', date: '2012-08-11T09:00:31', genre: 'cities', country: 'italy', cover: 'a.jpg', darkHeader: true,
    photos: [{ src: 'a.jpg', width: 1, height: 2 }], coverHeight: 2, coverWidth: 1, seoDescription: 'D', seoTitle: 'S', shortTitle: 'Short', oldSlugs: ['x', '', 'x', 'y'], body: '',
  };
  const post = {
    slug: 'p', title: 'T', date: '2019-03-04T10:11:12', categories: ['c'], lang: 'it' as const, excerpt: 'E', oldSlugs: [], body: '',
    seoDescription: 'D', seoTitle: 'S', cover: 'a.jpg',
  };
  const page = { slug: 'pg', path: '/pg/', title: 'T', lang: 'en' as const, seoDescription: 'D', seoTitle: 'S', body: '' };

  test('galleries', () => {
    writeMarkdown(dir, 'g', galleryFrontmatter(gallery), '');
    expect(keysOf(join(dir, 'g.md'))).toEqual(['title', 'shortTitle', 'date', 'genre', 'country', 'cover', 'coverWidth', 'coverHeight', 'darkHeader', 'seoTitle', 'seoDescription', 'oldSlugs', 'photos']);
    expect(galleryFrontmatter(gallery).oldSlugs).toEqual(['x', 'y']);
  });

  test('posts', () => {
    writeMarkdown(dir, 'p', postFrontmatter(post), '');
    expect(keysOf(join(dir, 'p.md'))).toEqual(['title', 'date', 'categories', 'cover', 'lang', 'seoTitle', 'seoDescription', 'oldSlugs', 'excerpt']);
  });

  test('pages', () => {
    writeMarkdown(dir, 'pg', pageFrontmatter(page), '');
    expect(keysOf(join(dir, 'pg.md'))).toEqual(['title', 'path', 'lang', 'seoTitle', 'seoDescription']);
  });

  test('undefined optionals are omitted, drafts start with draft: true', () => {
    const { cover: _c, seoTitle: _s, seoDescription: _d, ...bare } = post;
    writeMarkdown(dir, 'bare', draftFrontmatter(postFrontmatter(bare)), '');
    expect(keysOf(join(dir, 'bare.md'))).toEqual(['draft', 'title', 'date', 'categories', 'lang', 'oldSlugs', 'excerpt']);
    expect(read(dir, 'bare.md')).toMatch(/^---\ndraft: true\n/);
  });
});

describe('buildRedirects', () => {
  test('galleries use /gallery/<old>/, posts /YYYY/MM/<old>/; empty, duplicate and self slugs are dropped', () => {
    const r = buildRedirects(
      [{ slug: 'venezia', oldSlugs: ['venice', '', 'venice', 'venezia', 'lubitel-любитель'] }],
      [{ slug: 'post', date: '2019-03-04T10:11:12', oldSlugs: ['old-post'] }],
    );
    expect(r).toEqual([
      { from: '/gallery/venice/', to: '/gallery/venezia/' },
      { from: '/gallery/lubitel-любитель/', to: '/gallery/venezia/' },
      { from: '/2019/03/old-post/', to: '/2019/03/post/' },
    ]);
  });
});

describe('runMigration (fixture)', () => {
  test('writes galleries, posts, pages, data files and drafts outside the out dir', async () => {
    const { out, drafts, summary } = await migrate();

    expect(ls(join(out, 'content/galleries'))).toEqual(['abandoned-one.md', 'venezia-italy.md']);
    expect(ls(join(out, 'content/posts'))).toEqual(['primo-post.md', 'secondo-post.md']);
    expect(ls(join(out, 'content/pages'))).toEqual(['about.md', 'blog.md', 'cookie-policy.md', 'photos.md', 'privacy-policy.md', 'quotes.md']);
    expect(ls(join(out, 'data'))).toEqual(['books.yaml', 'events.yaml', 'home.yaml', 'quotes.yaml', 'redirects.yaml', 'taxonomies.yaml']);
    expect(ls(join(drafts, 'posts'))).toEqual(['bozza-due.md', 'draft-103.md']);
    expect(ls(join(drafts, 'galleries'))).toEqual(['draft-gallery.md']);
    expect(existsSync(join(out, 'drafts'))).toBe(false);
    expect(read(drafts, 'posts/bozza-due.md')).toMatch(/^---\ndraft: true\ntitle: Bozza due\n/);

    expect(summary).toMatchObject({
      galleries: 2, photos: 4, posts: 2, pages: 6, quotes: 4, quoteAuthors: 2, genres: 2, countries: 2, categories: 2,
      redirects: 4, draftPosts: 2, draftGalleries: 1,
    });
  });

  test('the broken photo path is fixed so no warning is raised; a draft without a genre is skipped and reported', async () => {
    const { out, summary } = await migrate();
    const venezia = read(out, 'content/galleries/venezia-italy.md');
    expect(venezia).toContain('src: 2007/01/snow-covered-road-sign-black-lake.jpg\n');
    expect(venezia).not.toContain('.jpg.jpg');
    expect(summary.warnings).toEqual([]);
    expect(summary.skippedDrafts).toEqual(['draft gallery draft-no-genre (Draft, no genre): gallery draft-no-genre: no genre term']);
  });

  test('gallery frontmatter is ordered and its old slugs are clean', async () => {
    const { out } = await migrate();
    expect(keysOf(join(out, 'content/galleries/venezia-italy.md'))).toEqual(['title', 'shortTitle', 'date', 'genre', 'country', 'cover', 'coverWidth', 'coverHeight', 'darkHeader', 'seoTitle', 'seoDescription', 'oldSlugs', 'photos']);
    const front = parse(read(out, 'content/galleries/venezia-italy.md').split('---\n')[1]) as { oldSlugs: string[]; photos: unknown[] };
    expect(front.oldSlugs).toEqual(['lubitel-любитель', 'venice']);
    expect(front.photos).toHaveLength(3);
  });

  test('pages carry their public path; about keeps the url of the old site', async () => {
    const { out } = await migrate();
    expect(read(out, 'content/pages/about.md')).toContain('path: /agile-scrum-product-owner-manager-turin-italy/');
    expect(read(out, 'content/pages/quotes.md')).toContain('path: /my-favourite-inspirational-quotes-life-design/');
    expect(read(out, 'content/pages/about.md')).toContain('[events](/events/)');
  });

  test('redirect entries use the type-specific url pattern', async () => {
    const { out } = await migrate();
    expect(yaml(out, 'data/redirects.yaml')).toEqual([
      { from: '/gallery/lubitel-любитель/', to: '/gallery/venezia-italy/' },
      { from: '/gallery/venice/', to: '/gallery/venezia-italy/' },
      { from: '/2019/03/vecchio-slug/', to: '/2019/03/primo-post/' },
      { from: '/2019/03/altro-vecchio/', to: '/2019/03/primo-post/' },
    ]);
  });

  test('quotes are stripped, decoded, trimmed and sorted by author then text', async () => {
    const { out } = await migrate();
    expect(yaml(out, 'data/quotes.yaml')).toEqual([
      { text: 'Alpha first.', author: { name: 'Alpha Author', slug: 'alpha-author' } },
      { text: 'Alpha later.', author: { name: 'Alpha Author', slug: 'alpha-author' } },
      { text: 'Be kind & brave.', author: { name: 'Zed Author', slug: 'zed-author' } },
      { text: 'Zebra thought.', author: { name: 'Zed Author', slug: 'zed-author' } },
    ]);
  });

  test('taxonomies are sorted by name, descriptions are Markdown and omitted when empty', async () => {
    const { out } = await migrate();
    expect(yaml(out, 'data/taxonomies.yaml')).toEqual({
      genres: [
        { slug: 'abandoned-places', name: 'Abandoned places', description: 'I find peace in *these* places.' },
        { slug: 'cities', name: 'Cities' },
      ],
      countries: [{ slug: 'france', name: 'France' }, { slug: 'italy', name: 'Italy' }],
      categories: [{ slug: 'tech', name: 'Tech' }, { slug: 'viaggi', name: 'Viaggi' }],
    });
  });

  test('events newest first, books in source order, home config with the photos page body', async () => {
    const { out } = await migrate();
    expect(yaml(out, 'data/events.yaml')).toEqual([
      { year: 2026, entries: ['Conf B – *May 2026*'] },
      { year: 2024, entries: ['Conf A – *May 2024*'] },
    ]);
    expect(yaml(out, 'data/books.yaml')).toEqual([
      { title: 'Favourite Books', entries: ['Book One – *Author One*'] },
      { title: 'Mixed Books', entries: ['Book Two – *Author Two*'] },
    ]);
    expect(yaml(out, 'data/home.yaml')).toEqual({ photosIntro: 'I am constantly updating these galleries.', featuredGalleries: [] });
  });

  test('an empty Photos page falls back to the placeholder sentence', async () => {
    const dump = join(tmp(), 'empty-photos.sql');
    writeFileSync(dump, read(FIXTURE).replace('I am constantly updating these galleries.', ''));
    const out = join(tmp(), 'src');
    await runMigration({ dump, out, drafts: join(tmp(), 'd'), dryRun: false });
    expect(yaml<{ photosIntro: string }>(out, 'data/home.yaml').photosIntro).toBe(
      'Fifteen years of places, abandoned factories and Soviet cameras, shot between Turin and the rest of Europe.',
    );
  });

  test('cleans only the files it owns before writing', async () => {
    const out = join(tmp(), 'src');
    for (const d of ['content/galleries', 'content/posts', 'content/pages', 'content/other', 'data']) mkdirSync(join(out, d), { recursive: true });
    for (const f of ['content/galleries/stale.md', 'content/posts/stale.md', 'content/pages/stale.md', 'data/quotes.yaml', 'content/galleries/notes.txt', 'content/other/keep.md', 'data/keep.yaml'])
      writeFileSync(join(out, f), 'old');
    await runMigration({ dump: FIXTURE, out, drafts: join(tmp(), 'd'), dryRun: false, force: true });
    expect(ls(join(out, 'content/galleries'))).toEqual(['abandoned-one.md', 'notes.txt', 'venezia-italy.md']);
    expect(ls(join(out, 'content/posts'))).toEqual(['primo-post.md', 'secondo-post.md']);
    expect(ls(join(out, 'content/pages'))).not.toContain('stale.md');
    expect(ls(join(out, 'content/other'))).toEqual(['keep.md']);
    expect(ls(join(out, 'data'))).toContain('keep.yaml');
    expect(read(out, 'data/quotes.yaml')).not.toBe('old');
  });

  test('refuses to replace existing content files without force, and touches nothing', async () => {
    const out = join(tmp(), 'src');
    mkdirSync(join(out, 'content/posts'), { recursive: true });
    writeFileSync(join(out, 'content/posts/hand-edited.md'), 'mine');
    await expect(runMigration({ dump: FIXTURE, out, drafts: join(tmp(), 'd'), dryRun: false })).rejects.toThrow(
      /already has 1 content files \(content\/posts\/hand-edited\.md\).*--force/,
    );
    expect(ls(join(out, 'content/posts'))).toEqual(['hand-edited.md']);
    expect(read(out, 'content/posts/hand-edited.md')).toBe('mine');
    expect(existsSync(join(out, 'data'))).toBe(false);
    // A dry run only reads, so it is allowed.
    expect((await runMigration({ dump: FIXTURE, out, drafts: join(tmp(), 'd'), dryRun: true })).posts).toBe(2);
  });

  test('dry run reports the summary and writes nothing', async () => {
    const root = tmp();
    const summary = await runMigration({ dump: FIXTURE, out: join(root, 'src'), drafts: join(root, 'drafts'), dryRun: true });
    expect(summary.galleries).toBe(2);
    expect(readdirSync(root)).toEqual([]);
  });
});

describe('mismatches', () => {
  const ok: Summary = {
    galleries: 85, photos: 3638, posts: 39, pages: 6, quotes: 188, quoteAuthors: 141, genres: 6, countries: 13, categories: 9, redirects: 15,
    draftPosts: 78, draftGalleries: 4, warnings: [], skippedDrafts: [],
  };
  test('EXPECTED pins the migration counts', () => {
    expect(EXPECTED).toEqual({ galleries: 85, photos: 3638, posts: 39, pages: 6, quotes: 188, quoteAuthors: 141, genres: 6, countries: 13, categories: 9, redirects: 15 });
    expect(mismatches(ok)).toEqual([]);
  });
  test('lists every count that differs', () => {
    expect(mismatches({ ...ok, galleries: 84, redirects: 14 })).toEqual(['galleries: expected 85, got 84', 'redirects: expected 15, got 14']);
  });
});

describe('real dump', () => {
  test.skipIf(!process.env.DUMP_PATH)('real migration counts match constraints', async () => {
    const root = tmp();
    const summary = await runMigration({ dump: process.env.DUMP_PATH!, out: join(root, 'src'), drafts: join(root, 'drafts'), dryRun: false });
    expect(mismatches(summary)).toEqual([]);
    // Two of the four draft galleries are empty stubs (no photos, no cover) and are skipped.
    expect(summary).toMatchObject({ draftPosts: 78, draftGalleries: 2 });
    expect(summary.skippedDrafts).toHaveLength(2);
    expect(summary.warnings).toEqual([]);
  }, 120_000);
});
