import { expect, test } from 'vitest';
import { daySeed, leadParagraphs, pickFeatured, pickRandom } from '../src/lib/home';
import { groupByAuthor, quotes } from '../src/lib/quotes';

const galleries = ['a', 'b', 'c', 'd', 'e'].map((id) => ({ id }));

test('pickFeatured: 4 random galleries for the day when no ids are listed, reproducible for a seed', () => {
  const a = pickFeatured(galleries, [], 4, 20261023).map((g) => g.id);
  const b = pickFeatured(galleries, [], 4, 20261023).map((g) => g.id);
  expect(a).toEqual(b);
  expect(new Set(a).size).toBe(4);
  expect(galleries.map((g) => g.id)).toEqual(expect.arrayContaining(a));
});
test('pickRandom: different seeds give different orders over a larger pool', () => {
  const pool = Array.from({ length: 40 }, (_, i) => `g${i}`);
  const picks = new Set([1, 2, 3, 4, 5].map((seed) => pickRandom(pool, 4, seed).join(',')));
  expect(picks.size).toBeGreaterThan(1);
});
test('daySeed encodes the local date', () => { expect(daySeed(new Date(2026, 9, 23, 15))).toBe(20261023); });
test('pickFeatured: listed ids in their order', () => { expect(pickFeatured(galleries, ['e', 'b']).map((g) => g.id)).toEqual(['e', 'b']); });
test('pickFeatured: an unknown id fails the build', () => { expect(() => pickFeatured(galleries, ['zzz'])).toThrow(/zzz/); });
test('leadParagraphs: the first two paragraphs, trimmed', () => { expect(leadParagraphs('\nOne\nline.\n\n  Two.\n\n\nThree.\n')).toEqual(['One\nline.', 'Two.']); });

test('groupByAuthor keeps file order and every quote', () => {
  const groups = groupByAuthor(quotes);
  expect(groups).toHaveLength(141);
  expect(groups.flatMap((g) => g.quotes)).toEqual(quotes);
  expect(groups[0]?.author.slug).toBe(quotes[0]?.author.slug);
});
