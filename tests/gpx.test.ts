import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { distanceKm, outsideZone, parseGpx, parsePrivacyZone, parseSegments, profileFigure, routeFit, routeShape, sanitizeGpx, simplifyPoints, type TrackPoint } from '../src/lib/gpx';

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
    expect(f.ticks.map((t) => t.km)).toEqual([0, 5]); // 6.2 km: the 5 km mark ends well before “6.2 km”
    expect(f.line).toMatch(/^M [\d.]+ [\d.]+( L [\d.]+ [\d.]+)+$/);
    expect(f.area.endsWith('Z')).toBe(true);
    expect(profileFigure([{ lat: 1, lon: 2 }, { lat: 1.1, lon: 2 }])).toBeUndefined();
  });

  it('profileFigure on a long track: marks every 5 km, the line drawn from at most max points', () => {
    const long = Array.from({ length: 5000 }, (_, i) => ({ lat: 45 + i * 0.0001, lon: 7, ele: 1000 + Math.sin(i / 500) * 600 }));
    const f = profileFigure(long, 400, 170, 400)!;
    expect(f.ticks.map((t) => t.km)).toEqual([0, 5, 10, 15, 20, 25, 30, 35, 40, 45]); // 55.6 km: 50 would run into the total
    expect((f.line.match(/ L /g) ?? []).length).toBeLessThanOrEqual(400);
  });

  it('profileFigure keeps every km mark clear of the total written at the end of the axis', () => {
    const track = (km: number) => Array.from({ length: 2000 }, (_, i) => ({ lat: 45 + (i / 1999) * (km / 111.195), lon: 7, ele: 300 + (i % 100) }));
    // The total is drawn right-aligned at `right`, in 8.5 px mono: about 5.44 units a character; a mark is centred on its x.
    const clear = (f: NonNullable<ReturnType<typeof profileFigure>>, label: string) =>
      f.ticks.every((t) => t.x + (String(t.km).length * 5.44) / 2 <= f.right - label.length * 5.44 - 4);
    for (const [km, label] of [[55.1, '55.1 km'], [51, '51 km'], [27.5, '27.5 km'], [9.6, '9.6 km'], [120.4, '120.4 km']] as const) {
      const f = profileFigure(track(km), 400, 170, 400, label)!;
      expect(clear(f, label), label).toBe(true);
      expect(f.ticks.length, label).toBeGreaterThan(1);
    }
    expect(profileFigure(track(55.1), 400, 170, 400, '55.1 km')!.ticks.at(-1)!.km).toBe(45);
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

describe('privacy zone', () => {
  const north = (steps: number): TrackPoint[] => Array.from({ length: steps }, (_, i) => ({ lat: 45 + 0.0009 * i, lon: 7.5 }));
  const line = north(41); // 4 km north, one point every 100 m

  it('parsePrivacyZone reads "lat,lon,radiusKm" and refuses anything else', () => {
    expect(parsePrivacyZone(' 45.1, 7.8 ,1.2')).toEqual({ lat: 45.1, lon: 7.8, radiusKm: 1.2 });
    for (const bad of ['45,7', '45,7,1,2', 'a,b,c', '45,7,0']) expect(() => parsePrivacyZone(bad)).toThrow(/PRIVACY_ZONE/);
  });

  it('outsideZone drops every point inside the circle and splits the route where it passes through', () => {
    const zone = { lat: line[20].lat, lon: 7.5, radiusKm: 0.55 };
    const runs = outsideZone(line, zone);
    expect(runs).toHaveLength(2);
    expect(runs[0]).toEqual(line.slice(0, 15));
    expect(runs[1]).toEqual(line.slice(26));
    for (const p of runs.flat()) expect(distanceKm(p, zone)).toBeGreaterThan(zone.radiusKm);
  });

  it('outsideZone drops runs of a single point, and leaves nothing of a route wholly inside', () => {
    expect(outsideZone(line, { lat: line[1].lat, lon: 7.5, radiusKm: 0.15 })).toEqual([line.slice(3)]);
    expect(outsideZone(line, { lat: line[20].lat, lon: 7.5, radiusKm: 5 })).toEqual([]);
  });
});

describe('segments', () => {
  const seg = (lat: number) => `<trkseg><trkpt lat="${lat}" lon="7"><ele>1</ele></trkpt><trkpt lat="${lat + 0.01}" lon="7"/></trkseg>`;
  const two = `<gpx><trk>${seg(45)}${seg(46)}</trk></gpx>`;

  it('parseSegments keeps each track segment apart; parseGpx runs them together', () => {
    expect(parseSegments(two).map((s) => s.length)).toEqual([2, 2]);
    expect(parseGpx(two)).toHaveLength(4);
    expect(parseSegments(`<gpx><trk>${seg(45).replace(/<\/?trkseg>/g, '')}</trk></gpx>`)).toHaveLength(1); // points outside any segment
  });

  it('sanitizeGpx keeps the segments, so no straight line joins them', () => {
    const clean = sanitizeGpx(two, 'x');
    expect(clean.match(/<trkseg>/g)).toHaveLength(2);
    expect(parseSegments(clean).map((s) => s.length)).toEqual([2, 2]);
  });
});

