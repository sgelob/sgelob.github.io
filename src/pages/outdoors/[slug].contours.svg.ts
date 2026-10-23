import { readFileSync } from 'node:fs';
import type { APIRoute, GetStaticPaths } from 'astro';
import { getTrips } from '../../lib/collections';
import type { Trip } from '../../lib/outdoors';
import { contoursFile, hasContours, TRACKS_DIR } from '../../lib/tracks';

// Only shared trips have a route map, and only those whose layer was drawn (npm run contours, or the trip wizard).
export const getStaticPaths = (async () =>
  (await getTrips())
    .filter((t) => t.data.track !== false && hasContours(t.data.track))
    .map((t) => ({ params: { slug: t.id }, props: { trip: t } }))) satisfies GetStaticPaths;

/** The contour layer behind a trip's route map, served from the site itself: no map service is called by visitors. */
export const GET: APIRoute<{ trip: Trip }> = ({ props }) => {
  const { track } = props.trip.data;
  if (track === false) throw new Error(`${props.trip.id} has no track`);
  return new Response(readFileSync(`${TRACKS_DIR}${contoursFile(track)}`, 'utf8'), {
    headers: { 'Content-Type': 'image/svg+xml; charset=utf-8' },
  });
};
