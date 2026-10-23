// `npm run contours -- <trip-slug>`: (re)draws the contour layer behind a shared trip's route map,
// src/content/outdoors/tracks/<track>.contours.svg. The wizard does this by itself for new trips.
import { existsSync, readFileSync } from 'node:fs';
import { parse } from 'yaml';
import { writeContours } from './trip/contours';

const slug = process.argv[2];
if (!slug) { console.error('usage: npm run contours -- <trip-slug>'); process.exit(2); }
const file = `src/content/outdoors/${slug}.md`;
if (!existsSync(file)) { console.error(`no trip "${slug}" in src/content/outdoors`); process.exit(2); }
const data = parse(readFileSync(file, 'utf8').split('\n---\n')[0].replace(/^---\n/, '')) as { track?: string | false };
if (typeof data.track !== 'string') { console.error(`${slug} is discreet (track: false): it has no route map, so no contours`); process.exit(2); }
writeContours(data.track, 'src/content/outdoors/tracks', fetch).then(
  ({ path, bytes, levels }) => console.log(`wrote ${path}: ${levels} contour levels, ${(bytes / 1024).toFixed(1)} KB`),
  (error) => { console.error(error instanceof Error ? error.message : error); process.exit(1); },
);
