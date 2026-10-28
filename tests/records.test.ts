import { expect, test } from 'vitest';
import { artistLabel, byKind, groupByLetter, parseRecords, recordPath, type RecordEntry } from '../src/lib/records';

const entry = (artist: string, kind: RecordEntry['kind'] = 'vinyl'): RecordEntry => ({
  slug: artist.toLowerCase().replace(/\W+/g, '-'), artist, title: 'T', label: 'L', kind, format: 'LP', genres: [], styles: [], tracks: [], videos: [],
});
const list = ['2020 Soundsystem', '808 State', 'Aphex Twin', 'Björk', 'The Prodigy', 'µ-Ziq', 'Мумий Тролль'].map((a) => entry(a));

test('groupByLetter: a “#” group for names starting with a digit or symbol, then A–Z (“The” ignored, accents folded), then other scripts', () => {
  const groups = groupByLetter(list);
  expect(groups.map((g) => g.letter)).toEqual(['#', 'A', 'B', 'P', 'М']);
  expect(groups[0].records.map((r) => r.artist)).toEqual(['2020 Soundsystem', '808 State', 'µ-Ziq']); // µ is not a Latin or Cyrillic letter
  expect(groups.find((g) => g.letter === 'P')!.records[0].artist).toBe('The Prodigy');
});

test('byKind: all, vinyl or CD; DVDs under CD', () => {
  const mixed = [entry('A'), entry('B', 'cd'), entry('C', 'dvd'), entry('D')];
  expect(byKind(mixed, 'all')).toHaveLength(4);
  expect(byKind(mixed, 'vinyl').map((r) => r.artist)).toEqual(['A', 'D']);
  expect(byKind(mixed, 'cd').map((r) => r.artist)).toEqual(['B', 'C']);
});

test('artistLabel and recordPath', () => {
  expect(artistLabel('Various')).toBe('Various artists');
  expect(artistLabel('Sade')).toBe('Sade');
  expect(recordPath({ slug: 'st-germain-tourist' })).toBe('/records/st-germain-tourist/');
});

test('parseRecords reads the data file, an empty file is no records', () => {
  expect(parseRecords('- slug: a\n  artist: A\n  title: T\n')).toHaveLength(1);
  expect(parseRecords('')).toEqual([]);
});
