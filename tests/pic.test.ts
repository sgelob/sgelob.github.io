import { expect, test } from 'vitest';
import Pic from '../src/components/Pic.astro';
import { render } from './helpers/render';

const base = { alt: 'A photo', sizes: '100vw' };

test('Pic: webp srcset, jpg fallback at the largest width under maxWidth, intrinsic size, lazy', async () => {
  const html = await render(Pic, { props: { ...base, src: '2012/08/a.jpg', width: 1620, height: 1080, maxWidth: 960 } });
  expect(html).toContain('<source type="image/webp" srcset="https://img.olegs.be/uploads/2012/08/a-480.webp 480w, https://img.olegs.be/uploads/2012/08/a-960.webp 960w" sizes="100vw">');
  expect(html).toContain('src="https://img.olegs.be/uploads/2012/08/a-960.jpg"');
  expect(html).toContain('srcset="https://img.olegs.be/uploads/2012/08/a-480.jpg 480w, https://img.olegs.be/uploads/2012/08/a-960.jpg 960w"');
  expect(html).toMatch(/width="1620" height="1080"/);
  expect(html).toContain('alt="A photo"');
  expect(html).toContain('loading="lazy"');
  expect(html).toContain('decoding="async"');
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
