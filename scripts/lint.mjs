import { readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';

const rg = spawnSync('rg', ['--files', 'src', 'scripts'], { encoding: 'utf8' });
if (rg.status !== 0) {
  process.exit(rg.status ?? 1);
}

const files = rg.stdout.trim().split('\n').filter(Boolean).filter((file) => /\.(ts|mjs|js)$/.test(file));
for (const file of files) {
  const source = await readFile(file, 'utf8');
  if (/try\s*\{\s*(?:await\s+)?import\s*\(/s.test(source) || /try\s*\{\s*import\s+/s.test(source)) {
    console.error(`${file}: imports must not be wrapped in try/catch blocks`);
    process.exit(1);
  }
}

console.log(`Linted ${files.length} source files.`);
