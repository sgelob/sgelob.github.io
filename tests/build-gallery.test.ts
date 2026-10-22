import { describe, expect, test } from 'vitest';
import { count, exists, read } from './helpers/dist';

test('venezia gallery renders 81 photos, hero, neighbours', () => { const html = read('dist/gallery/venezia-italy/index.html'); expect(count(html, 'class="ph"')).toBe(81); expect(html).toContain('data-pswp-width="1620"'); expect(html).toContain('81 photos'); expect(html).toMatch(/href="\/gallery\/[a-z0-9-]+\/"[^>]*rel="prev"/); });
test('gallery html stays under 50 KB and has no inline photoswipe', () => { const html = read('dist/gallery/berlin-germany/index.html'); expect(Buffer.byteLength(html)).toBeLessThan(50 * 1024); expect(html).not.toContain('PhotoSwipeLightbox'); });
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
    expect(html).toMatch(/Italy<\/span>\s*<span[^>]*>World Places<\/span>\s*<span[^>]*>August 2012<\/span>\s*<span[^>]*>81 photos<\/span>/);
  });

  test('grid: photos in frontmatter order, linking to the originals, with their ratio', () => {
    const html = venezia();
    expect(html).toContain('<a class="ph" href="https://img.olegs.be/uploads/2012/08/venezia-italy-01.jpg" data-pswp-width="1620" data-pswp-height="1080" style="--r: 1.5"');
    expect(html.indexOf('venezia-italy-01.jpg"')).toBeLessThan(html.indexOf('venezia-italy-81.jpg"'));
    expect(html).toContain('class="spacer"');
    expect(html).toContain('sizes="(min-width: 1100px) 33vw, 50vw"');
  });

  test('neighbours: "← older" is rel="next", "newer →" is rel="prev"', () => {
    const html = venezia(); // 2012-08: Florence is the older neighbour, Munich the newer
    expect(html).toMatch(/<a href="\/gallery\/florence-italy\/" rel="next"[^>]*>← Florence – Italy<\/a>/);
    expect(html).toMatch(/<a href="\/gallery\/munich-germany\/" rel="prev"[^>]*>Munich – Germany →<\/a>/);
  });

  test('the lightbox is a small module that imports PhotoSwipe on demand', () => {
    const html = venezia();
    expect(html).not.toContain('photoswipe'); // neither its stylesheet nor its code up front
    const src = /<script type="module" src="(\/_astro\/[^"]+\.js)"><\/script>/.exec(html)?.[1];
    expect(src).toBeDefined();
    const entry = read(`dist${src}`);
    expect(Buffer.byteLength(entry)).toBeLessThan(4 * 1024);
    expect(entry).toMatch(/import\([`"']\.\/photoswipe-lightbox\.esm\.[\w-]+\.js[`"']\)/);
    expect(entry).not.toContain('pswp__');
    // The core chunk is fetched by load() itself, so its failure reaches the plain-link fallback;
    // PhotoSwipe is not left to import it lazily (an uncaught rejection after preventDefault).
    expect(entry).toMatch(/import\([`"']\.\/photoswipe\.esm\.[\w-]+\.js[`"']\)/);
    expect(entry).not.toMatch(/pswpModule:\s*\(\)\s*=>/);
  });

  test('grid basis sits below the target row height: 280px desktop, 150px mobile', () => {
    const html = venezia();
    expect(html).toMatch(/\.justified\{--basis:280px;/);
    expect(html).toMatch(/@media \(width<=719px\)\{\.justified\{--basis:150px\}\}/);
  });

  test('a gallery with text renders its Markdown body', () => {
    const html = read('dist/gallery/zenit-e-soviet-35mm-reflex-film-camera/index.html');
    expect(html).toContain('<strong>Producer:</strong> KMZ/BeLomo');
  });

  test('a cover outside the photo list still has its size', () => {
    const html = read('dist/gallery/the-bearder-line/index.html');
    expect(html).toMatch(/<img [^>]*width="800" height="1079"[^>]*loading="eager"/);
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
