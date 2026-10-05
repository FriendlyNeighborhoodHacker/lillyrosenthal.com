#!/usr/bin/env node
/**
 * Production build: `astro build`, then drop dist/media when the site is
 * configured to load media from Cloudflare (PUBLIC_MEDIA_BASE set), so the
 * deployable dist/ is a few MB instead of carrying every video.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// Mirror Astro's .env loading for this one variable (astro build reads .env itself).
function envBase() {
  if (process.env.PUBLIC_MEDIA_BASE != null) return process.env.PUBLIC_MEDIA_BASE.trim();
  const file = path.join(ROOT, '.env');
  if (!fs.existsSync(file)) return '';
  const m = /^\s*PUBLIC_MEDIA_BASE\s*=\s*(.*?)\s*$/m.exec(fs.readFileSync(file, 'utf8'));
  return m ? m[1].replace(/^["']|["']$/g, '').trim() : '';
}

const baseBefore = envBase();
if (!baseBefore && !fs.existsSync(path.join(ROOT, 'public', 'media'))) {
  console.error('Refusing to build: PUBLIC_MEDIA_BASE is blank and public/media does not exist, so no clip could load.\n'
    + 'Set PUBLIC_MEDIA_BASE in .env (see .env.example) or run `npm run import-media`.');
  process.exit(1);
}

const res = spawnSync('npx', ['astro', 'build'], { cwd: ROOT, stdio: 'inherit', shell: process.platform === 'win32' });
if (res.status !== 0) process.exit(res.status ?? 1);

const base = envBase();
const distMedia = path.join(ROOT, 'dist', 'media');
if (base && fs.existsSync(distMedia)) {
  fs.rmSync(distMedia, { recursive: true, force: true });
  console.log(`\n› Media is served from ${base}; removed dist/media from the build output.`);
} else if (!base) {
  console.log('\n› PUBLIC_MEDIA_BASE is blank: dist/ includes the local media files (set it in .env to serve from Cloudflare).');
}
