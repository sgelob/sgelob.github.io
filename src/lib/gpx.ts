// Pure GPX helpers: parse track points, lay them out and draw them as SVG paths, write a sanitised download.
// No Astro runtime and no XML library: GPX 1.1 track points are regular enough for regexes.

export interface TrackPoint {
  lat: number;
  lon: number;
  ele?: number;
}

const EARTH_RADIUS_KM = 6371;

const TRKPT = /<trkpt\b([^>]*?)(?:\/>|>([\s\S]*?)<\/trkpt>)/g;

function attribute(attrs: string, name: string): number {
  const m = new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`).exec(attrs);
  return m ? Number(m[1] ?? m[2]) : NaN;
}

/** Every `<trkpt lat lon>` in document order, across all segments, with `<ele>` when present. Waypoints and route points are ignored. */
export function parseGpx(xml: string): TrackPoint[] {
  const points: TrackPoint[] = [];
  for (const [, attrs, inner = ''] of xml.matchAll(TRKPT)) {
    const lat = attribute(attrs, 'lat');
    const lon = attribute(attrs, 'lon');
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
    const point: TrackPoint = { lat, lon };
    const ele = /<ele>\s*([^<\s]+)\s*<\/ele>/.exec(inner);
    if (ele && Number.isFinite(Number(ele[1]))) point.ele = Number(ele[1]);
    points.push(point);
  }
  return points;
}

/** The track points of each `<trkseg>`, in document order; points outside any segment make one segment. */
export function parseSegments(xml: string): TrackPoint[][] {
  const segments = [...xml.matchAll(/<trkseg\b[^>]*>([\s\S]*?)<\/trkseg>/g)].map(([, inner]) => parseGpx(inner)).filter((s) => s.length);
  return segments.length ? segments : [parseGpx(xml)].filter((s) => s.length);
}

/** The same points when there are at most `max`, else every nth point, always keeping the first and the last. */
export function simplifyPoints(points: readonly TrackPoint[], max = 400): TrackPoint[] {
  if (points.length <= max) return [...points];
  const step = Math.ceil((points.length - 1) / (Math.max(max, 2) - 1));
  const kept: TrackPoint[] = [];
  for (let i = 0; i < points.length; i += step) kept.push(points[i]);
  if (kept[kept.length - 1] !== points[points.length - 1]) kept.push(points[points.length - 1]);
  return kept;
}

/** Great-circle distance between two points in kilometres (haversine). */
export function distanceKm(a: TrackPoint, b: TrackPoint): number {
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLon = (b.lon - a.lon) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

export interface MoveStartOptions {
  /** A number in [0, 1); `Math.random` unless a test fixes it. The draw is made once, when the track is written, never again. */
  random?: () => number;
  /** How far, in a straight line, the published start is from the real one: a random distance between the two. */
  minKm?: number;
  maxKm?: number;
}

/**
 * A route with approximate ends: every point kept, but starting somewhere on the path 1 to 1.5 km (straight line) from the real
 * start. The first segment runs from there to the real finish, the second from the real start to just before the moved one:
 * two segments, so nothing draws a straight line from the real finish to the real start.
 */
export function moveStart(points: readonly TrackPoint[], { random = Math.random, minKm = 1, maxKm = 1.5 }: MoveStartOptions = {}): [TrackPoint[], TrackPoint[]] {
  const target = minKm + random() * (maxKm - minKm);
  const at = points.findIndex((p) => distanceKm(p, points[0]) >= target);
  if (at < 1) throw new Error(`the route never gets ${target.toFixed(1)} km from its start: there is nowhere to move the start to`);
  return [points.slice(at), points.slice(0, at)];
}

const round1 = (n: number): number => Math.round(n * 10) / 10;

function pathOf(coords: readonly [number, number][]): string {
  return coords.map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${round1(x)} ${round1(y)}`).join(' ');
}

/** How a route is laid out in a box: projected equirectangularly (longitude scaled by the cosine of the mean latitude), scaled uniformly to fit the box minus `pad`, centred. */
export interface RouteFit {
  viewBox: string;
  width: number;
  height: number;
  /** A point's position in the box. */
  project(p: Pick<TrackPoint, 'lat' | 'lon'>): [number, number];
  /** The latitude and longitude at a position in the box: what the terrain behind the route is sampled at. */
  unproject(x: number, y: number): { lat: number; lon: number };
}

