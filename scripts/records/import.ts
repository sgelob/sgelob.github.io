// The one-time import of the music collection: the Discogs export (CSV) and the public Discogs API, covers to R2.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { RecordEntry, RecordTrack } from '../../src/lib/records';
import { processUploads } from '../photos/process';
import type { ObjectStore } from '../photos/r2';
import { artistSortKey, cleanName, curly, formatOf, matchVideos, parseCollection, slugBase, uniqueSlugs } from './collection';

export type FetchLike = (url: string, init?: { headers?: Record<string, string> }) => Promise<{ ok: boolean; status: number; text(): Promise<string>; arrayBuffer(): Promise<ArrayBuffer> }>;

export interface ImportOptions {
  /** The export's text. */
  csv: string;
  fetch: FetchLike;
  store: ObjectStore;
  uploadsDir: string;
  /** Where API answers are kept, so a rerun does not fetch them again. */
  cacheDir: string;
  /** The uploads folder of the covers, `yyyy/mm`. */
  month: string;
  log: (line: string) => void;
  /** Pause between network calls; the API allows 25 a minute without a token. */
  wait?: (ms: number) => Promise<void>;
}

interface Release {
  images?: { type?: string; uri?: string }[];
  tracklist?: { position?: string; title: string; duration?: string; type_?: string; sub_tracks?: { position?: string; title: string; duration?: string; type_?: string }[] }[];
  videos?: { title: string; uri: string }[];
  genres?: string[];
  styles?: string[];
}

const HEADERS = { 'User-Agent': 'olegs.be records import', Accept: 'application/json' };
const PAUSE = 2600;
const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export async function importRecords(opts: ImportOptions): Promise<{ records: RecordEntry[]; problems: string[] }> {
  const { fetch, store, uploadsDir, cacheDir, month, log, wait = sleep } = opts;
  const rows = parseCollection(opts.csv);
  const problems: string[] = [];
  mkdirSync(join(cacheDir, 'releases'), { recursive: true });
  mkdirSync(join(uploadsDir, month), { recursive: true });

  const fetchRelease = async (id: string): Promise<Release | undefined> => {
    const cached = join(cacheDir, 'releases', `${id}.json`);
    if (existsSync(cached)) return JSON.parse(readFileSync(cached, 'utf8')) as Release;
    let res = await fetch(`https://api.discogs.com/releases/${id}`, { headers: HEADERS });
    await wait(PAUSE);
    if (res.status === 429) {
      log('  rate limited: waiting a minute');
      await wait(60_000);
      res = await fetch(`https://api.discogs.com/releases/${id}`, { headers: HEADERS });
      await wait(PAUSE);
    }
    if (!res.ok) {
      problems.push(`release ${id}: the API answered ${res.status}`);
      return undefined;
    }
    const text = await res.text();
    writeFileSync(cached, text);
    return JSON.parse(text) as Release;
  };

  const years = rows.map((r) => (/^\d{4}$/.test(r.released) && r.released !== '0000' && Number(r.released) > 0 ? Number(r.released) : undefined));
  const artists = rows.map((r) => cleanName(r.artist));
  const titles = rows.map((r) => cleanName(r.title));
  const slugs = uniqueSlugs(rows.map((r, i) => ({ base: slugBase(artists[i], titles[i]), year: years[i] })));

  const records: RecordEntry[] = [];
  const covers: string[] = [];
  for (const [i, row] of rows.entries()) {
    log(`${i + 1}/${rows.length} ${artists[i]} – ${titles[i]}`);
    const release = await fetchRelease(row.releaseId);
    const { kind, text } = formatOf(row.format);
    const flat = (release?.tracklist ?? []).flatMap((t) => (t.sub_tracks?.length ? t.sub_tracks : [t])).filter((t) => (t.type_ ?? 'track') === 'track');
    const { trackVideo, extra } = matchVideos(flat, release?.videos ?? []);
    const tracks: RecordTrack[] = flat.map((t, j) => ({
      position: t.position ?? '',
      title: curly(t.title),
      ...(t.duration ? { duration: t.duration } : {}),
      ...(trackVideo[j] ? { video: trackVideo[j] } : {}),
    }));
    const entry: RecordEntry = {
      slug: slugs[i],
      artist: artists[i],
      title: titles[i],
      ...(years[i] ? { year: years[i] } : {}),
      label: cleanName(row.label.split(', ')[0]),
      kind,
      format: text,
      genres: release?.genres ?? [],
      styles: release?.styles ?? [],
      tracks,
      videos: extra,
    };
    const image = release?.images?.find((im) => im.type === 'primary') ?? release?.images?.[0];
    if (image?.uri) {
      const path = `${month}/record-${slugs[i]}.jpg`;
      const file = join(uploadsDir, path);
      if (!existsSync(file)) {
        const res = await fetch(image.uri, { headers: HEADERS });
        await wait(PAUSE);
        if (res.ok) writeFileSync(file, Buffer.from(await res.arrayBuffer()));
        else problems.push(`release ${row.releaseId}: the cover answered ${res.status}`);
      }
      if (existsSync(file)) covers.push(path);
    } else if (release) {
      problems.push(`release ${row.releaseId}: no image`);
    }
    records.push(entry);
  }

  if (covers.length) {
    const { sizes, errors } = await processUploads({ uploadsDir, store, files: covers, log });
    problems.push(...errors);
    for (const entry of records) {
      const src = covers.find((c) => c === `${month}/record-${entry.slug}.jpg`);
      const size = src && sizes.get(src);
      if (src && size) entry.cover = { src, width: size.width, height: size.height };
    }
  }

  const ordered = records.sort((a, b) => artistSortKey(a.artist).localeCompare(artistSortKey(b.artist), 'en') || a.title.localeCompare(b.title, 'en'));
  // Key order in the written file: cover after styles, as in the type.
  return {
    records: ordered.map(({ cover, tracks, videos, ...rest }) => ({ ...rest, ...(cover ? { cover } : {}), tracks, videos })),
    problems,
  };
}
