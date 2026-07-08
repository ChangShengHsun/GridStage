import { existsSync, rmSync, cpSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

// Copy the web app's build output into the Electron package so electron-builder
// can bundle it. Kept as a copy (not a symlink) so the packaged app is
// self-contained.
const here = dirname(fileURLToPath(import.meta.url));
const src = join(here, '..', 'web', 'dist');
const dest = join(here, 'renderer');

if (!existsSync(src)) {
  console.error(`web build not found at ${src} — run the web build first`);
  process.exit(1);
}
rmSync(dest, { recursive: true, force: true });
cpSync(src, dest, { recursive: true });
console.log(`copied ${src} -> ${dest}`);