/** The layout shared by the route line, its marks and the contour layer drawn behind it. */
export function routeFit(points: readonly TrackPoint[], width = 400, height = 300, pad = 8): RouteFit {
  const viewBox = `0 0 ${width} ${height}`;
  const meanLat = points.length ? points.reduce((sum, p) => sum + p.lat, 0) / points.length : 0;
  const k = Math.cos((meanLat * Math.PI) / 180);
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of points) {
    minX = Math.min(minX, p.lon * k); maxX = Math.max(maxX, p.lon * k);
    minY = Math.min(minY, -p.lat); maxY = Math.max(maxY, -p.lat);
  }
  if (!points.length) minX = minY = maxX = maxY = 0;
  const spanX = maxX - minX;
  const spanY = maxY - minY;
  const innerW = width - 2 * pad;
  const innerH = height - 2 * pad;
  const scale = Math.min(spanX > 0 ? innerW / spanX : Infinity, spanY > 0 ? innerH / spanY : Infinity);
  const s = Number.isFinite(scale) ? scale : 1;
  const offsetX = pad + (innerW - spanX * s) / 2;
  const offsetY = pad + (innerH - spanY * s) / 2;
  return {
    viewBox,
    width,
    height,
    project: (p) => [offsetX + (p.lon * k - minX) * s, offsetY + (-p.lat - minY) * s],
    unproject: (x, y) => ({ lon: ((x - offsetX) / s + minX) / k, lat: -((y - offsetY) / s + minY) }),
  };
}

/** The route seen from above as an SVG path, laid out by `routeFit`. */
export function routeShape(
  points: readonly TrackPoint[],
  width = 400,
  height = 300,
  pad = 8,
): { d: string; viewBox: string } {
  const fit = routeFit(points, width, height, pad);
  return { d: points.length ? pathOf(points.map((p) => fit.project(p))) : '', viewBox: fit.viewBox };
}

/** An elevation profile with what makes it readable: altitude guides, kilometre marks, the high and the low point. */
export interface ProfileFigure {
  viewBox: string;
  /** The drawn points (what labels must stay clear of), the profile line, and the same closed down to the baseline for the fill. */
  points: [number, number][];
  line: string;
  area: string;
  /** The plot's edges, for the guide lines. */
  left: number;
  right: number;
  baseline: number;
  /** Horizontal guides at every 500 m within the range. */
  guides: { y: number; ele: number }[];
  /** Kilometre marks every 5 km, leaving room for the total at the end. */
  ticks: { x: number; km: number }[];
  totalKm: number;
  high: { x: number; y: number; ele: number; km: number };
  low: { x: number; y: number; ele: number; km: number };
}

/**
 * The profile of the whole track: distance and extremes are measured on every point, the line is drawn from at most
 * `max` of them. The altitude axis spans the track's own range, rounded out to 100 m, plus a band below. Undefined with fewer than two elevations.
 */
/** A route's elevation profile without its coordinates: `[km from the start, elevation in m]` pairs. */
export type ProfileSeries = [number, number][];

/** Cumulative distance and elevation of the points that have one. */
function seriesOf(points: readonly TrackPoint[]): { km: number[]; ele: number[] } {
  const withEle = points.filter((p): p is TrackPoint & { ele: number } => p.ele !== undefined);
  const km = withEle.length ? [0] : [];
  for (let i = 1; i < withEle.length; i++) km.push(km[i - 1] + distanceKm(withEle[i - 1], withEle[i]));
  return { km, ele: withEle.map((p) => p.ele) };
}

/**
 * The profile of a whole route as a small file can keep it: at most about `max` pairs (every nth, plus the first, last,
 * highest and lowest), km to the metre and whole metres of elevation. A page whose track has approximate ends draws its profile from this.
 */
