import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';
import { parse } from 'yaml';
import PostList from '../src/components/PostList.astro';
import { count, read } from './helpers/dist';
import { render } from './helpers/render';

test('blog index lists 39 posts; empty category builds', () => { expect(count(read('dist/blog/index.html'), 'class="post-item"')).toBe(39); expect(existsSync('dist/category/product-management/index.html')).toBe(true); });  // Review Focus 4
test('post page keeps iframe and uses it lang', () => { const html = read('dist/2017/04/video-slide-wordpress-wordcamp-torino-2017/index.html'); expect(html).toContain('<iframe'); expect(html).toContain('<html lang="it"'); });
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
    expect(html).toContain('<title>WordPress — Blog — olegs</title>');
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
    expect(html).toContain('<title>Podcast con Naval Ravikant – Dure verità sulla felicità e la natura umana — olegs</title>');
    expect(html).toContain('<meta name="description" content="Riflessioni essenziali su felicità');
    expect(html).toContain('<meta property="og:image" content="https://img.olegs.be/uploads/2025/04/you-have-one-life-naval-ravikant.jpg">');
    expect(html).toMatch(/<h1[^>]*>Podcast con Naval Ravikant – Dure verità sulla felicità e la natura umana<\/h1>/);
    expect(html).toMatch(/16 aprile 2025[\s\S]{0,300}<a href="\/category\/personal-growth\/"[^>]*>Personal Growth<\/a>/);
    expect(html).toMatch(/<h2[^>]*>Sulla felicità<\/h2>/);
  });

  test('seoTitle wins over title in <title>', () => {
    const html = read('dist/2016/01/come-organizzare-meetup-informale-domande-postit/index.html');
    expect(html).toContain('<title>Come organizzare un WordPress Meetup informale con Post-it — olegs</title>');
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
  test('39 items with absolute links', () => {
    const xml = read('dist/feed.xml');
    expect(count(xml, '<item>')).toBe(39);
    expect(xml).toContain('<title>olegs — blog</title>');
    expect(xml).toContain('<link>https://olegs.be/2025/04/podcast-naval-ravikant-dure-verita-felicita-natura-umana/</link>');
  });
});

test('PostList renders a placeholder for an empty list', async () => {
  const html = await render(PostList, { props: { posts: [], heading: 'Product Management' } });
  expect(html).toMatch(/<p class="mono"[^>]*>No posts yet\.<\/p>/);
  expect(html).toMatch(/<h1[^>]*>Product Management<\/h1>/);
  expect(html).not.toContain('post-item');
});
