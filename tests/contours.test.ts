import { copyFileSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';
import { describe, expect, test } from 'vitest';
import { contourLevels, contourSvg, contoursFileFor, simplifyRing, terrainGrid, writeContours } from '../scripts/trip/contours';
import type { FetchLike } from '../scripts/trip/komoot';
import { parseGpx, routeFit } from '../src/lib/gpx';

/** A terrarium tile (height = R × 256 + G + B / 256 − 32768) whose height grows 4 m per pixel from west to east. */
async function slopeTile(base = 1000): Promise<Buffer> {
  const raw = Buffer.alloc(256 * 256 * 3);
  for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) {
    const total = base + x * 4 + 32768;
    const k = (y * 256 + x) * 3;
    raw[k] = Math.floor(total / 256); raw[k + 1] = total % 256; raw[k + 2] = 0;
  }
  return sharp(raw, { raw: { width: 256, height: 256, channels: 3 } }).png().toBuffer();
}
const serving = (png: Buffer, asked: string[] = []): FetchLike => async (url) => {
  asked.push(url);
  return { ok: true, status: 200, text: async () => '', arrayBuffer: async () => png.buffer.slice(png.byteOffset, png.byteOffset + png.byteLength) as ArrayBuffer };
};
const track = readFileSync(new URL('./fixtures/track.gpx', import.meta.url), 'utf8');

describe('contours', () => {
  test('simplifyRing keeps the corners of a closed square and drops the points along its sides', () => {
    const ring: [number, number][] = [[0, 0], [5, 0], [10, 0], [10, 5], [10, 10], [5, 10], [0, 10], [0, 5], [0, 0]];
    expect(simplifyRing(ring, 0.5)).toEqual([[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]]);
  });

  test('contourLevels: one level per 100 m crossed, rings in box units', () => {
    const grid = { w: 40, h: 30 };
    const cone = Float64Array.from({ length: 1200 }, (_, i) => 2600 - 40 * Math.hypot((i % 40) - 20, Math.floor(i / 40) - 15));
    const levels = contourLevels(cone, grid, 400, 300);
    expect(levels.map((l) => l.ele)).toEqual([1600, 1700, 1800, 1900, 2000, 2100, 2200, 2300, 2400, 2500]); // the corners sit at exactly 1,600 m
    for (const l of levels) expect(l.d).toMatch(/^M\d+ \d+(L\d+ \d+)+Z/);
  });

  test('contourSvg: a standalone SVG with the page background, brighter lines every 500 m, the data credited', () => {
    const svg = contourSvg([{ ele: 1900, d: 'M0 0L1 1Z' }, { ele: 2000, d: 'M0 0L2 2Z' }], 400, 300);
    expect(svg).toMatch(/^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" viewBox="0 0 400 300"/);
    expect(svg).toContain('<rect width="400" height="300" fill="#0c0c0c"/>');
    expect(svg).toContain('stroke="#2e2e2e" stroke-width="0.7"'); // 1,900 m
    expect(svg).toContain('stroke="#5a5a5a" stroke-width="1.1"'); // 2,000 m, a multiple of 500
    expect(svg).toContain('EU-DEM');
  });

  test('terrainGrid decodes terrarium heights over the box, fetching each tile once', async () => {
    const asked: string[] = [];
    const fit = routeFit(parseGpx(track));
    const grid = await terrainGrid(fit, serving(await slopeTile(), asked), { w: 20, h: 15 });
    expect(grid).toHaveLength(300);
    expect(new Set(asked).size).toBe(asked.length);
    expect(asked[0]).toMatch(/^https:\/\/s3\.amazonaws\.com\/elevation-tiles-prod\/terrarium\/13\/\d+\/\d+\.png$/);
    for (const h of grid) { expect(h).toBeGreaterThanOrEqual(1000); expect(h).toBeLessThanOrEqual(2020); }
  });

  test('writeContours draws the layer next to the track and names it after it', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'contours-'));
    copyFileSync(new URL('./fixtures/track.gpx', import.meta.url), join(dir, 'ride.gpx'));
    const { path, levels, bytes } = await writeContours('ride.gpx', dir, serving(await slopeTile()));
    expect(path).toBe(join(dir, 'ride.contours.svg'));
    expect(contoursFileFor('ride.gpx')).toBe('ride.contours.svg');
    expect(levels).toBeGreaterThan(0);
    expect(readFileSync(path, 'utf8').length).toBe(bytes);
    await expect(writeContours('missing.gpx', dir, serving(await slopeTile()))).rejects.toThrow('track missing.gpx not found');
  });
});
