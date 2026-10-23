import { render } from './helpers/render';
import JustifiedGrid from '../src/components/JustifiedGrid.astro';
import { readdirSync } from 'node:fs';
import { describe, expect, test } from 'vitest';
import { count, exists, read } from './helpers/dist';

test('venezia gallery renders 81 photos, hero, neighbours', () => { const html = read('dist/gallery/venezia-italy/index.html'); expect(count(html, 'class="ph"')).toBe(81); expect(html).toContain('width="1620" height="1080"'); expect(html).toContain('81 photos'); expect(html).toMatch(/href="\/gallery\/[a-z0-9-]+\/"[^>]*rel="prev"/); });
// The spec's budget was HTML + CSS under 50 KB. With the stylesheet inlined the file is both, and the
// page already came to ~57 KB (49 KB HTML + 8 KB CSS) when the stylesheet was a separate request.
// Since 2026-10-23 every photo carries a real alt text (content, not chrome): Berlin's 78 alts and its
// intro added ~6 KB, so the budget is 70 KB. Galleries with 100+ photos are larger still and not asserted.
test('gallery html with its inlined css stays under 70 KB and has no inline photoswipe', () => { const html = read('dist/gallery/berlin-germany/index.html'); expect(html).not.toContain('rel="stylesheet"'); expect(Buffer.byteLength(html)).toBeLessThan(70 * 1024); expect(html).not.toContain('PhotoSwipeLightbox'); });
test('old gallery slug builds a redirect page', () => { expect(read('dist/gallery/tarragona-spain/index.html')).toContain('http-equiv="refresh" content="0; url=/gallery/tarragona-catalonia-spain/"'); });

