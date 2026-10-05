#!/usr/bin/env node
/**
 * import-media.mjs — transcode the Dropbox acting clips into web-ready files.
 *
 *   npm run import-media                 # all sections
 *   npm run import-media -- snoopy       # one or more sections
 *   npm run import-media -- --force      # re-encode everything
 *   npm run import-media -- --prune      # delete outputs whose source is gone
 *
 * Source:  $ACTING_SRC  (default ~/Dropbox/lilly_college/acting)/<section>/*.mov|mp4|m4v|jpg|jpeg|png
 * Output:  public/media/<section>/<name>.mp4 + <name>.poster.jpg   (videos)
 *          public/media/<section>/<name>.jpg                        (images)
 *          src/data/media.generated.json                            (manifest, committed)
 *
 * Safe to re-run: a clip is only encoded when its output is missing or older
 * than the source. The manifest is always rebuilt from what is in public/media,
 * so section pages pick up new clips automatically (sorted by filename).
 *
 * Videos become H.264 / AAC MP4 (long side <= 1920, faststart). HDR clips
 * (iPhone HLG / Dolby Vision HEVC) are tone-mapped to SDR BT.709 with zscale +
 * tonemap; if that pipeline fails, macOS `avconvert` is used as a fallback.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_ROOT = path.join(ROOT, 'public', 'media');
const MANIFEST = path.join(ROOT, 'src', 'data', 'media.generated.json');
const SRC_ROOT = process.env.ACTING_SRC || path.join(os.homedir(), 'Dropbox', 'lilly_college', 'acting');
const ALL_SECTIONS = ['snoopy', 'annabeth', 'gomez', 'speeches', 'stills'];

const VIDEO_EXT = new Set(['.mov', '.mp4', '.m4v']);
const IMAGE_EXT = new Set(['.jpg', '.jpeg', '.png']);
const MAX_LONG_SIDE = 1920;
const POSTER_LONG_SIDE = 1280;

const args = process.argv.slice(2);
const force = args.includes('--force');
const prune = args.includes('--prune');
const sections = args.filter((a) => !a.startsWith('--'));
const wanted = sections.length ? sections : ALL_SECTIONS;

// ---------------------------------------------------------------- helpers
const naturalCompare = (a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });

/** "01_IMG_1894 (1)" -> "01_IMG_1894_1" */
function sanitize(stem) {
  return stem.replace(/[^A-Za-z0-9._-]+/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
}

function run(cmd, cmdArgs, opts = {}) {
  const res = spawnSync(cmd, cmdArgs, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, ...opts });
  return res;
}

