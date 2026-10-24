// Pure helpers for importing the music collection: the Discogs CSV export, names and formats, slugs, videos.
import { slugify } from '../trip/wizard';

export type RecordKind = 'vinyl' | 'cd' | 'dvd';

/** One release of the export: only the facts about the release, none of the owner's own fields. */
export interface CollectionRow {
  releaseId: string;
  artist: string;
  title: string;
  label: string;
  format: string;
  released: string;
}

/** RFC 4180 fields: commas and doubled quotes inside quoted fields. */
function csvRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field); field = '';
      rows.push(row); row = [];
    } else field += c;
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.some((f) => f.trim() !== ''));
}

/** The releases of the export, one row per `release_id` (a second copy of a release is the same record). */
export function parseCollection(csv: string): CollectionRow[] {
  const [header, ...rows] = csvRows(csv);
  const at = (name: string) => {
    const i = header.indexOf(name);
    if (i === -1) throw new Error(`the export has no "${name}" column`);
    return i;
  };
  const col = { releaseId: at('release_id'), artist: at('Artist'), title: at('Title'), label: at('Label'), format: at('Format'), released: at('Released') };
  const seen = new Set<string>();
  const out: CollectionRow[] = [];
  for (const r of rows) {
    const releaseId = r[col.releaseId].trim();
    if (!releaseId || seen.has(releaseId)) continue;
    seen.add(releaseId);
    out.push({ releaseId, artist: r[col.artist].trim(), title: r[col.title].trim(), label: r[col.label].trim(), format: r[col.format].trim(), released: r[col.released].trim() });
  }
  return out;
}

/** Straight quotes to typographic ones: an apostrophe is ’, an opening single quote ‘, double quotes “ ”. */
export function curly(text: string): string {
  return text
    .replace(/(^|[\s(\[])'(?=\p{L})/gu, '$1‘')
    .replace(/'/g, '’')
    .replace(/(^|[\s(\[])"/g, '$1“')
    .replace(/"/g, '”');
}

/** A name as the site shows it: without Discogs’s disambiguation numbers (“Adele (3)”), with curly quotes. */
export function cleanName(name: string): string {
  return curly(name.replace(/\s*\(\d+\)/g, '').replace(/\s+/g, ' ').trim());
}

const formatToken = (s: string): string =>
  s.trim().replace(/^DVD-V$/, 'DVD').replace(/^(\d+)x(.+)$/, '$1×$2').replace(/"/g, '″');

/** The kind of a release (its first format decides) and a short text such as “2×LP”, “12″”, “LP + CD”. */
export function formatOf(format: string): { kind: RecordKind; text: string } {
  const mains = format.split(' + ').map((segment) => formatToken(segment.split(',')[0]));
  const first = mains[0].replace(/^\d+×/, '');
  const kind: RecordKind = /CD/.test(first) ? 'cd' : /DVD/.test(first) ? 'dvd' : 'vinyl';
  return { kind, text: mains.join(' + ') };
}

const CYRILLIC: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p',
  р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'kh', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'shch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
};
const transliterate = (s: string): string => [...s.toLowerCase()].map((c) => CYRILLIC[c] ?? c).join('');

/** The slug before collisions: artist and title (a compilation: `various` and the title), transliterated. */
export function slugBase(artist: string, title: string): string {
  const who = artist === 'Various' ? 'various' : artist;
  return slugify(transliterate(`${who} ${title}`)) || slugify(transliterate(who)) || 'record';
}

/** Slugs made unique in order: on a collision the year is added, then a number. */
export function uniqueSlugs(items: { base: string; year?: number }[]): string[] {
  const used = new Set<string>();
  return items.map(({ base, year }) => {
    let slug = base;
    if (used.has(slug) && year) slug = `${base}-${year}`;
    if (used.has(slug)) {
      let n = 2;
      while (used.has(`${slug}-${n}`)) n++;
      slug = `${slug}-${n}`;
    }
    used.add(slug);
    return slug;
  });
}

/** The video id of a YouTube watch, short or embed link. */
export function youtubeId(uri: string): string | undefined {
  return /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/)|youtu\.be\/)([\w-]+)/.exec(uri)?.[1];
}

/** Lowercase letters and digits only, without the “Artist - ” many video titles start with. */
const normalise = (title: string): string =>
  title.replace(/^.*?\s-\s/, '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');

/**
 * Pairs videos with tracks by title: first exact matches, then a video title that contains a track title
 * (of 3 characters or more). Each video and each track is used once; videos left over are kept as extras.
 */
export function matchVideos(tracks: { title: string }[], videos: { title: string; uri: string }[]): { trackVideo: (string | undefined)[]; extra: { title: string; id: string }[] } {
  const names = tracks.map((t) => normalise(t.title));
  const trackVideo: (string | undefined)[] = tracks.map(() => undefined);
  const candidates = videos.flatMap((v) => {
    const id = youtubeId(v.uri);
    return id ? [{ title: v.title, id, name: normalise(v.title), used: false }] : [];
  });
  const pass = (fits: (video: string, track: string) => boolean) => {
    for (const video of candidates) {
      if (video.used) continue;
      const i = names.findIndex((name, j) => trackVideo[j] === undefined && name !== '' && fits(video.name, name));
      if (i !== -1) { trackVideo[i] = video.id; video.used = true; }
    }
  };
  pass((video, track) => video === track);
  pass((video, track) => track.length >= 3 && video.includes(track));
  return { trackVideo, extra: candidates.filter((v) => !v.used).map(({ title, id }) => ({ title: curly(title), id })) };
}

/** The key the A–Z list sorts by: lowercase, without a leading “The”. */
export const artistSortKey = (artist: string): string => artist.toLowerCase().replace(/^the\s+/, '');
