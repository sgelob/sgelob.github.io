// Gets everything a new trip needs from one Komoot tour, for writing the post in a chat instead of the terminal wizard:
//   npm run trip-fetch -- <tour link or id> [--no-places]
// It saves the tour's facts, its GPX export and its photos (in track order) to <drafts>/komoot/<id>/, then prints the
// places along the route and where each photo was taken (OpenStreetMap's Nominatim, one request a second).
// Needs KOMOOT_EMAIL and KOMOOT_PASSWORD. Nothing here is published: the drafts folder is git-ignored.
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseGpx } from '../src/lib/gpx';
import { downloadKomootImages, fetchKomootGpx, fetchKomootTour, komootLogin, tourIdFromUrl } from './trip/komoot';
import { alongRoute, pointAt } from './trip/places';

const root = fileURLToPath(new URL('..', import.meta.url));
if (existsSync(`${root}.env`)) process.loadEnvFile(`${root}.env`);
const [arg] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const id = arg && (/^\d+$/.test(arg) ? arg : tourIdFromUrl(arg));
if (!id) throw new Error('usage: npm run trip-fetch -- <Komoot tour link or id> [--no-places]');
const { KOMOOT_EMAIL: email, KOMOOT_PASSWORD: password } = process.env;
if (!email || !password) throw new Error('KOMOOT_EMAIL and KOMOOT_PASSWORD must be set');

const dir = join(process.env.DRAFTS_DIR ?? `${root}olegs-be-drafts`, 'komoot', id);
mkdirSync(dir, { recursive: true });
const auth = await komootLogin(email, password, fetch);
const tour = await fetchKomootTour(`https://www.komoot.com/tour/${id}`, fetch, auth);
const gpx = await fetchKomootGpx(id, fetch, auth);
writeFileSync(join(dir, `${id}.gpx`), gpx);
await downloadKomootImages(tour.images, join(dir, 'photos'), fetch);
writeFileSync(join(dir, 'tour.json'), JSON.stringify({ ...tour, images: tour.images.map(({ index }) => ({ index })) }, null, 1));
console.log(`${tour.name} | ${tour.sport} | ${tour.distanceKm} km | ${tour.climb} m up | ${tour.date} (${tour.startedAt}) | ${tour.images.length} photos`);
console.log(`saved to ${dir}: tour.json, ${id}.gpx, photos/`);

if (!process.argv.includes('--no-places')) {
  const points = parseGpx(gpx);
  const place = async (p: { lat: number; lon: number }) => {
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=16&lat=${p.lat}&lon=${p.lon}`, { headers: { 'User-Agent': 'olegs.be trip notes' } });
    const a = ((await res.json()) as { address?: Record<string, string> }).address ?? {};
    await new Promise((r) => setTimeout(r, 1100));
    return [a.road ?? a.path ?? '', a.hamlet ?? a.suburb ?? a.village ?? '', a.municipality ?? a.town ?? a.village ?? a.city ?? ''].filter(Boolean).join(' | ');
  };
  const first = points[0];
  const last = points.at(-1)!;
  console.log(`\nstart ${first.lat.toFixed(4)},${first.lon.toFixed(4)}  end ${last.lat.toFixed(4)},${last.lon.toFixed(4)}`);
  console.log('\nalong the route:');
  for (const { km, point } of alongRoute(points, Math.max(0.5, Math.round(tour.distanceKm / 12)))) {
    console.log(`  ${km.toFixed(1).padStart(5)} km ${String(Math.round(point.ele ?? 0)).padStart(5)} m  ${await place(point)}`);
  }
  console.log('\nphotos:');
  for (const [i, image] of tour.images.entries()) {
    const p = pointAt(points, image.index);
    console.log(`  ${String(i + 1).padStart(2, '0')}  ${p ? `${p.lat.toFixed(5)},${p.lon.toFixed(5)}  ${await place(p)}` : 'not placed on the track'}`);
  }
}
