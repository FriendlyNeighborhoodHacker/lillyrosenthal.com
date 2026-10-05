/**
 * Dev-only media admin for the Cloudflare R2 bucket.
 *
 * A Vite dev-server plugin (never part of `astro build`) that serves
 *   http://localhost:4321/__media/
 * a plain-JS page to browse the bucket, create folders, upload files, delete
 * objects, copy public URLs and add an uploaded clip to media.generated.json.
 *
 * Credentials come from .env (same keys as scripts/upload-media.mjs).
 * Previews are proxied through this server, so they work before the bucket
 * is public.
 */
import { S3Client, ListObjectsV2Command, PutObjectCommand, DeleteObjectCommand, GetObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MANIFEST = path.join(ROOT, 'src', 'data', 'media.generated.json');
const PREFIX = 'media/';
const TYPES = { '.mp4': 'video/mp4', '.mov': 'video/quicktime', '.m4v': 'video/x-m4v', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' };

function readEnv() {
  const out = {};
  const file = path.join(ROOT, '.env');
  if (fs.existsSync(file)) {
    for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
      const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/.exec(line);
      if (m && !line.trim().startsWith('#')) out[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  }
  return { ...out, ...Object.fromEntries(Object.entries(process.env).filter(([k]) => k.startsWith('R2_') || k === 'PUBLIC_MEDIA_BASE')) };
}

export default function devMediaAdmin() {
  return {
    name: 'dev-media-admin',
    apply: 'serve',
    configureServer(server) {
      let client = null;
      let cfg = null;
      const getClient = () => {
        cfg = readEnv();
        const missing = ['R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_BUCKET'].filter((k) => !cfg[k]);
        if (missing.length) throw new Error(`Missing ${missing.join(', ')} in .env (see .env.example)`);
        client ??= new S3Client({
          region: 'auto',
          endpoint: `https://${cfg.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
          credentials: { accessKeyId: cfg.R2_ACCESS_KEY_ID, secretAccessKey: cfg.R2_SECRET_ACCESS_KEY },
        });
        return client;
      };
      const bucket = () => cfg.R2_BUCKET;
      const publicBase = () => (cfg.PUBLIC_MEDIA_BASE || '').replace(/\/+$/, '');

      const json = (res, status, body) => { res.statusCode = status; res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(body)); };
      const safeKey = (k) => typeof k === 'string' && k.startsWith(PREFIX) && !k.includes('..') && !k.includes('//') && k.length < 512;
      const readBody = (req) => new Promise((resolve, reject) => { let d = ''; req.on('data', (c) => { d += c; }); req.on('end', () => resolve(d)); req.on('error', reject); });

      async function listAll() {
        const s3 = getClient();
        const objects = [];
        let token;
        do {
          const r = await s3.send(new ListObjectsV2Command({ Bucket: bucket(), Prefix: PREFIX, ContinuationToken: token }));
          for (const o of r.Contents || []) objects.push({ key: o.Key, size: o.Size, modified: o.LastModified });
          token = r.IsTruncated ? r.NextContinuationToken : undefined;
        } while (token);
        return objects;
      }

      function readManifest() {
        try { return JSON.parse(fs.readFileSync(MANIFEST, 'utf8')); } catch { return { generatedAt: null, clips: {} }; }
      }

      server.middlewares.use(async (req, res, next) => {
        const url = new URL(req.url, 'http://localhost');
        if (!url.pathname.startsWith('/__media')) return next();
        try {
          if (url.pathname === '/__media' || url.pathname === '/__media/') {
            res.setHeader('Content-Type', 'text/html; charset=utf-8');
            return res.end(PAGE);
          }

          if (url.pathname === '/__media/api/state' && req.method === 'GET') {
            const objects = await listAll();
            const manifest = readManifest();
            return json(res, 200, { bucket: bucket(), publicBase: publicBase(), prefix: PREFIX, objects, manifestKeys: Object.keys(manifest.clips || {}) });
          }

          if (url.pathname === '/__media/api/folder' && req.method === 'POST') {
            const { folder } = JSON.parse(await readBody(req) || '{}');
            if (!/^[a-z0-9][a-z0-9_-]{0,40}$/i.test(folder || '')) return json(res, 400, { error: 'Folder name: letters, numbers, - and _ only' });
            await getClient().send(new PutObjectCommand({ Bucket: bucket(), Key: `${PREFIX}${folder}/.folder`, Body: '', ContentLength: 0 }));
            return json(res, 200, { ok: true });
          }

          if (url.pathname === '/__media/api/object') {
            const key = url.searchParams.get('key') || '';
            if (!safeKey(key)) return json(res, 400, { error: 'bad key' });
            const s3 = getClient();

            if (req.method === 'PUT') {
              const size = Number(req.headers['content-length'] || 0);
              if (!size) return json(res, 411, { error: 'Content-Length required' });
              await s3.send(new PutObjectCommand({
                Bucket: bucket(), Key: key, Body: req, ContentLength: size,
                ContentType: TYPES[path.extname(key).toLowerCase()] || req.headers['content-type'] || 'application/octet-stream',
                CacheControl: 'public, max-age=604800',
              }));
              return json(res, 200, { ok: true, key, size });
            }

            if (req.method === 'DELETE') {
              await s3.send(new DeleteObjectCommand({ Bucket: bucket(), Key: key }));
              return json(res, 200, { ok: true });
            }

            if (req.method === 'GET' || req.method === 'HEAD') {
              // Proxy (with Range) so previews work even before the bucket is public.
              const range = req.headers.range;
              const r = await s3.send(new GetObjectCommand({ Bucket: bucket(), Key: key, Range: range }));
              res.statusCode = range ? 206 : 200;
              if (r.ContentType) res.setHeader('Content-Type', r.ContentType);
              if (r.ContentLength != null) res.setHeader('Content-Length', String(r.ContentLength));
              if (r.ContentRange) res.setHeader('Content-Range', r.ContentRange);
              res.setHeader('Accept-Ranges', 'bytes');
              res.setHeader('Cache-Control', 'no-store');
              if (req.method === 'HEAD') return res.end();
              r.Body.on('error', () => res.destroy());
              return r.Body.pipe(res);
            }
          }

          if (url.pathname === '/__media/api/manifest-add' && req.method === 'POST') {
            const { key } = JSON.parse(await readBody(req) || '{}');
            if (!safeKey(key)) return json(res, 400, { error: 'bad key' });
            const ext = path.extname(key).toLowerCase();
            const isVideo = ext === '.mp4';
            const isImage = ['.jpg', '.jpeg', '.png', '.webp'].includes(ext);
            if (!isVideo && !isImage) return json(res, 400, { error: 'Only .mp4 and images can be added' });
            const rel = key.slice(PREFIX.length);                       // section/name.ext
            const [section, ...rest] = rel.split('/');
            if (!section || rest.length !== 1) return json(res, 400, { error: 'Object must be directly inside a section folder' });
            const name = rest[0].slice(0, -ext.length);
            const port = server.config.server.port || 4321;
            const local = `http://127.0.0.1:${port}/__media/api/object?key=${encodeURIComponent(key)}`;
            const probe = spawnSync('ffprobe', ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', local], { encoding: 'utf8', maxBuffer: 16e6 });
            if (probe.status !== 0) return json(res, 500, { error: `ffprobe failed: ${probe.stderr.trim().split('\n').pop()}` });
            const info = JSON.parse(probe.stdout);
            const v = (info.streams || []).find((s) => s.codec_type === 'video') || {};
            const head = await getClient().send(new HeadObjectCommand({ Bucket: bucket(), Key: key }));
            const posterKey = `${PREFIX}${section}/${name}.poster.jpg`;
            let hasPoster = false;
            try { await getClient().send(new HeadObjectCommand({ Bucket: bucket(), Key: posterKey })); hasPoster = true; } catch { /* none */ }
            const manifest = readManifest();
            const entry = isVideo
              ? { section, type: 'video', src: `/${key}`, poster: hasPoster ? `/${posterKey}` : undefined, width: v.width, height: v.height, duration: Math.round(Number(info.format?.duration || 0) * 100) / 100, bytes: head.ContentLength }
              : { section, type: 'image', src: `/${key}`, width: v.width, height: v.height, bytes: head.ContentLength };
            manifest.clips[`${section}/${name}`] = entry;
            manifest.generatedAt = new Date().toISOString();
            fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2) + '\n');
            return json(res, 200, { ok: true, key: `${section}/${name}`, entry });
          }

          json(res, 404, { error: 'not found' });
        } catch (e) {
          json(res, 500, { error: e?.message || String(e) });
        }
      });
    },
  };
}

const PAGE = /* html */ `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Media admin (dev)</title>
<style>
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body { margin: 0; font: 14px/1.45 -apple-system, 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #222; background: #f6f6f6; }
  header { background: #111; color: #fff; padding: 14px 24px; display: flex; gap: 18px; align-items: baseline; flex-wrap: wrap; }
  header h1 { margin: 0; font-size: 15px; letter-spacing: .14em; text-transform: uppercase; font-weight: 500; }
  header .meta { opacity: .75; font-size: 12px; }
  header code { color: #ffd479; }
  main { max-width: 1400px; margin: 0 auto; padding: 20px 24px 60px; }
  .bar { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; background: #fff; border: 1px solid #e3e3e3; border-radius: 8px; padding: 12px 14px; margin-bottom: 18px; }
  .bar label { font-size: 12px; color: #666; }
  input, select, button { font: inherit; }
  input[type=text], select { padding: 6px 8px; border: 1px solid #ccc; border-radius: 6px; }
  button { padding: 6px 12px; border: 1px solid #bbb; border-radius: 6px; background: #fff; cursor: pointer; }
  button:hover { background: #f0f0f0; }
  button.primary { background: #111; color: #fff; border-color: #111; }
  button.danger { color: #b00020; border-color: #e5a5ad; }
  button:disabled { opacity: .5; cursor: default; }
  .sep { width: 1px; height: 24px; background: #e3e3e3; margin: 0 4px; }
  h2 { font-size: 13px; letter-spacing: .12em; text-transform: uppercase; color: #555; margin: 26px 0 10px; display: flex; gap: 10px; align-items: baseline; }
  h2 small { font-weight: normal; letter-spacing: 0; text-transform: none; color: #999; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(230px, 1fr)); gap: 12px; }
  .card { background: #fff; border: 1px solid #e3e3e3; border-radius: 8px; overflow: hidden; display: flex; flex-direction: column; }
  .thumb { background: #000; aspect-ratio: 16/10; display: flex; align-items: center; justify-content: center; position: relative; }
  .thumb img, .thumb video { max-width: 100%; max-height: 100%; width: 100%; height: 100%; object-fit: contain; display: block; }
  .thumb .badge { position: absolute; left: 6px; top: 6px; background: rgba(0,0,0,.6); color: #fff; font-size: 10px; padding: 2px 6px; border-radius: 4px; letter-spacing: .08em; text-transform: uppercase; }
  .thumb .dur { position: absolute; right: 6px; bottom: 6px; background: rgba(0,0,0,.6); color: #fff; font-size: 11px; padding: 2px 6px; border-radius: 4px; font-variant-numeric: tabular-nums; }
  .body { padding: 8px 10px 10px; display: flex; flex-direction: column; gap: 6px; }
  .name { font-weight: 600; word-break: break-all; font-size: 13px; }
  .small { color: #777; font-size: 11px; }
  .row { display: flex; gap: 6px; flex-wrap: wrap; }
  .row button { padding: 3px 8px; font-size: 12px; }
  .tag { font-size: 10px; padding: 1px 6px; border-radius: 4px; background: #e8f4ea; color: #1e6b32; }
  .tag.no { background: #fdeeee; color: #9a1b1b; }
  #log { position: fixed; right: 16px; bottom: 16px; max-width: 420px; display: flex; flex-direction: column; gap: 6px; }
  #log div { background: #111; color: #fff; padding: 8px 12px; border-radius: 6px; font-size: 12px; box-shadow: 0 4px 14px rgba(0,0,0,.25); }
  #log div.err { background: #b00020; }
  progress { width: 160px; }
  .empty { color: #888; padding: 30px; text-align: center; background: #fff; border: 1px dashed #ccc; border-radius: 8px; }
</style></head>
<body>
<header>
  <h1>Media admin</h1>
  <span class="meta">bucket <code id="bucket">…</code></span>
  <span class="meta" id="pub"></span>
  <span class="meta" id="totals"></span>
  <span class="meta" style="margin-left:auto">dev only · <a href="/" style="color:#9cf">back to site</a></span>
</header>
<main>
  <div class="bar">
    <label>Folder</label>
    <select id="folder"></select>
    <input type="text" id="newFolder" placeholder="new folder name" size="16">
    <button id="mkFolder">Create folder</button>
    <span class="sep"></span>
    <input type="file" id="files" multiple>
    <button class="primary" id="upload">Upload to folder</button>
    <progress id="prog" value="0" max="100" hidden></progress>
    <span class="small" id="progText"></span>
    <span class="sep"></span>
    <button id="refresh">Refresh</button>
  </div>
  <p class="small">Files are stored as-is (no transcoding). For the site, upload web-ready <b>.mp4</b> (H.264/AAC) plus an optional <b>name.poster.jpg</b>, then press <b>Add to manifest</b> so the clip gets a key you can use in the slide files. Clips imported with <code>npm run import-media</code> are already in the manifest.</p>
  <div id="content"><div class="empty">Loading…</div></div>
</main>
<div id="log"></div>
<script>
(() => {
  const $ = (s) => document.querySelector(s);
  let state = null;
  const fmt = (b) => b >= 1e6 ? (b / 1e6).toFixed(1) + ' MB' : b >= 1e3 ? (b / 1e3).toFixed(0) + ' KB' : b + ' B';
  const log = (msg, err) => { const d = document.createElement('div'); d.textContent = msg; if (err) d.className = 'err'; $('#log').appendChild(d); setTimeout(() => d.remove(), err ? 9000 : 4000); };
  const api = async (url, opts) => { const r = await fetch(url, opts); const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || r.statusText); return j; };
  const proxyUrl = (key) => '/__media/api/object?key=' + encodeURIComponent(key);
  const publicUrl = (key) => state.publicBase ? state.publicBase + '/' + key : '';

  async function load() {
    $('#content').innerHTML = '<div class="empty">Loading…</div>';
    try { state = await api('/__media/api/state'); } catch (e) { $('#content').innerHTML = '<div class="empty">' + e.message + '</div>'; return; }
    render();
  }

  function render() {
    $('#bucket').textContent = state.bucket;
    $('#pub').innerHTML = state.publicBase ? 'public at <code>' + state.publicBase + '</code>' : '<span style="color:#ffb3b3">not public yet — set PUBLIC_MEDIA_BASE in .env; previews below are proxied</span>';
    const files = state.objects.filter((o) => !o.key.endsWith('/.folder'));
    $('#totals').textContent = files.length + ' files · ' + fmt(files.reduce((a, o) => a + o.size, 0));

    const folders = new Map();
    for (const o of state.objects) {
      const rel = o.key.slice(state.prefix.length);
      const folder = rel.includes('/') ? rel.slice(0, rel.indexOf('/')) : '(root)';
      if (!folders.has(folder)) folders.set(folder, []);
      if (!o.key.endsWith('/.folder')) folders.get(folder).push(o);
    }
    const sel = $('#folder'); const prev = sel.value;
    sel.innerHTML = [...folders.keys()].filter((f) => f !== '(root)').sort().map((f) => '<option>' + f + '</option>').join('');
    if ([...sel.options].some((o) => o.value === prev)) sel.value = prev;

    const posters = new Set(files.filter((o) => o.key.endsWith('.poster.jpg')).map((o) => o.key));
    const manifest = new Set(state.manifestKeys);
    const html = [];
    for (const [folder, items] of [...folders.entries()].sort()) {
      html.push('<h2>' + folder + ' <small>' + items.length + ' file' + (items.length === 1 ? '' : 's') + ' · ' + fmt(items.reduce((a, o) => a + o.size, 0)) + '</small></h2>');
      if (!items.length) { html.push('<div class="empty">Empty folder</div>'); continue; }
      html.push('<div class="grid">');
      for (const o of items.sort((a, b) => a.key.localeCompare(b.key, undefined, { numeric: true }))) {
        const rel = o.key.slice(state.prefix.length);
        const name = rel.slice(rel.lastIndexOf('/') + 1);
        const ext = name.slice(name.lastIndexOf('.')).toLowerCase();
        const isVideo = ['.mp4', '.mov', '.m4v'].includes(ext);
        const isImage = ['.jpg', '.jpeg', '.png', '.webp'].includes(ext);
        const isPoster = name.endsWith('.poster.jpg');
        const base = isVideo ? o.key.slice(0, -ext.length) : null;
        const poster = base && posters.has(base + '.poster.jpg') ? base + '.poster.jpg' : null;
        const mKey = rel.slice(0, -ext.length);
        const inManifest = manifest.has(mKey);
        const canAdd = !isPoster && (ext === '.mp4' || isImage) && folder !== '(root)' && !rel.slice(folder.length + 1).includes('/');
        let thumb = '<span class="small" style="color:#999">' + ext + '</span>';
        if (isImage) thumb = '<img loading="lazy" src="' + proxyUrl(o.key) + '" alt="">';
        else if (isVideo) thumb = '<video preload="none" muted playsinline controls' + (poster ? ' poster="' + proxyUrl(poster) + '"' : ' preload="metadata"') + ' src="' + proxyUrl(o.key) + '"></video>';
        html.push('<div class="card" data-key="' + o.key + '">'
          + '<div class="thumb">' + thumb + (isPoster ? '<span class="badge">poster</span>' : '') + '</div>'
          + '<div class="body"><div class="name">' + name + '</div>'
          + '<div class="small">' + fmt(o.size) + ' · ' + new Date(o.modified).toLocaleString() + '</div>'
          + (canAdd ? '<div class="small">manifest key <code>' + mKey + '</code> ' + (inManifest ? '<span class="tag">in manifest</span>' : '<span class="tag no">not in manifest</span>') + '</div>' : '')
          + '<div class="row">'
          + (state.publicBase ? '<button data-act="copy">Copy URL</button><a href="' + publicUrl(o.key) + '" target="_blank" rel="noopener"><button>Open</button></a>' : '<a href="' + proxyUrl(o.key) + '" target="_blank" rel="noopener"><button>Open (proxy)</button></a>')
          + (canAdd && !inManifest ? '<button data-act="manifest">Add to manifest</button>' : '')
          + '<button class="danger" data-act="delete">Delete</button>'
          + '</div></div></div>');
      }
      html.push('</div>');
    }
    $('#content').innerHTML = html.join('') || '<div class="empty">Bucket is empty</div>';
  }

  $('#content').addEventListener('click', async (e) => {
    const btn = e.target.closest('button[data-act]'); if (!btn) return;
    const key = btn.closest('.card').dataset.key;
    try {
      if (btn.dataset.act === 'copy') { await navigator.clipboard.writeText(publicUrl(key)); log('Copied ' + publicUrl(key)); }
      if (btn.dataset.act === 'delete') { if (!confirm('Delete ' + key + ' from the bucket?\\nThis cannot be undone.')) return; await api('/__media/api/object?key=' + encodeURIComponent(key), { method: 'DELETE' }); log('Deleted ' + key); await load(); }
      if (btn.dataset.act === 'manifest') { btn.disabled = true; const r = await api('/__media/api/manifest-add', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key }) }); log('Added ' + r.key + ' to media.generated.json (' + r.entry.width + 'x' + r.entry.height + ')'); await load(); }
    } catch (err) { log(err.message, true); btn.disabled = false; }
  });

  $('#mkFolder').addEventListener('click', async () => {
    const folder = $('#newFolder').value.trim();
    try { await api('/__media/api/folder', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ folder }) }); log('Created folder ' + folder); $('#newFolder').value = ''; await load(); $('#folder').value = folder; }
    catch (err) { log(err.message, true); }
  });

  $('#upload').addEventListener('click', async () => {
    const folder = $('#folder').value; const files = [...$('#files').files];
    if (!folder) return log('Pick or create a folder first', true);
    if (!files.length) return log('Choose one or more files first', true);
    const prog = $('#prog'); prog.hidden = false; $('#upload').disabled = true;
    try {
      for (const [i, f] of files.entries()) {
        const dot = f.name.lastIndexOf('.');
        const stem = (dot > 0 ? f.name.slice(0, dot) : f.name).replace(/[^A-Za-z0-9._-]+/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
        const safe = stem + (dot > 0 ? f.name.slice(dot).toLowerCase() : '');
        const key = state.prefix + folder + '/' + safe;
        $('#progText').textContent = (i + 1) + '/' + files.length + ' ' + safe;
        await new Promise((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open('PUT', '/__media/api/object?key=' + encodeURIComponent(key));
          xhr.setRequestHeader('Content-Type', f.type || 'application/octet-stream');
          xhr.upload.onprogress = (ev) => { if (ev.lengthComputable) prog.value = (ev.loaded / ev.total) * 100; };
          xhr.onload = () => xhr.status < 300 ? resolve() : reject(new Error((JSON.parse(xhr.responseText || '{}').error) || xhr.statusText));
          xhr.onerror = () => reject(new Error('upload failed'));
          xhr.send(f);
        });
        log('Uploaded ' + key + ' (' + fmt(f.size) + ')');
      }
      $('#files').value = '';
      await load();
    } catch (err) { log(err.message, true); }
    finally { prog.hidden = true; prog.value = 0; $('#progText').textContent = ''; $('#upload').disabled = false; }
  });

  $('#refresh').addEventListener('click', load);
  load();
})();
</script>
</body></html>`;
