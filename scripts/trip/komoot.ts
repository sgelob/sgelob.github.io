// Reads the facts of a Komoot tour so the wizard can prefill them: name, sport, distance, climb, date, and its photos.
// Public tours answer on api.komoot.de without login, but then Komoot lists only the first page of photos
// and ignores paging; with KOMOOT_EMAIL and KOMOOT_PASSWORD (see komootLogin) it lists them all.
// Only those fields are taken: the start point and the photo locations the API also returns are never read.

export interface KomootTour {
  id: string;
  /** The tour's own photos Komoot listed, in tour order; empty for a planned tour or one without photos. */
  images: KomootImage[];
  /** How many photos the tour has: more than `images.length` when Komoot listed only some (no login). */
  imagesTotal: number;
  name: string;
  /** Komoot's sport slug, e.g. `hike`, `mtb`, `mtb_easy`, `e_mtb`, `racebike`. */
  sport: string;
  /** Kilometres, one decimal. */
  distanceKm: number;
  /** Metres, whole. */
  climb: number;
  /** The tour's date (the recording date for a recorded tour), local day as YYYY-MM-DD. */
  date: string;
  /** The same moment as Komoot gives it (ISO 8601 with the time), for ordering rides of the same day or month. */
  startedAt?: string;
  recorded: boolean;
}

export type FetchLike = (url: string, init?: { headers?: Record<string, string> }) => Promise<{ ok: boolean; status: number; text(): Promise<string>; arrayBuffer(): Promise<ArrayBuffer> }>;

