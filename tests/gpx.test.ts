import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { distanceKm, moveEnds, parseGpx, profileFigure, profileFromSeries, profileSeries, routeFit, routeShape, sanitizeGpx, simplifyPoints, type TrackPoint } from '../src/lib/gpx';

const xml = readFileSync('tests/fixtures/track.gpx', 'utf8');

describe('parseGpx', () => {
  it('reads every track point across segments, with elevation, and ignores waypoints', () => {
    const pts = parseGpx(xml);
    expect(pts).toHaveLength(6);
    expect(pts[0]).toEqual({ lat: 45.1, lon: 7, ele: 1200 });
    expect(pts[5].ele).toBe(2176);
    expect(pts.some((p) => p.lat === 45.1 && p.lon === 7 && p.ele === undefined)).toBe(false);
  });
  it('points without <ele> have no ele', () => { expect(parseGpx('<gpx><trk><trkseg><trkpt lat="1" lon="2"></trkpt></trkseg></trk></gpx>')).toEqual([{ lat: 1, lon: 2 }]); });
});

describe('geometry', () => {
  it('distanceKm: about 111 km per degree of latitude', () => { expect(distanceKm({ lat: 45, lon: 7 }, { lat: 46, lon: 7 })).toBeCloseTo(111.2, 0); });
  it('simplifyPoints keeps first and last and at most max points', () => {
    const pts = Array.from({ length: 1000 }, (_, i) => ({ lat: i, lon: 0 }));
    const s = simplifyPoints(pts, 400);
    expect(s.length).toBeLessThanOrEqual(400); expect(s[0]).toEqual(pts[0]); expect(s.at(-1)).toEqual(pts.at(-1));
    expect(simplifyPoints(pts.slice(0, 10), 400)).toHaveLength(10);
  });
  it('routeShape fits the box and starts with M', () => {
    const { d, viewBox } = routeShape(parseGpx(xml));
    expect(viewBox).toBe('0 0 400 300');
    expect(d).toMatch(/^M [\d.]+ [\d.]+( L [\d.]+ [\d.]+){5}$/);
    for (const [, x, y] of d.matchAll(/[ML] ([\d.]+) ([\d.]+)/g)) { expect(Number(x)).toBeGreaterThanOrEqual(8); expect(Number(x)).toBeLessThanOrEqual(392); expect(Number(y)).toBeGreaterThanOrEqual(8); expect(Number(y)).toBeLessThanOrEqual(292); }
  });
  it('routeFit: project and unproject are inverses, and the route fits inside the padding', () => {
    const pts = parseGpx(xml);
    const fit = routeFit(pts);
    for (const p of pts) {
      const [x, y] = fit.project(p);
      expect(x).toBeGreaterThanOrEqual(8); expect(x).toBeLessThanOrEqual(392); expect(y).toBeGreaterThanOrEqual(8); expect(y).toBeLessThanOrEqual(292);
      const back = fit.unproject(x, y);
      expect(back.lat).toBeCloseTo(p.lat, 9); expect(back.lon).toBeCloseTo(p.lon, 9);
    }
  });

  it('profileFigure: axis rounded to 100 m, guides every 500 m, km marks clear of the total, the true high and low points', () => {
    const f = profileFigure(parseGpx(xml))!;
    expect(f.viewBox).toBe('0 0 400 170');
    expect(f.guides.map((g) => g.ele)).toEqual([1500, 2000]); // 1,200–2,176 m: the axis runs 1,100–2,200 (a band below the low point)
    expect(f.points.length).toBe(6);
    expect(f.high).toMatchObject({ ele: 2176 });
    expect(f.low).toMatchObject({ ele: 1200, km: 0 });
    expect(f.high.km).toBeCloseTo(f.totalKm, 6);
    expect(f.ticks.every((t) => t.km <= f.totalKm - 4)).toBe(true);
    expect(f.line).toMatch(/^M [\d.]+ [\d.]+( L [\d.]+ [\d.]+)+$/);
    expect(f.area.endsWith('Z')).toBe(true);
    expect(profileFigure([{ lat: 1, lon: 2 }, { lat: 1.1, lon: 2 }])).toBeUndefined();
  });

  it('profileFigure on a long track: marks every 5 km, the line drawn from at most max points', () => {
    const long = Array.from({ length: 5000 }, (_, i) => ({ lat: 45 + i * 0.0001, lon: 7, ele: 1000 + Math.sin(i / 500) * 600 }));
    const f = profileFigure(long, 400, 170, 400)!;
    expect(f.ticks.map((t) => t.km)).toEqual([0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50]); // 55.6 km: 55 would crowd the total
    expect((f.line.match(/ L /g) ?? []).length).toBeLessThanOrEqual(400);
  });
});

