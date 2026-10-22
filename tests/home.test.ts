import { expect, test } from 'vitest';
import { leadParagraphs, pickFeatured } from '../src/lib/home';
import { groupByAuthor, quotes } from '../src/lib/quotes';

const galleries = ['a', 'b', 'c', 'd', 'e'].map((id) => ({ id }));

test('pickFeatured: the 4 most recent when no ids are listed', () => { expect(pickFeatured(galleries, []).map((g) => g.id)).toEqual(['a', 'b', 'c', 'd']); });
test('pickFeatured: listed ids in their order', () => { expect(pickFeatured(galleries, ['e', 'b']).map((g) => g.id)).toEqual(['e', 'b']); });
test('pickFeatured: an unknown id fails the build', () => { expect(() => pickFeatured(galleries, ['zzz'])).toThrow(/zzz/); });
test('leadParagraphs: the first two paragraphs, trimmed', () => { expect(leadParagraphs('\nOne\nline.\n\n  Two.\n\n\nThree.\n')).toEqual(['One\nline.', 'Two.']); });

test('groupByAuthor keeps file order and every quote', () => {
  const groups = groupByAuthor(quotes);
  expect(groups).toHaveLength(141);
  expect(groups.flatMap((g) => g.quotes)).toEqual(quotes);
  expect(groups[0]?.author.slug).toBe(quotes[0]?.author.slug);
});
