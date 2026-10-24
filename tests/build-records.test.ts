import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';
import { count, exists, read } from './helpers/dist';
import { artistLabel, byKind, recordPath } from '../src/lib/records';
import { records } from '../src/lib/records-data';
import { pageTitle } from '../src/lib/site';

/** Text as Astro writes it into HTML. */
const html = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const rows = (page: string) => count(page, 'class="record-row"');

describe('records list', () => {
  const list = read('dist/records/index.html');

  test('the whole collection, one row per record, under letter headings', () => {
    expect(records.length).toBeGreaterThan(250);
    expect(rows(list)).toBe(records.length);
    expect(list).toMatch(/<h2[^>]*class="letter[^"]*"[^>]*>A<\/h2>/);
    expect(list).toContain(`<title>${html(pageTitle('Records'))}</title>`);
  });

  test('a filter row with counts; Vinyl and CD pages list only their kind', () => {
    const vinyl = byKind(records, 'vinyl').length;
    const cd = byKind(records, 'cd').length;
    expect(list).toMatch(new RegExp(`<a href="/records/" aria-current="page"[^>]*>All <span class="count"[^>]*>${records.length}</span>`));
    expect(list).toMatch(new RegExp(`<a href="/records/vinyl/"[^>]*>Vinyl <span class="count"[^>]*>${vinyl}</span>`));
    expect(list).toMatch(new RegExp(`<a href="/records/cd/"[^>]*>CD <span class="count"[^>]*>${cd}</span>`));
    expect(rows(read('dist/records/vinyl/index.html'))).toBe(vinyl);
    expect(rows(read('dist/records/cd/index.html'))).toBe(cd);
    expect(exists('dist/records/dvd/index.html')).toBe(false);
  });

  test('list covers come from the site’s image host, decorative and lazy; a record without one gets a plain square', () => {
    const imgs = [...list.matchAll(/<img [^>]*>/g)].map((m) => m[0]);
    expect(imgs.length).toBe(records.filter((r) => r.cover).length);
    for (const img of imgs) {
      expect(img).toMatch(/src="https:\/\/img\.olegs\.be\/uploads\//);
      expect(img).toMatch(/\salt(="")?[\s>]/); // Astro writes an empty alt as a bare attribute
      expect(img).toContain('loading="lazy"');
    }
    expect(count(list, 'class="cover blank"')).toBe(records.filter((r) => !r.cover).length);
  });
});

describe('record page', () => {
  const record = records.find((r) => r.cover && r.tracks.some((t) => t.video) && r.videos.length) ?? records.find((r) => r.tracks.some((t) => t.video))!;
  const page = read(`dist${recordPath(record)}index.html`);

  test('every record has a page', () => {
    const dirs = readdirSync('dist/records').filter((d) => statSync(join('dist/records', d)).isDirectory());
    expect(dirs.length).toBe(records.length + 2); // and vinyl/, cd/
  });

  test('title, cover with its description, the facts and the tracklist', () => {
    expect(page).toContain(`<title>${html(pageTitle(record.title, artistLabel(record.artist), 'Records'))}</title>`);
    if (record.cover) expect(page).toContain(`alt="${html(`Cover of ${record.title} by ${artistLabel(record.artist)}`)}"`);
    expect(page).toContain(html(record.format));
    expect(count(page, 'class="track"')).toBe(record.tracks.length);
  });

  test('a track with a video links to it on YouTube and carries its id for the player; the other videos follow the tracklist', () => {
    for (const t of record.tracks.filter((t) => t.video)) {
      expect(page).toMatch(new RegExp(`<a class="play" href="https://www\\.youtube\\.com/watch\\?v=${t.video}" data-video="${t.video}"`));
    }
    for (const v of record.videos) expect(page).toContain(`data-video="${v.id}"`);
  });

  test('nothing third-party on load: no iframe, no inline script, no image from Discogs', () => {
    expect(page).not.toContain('<iframe');
    expect(page).not.toMatch(/<script(?![^>]*\bsrc=)[^>]*>/);
    expect(page).not.toContain('discogs');
  });
});

describe('the data', () => {
  const raw = readFileSync('src/data/records.yaml', 'utf8');

  test('curly apostrophes and quotes only', () => {
    expect(raw).not.toMatch(/\p{L}'\p{L}/u);
  });

  test('none of the owner’s own data', () => {
    expect(raw).not.toMatch(/^\s*(rating|condition|added|notes|folder):/m);
  });

  test('no link to Discogs anywhere on the site', () => {
    const walk = (dir: string): string[] => readdirSync(dir).flatMap((f) => {
      const p = join(dir, f);
      return statSync(p).isDirectory() ? walk(p) : p.endsWith('.html') ? [p] : [];
    });
    expect(walk('dist').filter((f) => readFileSync(f, 'utf8').includes('discogs.com'))).toEqual([]);
  });
});

describe('the player', () => {
  const record = records.find((r) => r.tracks.some((t) => t.video))!;
  const page = read(`dist${recordPath(record)}index.html`);

  test('an empty, hidden player, and a bundled script that plays a track’s video only after a click', () => {
    expect(page).toMatch(/<div class="player"[^>]*data-player[^>]*hidden/);
    const src = /<script type="module" src="(\/_astro\/[^"]+\.js)"><\/script>/.exec(page)?.[1];
    expect(src).toBeDefined();
    const code = read(`dist${src}`);
    expect(code).toContain('youtube-nocookie.com/embed/');
    expect(code).toContain('autoplay=1');
    expect(code).toMatch(/dataset\.video|data-video/);
  });
});