describe('sanitizeGpx', () => {
  it('keeps only lat, lon, ele and the name', () => {
    const out = sanitizeGpx(xml, 'Colle delle Finestre & back');
    expect(out).toContain('<name>Colle delle Finestre &amp; back</name>');
    expect(out.match(/<trkpt /g)).toHaveLength(6);
    expect(out).toContain('<ele>2176</ele>');
    for (const banned of ['<time', '<metadata', '<author', '<extensions', 'gpxtpx', '<wpt', 'Parking', 'Oleg']) expect(out).not.toContain(banned);
    expect(out).toMatch(/^<\?xml version="1.0" encoding="UTF-8"\?>\n<gpx version="1.1" creator="olegs.be" xmlns="http:\/\/www.topografix.com\/GPX\/1\/1">/);
  });
  it('round-trips through parseGpx and refuses an empty track', () => {
    expect(parseGpx(sanitizeGpx(xml, 'x'))).toEqual(parseGpx(xml));
    expect(() => sanitizeGpx('<gpx></gpx>', 'x')).toThrow('no track points');
  });
});

describe('moveEnds', () => {
  // About 0.1 km a step: 0.0009° of latitude.
  const north = (from: TrackPoint, steps: number): TrackPoint[] => Array.from({ length: steps }, (_, i) => ({ lat: from.lat + 0.0009 * (i + 1), lon: from.lon, ele: 300 }));
  const origin: TrackPoint = { lat: 45, lon: 7.5, ele: 250 };
  const line = [origin, ...north(origin, 100)]; // 10 km north, one point every 100 m
  const slice = (kept: TrackPoint[]) => { const i = line.indexOf(kept[0]); return line.slice(i, i + kept.length); };

  it('starts and ends on the path, 1 to 1.5 km in a straight line from the real start and finish, the middle untouched', () => {
    for (const r of [0, 0.5, 0.999]) {
      const kept = moveEnds(line, { random: () => r });
      expect(kept).toEqual(slice(kept)); // one unbroken stretch of the original points
      const fromStart = distanceKm(kept[0], line[0]);
      const fromFinish = distanceKm(kept[kept.length - 1], line[line.length - 1]);
      for (const d of [fromStart, fromFinish]) {
        expect(d).toBeGreaterThanOrEqual(1 + 0.5 * r);
        expect(d).toBeLessThan(1 + 0.5 * r + 0.11);
      }
    }
  });

  it('a new draw each time unless the caller fixes the randomness', () => {
    const draws = new Set(Array.from({ length: 20 }, () => line.indexOf(moveEnds(line)[0])));
    expect(draws.size).toBeGreaterThan(1);
    for (const i of draws) expect(distanceKm(line[i], origin)).toBeGreaterThanOrEqual(1);
  });

  it('refuses a route too short to keep anything between the moved ends', () => {
    expect(() => moveEnds([origin, ...north(origin, 20)], { random: () => 0.5 })).toThrow(/too short/);
  });
});

describe('profileSeries', () => {
  const wave: TrackPoint[] = Array.from({ length: 3000 }, (_, i) => ({ lat: 45 + i * 0.00009, lon: 7.5, ele: 300 + Math.round(200 * Math.sin(i / 300)) + (i === 1234 ? 90 : 0) }));

  it('keeps distance and elevation only, at most about `max` points, with the highest and lowest kept exactly', () => {
    const series = profileSeries(wave, 400);
    expect(series.length).toBeLessThanOrEqual(402);
    expect(series[0]).toEqual([0, wave[0].ele]);
    for (const pair of series) expect(pair).toHaveLength(2);
    expect(Math.max(...series.map(([, e]) => e))).toBe(Math.max(...wave.map((p) => p.ele!)));
    expect(Math.min(...series.map(([, e]) => e))).toBe(Math.min(...wave.map((p) => p.ele!)));
    let total = 0; for (let i = 1; i < wave.length; i++) total += distanceKm(wave[i - 1], wave[i]);
    expect(series[series.length - 1][0]).toBeCloseTo(total, 1);
  });

  it('profileFromSeries draws the same figure as profileFigure from the track', () => {
    const fromTrack = profileFigure(wave)!;
    const fromSeries = profileFromSeries(profileSeries(wave, 4000))!;
    expect(fromSeries.totalKm).toBeCloseTo(fromTrack.totalKm, 1);
    expect(fromSeries.high.ele).toBe(fromTrack.high.ele);
    expect(fromSeries.low.ele).toBe(fromTrack.low.ele);
    expect(fromSeries.ticks).toEqual(fromTrack.ticks);
  });
});