/** One of the tour's own photos, in tour order. The location Komoot attaches to it is never read. */
export interface KomootImage {
  id: number;
  /** The plain image URL: Komoot serves the photo at up to 2048 px on the long side. */
  src: string;
  /** Position along the track (the coordinate the photo was taken at), which orders the gallery; undefined when Komoot could not place it. */
  index: number | undefined;
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

/** A logged-in Komoot session: the account's username and the API token Komoot hands out for it. */
export interface KomootAuth {
  username: string;
  token: string;
}

const UA = 'olegs.be trip wizard';
const basic = (user: string, secret: string) => `Basic ${Buffer.from(`${user}:${secret}`).toString('base64')}`;
const headers = (auth?: KomootAuth): Record<string, string> => ({ Accept: 'application/hal+json', 'User-Agent': UA, ...(auth ? { Authorization: basic(auth.username, auth.token) } : {}) });

/**
 * Logs in with the account's email and password (the same pair as on komoot.com) and returns the API token.
 * The password only goes to api.komoot.de and is not kept; the token is used for the rest of the run.
 */
export async function komootLogin(email: string, password: string, fetchImpl: FetchLike): Promise<KomootAuth> {
  const res = await fetchImpl(`https://api.komoot.de/v006/account/email/${encodeURIComponent(email)}/`, {
    headers: { Accept: 'application/json', 'User-Agent': UA, Authorization: basic(email, password) },
  });
  if (res.status === 401 || res.status === 403) throw new Error('Komoot refused the login: check KOMOOT_EMAIL and KOMOOT_PASSWORD in .env');
  if (!res.ok) throw new Error(`the Komoot login answered ${res.status}`);
  const data = JSON.parse(await res.text()) as Record<string, unknown>;
  if (typeof data.username !== 'string' || typeof data.password !== 'string') throw new Error('the Komoot login answered without a username and token');
  return { username: data.username, token: data.password };
}

/** Fetches a tour's facts and photos. Throws with a plain message when the tour is private, missing or the answer is not what Komoot sends. */
export async function fetchKomootTour(url: string, fetchImpl: FetchLike, auth?: KomootAuth): Promise<KomootTour> {
  const id = tourIdFromUrl(url);
  if (!id) throw new Error('not a Komoot tour link (expected …komoot.com/tour/<number>)');
  const res = await fetchImpl(`https://api.komoot.de/v007/tours/${id}`, { headers: headers(auth) });
  if (res.status === 403 || res.status === 401) throw new Error(auth ? 'Komoot refuses this tour to your account' : 'this tour is not public: Komoot refuses it without a login');
  if (res.status === 404) throw new Error(`no Komoot tour with id ${id}`);
  if (!res.ok) throw new Error(`Komoot answered ${res.status}`);
  const data = JSON.parse(await res.text()) as Record<string, unknown>;
  const { name, sport, distance, elevation_up: up, date, type } = data;
  if (typeof name !== 'string' || typeof sport !== 'string' || typeof distance !== 'number' || typeof up !== 'number' || typeof date !== 'string') {
    throw new Error('Komoot sent a tour without name, sport, distance, climb or date');
  }
  const when = new Date(date);
  const day = `${when.getFullYear()}-${String(when.getMonth() + 1).padStart(2, '0')}-${String(when.getDate()).padStart(2, '0')}`;
  const { images, total } = await fetchKomootImages(id, fetchImpl, auth);
  return { id, name, sport, distanceKm: Math.round(distance / 100) / 10, climb: Math.round(up), date: day, startedAt: date, recorded: type === 'tour_recorded', images, imagesTotal: total };
}

/**
 * The tour's own photos, following Komoot's `next` links page by page, sorted by their position along the track.
 * Without a login Komoot answers every page with the first one: the loop stops when a page brings nothing new,
 * and `total` (Komoot's count) then tells the caller the list is short.
 */
export async function fetchKomootImages(id: string, fetchImpl: FetchLike, auth?: KomootAuth): Promise<{ images: KomootImage[]; total: number }> {
  const byId = new Map<number, KomootImage>();
  let total = 0;
  let next: string | undefined = `https://api.komoot.de/v007/tours/${id}/images/?page=0&limit=50`;
  for (let pages = 0; next && pages < 100; pages++) {
    const res = await fetchImpl(next, { headers: headers(auth) });
    if (!res.ok) break; // a planned tour or one without photos: nothing to offer
    const data = JSON.parse(await res.text()) as { page?: { totalElements?: number }; _embedded?: { items?: Record<string, unknown>[] }; _links?: { next?: { href?: string } } };
    total = data.page?.totalElements ?? total;
    const before = byId.size;
    for (const it of data._embedded?.items ?? []) {
      if (typeof it.src !== 'string' || typeof it.id !== 'number' || byId.has(it.id)) continue;
      byId.set(it.id, { id: it.id, src: it.src.split('?')[0], index: typeof it.index === 'number' ? it.index : undefined, createdAt: String(it.created_at ?? ''), widthPx: Number(it.width_px ?? 0), heightPx: Number(it.height_px ?? 0) });
    }
    if (byId.size === before) break; // the same photos again: Komoot ignored the page
    next = data._links?.next?.href;
  }
  const images = [...byId.values()];
  // Along the track first; photos Komoot could not place on it come last, by the time they were taken.
  images.sort((a, b) => {
    if (a.index !== undefined && b.index !== undefined) return a.index - b.index || a.id - b.id;
    if (a.index !== undefined) return -1;
    if (b.index !== undefined) return 1;
    return a.createdAt.localeCompare(b.createdAt) || a.id - b.id;
  });
  return { images, total: Math.max(total, images.length) };
}

/** Downloads the photos into `dir` as `01.jpg`, `02.jpg`, … in tour order; returns the file names. */
export async function downloadKomootImages(images: readonly KomootImage[], dir: string, fetchImpl: FetchLike, log?: (line: string) => void): Promise<string[]> {
  const { mkdirSync, writeFileSync } = await import('node:fs');
  const { join } = await import('node:path');
  mkdirSync(dir, { recursive: true });
  const pad = String(images.length).length > 2 ? 3 : 2;
  const names: string[] = [];
  for (const [i, image] of images.entries()) {
    const res = await fetchImpl(image.src, { headers: { 'User-Agent': UA } });
    if (!res.ok) throw new Error(`Komoot photo ${image.id} answered ${res.status}`);
    const name = `${String(i + 1).padStart(pad, '0')}.jpg`;
    writeFileSync(join(dir, name), Buffer.from(await res.arrayBuffer()));
    names.push(name);
    log?.(`  ${name} (${image.widthPx}×${image.heightPx} uploaded, served at up to 2048 px)`);
  }
  return names;
}
