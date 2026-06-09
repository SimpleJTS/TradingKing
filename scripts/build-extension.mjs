import { mkdir, cp, rm } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';

const distDir = new URL('../dist/', import.meta.url);
await rm(distDir, { recursive: true, force: true });
await mkdir(new URL('./assets/', distDir), { recursive: true });

const tsc = spawnSync(
  'tsc',
  ['--noEmit', 'false', '--outDir', 'dist/assets', '--rootDir', 'src', '--declaration', 'false', '--sourceMap', 'true'],
  { stdio: 'inherit' },
);

if (tsc.status !== 0) {
  process.exit(tsc.status ?? 1);
}

await cp(new URL('../public/manifest.json', import.meta.url), new URL('./manifest.json', distDir));
console.log('Built Chrome extension into dist/.');