export function profileSeries(points: readonly TrackPoint[], max = 400): ProfileSeries {
  const { km, ele } = seriesOf(points);
  if (km.length < 2) return [];
  let hi = 0, lo = 0;
  ele.forEach((e, i) => { if (e > ele[hi]) hi = i; if (e < ele[lo]) lo = i; });
  const step = Math.max(1, Math.ceil(km.length / max));
  const last = km.length - 1;
  const series: ProfileSeries = [];
  for (let i = 0; i <= last; i++) if (i % step === 0 || i === last || i === hi || i === lo) series.push([Math.round(km[i] * 1000) / 1000, Math.round(ele[i])]);
  return series;
}

/** The elevation profile of a track (see `drawProfile`). */
export function profileFigure(points: readonly TrackPoint[], width = 400, height = 170, max = 400): ProfileFigure | undefined {
  const { km, ele } = seriesOf(points);
  return drawProfile(km, ele, width, height, max);
}

/** The same figure from a profile file's pairs, for a track whose drawn part is not the whole route. */
export function profileFromSeries(series: readonly (readonly [number, number])[], width = 400, height = 170, max = 400): ProfileFigure | undefined {
  return drawProfile(series.map(([k]) => k), series.map(([, e]) => e), width, height, max);
}

function drawProfile(km: readonly number[], ele: readonly number[], width: number, height: number, max: number): ProfileFigure | undefined {
  if (km.length < 2) return undefined;
  const left = 40, right = width - 10, top = 26, baseline = height - 22;
  const totalKm = km[km.length - 1];
  let hi = 0, lo = 0;
  ele.forEach((e, i) => { if (e > ele[hi]) hi = i; if (e < ele[lo]) lo = i; });
  // One more 100 m band under the lowest point, so its label has room below it.
  const floor = Math.floor(ele[lo] / 100) * 100 - 100;
  const ceil = Math.max(Math.ceil(ele[hi] / 100) * 100, floor + 100);
  const x = (d: number) => left + (totalKm > 0 ? d / totalKm : 0) * (right - left);
  const y = (e: number) => top + (1 - (e - floor) / (ceil - floor)) * (baseline - top);
  const step = Math.max(1, Math.ceil(km.length / max));
  const drawn = km.map((d, i) => [x(d), y(ele[i])] as [number, number]).filter((_, i) => i % step === 0 || i === km.length - 1);
  const line = pathOf(drawn);
  const area = `${line} L ${round1(right)} ${round1(baseline)} L ${round1(left)} ${round1(baseline)} Z`;
  const guides: ProfileFigure['guides'] = [];
  for (let e = Math.ceil(floor / 500) * 500; e <= ceil; e += 500) guides.push({ y: round1(y(e)), ele: e });
  const ticks: ProfileFigure['ticks'] = [];
  for (let d = 0; d <= totalKm - 4; d += 5) ticks.push({ x: round1(x(d)), km: d });
  const mark = (i: number) => ({ x: round1(x(km[i])), y: round1(y(ele[i])), ele: ele[i], km: km[i] });
  return { viewBox: `0 0 ${width} ${height}`, points: drawn, line, area, left, right, baseline, guides, ticks, totalKm, high: mark(hi), low: mark(lo) };
}

const escapeXml = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** A new GPX 1.1 document with only the name and the track points (lat, lon, ele), segment by segment: no time, author, extensions or waypoints. */
export function sanitizeGpx(xml: string, name: string): string {
  const segments = parseSegments(xml);
  if (segments.length === 0) throw new Error('no track points');
  return trackDocument(segments, name);
}

/** A GPX 1.1 document of these segments, with the name and nothing else. */
export function trackDocument(segments: readonly (readonly TrackPoint[])[], name: string): string {
  const trkpt = (p: TrackPoint) =>
    p.ele === undefined ? `      <trkpt lat="${p.lat}" lon="${p.lon}"/>` : `      <trkpt lat="${p.lat}" lon="${p.lon}"><ele>${p.ele}</ele></trkpt>`;
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<gpx version="1.1" creator="olegs.be" xmlns="http://www.topografix.com/GPX/1/1">',
    '  <trk>',
    `    <name>${escapeXml(name)}</name>`,
    ...segments.flatMap((segment) => ['    <trkseg>', ...segment.map(trkpt), '    </trkseg>']),
    '  </trk>',
    '</gpx>',
    '',
  ].join('\n');
}