function probe(file) {
  const res = run('ffprobe', ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', file]);
  if (res.status !== 0) throw new Error(`ffprobe failed for ${file}: ${res.stderr}`);
  const json = JSON.parse(res.stdout);
  const v = (json.streams || []).find((s) => s.codec_type === 'video') || {};
  const a = (json.streams || []).find((s) => s.codec_type === 'audio');
  const rotate = Number(v.tags?.rotate || 0) || (v.side_data_list || []).find((d) => d.rotation)?.rotation || 0;
  const swap = Math.abs(rotate) % 180 === 90;
  return {
    width: swap ? v.height : v.width,
    height: swap ? v.width : v.height,
    duration: Number(json.format?.duration || v.duration || 0),
    codec: v.codec_name,
    pixFmt: v.pix_fmt,
    transfer: v.color_transfer,
    primaries: v.color_primaries,
    hasAudio: Boolean(a),
    bytes: Number(json.format?.size || 0),
  };
}

const isHdr = (p) =>
  ['arib-std-b67', 'smpte2084'].includes(p.transfer) ||
  (String(p.pixFmt).includes('10') && p.primaries === 'bt2020');

const isNewer = (out, src) => {
  if (!fs.existsSync(out)) return false;
  return fs.statSync(out).mtimeMs >= fs.statSync(src).mtimeMs;
};

// Long side capped at MAX_LONG_SIDE, both dimensions forced even.
const SCALE = `scale=w='if(gte(iw,ih),min(${MAX_LONG_SIDE},iw),-2)':h='if(gte(iw,ih),-2,min(${MAX_LONG_SIDE},ih))',scale=trunc(iw/2)*2:trunc(ih/2)*2`;
const TONEMAP = 'zscale=t=linear:npl=100,format=gbrpf32le,zscale=p=bt709,tonemap=tonemap=hable:desat=0,zscale=t=bt709:m=bt709:r=tv,format=yuv420p';

function encodeVideo(src, out, p) {
  const hdr = isHdr(p);
  const preset = p.duration > 60 ? 'medium' : 'slow';
  const vf = hdr ? `${TONEMAP},${SCALE}` : `${SCALE},format=yuv420p`;
  const common = [
    '-y', '-hide_banner', '-loglevel', 'error', '-stats',
    '-i', src,
    '-map', '0:v:0', '-map', '0:a:0?',
    '-vf', vf,
    '-c:v', 'libx264', '-preset', preset, '-crf', '22', '-profile:v', 'high', '-level', '4.1', '-pix_fmt', 'yuv420p',
    '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709',
    '-c:a', 'aac', '-b:a', '128k', '-ac', '2',
    '-movflags', '+faststart', '-map_metadata', '-1',
    out,
  ];
  let res = run('ffmpeg', common, { stdio: ['ignore', 'inherit', 'pipe'] });
  if (res.status === 0) return hdr ? 'ffmpeg+tonemap' : 'ffmpeg';

  if (hdr) {
    console.warn(`    zscale/tonemap pipeline failed (${(res.stderr || '').trim().split('\n').pop()}); trying avconvert`);
    const tmp = out.replace(/\.mp4$/, '.avconvert.mov');
    const ac = run('avconvert', ['--source', src, '--output', tmp, '--preset', 'Preset1920x1080', '--replace']);
    if (ac.status === 0) {
      res = run('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', '-i', tmp, '-map', '0:v:0', '-map', '0:a:0?',
        '-c:v', 'copy', '-c:a', 'aac', '-b:a', '128k', '-ac', '2', '-movflags', '+faststart', '-map_metadata', '-1', out]);
      fs.rmSync(tmp, { force: true });
      if (res.status === 0) return 'avconvert';
    }
  }
  throw new Error(`encode failed for ${src}: ${(res.stderr || '').trim()}`);
}

function makePoster(mp4, poster, duration) {
  const ss = Math.min(1, Math.max(0, duration / 2)).toFixed(2);
  const res = run('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', '-ss', ss, '-i', mp4, '-frames:v', '1',
    '-vf', `scale=w='if(gte(iw,ih),min(${POSTER_LONG_SIDE},iw),-2)':h='if(gte(iw,ih),-2,min(${POSTER_LONG_SIDE},ih))'`,
    '-q:v', '3', poster]);
  if (res.status !== 0) throw new Error(`poster failed for ${mp4}: ${res.stderr}`);
}

function importImage(src, out) {
  // Shrink to MAX_LONG_SIDE if larger; never upscale a small image.
  const dims = run('sips', ['-g', 'pixelWidth', '-g', 'pixelHeight', src]).stdout || '';
  const w = Number(/pixelWidth:\s*(\d+)/.exec(dims)?.[1] || 0);
  const h = Number(/pixelHeight:\s*(\d+)/.exec(dims)?.[1] || 0);
  const resize = Math.max(w, h) > MAX_LONG_SIDE ? ['-Z', String(MAX_LONG_SIDE)] : [];
  const res = run('sips', [...resize, '-s', 'format', 'jpeg', '-s', 'formatOptions', '85', src, '--out', out]);
  if (res.status !== 0) throw new Error(`sips failed for ${src}: ${res.stderr}`);
}

// ---------------------------------------------------------------- main
if (!fs.existsSync(SRC_ROOT)) {
  console.error(`Source folder not found: ${SRC_ROOT} (set ACTING_SRC to override)`);
  process.exit(1);
}

