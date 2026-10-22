import { expect, test } from 'vitest';
import { redirects, redirectsUnder } from '../src/lib/redirects';

test('redirectsUnder keeps the entries under a prefix, raw Unicode slugs included', () => {
  const gallery = redirectsUnder('/gallery/');
  expect(gallery.length).toBeGreaterThan(0);
  expect(gallery.length).toBeLessThan(redirects.length);
  expect(gallery.every((r) => r.from.startsWith('/gallery/'))).toBe(true);
  expect(gallery).toContainEqual({ from: '/gallery/tarragona-spain/', to: '/gallery/tarragona-catalonia-spain/' });
  expect(gallery.map((r) => r.from)).toContain('/gallery/smena-8m-Смена-8М-soviet-35mm-film-camera/');
});
