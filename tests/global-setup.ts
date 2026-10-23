import { spawnSync } from 'node:child_process';

/** Builds the site and its search index once per vitest run, so build-output tests can read `dist/`. */
export default function setup(): void {
  const build = spawnSync('npx', ['astro', 'build'], { stdio: 'inherit' });
  if (build.status !== 0) throw new Error(`astro build failed with exit code ${build.status}`);
  const index = spawnSync('npx', ['pagefind', '--site', 'dist', '--quiet'], { stdio: 'inherit' });
  if (index.status !== 0) throw new Error(`pagefind failed with exit code ${index.status}`);
}
