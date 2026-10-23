// `npm run trip`: a step-by-step wizard that creates a trip for Outdoors from a folder of photos.
// It uploads the photos, writes src/content/outdoors/<slug>.md with the answers, sanitises the GPX
// (shared trips only) and keeps the notes for the story in the drafts folder. See README, "Add a trip".
import { existsSync, readFileSync } from 'node:fs';
import { stdin, stdout } from 'node:process';
import { createInterface } from 'node:readline/promises';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';
import { storeFromEnv } from './photos/r2';
import { fetchKomootTour } from './trip/komoot';
import { runWizard, type Ask } from './trip/wizard';

if (existsSync('.env')) process.loadEnvFile('.env');

const root = fileURLToPath(new URL('..', import.meta.url));
const uploadsDir = process.env.UPLOADS_DIR;
if (!uploadsDir) {
  console.error('UPLOADS_DIR must be set (see .env.example)');
  process.exit(2);
}

const rl = createInterface({ input: stdin, output: stdout });
const ask: Ask = async (question, opts) => {
  if (opts?.multiline) {
    console.log(`${question} (end with an empty line)`);
    const lines: string[] = [];
    for (;;) {
      const line = await rl.question('> ');
      if (!line.trim()) break;
      lines.push(line);
    }
    return lines.join('\n');
  }
  const answer = await rl.question(`${question}${opts?.default ? ` [${opts.default}]` : ''}: `);
  return answer.trim() || opts?.default || '';
};

const taxonomies = parse(readFileSync(`${root}src/data/taxonomies.yaml`, 'utf8')) as { countries: { slug: string }[] };

let store;
try {
  store = storeFromEnv();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(2);
}

runWizard({
  ask,
  say: (line) => console.log(line),
  store,
  uploadsDir,
  contentDir: `${root}src/content/outdoors`,
  tracksDir: `${root}src/content/outdoors/tracks`,
  notesDir: `${process.env.DRAFTS_DIR ?? `${root}olegs-be-drafts`}/outdoors`,
  countries: taxonomies.countries.map((c) => c.slug),
  komoot: (url) => fetchKomootTour(url, fetch),
}).then(
  () => { rl.close(); process.exit(0); },
  (error) => { console.error(error instanceof Error ? error.message : error); rl.close(); process.exit(1); },
);
