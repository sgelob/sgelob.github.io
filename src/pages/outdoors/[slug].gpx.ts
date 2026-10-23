import type { APIRoute, GetStaticPaths } from 'astro';
import { getTrips } from '../../lib/collections';
import type { Trip } from '../../lib/outdoors';
import { sanitizeGpx } from '../../lib/gpx';
import { readTrack } from '../../lib/tracks';

export const getStaticPaths = (async () =>
  (await getTrips()).filter((t) => t.data.track !== false).map((t) => ({ params: { slug: t.id }, props: { trip: t } }))) satisfies GetStaticPaths;

/** The sanitised track of a trip: track points only, no timestamps, metadata or waypoints. */
export const GET: APIRoute<{ trip: Trip }> = ({ props }) => {
  const { track, title } = props.trip.data;
  if (track === false) throw new Error(`${props.trip.id} has no track`);
  return new Response(sanitizeGpx(readTrack(track), title), {
    headers: { 'Content-Type': 'application/gpx+xml; charset=utf-8' },
  });
};
