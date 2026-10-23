// Pure GPX helpers: parse track points, draw them as SVG paths, write a sanitised download.
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

const round1 = (n: number): number => Math.round(n * 10) / 10;

function pathOf(coords: readonly [number, number][]): string {
  return coords.map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${round1(x)} ${round1(y)}`).join(' ');
}

/** The route seen from above as an SVG path, scaled uniformly to fit the box minus `pad` and centred in it. */
export function routeShape(
  points: readonly TrackPoint[],
  width = 400,
  height = 300,
  pad = 8,
): { d: string; viewBox: string } {
  const viewBox = `0 0 ${width} ${height}`;
  if (points.length === 0) return { d: '', viewBox };
  const meanLat = points.reduce((sum, p) => sum + p.lat, 0) / points.length;
  const k = Math.cos((meanLat * Math.PI) / 180);
  const flat = points.map((p): [number, number] => [p.lon * k, -p.lat]);
  const xs = flat.map(([x]) => x);
  const ys = flat.map(([, y]) => y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const spanX = Math.max(...xs) - minX;
  const spanY = Math.max(...ys) - minY;
  const innerW = width - 2 * pad;
  const innerH = height - 2 * pad;
  const scale = Math.min(spanX > 0 ? innerW / spanX : Infinity, spanY > 0 ? innerH / spanY : Infinity);
  const s = Number.isFinite(scale) ? scale : 1;
  const offsetX = pad + (innerW - spanX * s) / 2;
  const offsetY = pad + (innerH - spanY * s) / 2;
  return { d: pathOf(flat.map(([x, y]) => [offsetX + (x - minX) * s, offsetY + (y - minY) * s])), viewBox };
}

/** Elevation against distance as an SVG path (highest point at the top); undefined when fewer than two points carry `ele`. */
export function elevationProfile(
  points: readonly TrackPoint[],
  width = 400,
  height = 120,
  pad = 8,
): { d: string; viewBox: string; minEle: number; maxEle: number; totalKm: number } | undefined {
  const withEle = points.filter((p): p is TrackPoint & { ele: number } => p.ele !== undefined);
  if (withEle.length < 2) return undefined;
  const cumulative = [0];
  for (let i = 1; i < withEle.length; i++) cumulative.push(cumulative[i - 1] + distanceKm(withEle[i - 1], withEle[i]));
  const totalKm = cumulative[cumulative.length - 1];
  const eles = withEle.map((p) => p.ele);
  const minEle = Math.min(...eles);
  const maxEle = Math.max(...eles);
  const innerW = width - 2 * pad;
  const innerH = height - 2 * pad;
  const coords = withEle.map((p, i): [number, number] => [
    pad + (totalKm > 0 ? (cumulative[i] / totalKm) * innerW : 0),
    pad + (maxEle > minEle ? ((maxEle - p.ele) / (maxEle - minEle)) * innerH : innerH / 2),
  ]);
  return { d: pathOf(coords), viewBox: `0 0 ${width} ${height}`, minEle, maxEle, totalKm };
}

const escapeXml = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** A new GPX 1.1 document with only the name and the track points (lat, lon, ele): no time, author, extensions or waypoints. */
export function sanitizeGpx(xml: string, name: string): string {
  const points = parseGpx(xml);
  if (points.length === 0) throw new Error('no track points');
  const trkpts = points.map((p) =>
    p.ele === undefined
      ? `      <trkpt lat="${p.lat}" lon="${p.lon}"/>`
      : `      <trkpt lat="${p.lat}" lon="${p.lon}"><ele>${p.ele}</ele></trkpt>`,
  );
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<gpx version="1.1" creator="olegs.be" xmlns="http://www.topografix.com/GPX/1/1">',
    '  <trk>',
    `    <name>${escapeXml(name)}</name>`,
    '    <trkseg>',
    ...trkpts,
    '    </trkseg>',
    '  </trk>',
    '</gpx>',
    '',
  ].join('\n');
}
