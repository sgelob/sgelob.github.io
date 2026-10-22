import { expect, test } from 'vitest';
import Pic from '../src/components/Pic.astro';
import { render } from './helpers/render';

const base = { alt: 'A photo', sizes: '100vw' };

test('Pic: webp srcset, plain jpg fallback at the largest width under maxWidth, intrinsic size, lazy', async () => {
  const html = await render(Pic, { props: { ...base, src: '2012/08/a.jpg', width: 1620, height: 1080, maxWidth: 960 } });
  expect(html).toContain('<source type="image/webp" srcset="https://img.olegs.be/uploads/2012/08/a-480.webp 480w, https://img.olegs.be/uploads/2012/08/a-960.webp 960w" sizes="100vw">');
  expect(html).toContain('src="https://img.olegs.be/uploads/2012/08/a-960.jpg"');
  expect(html).not.toMatch(/<img[^>]*srcset/); // the webp source carries the srcset; the img is the fallback
  expect(html).toMatch(/width="1620" height="1080"/);
  expect(html).toContain('alt="A photo"');
  expect(html).toContain('loading="lazy"');
  expect(html).not.toContain('decoding='); // left out: 17 bytes per photo against the 50 KB gallery budget
});

test('Pic: maxWidth defaults to the image width, never upscales', async () => {
  const html = await render(Pic, { props: { ...base, src: '2012/08/a.jpg', width: 1000, height: 800, loading: 'eager', class: 'x' } });
  expect(html).toContain('src="https://img.olegs.be/uploads/2012/08/a-960.jpg"');
  expect(html).not.toContain('-1600.');
  expect(html).toContain('loading="eager"');
  expect(html).toContain('class="x"');
});

test('Pic: an image narrower than every variant uses the original and no srcset', async () => {
  const html = await render(Pic, { props: { ...base, src: '2012/08/small.jpg', width: 300, height: 200 } });
  expect(html).toContain('src="https://img.olegs.be/uploads/2012/08/small.jpg"');
  expect(html).not.toContain('srcset');
  expect(html).not.toContain('<source');
});

test('Pic: an image of unknown size is the original with no size, srcset or source', async () => {
  const html = await render(Pic, { props: { ...base, src: '2012/08/unknown.jpg' } });
  expect(html).toContain('<img src="https://img.olegs.be/uploads/2012/08/unknown.jpg"');
  expect(html).not.toContain('width=');
  expect(html).not.toContain('height=');
  expect(html).not.toContain('srcset');
  expect(html).not.toContain('<source');
});

test('Pic: an image between its largest variant and maxWidth adds the original as the widest candidate', async () => {
  const html = await render(Pic, { props: { ...base, src: '2012/08/c.jpg', width: 1440, height: 960, maxWidth: 1600 } });
  expect(html).toContain(
    'srcset="https://img.olegs.be/uploads/2012/08/c-480.webp 480w, https://img.olegs.be/uploads/2012/08/c-960.webp 960w, https://img.olegs.be/uploads/2012/08/c.jpg 1440w"',
  );
  expect(html).toContain('<img src="https://img.olegs.be/uploads/2012/08/c.jpg"');
});

test('Pic: an 800 px image shown up to 1600 is served as the original', async () => {
  const html = await render(Pic, { props: { ...base, src: '2012/08/d.jpg', width: 800, height: 1079, maxWidth: 1600 } });
  expect(html).toContain('<img src="https://img.olegs.be/uploads/2012/08/d.jpg"');
  expect(html).toContain('srcset="https://img.olegs.be/uploads/2012/08/d-480.webp 480w, https://img.olegs.be/uploads/2012/08/d.jpg 800w"');
});

test('Pic: no original when a variant reaches maxWidth or the image is wider than it', async () => {
  for (const width of [1600, 1620]) {
    const html = await render(Pic, { props: { ...base, src: '2012/08/e.jpg', width, height: 1080, maxWidth: 1600 } });
    expect(html, String(width)).not.toContain('e.jpg');
    expect(html, String(width)).toContain('src="https://img.olegs.be/uploads/2012/08/e-1600.jpg"');
  }
});
