// `npm run trip`: a step-by-step wizard that creates a trip for Outdoors from a folder of photos.
// It uploads the photos, writes src/content/outdoors/<slug>.md with the answers, sanitises the GPX
// (shared trips only) and keeps the notes for the story in the drafts folder. See README, "Add a trip".
import { existsSync, readFileSync } from 'node:fs';
import { stdin, stdout } from 'node:process';
import { createInterface } from 'node:readline/promises';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';
import { storeFromEnv } from './photos/r2';
import { spawn } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { downloadKomootImages, fetchKomootTour, komootLogin, type KomootAuth } from './trip/komoot';
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

// With KOMOOT_EMAIL and KOMOOT_PASSWORD in .env the wizard logs in once, so Komoot lists all of a tour's photos.
let auth: Promise<KomootAuth | undefined> | undefined;
const komootAuth = () =>
  (auth ??= (async () => {
    const { KOMOOT_EMAIL: email, KOMOOT_PASSWORD: password } = process.env;
    if (!email || !password) return undefined;
    try {
      const session = await komootLogin(email, password, fetch);
      console.log('  Logged in to Komoot.');
      return session;
    } catch (error) {
      console.log(`  ${error instanceof Error ? error.message : error}; going on without a login.`);
      return undefined;
    }
  })());

runWizard({
  ask,
  say: (line) => console.log(line),
  store,
  uploadsDir,
  contentDir: `${root}src/content/outdoors`,
  tracksDir: `${root}src/content/outdoors/tracks`,
  notesDir: `${process.env.DRAFTS_DIR ?? `${root}olegs-be-drafts`}/outdoors`,
  countries: taxonomies.countries.map((c) => c.slug),
  komoot: async (url) => fetchKomootTour(url, fetch, await komootAuth()),
  reveal: (dir) => { if (process.platform === 'darwin') spawn('open', [dir], { stdio: 'ignore', detached: true }).unref(); },
  komootPhotos: async (tour) => {
    const dir = mkdtempSync(join(tmpdir(), `komoot-${tour.id}-`));
    await downloadKomootImages(tour.images, dir, fetch, (line) => console.log(line));
    return dir;
  },
}).then(
  () => { rl.close(); process.exit(0); },
  (error) => { console.error(error instanceof Error ? error.message : error); rl.close(); process.exit(1); },
);
