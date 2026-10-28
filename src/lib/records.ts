// The music collection (/records/): the entries of src/data/records.yaml, written once by `npm run records`.

export type RecordKind = 'vinyl' | 'cd' | 'dvd';

export interface RecordTrack {
  position: string;
  title: string;
  duration?: string;
  /** YouTube video id, when one of the release’s videos is this track. */
  video?: string;
}

/** One release: facts about it only, none of the owner’s own data (rating, condition, date added). */
export interface RecordEntry {
  slug: string;
  artist: string;
  title: string;
  year?: number;
  label: string;
  kind: RecordKind;
  /** Short format text: “2×LP”, “12″”, “CD”, “LP + CD”. */
  format: string;
  genres: string[];
  styles: string[];
  /** The main cover under uploads/ on R2, absent when the release has none. */
  cover?: { src: string; width: number; height: number };
  tracks: RecordTrack[];
  /** Videos that match no track. */
  videos: { title: string; id: string }[];
}

import { parse } from 'yaml';

/** The entries of a records data file; an empty file is no records. */
export const parseRecords = (raw: string): RecordEntry[] => (parse(raw) as RecordEntry[] | null) ?? [];

export const recordPath = (record: Pick<RecordEntry, 'slug'>): string => `/records/${record.slug}/`;

export type RecordFilter = 'all' | 'vinyl' | 'cd';

/** The records a filter page lists. DVDs are CD-sized discs and too few for a page of their own, so they sit under CD. */
export const byKind = (list: readonly RecordEntry[], filter: RecordFilter): RecordEntry[] =>
  filter === 'all' ? [...list] : list.filter((r) => (r.kind === 'dvd' ? 'cd' : r.kind) === filter);

/** “Various” is how Discogs names the artist of a compilation. */
export const artistLabel = (artist: string): string => (artist === 'Various' ? 'Various artists' : artist);

/** The key the A–Z list sorts by: lowercase, without a leading “The”. */
export const artistSortKey = (artist: string): string => artist.toLowerCase().replace(/^the\s+/, '');

/** The heading a record sits under: a Latin letter without its accent, a Cyrillic letter, or “#” for anything else (a digit, a symbol, µ). */
export function letterOf(artist: string): string {
  const first = ([...artistSortKey(artist).normalize('NFD').replace(/[\u0300-\u036f]/g, '')][0] ?? '#').toUpperCase();
  return /^[A-Z]$/.test(first) || /\p{Script=Cyrillic}/u.test(first) ? first : '#';
}

/** Letter groups in list order: “#” first, then A–Z, then other scripts; records keep their order within a group. */
export function groupByLetter(list: readonly RecordEntry[]): { letter: string; records: RecordEntry[] }[] {
  const groups = new Map<string, RecordEntry[]>();
  for (const record of list) {
    const letter = letterOf(record.artist);
    groups.set(letter, [...(groups.get(letter) ?? []), record]);
  }
  const rank = (letter: string) => (letter === '#' ? 0 : /^[A-Z]$/.test(letter) ? 1 : 2);
  return [...groups.entries()]
    .sort(([a], [b]) => rank(a) - rank(b) || a.localeCompare(b, 'en'))
    .map(([letter, records]) => ({ letter, records }));
}

export const RECORDS_LEAD = 'The records on my shelves, vinyl and CDs. Open one to see its tracks and play the ones with a video.';
