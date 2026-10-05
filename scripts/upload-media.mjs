#!/usr/bin/env node
/**
 * upload-media.mjs — sync public/media/** to a Cloudflare R2 bucket.
 *
 *   npm run upload-media              # upload new/changed files
 *   npm run upload-media -- --dry-run # show what would happen
 *   npm run upload-media -- --prune   # also delete remote files that no longer exist locally
 *   npm run upload-media -- --check   # after uploading, fetch each public URL to confirm access
 *
 * Reads R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET and
 * PUBLIC_MEDIA_BASE from .env (see .env.example). Object keys mirror the local
 * paths under public/media, e.g. "media/snoopy/01_IMG_1894_1.mp4", so the
 * public URL is simply `${PUBLIC_MEDIA_BASE}/media/snoopy/01_IMG_1894_1.mp4`,
 * the same path the site uses locally.
 *
 * Unchanged files are skipped by comparing size + MD5 with the remote ETag.
 */
import { S3Client, ListObjectsV2Command, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LOCAL = path.join(ROOT, 'public', 'media');
const PREFIX = 'media/';

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const prune = args.includes('--prune');
const check = args.includes('--check');

const env = (k, required = true) => {
  const v = process.env[k];
  if (required && !v) { console.error(`Missing ${k}. Copy .env.example to .env and fill it in.`); process.exit(1); }
  return v || '';
};
const accountId = env('R2_ACCOUNT_ID');
const bucket = env('R2_BUCKET');
const publicBase = env('PUBLIC_MEDIA_BASE', false).replace(/\/+$/, '');

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: env('R2_ACCESS_KEY_ID'), secretAccessKey: env('R2_SECRET_ACCESS_KEY') },
});

const TYPES = { '.mp4': 'video/mp4', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.json': 'application/json' };

function walk(dir, out = []) {
  for (const name of fs.readdirSync(dir)) {
    if (name.startsWith('.')) continue;
    const full = path.join(dir, name);
    if (fs.statSync(full).isDirectory()) walk(full, out); else out.push(full);
  }
  return out;
}

const md5 = (file) => new Promise((resolve, reject) => {
  const h = crypto.createHash('md5');
  fs.createReadStream(file).on('data', (d) => h.update(d)).on('end', () => resolve(h.digest('hex'))).on('error', reject);
});

async function listRemote() {
  const out = new Map();
  let token;
  do {
    const res = await s3.send(new ListObjectsV2Command({ Bucket: bucket, Prefix: PREFIX, ContinuationToken: token }));
    for (const o of res.Contents || []) out.set(o.Key, { size: o.Size, etag: (o.ETag || '').replace(/"/g, '') });
    token = res.IsTruncated ? res.NextContinuationToken : undefined;
  } while (token);
  return out;
}

if (!fs.existsSync(LOCAL)) { console.error(`Nothing to upload: ${LOCAL} does not exist (run npm run import-media first).`); process.exit(1); }

const files = walk(LOCAL).sort();
console.log(`Bucket ${bucket}: comparing ${files.length} local file(s)…`);
const remote = await listRemote();

const rows = [];
let uploadedBytes = 0;
const seen = new Set();
for (const file of files) {
  const key = PREFIX + path.relative(LOCAL, file).split(path.sep).join('/');
  seen.add(key);
  const size = fs.statSync(file).size;
  const r = remote.get(key);
  const hash = await md5(file);
  const same = r && r.size === size && r.etag === hash;
  if (same) { rows.push({ key, size: (size / 1e6).toFixed(2) + ' MB', action: 'up to date' }); continue; }
  rows.push({ key, size: (size / 1e6).toFixed(2) + ' MB', action: r ? 'update' : 'upload' });
  if (dryRun) continue;
  process.stdout.write(`  ↑ ${key} (${(size / 1e6).toFixed(1)} MB)… `);
  await s3.send(new PutObjectCommand({
    Bucket: bucket, Key: key,
    Body: fs.createReadStream(file), ContentLength: size,
    ContentType: TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream',
    CacheControl: 'public, max-age=604800',
    ContentMD5: Buffer.from(hash, 'hex').toString('base64'),
  }));
  uploadedBytes += size;
  console.log('done');
}

for (const key of remote.keys()) {
  if (seen.has(key)) continue;
  rows.push({ key, size: (remote.get(key).size / 1e6).toFixed(2) + ' MB', action: prune ? (dryRun ? 'would delete' : 'deleted') : 'remote only (use --prune)' });
  if (prune && !dryRun) await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}

console.table(rows);
console.log(`${dryRun ? 'Dry run. ' : ''}Uploaded ${(uploadedBytes / 1e6).toFixed(1)} MB.`);

if (publicBase) {
  console.log(`\nPublic URLs look like: ${publicBase}/${PREFIX}snoopy/01_IMG_1894_1.mp4`);
  if (check && !dryRun) {
    console.log('Checking public access…');
    let bad = 0;
    for (const file of files) {
      const url = `${publicBase}/${PREFIX}${path.relative(LOCAL, file).split(path.sep).join('/')}`;
      try {
        const res = await fetch(url, { method: 'HEAD' });
        if (!res.ok) { bad++; console.log(`  ✗ ${res.status} ${url}`); }
      } catch (e) { bad++; console.log(`  ✗ ${e.message} ${url}`); }
    }
    console.log(bad ? `${bad} URL(s) not reachable — is public access enabled on the bucket?` : '  ✓ all public URLs respond');
  }
} else {
  console.log('\nPUBLIC_MEDIA_BASE is blank: the site still serves local files. Set it in .env (see .env.example) and rebuild.');
}
