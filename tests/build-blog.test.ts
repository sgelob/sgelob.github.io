import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';
import { parse } from 'yaml';
import PostList from '../src/components/PostList.astro';
import { count, read, contentCount } from './helpers/dist';
import { render } from './helpers/render';

test('blog index lists 39 posts; empty category builds', () => { expect(count(read('dist/blog/index.html'), 'class="post-item"')).toBe(39); expect(existsSync('dist/category/product-management/index.html')).toBe(true); });  // Review Focus 4
test('post page keeps its videos, as click-to-play facades, and uses its lang', () => { const html = read('dist/2017/04/video-slide-wordpress-wordcamp-torino-2017/index.html'); expect(html).toContain('<a class="video-embed"'); expect(html).toContain('<html lang="it"'); });
test('year and month archives and feed exist', () => { for (const p of ['dist/2016/index.html','dist/2016/05/index.html','dist/feed.xml']) expect(existsSync(p)).toBe(true); expect(read('dist/feed.xml')).toContain('<item>'); });
test('old post slug redirects', () => { expect(read('dist/2018/01/web-performance-fattore-ranking-siti-web-carlo-piazzano/index.html')).toContain('url=/2018/01/web-performance-fattore-ranking-seo-siti-web-carlo-piazzano/'); });

/** Post slugs whose frontmatter date starts with `prefix` (`YYYY-MM`), read from the content files. */
function postSlugsDated(prefix: string): string[] {
  const dir = 'src/content/posts';
  return readdirSync(dir)
    .filter((f) => f.endsWith('.md'))
    .filter((f) => {
      const front = /^---\n([\s\S]*?)\n---/.exec(readFileSync(`${dir}/${f}`, 'utf8'))?.[1] ?? '';
      return String((parse(front) as { date: string }).date).startsWith(prefix);
    })
    .map((f) => f.replace(/\.md$/, ''));
}

