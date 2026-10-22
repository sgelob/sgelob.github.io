import { describe, expect, test } from 'vitest';
import { WpDb } from '../scripts/lib/wp';
import { buildAboutPage, buildPage, DROPPED_PAGES, isDroppedPage, splitAbout } from '../scripts/migrate/pages';

const FIXTURE = 'tests/fixtures/wp-posts.sql';

// Shaped like the real About page: Classic Editor HTML, blank-line paragraphs, excerpt divs, years and sections.
const ABOUT_FIXTURE = `Hi, I’m Oleg. I work in tech, currently as a Product Manager.

I sometimes attend <a href="#events">tech events</a> and enjoy good <a href="#books">books</a>, see my <a href="https://olegs.be/photos/">photos</a>.
<div class="excerpt"></div>
<h2 id="events">The Events and Conferences I Attended</h2>
<h3>2026</h3>
<ul>
 \t<li><a href="https://www.productheroes.it/conference/">Product Heroes Conference</a> – <em>October 1-2, 2026 – Milan, Italy</em></li>
 \t<li>AI Certification (Jane Doe &amp; John Roe) – <em>July 2026 – Online</em></li>
</ul>
<h3>2025</h3>
<ul>
 \t<li>TEDxCrocetta – “Embrace The Challenge” – <em>November 29, 2025 – Turin, Italy</em></li>
</ul>
I often attend local Meetups, <a href="https://creativemornings.com/cities/trn">Creative Mornings Turin</a>.
<div class="excerpt"></div>
<h2 id="books">The Books I Read</h2>
<a href="https://olegs.be/my-favourite-inspirational-quotes-life-design/">My Favourite Inspirational Quotes</a>
<h3>Favourite Books</h3>
<ol reversed="">
 \t<li>The Anxious Generation – <em>Jonathan Haidt</em></li>
 \t<li>Liminal Thinking – <em>Dave Gray</em></li>
</ol>
<h3>Mixed Books</h3>
<ol reversed="">
 \t<li>Lying – <em>Sam Harris</em></li>
</ol>
<div class="excerpt"></div>
<h2>How May I Help You?</h2>
<strong>Do you want to work together?</strong>

<strong><a href="mailto:me@example.com">Get in touch</a> and let’s talk!</strong>
<div class="excerpt"></div>`;

