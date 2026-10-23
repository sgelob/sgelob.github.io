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
 * The track without its ends: every point within `radiusKm` of the start or of the finish is dropped, so a route that starts
 * near home can be shared without showing where. What is left is one unbroken stretch, the longest one outside both circles:
 * keeping two stretches would draw a straight line across the hidden circle between them.
 */
export function maskEnds(points: readonly TrackPoint[], radiusKm: number): TrackPoint[] {
  if (!(radiusKm > 0) || points.length === 0) return [...points];
  const start = points[0];
  const finish = points[points.length - 1];
  let best: TrackPoint[] = [];
  let bestKm = -1;
  let run: TrackPoint[] = [];
  let runKm = 0;
  const close = () => {
    if (run.length > 1 && runKm > bestKm) [best, bestKm] = [run, runKm];
    run = [];
    runKm = 0;
  };
  for (const p of points) {
    if (distanceKm(p, start) < radiusKm || distanceKm(p, finish) < radiusKm) {
      close();
      continue;
    }
    if (run.length) runKm += distanceKm(run[run.length - 1], p);
    run.push(p);
  }
  close();
  if (best.length < 2) throw new Error(`the whole track lies within ${radiusKm} km of the start or finish: nothing would be left to share`);
  return best;
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
export function profileFigure(points: readonly TrackPoint[], width = 400, height = 170, max = 400): ProfileFigure | undefined {
  const withEle = points.filter((p): p is TrackPoint & { ele: number } => p.ele !== undefined);
  if (withEle.length < 2) return undefined;
  const left = 40, right = width - 10, top = 26, baseline = height - 22;
  const km = [0];
  for (let i = 1; i < withEle.length; i++) km.push(km[i - 1] + distanceKm(withEle[i - 1], withEle[i]));
  const totalKm = km[km.length - 1];
  let hi = 0, lo = 0;
  withEle.forEach((p, i) => { if (p.ele > withEle[hi].ele) hi = i; if (p.ele < withEle[lo].ele) lo = i; });
  // One more 100 m band under the lowest point, so its label has room below it.
  const floor = Math.floor(withEle[lo].ele / 100) * 100 - 100;
  const ceil = Math.max(Math.ceil(withEle[hi].ele / 100) * 100, floor + 100);
  const x = (d: number) => left + (totalKm > 0 ? d / totalKm : 0) * (right - left);
  const y = (e: number) => top + (1 - (e - floor) / (ceil - floor)) * (baseline - top);
  const step = Math.max(1, Math.ceil(withEle.length / max));
  const drawn = withEle.map((p, i) => [x(km[i]), y(p.ele)] as [number, number]).filter((_, i) => i % step === 0 || i === withEle.length - 1);
  const line = pathOf(drawn);
  const area = `${line} L ${round1(right)} ${round1(baseline)} L ${round1(left)} ${round1(baseline)} Z`;
  const guides: ProfileFigure['guides'] = [];
  for (let e = Math.ceil(floor / 500) * 500; e <= ceil; e += 500) guides.push({ y: round1(y(e)), ele: e });
  const ticks: ProfileFigure['ticks'] = [];
  for (let d = 0; d <= totalKm - 4; d += 5) ticks.push({ x: round1(x(d)), km: d });
  const mark = (i: number) => ({ x: round1(x(km[i])), y: round1(y(withEle[i].ele)), ele: withEle[i].ele, km: km[i] });
  return { viewBox: `0 0 ${width} ${height}`, points: drawn, line, area, left, right, baseline, guides, ticks, totalKm, high: mark(hi), low: mark(lo) };
}

const escapeXml = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/**
 * A new GPX 1.1 document with only the name and the track points (lat, lon, ele): no time, author, extensions or waypoints.
 * With `maskKm`, the points within that distance of the start and the finish are left out too (see `maskEnds`).
 */
export function sanitizeGpx(xml: string, name: string, maskKm = 0): string {
  const parsed = parseGpx(xml);
  if (parsed.length === 0) throw new Error('no track points');
  const points = maskEnds(parsed, maskKm);
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
