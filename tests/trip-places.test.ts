import { describe, expect, test } from 'vitest';
import { alongRoute, pointAt } from '../scripts/trip/places';

// About 1.1 km between points: a degree of latitude is 111.2 km.
const line = Array.from({ length: 11 }, (_, i) => ({ lat: 45 + i * 0.01, lon: 7, ele: 300 + i * 10 }));

describe('places along a route', () => {
  test('alongRoute: the first point, then one about every step, with the distance so far', () => {
    const samples = alongRoute(line, 3);
    expect(samples.map((s) => Math.round(s.km))).toEqual([0, 3, 7, 10]);
    expect(samples[0].point).toEqual(line[0]);
    expect(samples.every((s, i) => i === 0 || s.km >= i * 3)).toBe(true);
  });

  test('pointAt: the track point a photo sits on, or nothing when Komoot did not place it', () => {
    expect(pointAt(line, 4)).toEqual(line[4]);
    expect(pointAt(line, undefined)).toBeUndefined();
    expect(pointAt(line, 99)).toBeUndefined();
  });
});
