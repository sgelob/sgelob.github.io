// Fills src/data/books.yaml with the first publication year and the cover of each book a lookup matched confidently:
// `npm run books -- <lookup.json> [--dry-run]`. Titles, authors and order stay as written; covers go to R2 through
// the photo pipeline. Safe to run again after a new lookup: books that already have a year or a cover keep them.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse, stringify } from 'yaml';
import { storeFromEnv, type ObjectStore } from './photos/r2';
import { enrichBooks, type LookupEntry } from './books/entries';

const root = fileURLToPath(new URL('..', import.meta.url));
if (existsSync(`${root}.env`)) process.loadEnvFile(`${root}.env`);

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const [lookupPath, ...rest] = args.filter((a) => a !== '--dry-run');
const uploadsDir = process.env.UPLOADS_DIR;
if (!lookupPath || rest.length || !uploadsDir) {
  console.error('Usage: npm run books -- <lookup.json> [--dry-run]   (UPLOADS_DIR must be set)');
  process.exit(2);
}

const dataFile = `${root}src/data/books.yaml`;
const store: ObjectStore = dryRun
  ? { listKeys: async () => new Set(), put: async (key) => { throw new Error(`dry run: ${key} would be uploaded`); } }
  : storeFromEnv();
const now = new Date();
const { books, problems } = await enrichBooks({
  sections: parse(readFileSync(dataFile, 'utf8')),
  lookup: JSON.parse(readFileSync(resolve(lookupPath), 'utf8')) as LookupEntry[],
  store,
  uploadsDir: resolve(uploadsDir),
  month: `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}`,
  log: (line) => console.log(line),
});

const all = books.flatMap((s) => s.books);
console.log(`${all.length} books: ${all.filter((b) => b.year).length} with a year, ${all.filter((b) => b.cover).length} with a cover`);
if (problems.length) console.log(`Problems:\n${problems.map((p) => `  ${p}`).join('\n')}`);
if (dryRun) console.log('Dry run: nothing written.');
else {
  writeFileSync(dataFile, stringify(books, { lineWidth: 0 }));
  console.log('Wrote src/data/books.yaml');
}
