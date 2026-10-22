import { describe, expect, test } from 'vitest';
import { originalUrl, srcset, variantUrl } from '../src/lib/images';

describe('image URL builders', () => {
  test('variantUrl', () => {
    expect(variantUrl('2012/08/a.jpg', 960, 'webp')).toBe('https://img.olegs.be/uploads/2012/08/a-960.webp');
    expect(variantUrl('2012/08/a.png', 480, 'jpg')).toBe('https://img.olegs.be/uploads/2012/08/a-480.jpg');
  });

  test('originalUrl keeps the original extension', () => {
    expect(originalUrl('2012/08/a.jpg')).toBe('https://img.olegs.be/uploads/2012/08/a.jpg');
  });

  test('srcset lists every width that fits', () => {
    expect(srcset('2012/08/a.jpg', 'webp', 1620)).toBe(
      'https://img.olegs.be/uploads/2012/08/a-480.webp 480w, https://img.olegs.be/uploads/2012/08/a-960.webp 960w, https://img.olegs.be/uploads/2012/08/a-1600.webp 1600w',
    );
  });

  test('srcset omits widths above the source size', () => {
    expect(srcset('2020/01/s.jpg', 'jpg', 900)).toBe('https://img.olegs.be/uploads/2020/01/s-480.jpg 480w');
    expect(srcset('2020/01/s.jpg', 'jpg', 960)).toBe(
      'https://img.olegs.be/uploads/2020/01/s-480.jpg 480w, https://img.olegs.be/uploads/2020/01/s-960.jpg 960w',
    );
  });
});
