// The contour layer drawn behind a trip's route: terrain heights sampled over the map's box, contour lines every
// 100 m with a brighter one every 500 m, each band a shade lighter the higher it is. Written once per shared trip
// as an SVG file next to its track (`<slug>.contours.svg`); the site serves it as is, so visitors never call a map service.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { contours as d3contours } from 'd3-contour';
import sharp from 'sharp';
import { parseGpx, routeFit, simplifyPoints, type RouteFit } from '../../src/lib/gpx';
import type { FetchLike } from './komoot';

/** The map box, the same as the route block's: changing one means regenerating every layer. */
export const MAP = { width: 400, height: 300, pad: 8 } as const;
/** Grid of terrain samples over the box: one every 2 viewBox units. */
const GRID = { w: 200, h: 150 } as const;
/** Terrain Tiles zoom: about 15 m per pixel at these latitudes. */
const ZOOM = 13;
const TILE_URL = (z: number, x: number, y: number) => `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${z}/${x}/${y}.png`;

const tileX = (lon: number, z: number) => ((lon + 180) / 360) * 2 ** z;
const tileY = (lat: number, z: number) => {
  const r = (lat * Math.PI) / 180;
  return ((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * 2 ** z;
};

/**
 * Terrain heights in metres over the box, row by row (`GRID.w` × `GRID.h`), from the open Terrain Tiles
 * (terrarium encoding: height = R × 256 + G + B / 256 − 32768), fetching each tile the box touches once.
 */
export async function terrainGrid(fit: RouteFit, fetchImpl: FetchLike, grid: { w: number; h: number } = GRID, zoom = ZOOM): Promise<Float64Array> {
  const corners = [fit.unproject(0, 0), fit.unproject(fit.width, fit.height)];
  const xs = corners.map((c) => Math.floor(tileX(c.lon, zoom)));
  const ys = corners.map((c) => Math.floor(tileY(c.lat, zoom)));
  const tiles = new Map<string, Buffer>();
  for (let x = Math.min(...xs); x <= Math.max(...xs); x++) {
    for (let y = Math.min(...ys); y <= Math.max(...ys); y++) {
      const res = await fetchImpl(TILE_URL(zoom, x, y));
      if (!res.ok) throw new Error(`terrain tile ${zoom}/${x}/${y} answered ${res.status}`);
      const { data, info } = await sharp(Buffer.from(await res.arrayBuffer())).removeAlpha().raw().toBuffer({ resolveWithObject: true });
      if (info.width !== 256 || info.height !== 256) throw new Error(`terrain tile ${zoom}/${x}/${y} is ${info.width}×${info.height}, not 256×256`);
      tiles.set(`${x}/${y}`, data);
    }
  }
  const heights = new Float64Array(grid.w * grid.h);
  for (let j = 0; j < grid.h; j++) {
    for (let i = 0; i < grid.w; i++) {
      const { lat, lon } = fit.unproject(((i + 0.5) * fit.width) / grid.w, ((j + 0.5) * fit.height) / grid.h);
      const fx = tileX(lon, zoom), fy = tileY(lat, zoom);
      const tx = Math.floor(fx), ty = Math.floor(fy);
      const px = Math.min(255, Math.floor((fx - tx) * 256)), py = Math.min(255, Math.floor((fy - ty) * 256));
      const data = tiles.get(`${tx}/${ty}`)!;
      const k = (py * 256 + px) * 3;
      heights[j * grid.w + i] = data[k] * 256 + data[k + 1] + data[k + 2] / 256 - 32768;
    }
  }
  return heights;
}

/** Ramer–Douglas–Peucker; on a closed ring (first point = last) distances are measured to that point. */
export function simplifyRing(points: readonly [number, number][], tolerance: number): [number, number][] {
  if (points.length < 3) return [...points];
  const [a, b] = [points[0], points[points.length - 1]];
  const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy);
  let far = 0, farthest = 0;
  for (let i = 1; i < points.length - 1; i++) {
    const [x, y] = points[i];
    const d = len === 0 ? Math.hypot(x - a[0], y - a[1]) : Math.abs(dy * x - dx * y + b[0] * a[1] - b[1] * a[0]) / len;
    if (d > farthest) { farthest = d; far = i; }
  }
  if (farthest <= tolerance) return [a, b];
  return [...simplifyRing(points.slice(0, far + 1), tolerance).slice(0, -1), ...simplifyRing(points.slice(far), tolerance)];
}

export interface ContourLevel {
  ele: number;
  /** Closed rings in box units, simplified and rounded to whole units. */
  d: string;
}

/** Contour rings every `step` metres over a grid of heights laid out across a `width` × `height` box. */
export function contourLevels(heights: ArrayLike<number>, grid: { w: number; h: number }, width: number, height: number, step = 100, tolerance = 0.6): ContourLevel[] {
  let lo = Infinity, hi = -Infinity;
  for (let i = 0; i < heights.length; i++) { lo = Math.min(lo, heights[i]); hi = Math.max(hi, heights[i]); }
  const thresholds: number[] = [];
  for (let e = Math.ceil(lo / step) * step; e <= hi; e += step) thresholds.push(e);
  const sx = width / grid.w, sy = height / grid.h;
  return d3contours().size([grid.w, grid.h]).thresholds(thresholds)(Array.from(heights)).map((c) => ({
    ele: c.value,
    d: c.coordinates
      .flatMap((polygon) => polygon.map((ring) => {
        const r = simplifyRing(ring.map(([x, y]) => [x * sx, y * sy] as [number, number]), tolerance);
        return r.length < 3 ? '' : `M${r.map(([x, y]) => `${Math.round(x)} ${Math.round(y)}`).join('L')}Z`;
      }))
      .join(''),
  })).filter((level) => level.d);
}

/** The standalone SVG of the layer: lines every level, brighter every `index` metres, bands lighter as they climb. */
export function contourSvg(levels: readonly ContourLevel[], width: number, height: number, index = 500): string {
  const n = Math.max(1, levels.length);
  const paths = levels.map((l, i) => {
    const major = l.ele % index === 0;
    return `<path d="${l.d}" fill="rgb(236 236 236 / ${(0.012 + (0.05 * i) / n).toFixed(3)})" stroke="${major ? '#5a5a5a' : '#2e2e2e'}" stroke-width="${major ? 1.1 : 0.7}"/>`;
  });
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}"><!-- Contours every 100 m from EU-DEM terrain data (Copernicus) via the Terrain Tiles on AWS Open Data --><rect width="${width}" height="${height}" fill="#0c0c0c"/>${paths.join('')}</svg>\n`;
}

/** The layer's file name for a track: `<name>.gpx` → `<name>.contours.svg`. */
export const contoursFileFor = (track: string) => track.replace(/\.gpx$/, '.contours.svg');

/** Writes the contour layer of a committed track into the tracks folder and returns its path and size. */
export async function writeContours(track: string, tracksDir: string, fetchImpl: FetchLike): Promise<{ path: string; bytes: number; levels: number }> {
  const gpx = join(tracksDir, track);
  if (!existsSync(gpx)) throw new Error(`track ${track} not found in ${tracksDir}`);
  const points = simplifyPoints(parseGpx(readFileSync(gpx, 'utf8')));
  if (points.length < 2) throw new Error(`${track} has no track points`);
  const fit = routeFit(points, MAP.width, MAP.height, MAP.pad);
  const levels = contourLevels(await terrainGrid(fit, fetchImpl), GRID, MAP.width, MAP.height);
  const svg = contourSvg(levels, MAP.width, MAP.height);
  const path = join(tracksDir, contoursFileFor(track));
  writeFileSync(path, svg);
  return { path, bytes: Buffer.byteLength(svg), levels: levels.length };
}
