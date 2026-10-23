// Reads the public facts of a Komoot tour so the wizard can prefill them: name, sport, distance, climb, date.
// Public tours answer on api.komoot.de without login; private ones do not, and the wizard then asks as usual.
// Only those fields are taken: the start point the API also returns is never read.

export interface KomootTour {
  id: string;
  /** The tour's own photos, in tour order; empty for a planned tour or one without photos. */
  images: KomootImage[];
  name: string;
  /** Komoot's sport slug, e.g. `hike`, `mtb`, `mtb_easy`, `e_mtb`, `racebike`. */
  sport: string;
  /** Kilometres, one decimal. */
  distanceKm: number;
  /** Metres, whole. */
  climb: number;
  /** The tour's date (the recording date for a recorded tour), local day as YYYY-MM-DD. */
  date: string;
  recorded: boolean;
}

export type FetchLike = (url: string, init?: { headers?: Record<string, string> }) => Promise<{ ok: boolean; status: number; text(): Promise<string>; arrayBuffer(): Promise<ArrayBuffer> }>;

/** One of the tour's own photos, in tour order. The location Komoot attaches to it is never read. */
export interface KomootImage {
  id: number;
  /** The plain image URL: Komoot serves the photo at up to 2048 px on the long side. */
  src: string;
  /** Position along the tour, which is the shooting order. */
  index: number;
  createdAt: string;
  /** The size of the upload, not of what Komoot serves. */
  widthPx: number;
  heightPx: number;
}

const TOUR_URL = /komoot\.[a-z.]+\/(?:[a-z]{2}-[a-z]{2}\/)?tour\/(\d+)/i;

/** The tour id of a Komoot tour link (`/tour/123` with or without a locale); undefined for anything else, smart tours included. */
export const tourIdFromUrl = (url: string): string | undefined => TOUR_URL.exec(url.trim())?.[1];

/** Komoot sport → the trip's activity; undefined when it is neither a hike nor a mountain-bike ride. */
export function activityFromSport(sport: string): 'hike' | 'ride' | undefined {
  if (/^(hike|mountaineering|nordicwalking)$/.test(sport)) return 'hike';
  if (/^(mtb|mtb_easy|mtb_advanced|e_mtb|enduro|downhillbike)$/.test(sport)) return 'ride';
  return undefined;
}

/** Fetches a public tour's facts. Throws with a plain message when the tour is private, missing or the answer is not what Komoot sends. */
export async function fetchKomootTour(url: string, fetchImpl: FetchLike): Promise<KomootTour> {
  const id = tourIdFromUrl(url);
  if (!id) throw new Error('not a Komoot tour link (expected …komoot.com/tour/<number>)');
  const res = await fetchImpl(`https://api.komoot.de/v007/tours/${id}`, { headers: { Accept: 'application/hal+json', 'User-Agent': 'olegs.be trip wizard' } });
  if (res.status === 403 || res.status === 401) throw new Error('this tour is not public: Komoot refuses it without a login');
  if (res.status === 404) throw new Error(`no Komoot tour with id ${id}`);
  if (!res.ok) throw new Error(`Komoot answered ${res.status}`);
  const data = JSON.parse(await res.text()) as Record<string, unknown>;
  const { name, sport, distance, elevation_up: up, date, type } = data;
  if (typeof name !== 'string' || typeof sport !== 'string' || typeof distance !== 'number' || typeof up !== 'number' || typeof date !== 'string') {
    throw new Error('Komoot sent a tour without name, sport, distance, climb or date');
  }
  const when = new Date(date);
  const day = `${when.getFullYear()}-${String(when.getMonth() + 1).padStart(2, '0')}-${String(when.getDate()).padStart(2, '0')}`;
  const images = await fetchKomootImages(id, fetchImpl);
  return { id, name, sport, distanceKm: Math.round(distance / 100) / 10, climb: Math.round(up), date: day, recorded: type === 'tour_recorded', images };
}

const HEADERS = { Accept: 'application/hal+json', 'User-Agent': 'olegs.be trip wizard' };

/** The tour's own photos from every page of `/tours/<id>/images/`, sorted by their position along the tour. */
export async function fetchKomootImages(id: string, fetchImpl: FetchLike): Promise<KomootImage[]> {
  const images: KomootImage[] = [];
  for (let page = 0, pages = 1; page < pages; page++) {
    const res = await fetchImpl(`https://api.komoot.de/v007/tours/${id}/images/?page=${page}&limit=50`, { headers: HEADERS });
    if (!res.ok) return images; // a planned tour or one without photos: nothing to offer
    const data = JSON.parse(await res.text()) as { page?: { totalPages?: number }; _embedded?: { items?: Record<string, unknown>[] } };
    pages = data.page?.totalPages ?? 1;
    for (const it of data._embedded?.items ?? []) {
      if (typeof it.src !== 'string' || typeof it.id !== 'number') continue;
      images.push({ id: it.id, src: it.src.split('?')[0], index: Number(it.index ?? 0), createdAt: String(it.created_at ?? ''), widthPx: Number(it.width_px ?? 0), heightPx: Number(it.height_px ?? 0) });
    }
  }
  return images.sort((a, b) => a.index - b.index || a.id - b.id);
}

/** Downloads the photos into `dir` as `01.jpg`, `02.jpg`, … in tour order; returns the file names. */
export async function downloadKomootImages(images: readonly KomootImage[], dir: string, fetchImpl: FetchLike, log?: (line: string) => void): Promise<string[]> {
  const { mkdirSync, writeFileSync } = await import('node:fs');
  const { join } = await import('node:path');
  mkdirSync(dir, { recursive: true });
  const pad = String(images.length).length > 2 ? 3 : 2;
  const names: string[] = [];
  for (const [i, image] of images.entries()) {
    const res = await fetchImpl(image.src, { headers: { 'User-Agent': HEADERS['User-Agent'] } });
    if (!res.ok) throw new Error(`Komoot photo ${image.id} answered ${res.status}`);
    const name = `${String(i + 1).padStart(pad, '0')}.jpg`;
    writeFileSync(join(dir, name), Buffer.from(await res.arrayBuffer()));
    names.push(name);
    log?.(`  ${name} (${image.widthPx}×${image.heightPx} uploaded, served at up to 2048 px)`);
  }
  return names;
}
