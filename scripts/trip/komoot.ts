// Reads the public facts of a Komoot tour so the wizard can prefill them: name, sport, distance, climb, date.
// Public tours answer on api.komoot.de without login; private ones do not, and the wizard then asks as usual.
// Only those fields are taken: the start point the API also returns is never read.

export interface KomootTour {
  id: string;
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

export type FetchLike = (url: string, init?: { headers?: Record<string, string> }) => Promise<{ ok: boolean; status: number; text(): Promise<string> }>;

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
  return { id, name, sport, distanceKm: Math.round(distance / 100) / 10, climb: Math.round(up), date: day, recorded: type === 'tour_recorded' };
}