describe('blog lists', () => {
  test('a row: mono date and category, linked title, excerpt', () => {
    const html = read('dist/blog/index.html');
    expect(html).toContain('<title>Blog – Olegs Belousovs</title>'); // Yoast seoTitle of the blog page
    expect(html).toMatch(/<meta name="description" content="Scrivo su ottimizzazione/);
    expect(html).toContain('<html lang="it"');
    expect(html).toMatch(/16 aprile 2025[^<]*<\/time>[\s\S]{0,200}Personal Growth/);
    expect(html).toMatch(/<a href="\/2025\/04\/podcast-naval-ravikant-dure-verita-felicita-natura-umana\/"[^>]*>Podcast con Naval Ravikant/);
    expect(html).toContain('Riflessioni essenziali su felicità');
    expect(html).toContain('<span lang="en">The posts are in Italian.</span>');
    // date descending: the 2025 post comes before every 2016 one
    expect(html.indexOf('/2025/04/')).toBeLessThan(html.indexOf('/2016/'));
  });

  test('month archive lists exactly that month’s posts, under its Italian name', () => {
    const html = read('dist/2016/05/index.html');
    const expected = postSlugsDated('2016-05');
    expect(expected.length).toBeGreaterThan(0);
    expect(count(html, 'class="post-item"')).toBe(expected.length);
    for (const slug of expected) expect(html).toContain(`href="/2016/05/${slug}/"`);
    expect(html).toMatch(/<h1[^>]*>maggio 2016<\/h1>/);
  });

  test('year archive lists that year’s posts', () => {
    const html = read('dist/2016/index.html');
    expect(count(html, 'class="post-item"')).toBe(postSlugsDated('2016-').length);
    expect(html).toMatch(/<h1[^>]*>2016<\/h1>/);
  });

  test('category page has the category name as heading and only its posts', () => {
    const html = read('dist/category/wordpress/index.html');
    expect(html).toMatch(/<h1[^>]*>WordPress<\/h1>/);
    expect(html).toContain('<title>WordPress · Blog – Olegs Belousovs</title>');
    expect(html).toContain('href="/2017/04/video-slide-wordpress-wordcamp-torino-2017/"');
    expect(html).not.toContain('href="/2025/04/podcast-naval-ravikant-dure-verita-felicita-natura-umana/"');
  });

  test('an empty category says so', () => {
    expect(read('dist/category/product-management/index.html')).toMatch(/<p class="mono"[^>]*>No posts yet\.<\/p>/);
  });
});

describe('post page', () => {
  test('title, description, og image, heading and meta line', () => {
    const html = read('dist/2025/04/podcast-naval-ravikant-dure-verita-felicita-natura-umana/index.html');
    expect(html).toContain('<title>Podcast con Naval Ravikant – Dure verità sulla felicità e la natura umana – Olegs Belousovs</title>');
    expect(html).toContain('<meta name="description" content="Riflessioni essenziali su felicità');
    expect(html).toContain('<meta property="og:image" content="https://img.olegs.be/uploads/2025/04/you-have-one-life-naval-ravikant.jpg">');
    expect(html).toMatch(/<h1[^>]*>Podcast con Naval Ravikant – Dure verità sulla felicità e la natura umana<\/h1>/);
    expect(html).toMatch(/16 aprile 2025[\s\S]{0,300}<a href="\/category\/personal-growth\/"[^>]*>Personal Growth<\/a>/);
    expect(html).toMatch(/<h2[^>]*>Sulla felicità<\/h2>/);
  });

  test('seoTitle wins over title in <title>', () => {
    const html = read('dist/2016/01/come-organizzare-meetup-informale-domande-postit/index.html');
    expect(html).toContain('<title>Come organizzare un WordPress Meetup informale con Post-it – Olegs Belousovs</title>');
  });

  test('post images keep their own width up to the column: a small GIF is not stretched', () => {
    const html = read('dist/2016/10/cosa-sono-web-performance-perche-devi-preoccupartene/index.html');
    expect(html).toContain('<img src="https://img.olegs.be/uploads/2016/09/mobile-web-is-slow-phone-rage-throw-wall.gif"');
    expect(html).toMatch(/\.prose\[[\w-]+\] img\{width:auto;max-width:100%;height:auto\}/);
  });

  test('the old About #books anchor points at the Books page', () => {
    const html = read('dist/2016/05/mia-raccolta-citazioni-preferite-vita-design-lavoro/index.html');
    expect(html).toContain('<a href="/books/">una lista di libri</a>');
    expect(html).not.toContain('olegs.be/#books');
  });

  test('raw script embeds survive', () => {
    const html = read('dist/2016/11/note-impressioni-conferenza-webperfdays-amsterdam/index.html');
    expect(html).toContain('class="speakerdeck-embed"');
  });

  test('a redirect with a non-ASCII old slug builds', () => {
    expect(existsSync('dist/2017/06/tradotto-italiano-you-have-too-much-shit-💩-libro-auto-aiuto-chris-thomas/index.html')).toBe(true);
  });
});

describe('feed', () => {
  test('one item per post and per gallery, newest first, with absolute links', () => {
    const xml = read('dist/feed.xml');
    expect(count(xml, '<item>')).toBe(contentCount('posts') + contentCount('galleries') + contentCount('outdoors'));
    expect(xml).toContain('<title>olegs — blog and photos</title>');
    expect(xml).toContain('<link>https://olegs.be/2025/04/podcast-naval-ravikant-dure-verita-felicita-natura-umana/</link>');
    expect(xml).toContain('<link>https://olegs.be/gallery/ljubljana-slovenia/</link>');
    const dates = [...xml.matchAll(/<pubDate>([^<]+)<\/pubDate>/g)].map((m) => Date.parse(m[1]));
    expect(dates).toEqual([...dates].sort((a, b) => b - a));
  });

  test('gallery items carry the intro, the cover and their genre and country', () => {
    const xml = read('dist/feed.xml');
    const item = xml.split('<item>').find((i) => i.includes('/gallery/ljubljana-slovenia/')) ?? '';
    expect(item).toContain('Ljubljana, the capital of Slovenia');
    expect(item).toContain('https://img.olegs.be/uploads/2013/04/ljubljana-slovenia-75-960.jpg');
    expect(item).toContain('<category>Slovenia</category>');
    expect(item).toContain('<category>World Places</category>');
  });
});

test('PostList renders a placeholder for an empty list', async () => {
  const html = await render(PostList, { props: { posts: [], heading: 'Product Management' } });
  expect(html).toMatch(/<p class="mono"[^>]*>No posts yet\.<\/p>/);
  expect(html).toMatch(/<h1[^>]*>Product Management<\/h1>/);
  expect(html).not.toContain('post-item');
});

describe('post accessibility', () => {
  const wordcamp = () => read('dist/2017/04/video-slide-wordpress-wordcamp-torino-2017/index.html');

  test('every video carries a title for its player (the WordCamp 2017 post embeds 18)', () => {
    const html = wordcamp();
    const videos = html.match(/<a class="video-embed"[^>]*>/g) ?? [];
    expect(videos).toHaveLength(18);
    expect(videos.filter((tag) => !/\sdata-title="[^"]+"/.test(tag))).toEqual([]);
    expect(videos[0]).toContain('data-title="VideoPress video: Tammie Lister: Know your users (in inglese)"');
    expect(html).not.toContain('<iframe');
  });

  test('no built page has an untitled iframe', () => {
    const untitled: string[] = [];
    const walk = (dir: string): void => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const path = `${dir}/${entry.name}`;
        if (entry.isDirectory()) walk(path);
        else if (entry.name.endsWith('.html') && /<iframe\b(?![^>]*\stitle=)[^>]*>/.test(readFileSync(path, 'utf8'))) untitled.push(path);
      }
    };
    walk('dist');
    expect(untitled).toEqual([]);
  });

  test('English talk titles are marked inside the Italian post', () => {
    expect(wordcamp()).toContain('<span lang="en">Know your users</span> (in inglese)');
  });

  test('on an Italian post the English chrome is marked and the pager speaks Italian', () => {
    const html = wordcamp();
    expect(html).toContain('<html lang="it"');
    expect(html).toMatch(/<ul class="links mono" lang="en"/);
    expect(html).toMatch(/<footer[\s\S]*<ul class="links" lang="en"/);
    expect(html).toContain('aria-label="Altri articoli"');
    expect(html).toMatch(/<span class="visually-hidden"[^>]*>Articolo (precedente|successivo): <\/span>/);
    expect(html).toContain('Vai al contenuto');
  });

  test('the meetup posts no longer skip from h1 to h3', () => {
    for (const path of [
      '2017/04/webperf-meetup-torino-performance-esperienza-religiosa',
      '2017/06/webperf-meetup-torino-utilizzo-chrome-devtools-audit-web-performance',
      '2018/05/quiz-interattivo-quanto-ne-sai-di-web-performance',
      '2018/09/web-performance-real-user-monitoring-navigation-timing-api-google-tag-manager-analytics',
    ]) {
      const levels = [...read(`dist/${path}/index.html`).matchAll(/<h([1-6])[\s>]/g)].map((m) => Number(m[1]));
      expect(levels.every((level, i) => i === 0 || level <= levels[i - 1]! + 1), path).toBe(true);
    }
  });

  test('blog list items carry their post language', () => {
    expect(count(read('dist/blog/index.html'), '<article class="post-item" lang="')).toBe(39);
  });
});
