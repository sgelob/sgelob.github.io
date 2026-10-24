// The one-time import of the music collection: `npm run records -- <collection.csv> [--dry-run]`.
// Reads the Discogs export and the public Discogs API, uploads the covers to R2 and writes src/data/records.yaml.
// API answers are cached in olegs-be-data/discogs/releases/, so a rerun or a crash does not fetch them again.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { stringify } from 'yaml';
import { storeFromEnv, type ObjectStore } from './photos/r2';
import { importRecords } from './records/import';

const root = fileURLToPath(new URL('..', import.meta.url));
if (existsSync(`${root}.env`)) process.loadEnvFile(`${root}.env`);

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const [csvPath, ...rest] = args.filter((a) => a !== '--dry-run');
if (!csvPath || rest.length) {
  console.error('Usage: npm run records -- <collection.csv> [--dry-run]');
  process.exit(2);
}
const uploadsDir = process.env.UPLOADS_DIR;
if (!uploadsDir) {
  console.error('UPLOADS_DIR must be set (see .env.example)');
  process.exit(2);
}

/** A dry run lists what R2 holds but never puts anything. */
const store: ObjectStore = dryRun
  ? { listKeys: async () => new Set(), put: async (key) => { throw new Error(`dry run: ${key} would be uploaded`); } }
  : storeFromEnv();
const now = new Date();
const month = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}`;

const { records, problems } = await importRecords({
  csv: readFileSync(resolve(csvPath), 'utf8'),
  fetch,
  store,
  uploadsDir: resolve(uploadsDir),
  cacheDir: `${root}olegs-be-data/discogs`,
  month,
  log: (line) => console.log(line),
});

const kinds = Object.groupBy(records, (r) => r.kind);
console.log(`\n${records.length} records: ${(['vinyl', 'cd', 'dvd'] as const).map((k) => `${kinds[k]?.length ?? 0} ${k}`).join(', ')}; ${records.filter((r) => !r.cover).length} without a cover`);
if (problems.length) console.log(`Problems:\n${problems.map((p) => `  ${p}`).join('\n')}`);
if (dryRun) {
  console.log('Dry run: nothing written.');
} else {
  writeFileSync(`${root}src/data/records.yaml`, stringify(records, { lineWidth: 0 }));
  console.log('Wrote src/data/records.yaml');
}