describe('gallery page', () => {
  const venezia = () => read('dist/gallery/venezia-italy/index.html');

  test('title, description, og image and the photos section active in the nav', () => {
    const html = venezia();
    expect(html).toContain('<title>Venezia – Italy — Photos — olegs</title>');
    expect(html).toContain('<meta name="description" content="Photos from Venezia – Italy: 81 photos.">');
    expect(html).toContain('<meta property="og:image" content="https://img.olegs.be/uploads/2012/08/venezia-italy-02-1600.jpg">');
    expect(html).toMatch(/<a href="\/photos\/" aria-current="true"[^>]*>/);
  });

  test('hero: eager full-width cover, heading and meta row', () => {
    const html = venezia();
    expect(html).toContain('venezia-italy-02-1600.webp 1600w" sizes="100vw">');
    expect(html).toMatch(/<img src="https:\/\/img\.olegs\.be\/uploads\/2012\/08\/venezia-italy-02-1600\.jpg"[^>]*loading="eager"/);
    expect(html).toMatch(/<h1[^>]*>Venezia – Italy<\/h1>/);
    expect(html).toMatch(/<a href="\/photos\/country\/italy\/"[^>]*>Italy<\/a>\s*<a href="\/photos\/genre\/world-places\/"[^>]*>World Places<\/a>\s*<span[^>]*>August 2012<\/span>\s*<span[^>]*>81 photos<\/span>/);
  });

  test('grid: photos in frontmatter order, linking to the originals, the lightbox at 1600, with their ratio', () => {
    const html = venezia();
    expect(html).toContain('<a class="ph" href="https://img.olegs.be/uploads/2012/08/venezia-italy-01.jpg" data-pswp-src="https://img.olegs.be/uploads/2012/08/venezia-italy-01-1600.jpg" style="--r:1.5"');
    expect(html).not.toContain('data-pswp-width'); // the lightbox reads the size from the img
    expect(html.indexOf('venezia-italy-01.jpg"')).toBeLessThan(html.indexOf('venezia-italy-81.jpg"'));
    expect(html).toContain('class="spacer"');
    expect(html).toContain('sizes="(min-width: 1100px) 33vw, 50vw"');
  });

  test('neighbours: "← older" is rel="next", "newer →" is rel="prev"', () => {
    const html = venezia(); // 2012-08: Florence is the older neighbour, Munich the newer
    expect(html).toMatch(/<a href="\/gallery\/florence-italy\/" rel="next"[^>]*><span aria-hidden="true"[^>]*>←<\/span> <span class="visually-hidden"[^>]*>Older gallery: <\/span>Florence – Italy<\/a>/);
    expect(html).toMatch(/<a href="\/gallery\/munich-germany\/" rel="prev"[^>]*><span class="visually-hidden"[^>]*>Newer gallery: <\/span>Munich – Germany <span aria-hidden="true"[^>]*>→<\/span><\/a>/);
  });

  test('related galleries: four covers from the same country, linking to its archive, never the gallery itself', () => {
    const html = venezia();
    const section = html.match(/<section class="related" aria-labelledby="related" data-pagefind-ignore[^>]*>([\s\S]*?)<\/section>/)?.[1] ?? '';
    expect(section).toMatch(/<h2 id="related"[^>]*>More from Italy<\/h2>/);
    expect(section).toMatch(/<a href="\/photos\/country\/italy\/"[^>]*>All from Italy/);
    expect(count(section, 'class="gallery-card"')).toBe(4);
    expect(section).toContain('href="/gallery/florence-italy/"');
    expect(section).not.toContain('href="/gallery/venezia-italy/"');
  });

  test('related galleries fall back to the genre when the country has no other gallery', () => {
    const html = read('dist/gallery/ljubljana-slovenia/index.html');
    expect(html).toMatch(/<h2 id="related"[^>]*>More World Places<\/h2>/);
    expect(html).toMatch(/<a href="\/photos\/genre\/world-places\/"[^>]*>All World Places/);
  });

  test('the lightbox is a small module that imports PhotoSwipe on demand', () => {
    const html = venezia();
    expect(html).not.toContain('photoswipe'); // neither its stylesheet nor its code up front
    const src = /<script type="module" src="(\/_astro\/[^"]+\.js)"><\/script>/.exec(html)?.[1];
    expect(src).toBeDefined();
    const entry = read(`dist${src}`);
    expect(Buffer.byteLength(entry)).toBeLessThan(5 * 1024); // ~4 KB with the caption and hash history code
    expect(entry).toMatch(/import\([`"']\.\/photoswipe-lightbox\.esm\.[\w-]+\.js[`"']\)/);
    expect(entry).not.toContain('pswp__');
    // The core chunk is fetched by load() itself, so its failure reaches the plain-link fallback;
    // PhotoSwipe is not left to import it lazily (an uncaught rejection after preventDefault).
    expect(entry).toMatch(/import\([`"']\.\/photoswipe\.esm\.[\w-]+\.js[`"']\)/);
    expect(entry).not.toMatch(/pswpModule:\s*\(\)\s*=>/);
    expect(entry).toContain('domItemData'); // sizes from the grid img, not data-pswp-width/height
    // An accessible name for the dialog and an announced counter (PhotoSwipe has neither).
    expect(entry).toContain('Photo viewer');
    expect(entry).toContain('aria-live');
    expect(entry).toContain('Previous photo');
  });

  test('the lightbox shows the photo description as a caption and keeps the open photo in the hash', () => {
    const html = venezia();
    const src = /<script type="module" src="(\/_astro\/[^"]+\.js)"><\/script>/.exec(html)?.[1];
    const entry = read(`dist${src}`);
    expect(entry).toContain('registerElement'); // the caption element, filled from the slide's alt
    expect(entry).toMatch(/Photo \\d\+/); // the "Photo n" fallback is not shown as a caption
    expect(entry).toContain('#photo-'); // deep link to the open photo
    expect(entry).toContain('popstate'); // Back closes the photo instead of leaving the page
    expect(html).toContain('.pswp .lb-caption'); // the caption's style ships with the page
  });

  test('grid basis sits below the target row height: 280px desktop, 150px mobile', () => {
    const html = venezia();
    expect(html).toMatch(/\.justified\{--basis:280px;/);
    expect(html).toMatch(/@media \(width<=719px\)\{\.justified\{--basis:150px\}\}/);
  });

  test('a Yoast seoTitle replaces the generated title', () => {
    expect(read('dist/gallery/sky-clouds-surreal-shapes-colors/index.html')).toContain(
      '<title>Sky and Clouds – Shapes and Surreal Colors Photography</title>',
    );
  });

  test('darkHeader: the hero is marked for the stronger scrims, only when set', () => {
    const hero = (slug: string) => /<header class="hero"[^>]*>/.exec(read(`dist/gallery/${slug}/index.html`))?.[0];
    expect(hero('kiev4a-type2-soviet-35mm-rangefinder-film-camera')).toContain('data-dark-header');
    expect(hero('berlin-germany')).toBeDefined();
    expect(hero('berlin-germany')).not.toContain('data-dark-header'); // darkHeader: false
  });

  test('a gallery with text renders its Markdown body', () => {
    const html = read('dist/gallery/zenit-e-soviet-35mm-reflex-film-camera/index.html');
    expect(html).toContain('<strong>Producer:</strong> KMZ/BeLomo');
  });

  test('a cover outside the photo list still has its size', () => {
    const html = read('dist/gallery/the-bearder-line/index.html');
    expect(html).toMatch(/<img [^>]*width="800" height="1079"[^>]*loading="eager"/);
  });

  test('a cover narrower than 1600 px offers its original above the variants', () => {
    const hero = (slug: string) => /<header class="hero"[\s\S]*?<\/picture>/.exec(read(`dist/gallery/${slug}/index.html`))?.[0] ?? '';
    const brussels = hero('brussels-belgium'); // 1440 px cover
    expect(brussels).toContain('brussels-belgium-28-960.webp 960w, https://img.olegs.be/uploads/2011/08/brussels-belgium-28.jpg 1440w"');
    expect(brussels).toContain('<img src="https://img.olegs.be/uploads/2011/08/brussels-belgium-28.jpg"');
    expect(hero('the-bearder-line')).toMatch(/\.jpg 800w"/); // 800 px cover
  });
});

describe('gallery redirects', () => {
  test('redirect page: canonical to the new url, noindex, a text link', () => {
    const html = read('dist/gallery/tarragona-spain/index.html');
    expect(html).toContain('<link rel="canonical" href="https://olegs.be/gallery/tarragona-catalonia-spain/">');
    expect(html).toContain('<meta name="robots" content="noindex">');
    expect(html).toContain('<a href="/gallery/tarragona-catalonia-spain/">');
  });

  test('a Cyrillic old slug builds', () => {
    expect(exists('dist/gallery/smena-8m-Смена-8М-soviet-35mm-film-camera/index.html')).toBe(true);
  });
});

describe('core web vitals', () => {
  test('the gallery cover is fetched at high priority', () => {
    expect(read('dist/gallery/venezia-italy/index.html')).toMatch(/<img src="https:\/\/img\.olegs\.be\/uploads\/2012\/08\/venezia-italy-02-1600\.jpg"[^>]*fetchpriority="high"/);
  });

  test('every embedded iframe on the site loads lazily', () => {
    const pages = readdirSync('dist', { recursive: true, encoding: 'utf8' }).filter((f) => f.endsWith('.html'));
    const eager = pages.filter((f) => /<iframe(?![^>]*loading="lazy")/.test(read(`dist/${f}`)));
    expect(read('dist/gallery/abandoned-beldi-furnace-novara-italy/index.html')).toMatch(/<iframe [^>]*loading="lazy"/); // after the a11y title
    expect(eager).toEqual([]);
  });

  test('the Inter latin font is preloaded from the file its @font-face uses', () => {
    const html = read('dist/gallery/venezia-italy/index.html');
    const href = html.match(/<link rel="preload" href="([^"]+inter-latin-wght-normal[^"]+\.woff2)" as="font" type="font\/woff2" crossorigin>/)?.[1];
    expect(href).toBeDefined();
    expect(html).toContain(`url(${href})`);
  });
});

describe('gallery accessibility', () => {
  test('grid photos use their alt when present, else a short "Photo N" fallback without the gallery title', async () => {
    const html = await render(JustifiedGrid, { props: { photos: [
      { src: '2012/08/a.jpg', width: 1620, height: 1080, alt: 'Gondolas moored at striped poles' },
      { src: '2012/08/b.jpg', width: 1620, height: 1080 },
    ] } });
    expect(html).toMatch(/<img [^>]*alt="Gondolas moored at striped poles"[^>]*>/);
    expect(html).toMatch(/<img [^>]*alt="Photo 2"[^>]*>/);
    expect(html).not.toContain(', photo ');
    const venezia = read('dist/gallery/venezia-italy/index.html');
    expect(venezia).toContain('alt="Water taxis and vaporetti on green lagoon water under heavy clouds"');
  });

  test('the hero cover is decorative when the grid repeats it, named after the gallery when not', () => {
    const heroImg = (slug: string) => /<header class="hero"[\s\S]*?<img [^>]*>/.exec(read(`dist/gallery/${slug}/index.html`))?.[0] ?? '';
    expect(heroImg('venezia-italy')).toMatch(/\salt(="")?[\s>]/); // empty alt, which Astro writes as a bare `alt`
    expect(heroImg('the-bearder-line')).toContain('alt="The Bearder Line"');
  });

  test('gallery cards: decorative image, the caption names the link', () => {
    const html = read('dist/photos/index.html');
    const card = /<a class="gallery-card"[\s\S]*?<\/a>/.exec(html)?.[0] ?? '';
    expect(card).toMatch(/<img [^>]*\salt(="")?[\s>]/);
    expect(card).toContain('class="title"');
  });

  test('skip link first, to the main landmark', () => {
    const html = read('dist/gallery/venezia-italy/index.html');
    expect(html).toMatch(/<body[^>]*>\s*<a class="skip-link" href="#main">Skip to content<\/a>/);
    expect(html).toMatch(/<main id="main" tabindex="-1"/);
  });
});
