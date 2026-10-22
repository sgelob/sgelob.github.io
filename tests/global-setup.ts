import { spawnSync } from 'node:child_process';

/** Builds the site once per vitest run, so build-output tests can read `dist/`. */
export default function setup(): void {
  const result = spawnSync('npx', ['astro', 'build'], { stdio: 'inherit' });
  if (result.status !== 0) throw new Error(`astro build failed with exit code ${result.status}`);
}
