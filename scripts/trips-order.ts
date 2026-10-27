// Renumbers the hidden ride order of the trips from the ride times in their notes: `npm run trips-order`.
// With `--komoot`, a trip whose notes have no ride time (notes stay where they were written: a fresh checkout has none)
// first gets it from its Komoot tour, or, when it links none, from the tour of the account with its month, distance and climb;
// both need KOMOOT_EMAIL and KOMOOT_PASSWORD.
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { fetchKomootTour, komootLogin, listKomootTours } from './trip/komoot';
import { matchRideTime, missingRideTimes, orderTrips, recordRideTime } from './trip/order';

const root = fileURLToPath(new URL('..', import.meta.url));
if (existsSync(`${root}.env`)) process.loadEnvFile(`${root}.env`);
const contentDir = `${root}src/content/outdoors`;
const notesDir = `${process.env.DRAFTS_DIR ?? `${root}olegs-be-drafts`}/outdoors`;

if (process.argv.includes('--komoot')) {
  const missing = missingRideTimes(contentDir, notesDir);
  if (missing.length) {
    const { KOMOOT_EMAIL: email, KOMOOT_PASSWORD: password } = process.env;
    if (!email || !password) throw new Error('--komoot needs KOMOOT_EMAIL and KOMOOT_PASSWORD');
    const auth = await komootLogin(email, password, fetch);
    // Trips with approximate ends do not link to their tour: they are found in the account's list instead.
    const listed = missing.some((t) => !t.tourId) ? await listKomootTours(fetch, auth) : [];
    let found = 0;
    for (const trip of missing) {
      const startedAt = trip.tourId ? (await fetchKomootTour(`https://www.komoot.com/tour/${trip.tourId}`, fetch, auth)).startedAt : matchRideTime(trip, listed);
      if (startedAt) {
        recordRideTime(notesDir, trip.slug, startedAt);
        found++;
      }
    }
    console.log(`${found} ride time${found === 1 ? '' : 's'} taken from Komoot`);
  }
}

const { changed, problems } = orderTrips(contentDir, notesDir, (line) => console.log(line));
console.log(`${changed.length} trip file${changed.length === 1 ? '' : 's'} renumbered${problems.length ? `; ${problems.length} without a ride time` : ''}`);
