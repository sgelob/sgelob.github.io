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
