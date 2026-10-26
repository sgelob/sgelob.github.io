// Renumbers the hidden ride order of the trips from the ride times in their notes: `npm run trips-order`.
// With `--komoot`, a trip whose notes have no ride time (notes stay where they were written: a fresh checkout has none)
// first gets it from its Komoot tour, which needs KOMOOT_EMAIL and KOMOOT_PASSWORD.
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { fetchKomootTour, komootLogin } from './trip/komoot';
import { missingRideTimes, orderTrips, recordRideTime } from './trip/order';

const root = fileURLToPath(new URL('..', import.meta.url));
if (existsSync(`${root}.env`)) process.loadEnvFile(`${root}.env`);
const contentDir = `${root}src/content/outdoors`;
const notesDir = `${process.env.DRAFTS_DIR ?? `${root}olegs-be-drafts`}/outdoors`;

if (process.argv.includes('--komoot')) {
  const missing = missingRideTimes(contentDir, notesDir).filter((t) => t.tourId);
  if (missing.length) {
    const { KOMOOT_EMAIL: email, KOMOOT_PASSWORD: password } = process.env;
    if (!email || !password) throw new Error('--komoot needs KOMOOT_EMAIL and KOMOOT_PASSWORD');
    const auth = await komootLogin(email, password, fetch);
    for (const { slug, tourId } of missing) {
      const tour = await fetchKomootTour(`https://www.komoot.com/tour/${tourId}`, fetch, auth);
      if (tour.startedAt) recordRideTime(notesDir, slug, tour.startedAt);
    }
    console.log(`${missing.length} ride time${missing.length === 1 ? '' : 's'} taken from Komoot`);
  }
}

const { changed, problems } = orderTrips(contentDir, notesDir, (line) => console.log(line));
console.log(`${changed.length} trip file${changed.length === 1 ? '' : 's'} renumbered${problems.length ? `; ${problems.length} without a ride time` : ''}`);