const rows = [];
for (const section of wanted) {
  const srcDir = path.join(SRC_ROOT, section);
  const outDir = path.join(OUT_ROOT, section);
  if (!fs.existsSync(srcDir)) { console.warn(`! no source folder for section "${section}" (${srcDir})`); continue; }
  fs.mkdirSync(outDir, { recursive: true });

  const files = fs.readdirSync(srcDir)
    .filter((f) => !f.startsWith('.') && (VIDEO_EXT.has(path.extname(f).toLowerCase()) || IMAGE_EXT.has(path.extname(f).toLowerCase())))
    .sort(naturalCompare);

  console.log(`\n[${section}] ${files.length} source file(s)`);
  const expected = new Set();

  for (const f of files) {
    const src = path.join(srcDir, f);
    const ext = path.extname(f).toLowerCase();
    const name = sanitize(path.basename(f, ext));
    const t0 = Date.now();

    if (VIDEO_EXT.has(ext)) {
      const out = path.join(outDir, `${name}.mp4`);
      const poster = path.join(outDir, `${name}.poster.jpg`);
      expected.add(path.basename(out)); expected.add(path.basename(poster));
      if (!force && isNewer(out, src) && fs.existsSync(poster)) { console.log(`  = ${f} (up to date)`); continue; }
      const p = probe(src);
      console.log(`  > ${f}  ${p.width}x${p.height} ${p.duration.toFixed(1)}s ${p.codec}${isHdr(p) ? ' HDR' : ''}`);
      const how = encodeVideo(src, out, p);
      makePoster(out, poster, p.duration);
      const q = probe(out);
      rows.push({ section, file: `${name}.mp4`, size: `${q.width}x${q.height}`, sec: q.duration.toFixed(1), mb: (q.bytes / 1e6).toFixed(1), via: how, took: `${((Date.now() - t0) / 1000).toFixed(0)}s` });
    } else {
      const out = path.join(outDir, `${name}.jpg`);
      expected.add(path.basename(out));
      if (!force && isNewer(out, src)) { console.log(`  = ${f} (up to date)`); continue; }
      console.log(`  > ${f} (image)`);
      importImage(src, out);
      const q = probe(out);
      rows.push({ section, file: `${name}.jpg`, size: `${q.width}x${q.height}`, sec: '-', mb: (fs.statSync(out).size / 1e6).toFixed(2), via: 'sips', took: `${((Date.now() - t0) / 1000).toFixed(0)}s` });
    }
  }

  // Orphans: outputs whose source no longer exists.
  for (const f of fs.readdirSync(outDir)) {
    if (f.startsWith('.') || expected.has(f)) continue;
    if (prune) { fs.rmSync(path.join(outDir, f)); console.log(`  - pruned ${f}`); }
    else console.warn(`  ? orphan ${section}/${f} (source gone; run with --prune to delete)`);
  }
}

// ---------------------------------------------------------------- manifest
const clips = {};
if (fs.existsSync(OUT_ROOT)) {
  for (const section of fs.readdirSync(OUT_ROOT).sort(naturalCompare)) {
    const dir = path.join(OUT_ROOT, section);
    if (!fs.statSync(dir).isDirectory()) continue;
    for (const f of fs.readdirSync(dir).sort(naturalCompare)) {
      const ext = path.extname(f).toLowerCase();
      if (f.startsWith('.') || f.endsWith('.poster.jpg')) continue;
      const name = path.basename(f, ext);
      const full = path.join(dir, f);
      const key = `${section}/${name}`;
      if (ext === '.mp4') {
        const p = probe(full);
        const poster = `${name}.poster.jpg`;
        clips[key] = {
          section, type: 'video',
          src: `/media/${section}/${f}`,
          poster: fs.existsSync(path.join(dir, poster)) ? `/media/${section}/${poster}` : undefined,
          width: p.width, height: p.height,
          duration: Math.round(p.duration * 100) / 100,
          bytes: fs.statSync(full).size,
        };
      } else if (IMAGE_EXT.has(ext)) {
        const p = probe(full);
        clips[key] = { section, type: 'image', src: `/media/${section}/${f}`, width: p.width, height: p.height, bytes: fs.statSync(full).size };
      }
    }
  }
}
fs.mkdirSync(path.dirname(MANIFEST), { recursive: true });
fs.writeFileSync(MANIFEST, JSON.stringify({ generatedAt: new Date().toISOString(), clips }, null, 2) + '\n');

if (rows.length) { console.log('\nEncoded:'); console.table(rows); }
console.log(`\nManifest: ${path.relative(ROOT, MANIFEST)} (${Object.keys(clips).length} items)`);
