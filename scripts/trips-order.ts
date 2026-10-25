// Renumbers the hidden ride order of the trips from the ride times in their notes: `npm run trips-order`.
import { fileURLToPath } from 'node:url';
import { orderTrips } from './trip/order';

const root = fileURLToPath(new URL('..', import.meta.url));
const { changed, problems } = orderTrips(`${root}src/content/outdoors`, `${root}olegs-be-drafts/outdoors`, (line) => console.log(line));
console.log(`${changed.length} trip file${changed.length === 1 ? '' : 's'} renumbered${problems.length ? `; ${problems.length} without a ride time` : ''}`);
