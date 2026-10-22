import { homedir } from 'node:os';
import { resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { formatSummary, mismatches, runMigration } from './migrate/run';

const USAGE = 'usage: npm run migrate -- --dump <path> [--out src] [--drafts ~/olegs-be-drafts] [--dry-run] [--no-assert]';

const expandHome = (path: string): string => (path === '~' || path.startsWith('~/') ? resolve(homedir(), path.slice(2)) : resolve(path));

async function main(): Promise<number> {
  const { values } = parseArgs({
    options: {
      dump: { type: 'string' },
      out: { type: 'string', default: 'src' },
      drafts: { type: 'string', default: '~/olegs-be-drafts' },
      'dry-run': { type: 'boolean', default: false },
      'no-assert': { type: 'boolean', default: false },
    },
  });
  if (!values.dump) {
    console.error(USAGE);
    return 2;
  }

  const summary = await runMigration({
    dump: expandHome(values.dump),
    out: expandHome(values.out),
    drafts: expandHome(values.drafts),
    dryRun: values['dry-run'],
  });

  console.log(formatSummary(summary));
  if (summary.warnings.length) console.log(`\nWarnings:\n${summary.warnings.map((w) => `  - ${w}`).join('\n')}`);
  if (summary.skippedDrafts.length) console.log(`\nSkipped drafts:\n${summary.skippedDrafts.map((d) => `  - ${d}`).join('\n')}`);
  if (values['dry-run']) console.log('\nDry run: nothing written.');

  const wrong = values['no-assert'] ? [] : mismatches(summary);
  if (wrong.length) console.error(`\nUnexpected counts:\n${wrong.map((m) => `  - ${m}`).join('\n')}`);
  return wrong.length ? 1 : 0;
}

main().then(
  (code) => process.exit(code),
  (error: unknown) => {
    console.error(error);
    process.exit(1);
  },
);
