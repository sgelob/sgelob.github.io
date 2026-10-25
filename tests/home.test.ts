import { expect, test } from 'vitest';
import { daySeed, HOME_QUOTE_MAX, leadParagraphs, pickFeatured, pickRandom, quoteOfTheDay, trackOfTheDay } from '../src/lib/home';
import { records } from '../src/lib/records-data';
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

test('quoteOfTheDay: the same day gives the same quote, the next day another, and every short quote comes round', () => {
  const day = (n: number) => new Date(2026, 9, 23 + n, 4);
  expect(quoteOfTheDay(day(0))).toBe(quoteOfTheDay(new Date(2026, 9, 23, 22))); // a day, not an hour
  const eligible = [...new Set(quotes.filter((q) => q.text.length <= HOME_QUOTE_MAX).map((q) => q.text))]; // a few texts are in the file twice
  expect(eligible.length).toBeGreaterThan(150);
  const seen = new Set<string>();
  for (let n = 0; n < eligible.length; n++) {
    const today = quoteOfTheDay(day(n));
    expect(today.text.length).toBeLessThanOrEqual(HOME_QUOTE_MAX);
    expect(today).not.toBe(quoteOfTheDay(day(n + 1)));
    seen.add(today.text);
  }
  expect(seen.size).toBe(eligible.length); // no repeat before every quote has had its day
});

test('trackOfTheDay: a track with a video; one record a day, each before any repeats, then its next track', () => {
  const day = (n: number) => new Date(2026, 9, 25 + n, 4);
  expect(trackOfTheDay(day(0))).toEqual(trackOfTheDay(new Date(2026, 9, 25, 23))); // a day, not an hour
  const withVideo = records.filter((r) => r.tracks.some((t) => t.video));
  expect(withVideo.length).toBeGreaterThan(200);
  const seen = new Set<string>();
  for (let n = 0; n < withVideo.length; n++) {
    const today = trackOfTheDay(day(n))!;
    expect(today.track.video).toMatch(/^[\w-]{11}$/);
    expect(today.record.tracks).toContain(today.track);
    expect(today.record).not.toBe(trackOfTheDay(day(n + 1))!.record);
    seen.add(today.record.slug);
  }
  expect(seen.size).toBe(withVideo.length);
  // A record with several videos plays a different one on its next turn.
  const n = [...Array(withVideo.length).keys()].find((k) => trackOfTheDay(day(k))!.record.tracks.filter((t) => t.video).length > 1)!;
  expect(trackOfTheDay(day(n + withVideo.length))!.record).toBe(trackOfTheDay(day(n))!.record);
  expect(trackOfTheDay(day(n + withVideo.length))!.track).not.toBe(trackOfTheDay(day(n))!.track);
});

test('trackOfTheDay: none without a record that has a video', () => {
  expect(trackOfTheDay(new Date(), [])).toBeUndefined();
  expect(trackOfTheDay(new Date(), records.map((r) => ({ ...r, tracks: r.tracks.map(({ video, ...t }) => t) })))).toBeUndefined();
});
