import { describe, expect, test } from 'vitest';
import { stripSizeSuffix, uploadPath } from '../scripts/lib/uploads';

describe('uploadPath', () => {
  test('strips the size suffix and host', () => {
    expect(uploadPath('http://olegs.be/wp-content/uploads/2012/08/a-768x512.jpg')).toBe('2012/08/a.jpg');
  });

  test('plain original over https', () => {
    expect(uploadPath('https://olegs.be/wp-content/uploads/2012/08/a.jpg')).toBe('2012/08/a.jpg');
  });

  test('accepts www, protocol-relative and bare paths', () => {
    expect(uploadPath('https://www.olegs.be/wp-content/uploads/2012/08/a-150x150.jpg')).toBe('2012/08/a.jpg');
    expect(uploadPath('//olegs.be/wp-content/uploads/2012/08/a.jpg')).toBe('2012/08/a.jpg');
    expect(uploadPath('/wp-content/uploads/2012/08/a-300x200.png')).toBe('2012/08/a.png');
  });

  test('non-upload URLs return null', () => {
    expect(uploadPath('https://example.com/x.jpg')).toBeNull();
    expect(uploadPath('https://example.com/wp-content/uploads/2012/08/a.jpg')).toBeNull();
    expect(uploadPath('https://olegs.be/about')).toBeNull();
  });
});

describe('stripSizeSuffix', () => {
  test('removes only a trailing -WxH before the extension', () => {
    expect(stripSizeSuffix('2012/08/a-768x512.jpg')).toBe('2012/08/a.jpg');
    expect(stripSizeSuffix('2012/08/a.jpg')).toBe('2012/08/a.jpg');
    expect(stripSizeSuffix('2012/08/a-1024x683-2.jpg')).toBe('2012/08/a-1024x683-2.jpg');
    expect(stripSizeSuffix('2012/08/IMG-20x20.JPG')).toBe('2012/08/IMG.JPG');
  });
});
