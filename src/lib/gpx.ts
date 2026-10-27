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

/**
 * A circle around home that no published track enters. Its centre is deliberately not home: it is offset a few hundred
 * metres in a random direction, so the hole that every track leaves there does not point at the house.
 */
export interface PrivacyZone {
  lat: number;
  lon: number;
  radiusKm: number;
}

/** `lat,lon,radiusKm`, the form PRIVACY_ZONE takes. */
export function parsePrivacyZone(value: string): PrivacyZone {
  const [lat, lon, radiusKm, ...rest] = value.split(',').map((s) => Number(s.trim()));
  if (rest.length || ![lat, lon, radiusKm].every(Number.isFinite) || radiusKm <= 0) throw new Error(`PRIVACY_ZONE must be "lat,lon,radiusKm", not "${value}"`);
  return { lat, lon, radiusKm };
}

/** The runs of the route outside the zone, each one a segment: what lies inside is dropped, and a run of a single point with it. */
export function outsideZone(points: readonly TrackPoint[], zone: PrivacyZone): TrackPoint[][] {
  const runs: TrackPoint[][] = [[]];
  for (const p of points) {
    if (distanceKm(p, zone) > zone.radiusKm) runs[runs.length - 1].push(p);
    else if (runs[runs.length - 1].length) runs.push([]);
  }
  return runs.filter((run) => run.length > 1);
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
/** Cumulative distance and elevation of the points that have one. */
function seriesOf(points: readonly TrackPoint[]): { km: number[]; ele: number[] } {
  const withEle = points.filter((p): p is TrackPoint & { ele: number } => p.ele !== undefined);
  const km = withEle.length ? [0] : [];
  for (let i = 1; i < withEle.length; i++) km.push(km[i - 1] + distanceKm(withEle[i - 1], withEle[i]));
  return { km, ele: withEle.map((p) => p.ele) };
}

/** The elevation profile of a track (see `drawProfile`); `endLabel` is the total written at the end of the distance axis. */
export function profileFigure(points: readonly TrackPoint[], width = 400, height = 170, max = 400, endLabel?: string): ProfileFigure | undefined {
  const { km, ele } = seriesOf(points);
  return drawProfile(km, ele, width, height, max, endLabel);
}

// Width of one character of the axis labels in figure units: 8.5 px mono (0.6 em) with 0.04 em spacing, as in RouteBlock's `.axis`.
const AXIS_CHAR = 8.5 * 0.64;

function drawProfile(km: readonly number[], ele: readonly number[], width: number, height: number, max: number, endLabel?: string): ProfileFigure | undefined {
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
  // A km mark stays only where it ends before the total, which is right-aligned at the end of the axis.
  const totalStart = right - (endLabel ?? `${totalKm.toFixed(1)} km`).length * AXIS_CHAR - 4;
  for (let d = 0; x(d) + (String(d).length * AXIS_CHAR) / 2 <= totalStart; d += 5) ticks.push({ x: round1(x(d)), km: d });
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
