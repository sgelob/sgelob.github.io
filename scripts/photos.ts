import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { WIDTHS } from '../src/lib/images';
import { fixSizes } from './photos/fill-sizes';
import { processUploads } from './photos/process';
import { R2Store, type ObjectStore } from './photos/r2';
import { scaffoldGallery } from './photos/scaffold';

const GALLERIES_DIR = fileURLToPath(new URL('../src/content/galleries', import.meta.url));
const USAGE = `Usage:
  npm run photos -- --uploads <dir> [--dry-run] [--width <n>]   resize and upload every original under <dir>
  npm run photos -- --new <slug> <folder> [--date YYYY-MM-DD]   copy a folder of photos into UPLOADS_DIR/<yyyy>/<mm> of the shooting date, upload, write the gallery file
  npm run photos -- --fix-sizes                                 fill photos with width 0 in the gallery files from UPLOADS_DIR`;

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    uploads: { type: 'string' },
    'dry-run': { type: 'boolean' },
    width: { type: 'string' },
    new: { type: 'boolean' },
    date: { type: 'string' },
    'fix-sizes': { type: 'boolean' },
  },
});

if (existsSync('.env')) process.loadEnvFile('.env');

function r2Env() {
  const { R2_ACCOUNT_ID: accountId, R2_ACCESS_KEY_ID: accessKeyId, R2_SECRET_ACCESS_KEY: secretAccessKey, R2_BUCKET: bucket } = process.env;
  return accountId && accessKeyId && secretAccessKey && bucket ? { accountId, accessKeyId, secretAccessKey, bucket } : undefined;
}

/** A dry run may go without credentials: then nothing is known to exist remotely. */
const nothingStored: ObjectStore = {
  listKeys: async () => new Set(),
  put: async () => {
    throw new Error('dry run: nothing may be put');
  },
};

function realStore(): ObjectStore {
  const env = r2Env();
  if (!env) throw new Error('R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY and R2_BUCKET must be set (see .env.example)');
  return new R2Store(env);
}

async function main(): Promise<number> {
  const log = console.log;

  if (values['fix-sizes']) {
    const uploadsDir = process.env.UPLOADS_DIR;
    if (!uploadsDir) throw new Error('UPLOADS_DIR must be set');
    const r = await fixSizes({ contentDir: GALLERIES_DIR, uploadsDir, log });
    log(`${r.files} gallery files updated, ${r.photos} sizes filled, ${r.missing.length} photos not found`);
    return r.missing.length ? 1 : 0;
  }

  if (values.new) {
    const [slug, folder] = positionals;
    if (!slug || !folder) throw new Error(`--new needs a slug and a folder\n${USAGE}`);
    let date: Date | undefined;
    if (values.date !== undefined) {
      const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(values.date);
      if (!m) throw new Error(`--date must be YYYY-MM-DD, got "${values.date}"`);
      date = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12, 0, 0);
    }
    const path = await scaffoldGallery({ slug, folder: resolve(folder), store: realStore(), contentDir: GALLERIES_DIR, date });
    log(`wrote ${path}: set genre, country and cover, then review the order`);
    log('set darkHeader: true when the cover is light at the top or bottom: the hero then darkens it more under the nav and title');
    return 0;
  }

  if (values.uploads) {
    const widths: number[] = [...WIDTHS];
    if (values.width) {
      const extra = Number(values.width);
      if (!Number.isInteger(extra) || extra <= 0) throw new Error(`invalid --width ${values.width}`);
      widths.push(extra);
    }
    const dryRun = Boolean(values['dry-run']);
    const store = dryRun && !r2Env() ? nothingStored : realStore();
    const r = await processUploads({ uploadsDir: resolve(values.uploads), store, widths, dryRun, log });
    log(
      `${r.files} files, ${r.uploaded} uploaded, ${r.skipped} already present` +
        (dryRun ? `, ${r.planned} would be uploaded (dry run)` : '') +
        `, ${r.sizes.size} images measured, ${r.errors.length} errors`,
    );
    for (const e of r.errors) console.error(`error: ${e}`);
    return r.errors.length ? 1 : 0;
  }

  console.error(USAGE);
  return 2;
}

main().then(
  (code) => process.exit(code),
  (error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  },
);