describe('splitAbout', () => {
  test('splitAbout finds years and sections', () => {
    const r = splitAbout(ABOUT_FIXTURE);
    expect(r.events[0].year).toBe(2026);
    expect(r.events[0].entries[0]).toMatch(/^\[Product Heroes/);
    expect(r.books[0].title).toBe('Favourite Books');
    expect(r.intro).toContain('Hi, I’m Oleg');
  });

  test('events: one entry per li, in order, as Markdown', () => {
    const { events } = splitAbout(ABOUT_FIXTURE);
    expect(events.map((e) => e.year)).toEqual([2026, 2025]);
    expect(events[0].entries).toEqual([
      '[Product Heroes Conference](https://www.productheroes.it/conference/) – *October 1-2, 2026 – Milan, Italy*',
      'AI Certification (Jane Doe & John Roe) – *July 2026 – Online*',
    ]);
    expect(events[1].entries).toHaveLength(1);
  });

  test('books: sections with their entries, the quotes link before the first section is dropped', () => {
    const r = splitAbout(ABOUT_FIXTURE);
    expect(r.books).toEqual([
      { title: 'Favourite Books', entries: ['The Anxious Generation – *Jonathan Haidt*', 'Liminal Thinking – *Dave Gray*'] },
      { title: 'Mixed Books', entries: ['Lying – *Sam Harris*'] },
    ]);
    expect(JSON.stringify(r)).not.toContain('Inspirational Quotes');
  });

  test('intro stops before the events heading and has no excerpt divs; outro keeps the heading and the closing paragraph', () => {
    const r = splitAbout(ABOUT_FIXTURE);
    expect(r.intro).toContain('href="#events"');
    expect(r.intro).not.toContain('<h2');
    expect(r.intro).not.toContain('class="excerpt"');
    expect(r.outro).toContain('<h2>How May I Help You?</h2>');
    expect(r.outro).toContain('Get in touch');
    expect(r.outro).toContain('Creative Mornings Turin');
    expect(r.outro).not.toContain('class="excerpt"');
    expect(r.outro).not.toContain('Liminal Thinking');
  });

  test('a page without the events or books headings is an error', () => {
    expect(() => splitAbout('<p>Hi</p>')).toThrow(/events/);
    expect(() => splitAbout('<h2 id="events">E</h2><h3>2020</h3><ul><li>x</li></ul>')).toThrow(/books/);
  });
});

describe('pages (fixture)', () => {
  async function load() {
    const db = await WpDb.fromDump(FIXTURE);
    return { db, page: (id: number) => buildPage(db, db.post(id)!) };
  }

  test('pages are in English', async () => {
    const { db, page } = await load();
    expect(page(11).lang).toBe('en');
    expect(page(743).lang).toBe('en');
    expect(buildAboutPage(db, db.post(9)!).lang).toBe('en');
  });

  test('the privacy and cookie policies are dropped, nothing else', async () => {
    const { db } = await load();
    expect(DROPPED_PAGES).toEqual(['privacy-policy', 'cookie-policy']);
    const pages = db.posts({ type: 'page', status: 'publish' });
    expect(pages.filter(isDroppedPage).map((p) => p.ID).sort((a, b) => a - b)).toEqual([634, 3727]);
    expect(pages.filter((p) => !isDroppedPage(p)).map((p) => p.post_name).sort()).toEqual([
      'agile-scrum-product-owner-manager-turin-italy', 'blog', 'my-favourite-inspirational-quotes-life-design', 'photos',
    ]);
  });

  test('slugs and public paths', async () => {
    const { db, page } = await load();
    expect(buildAboutPage(db, db.post(9)!)).toMatchObject({ slug: 'about', path: '/about/' });
    expect(page(743)).toMatchObject({ slug: 'quotes', path: '/my-favourite-inspirational-quotes-life-design/' });
    expect(page(11)).toMatchObject({ slug: 'photos', path: '/photos/' });
    expect(page(13)).toMatchObject({ slug: 'blog', path: '/blog/' });
  });

  test('page body is converted Markdown with upload links rewritten; seo meta mapped, empty omitted', async () => {
    const { page } = await load();
    const cookie = page(634); // buildPage still converts any page; the migration skips this one
    expect(cookie.body).toBe('Questo sito usa [cookie](https://img.olegs.be/uploads/2020/05/doc.pdf).');
    expect(cookie.seoTitle).toBe('Cookie SEO');
    expect(cookie).not.toHaveProperty('seoDescription');
    expect(page(13).body).toBe('');
    expect(page(11)).not.toHaveProperty('seoTitle');
  });

  test('buildPage on the About page returns a plain PageDoc without events and books', async () => {
    const { page } = await load();
    const about = page(9);
    expect(about.slug).toBe('about');
    expect(about).not.toHaveProperty('events');
    expect(about).not.toHaveProperty('books');
  });

  test('about body is intro + outro with anchors pointing to /events/ and /books/', async () => {
    const db = await WpDb.fromDump(FIXTURE);
    const about = buildAboutPage(db, { ...db.post(9)!, post_content: ABOUT_FIXTURE });
    expect(about.body).toContain('[tech events](/events/)');
    expect(about.body).toContain('[books](/books/)');
    expect(about.body).toContain('## How May I Help You?');
    expect(about.body).not.toContain('Product Heroes');
    expect(about.body).not.toContain('Liminal Thinking');
    expect(about.events).toHaveLength(2);
    expect(about.books.map((b) => b.title)).toEqual(['Favourite Books', 'Mixed Books']);
  });
});

describe('pages (real dump)', () => {
  test.skipIf(!process.env.DUMP_PATH)('39 posts, 6 WordPress pages (4 kept), 12 event years, 2 book sections', async () => {
    const db = await WpDb.fromDump(process.env.DUMP_PATH!);
    const posts = db.posts({ type: 'post', status: 'publish' });
    const pages = db.posts({ type: 'page', status: 'publish' });
    expect(posts).toHaveLength(39);
    expect(pages).toHaveLength(6);

    const about = buildAboutPage(db, db.post(9)!);
    expect(pages.filter((p) => !isDroppedPage(p))).toHaveLength(4);
    const others = pages.filter((p) => p.ID !== 9 && !isDroppedPage(p)).map((p) => buildPage(db, p));
    console.log(
      `pages: ${pages.length}, event years: ${about.events.length} (${about.events.map((e) => e.year)}), ` +
        `event entries: ${about.events.reduce((n, e) => n + e.entries.length, 0)}, ` +
        `book sections: ${about.books.map((b) => `${b.title}=${b.entries.length}`)}`,
    );
    expect(about.events).toHaveLength(12);
    expect(about.events[0].year).toBe(2026);
    expect(about.events.at(-1)!.year).toBe(2015);
    expect(about.books.map((b) => b.title)).toEqual(['Favourite Books', 'Mixed Books']);
    expect(about.body).toContain('(/events/)');
    expect(about.body).toContain('(/books/)');
    expect(about.body).not.toContain('#events');
    expect(others.map((p) => p.slug).sort()).toEqual(['blog', 'photos', 'quotes']);
  });
});
