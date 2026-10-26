// Where a route goes and where its photos were taken, for writing about a trip: samples of the track to look up on a map.
import { distanceKm, type TrackPoint } from '../../src/lib/gpx';

/** The first point, then one about every `stepKm`, each with the distance covered to reach it. */
export function alongRoute<T extends TrackPoint>(points: readonly T[], stepKm: number): { km: number; point: T }[] {
  const samples: { km: number; point: T }[] = [];
  let km = 0;
  let next = 0;
  points.forEach((point, i) => {
    if (i) km += distanceKm(points[i - 1], point);
    if (km >= next) {
      samples.push({ km, point });
      next += stepKm;
    }
  });
  return samples;
}

/** The track point at a photo's position on the tour (Komoot's index into the GPX export), if Komoot placed it. */
export const pointAt = <T>(points: readonly T[], index: number | undefined): T | undefined => (index === undefined ? undefined : points[index]);
