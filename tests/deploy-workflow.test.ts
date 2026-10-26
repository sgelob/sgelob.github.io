import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';
import { parse } from 'yaml';

type Step = { name?: string; id?: string; uses?: string; run?: string; if?: string; env?: Record<string, string> };
const workflow = parse(readFileSync(new URL('../.github/workflows/deploy.yml', import.meta.url), 'utf8'));
const steps: Step[] = workflow.jobs.deploy.steps;
const purge = steps.find((s) => s.run?.includes('purge_cache'));

describe('deploy: Cloudflare keeps the pages at the edge, so every deploy purges them', () => {
  test('the purge runs after the Pages deployment', () => {
    expect(purge).toBeDefined();
    expect(steps.indexOf(purge!)).toBeGreaterThan(steps.findIndex((s) => s.id === 'deployment'));
  });

  test('it purges the site host only, so the photos stay cached', () => {
    expect(purge!.run).toContain('"hosts":["olegs.be"]');
    expect(purge!.run).not.toContain('purge_everything');
    expect(purge!.run).not.toContain('img.olegs.be');
  });

  test('the token comes from a secret and a failed purge fails the deploy', () => {
    expect(purge!.env?.CF_PURGE_TOKEN).toBe('${{ secrets.CF_PURGE_TOKEN }}');
    expect(purge!.run).toContain('--fail');
  });
});
