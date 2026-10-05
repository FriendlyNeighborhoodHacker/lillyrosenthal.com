# lillyrosenthal.com

Acting portfolio for Lilly Rosenthal. An [Astro](https://astro.build) static site
modeled on judyrosenthal.com, with a full-bleed **video** slideshow on the homepage
and on each section page (Snoopy, Annabeth, Gomez, Speeches), plus a Bio page.

## Run it

```sh
npm install
npm run import-media   # transcode the clips from Dropbox into public/media (see below)
npm run dev            # http://localhost:4321
npm run build          # static site in dist/
```

## Deploying

The site is static. Production is a DreamHost VPS that serves
`/home/lillydebate/lillyrosenthal.org`; a GitHub webhook makes it rebuild on
every push. All video comes from the Cloudflare bucket, so the server needs no
media files and no R2 credentials, only `PUBLIC_MEDIA_BASE`.

### One-time server setup

```sh
# as the site user, on the VPS (Node >= 22.12 must be on the PATH)
git clone <repo> /home/lillydebate/lillyrosenthal.com     # the checkout lives OUTSIDE the web root
cd /home/lillydebate/lillyrosenthal.com
cp .env.example .env            # set PUBLIC_MEDIA_BASE=https://lillyrosenthalmedia.com
bash scripts/deploy.sh          # first build + publish into /home/lillydebate/lillyrosenthal.org
cp public/config.local.php.example /home/lillydebate/lillyrosenthal.org/config.local.php
# edit that config.local.php: set webhook_secret (any long random string)
```

Then in GitHub → repo → Settings → Webhooks → Add webhook:
Payload URL `https://lillyrosenthal.org/gitwebhook.php`, content type
`application/json`, Secret = the same `webhook_secret`, event "Just the push
event". Every push now runs `scripts/deploy.sh` on the server: `git reset
--hard origin/main`, `npm ci`, `npm run build`, then rsync `dist/` into the web
root (keeping `config.local.php`). The log is
`/home/lillydebate/lillyrosenthal.org.deploy.log`; GitHub's "Recent
Deliveries" tab shows the script's output.

If the repo, web root or branch differ, set `REPO`, `WEBROOT` or `BRANCH` at the
top of `scripts/deploy.sh` (or in the environment).

### Building by hand

```sh
npm ci
npm run build          # → dist/ (dist/media is dropped when PUBLIC_MEDIA_BASE is set)
rsync -av --delete --exclude config.local.php dist/ user@host:/home/lillydebate/lillyrosenthal.org/
```

The build refuses to run when `PUBLIC_MEDIA_BASE` is blank and there is no
local `public/media`, since no clip could load. The media admin, the dev badge
and the clip clock never appear in the build.

## Media

Source clips live in `~/Dropbox/lilly_college/acting/<section>/` (override with
`ACTING_SRC=/path`): `snoopy`, `annabeth`, `gomez`, `speeches`, plus `stills` for
photos used on the homepage. They are **not** committed. `npm run import-media`:

- transcodes every `.mov/.mp4/.m4v` to H.264/AAC MP4 (long side ≤ 1920, faststart),
  tone-mapping iPhone HDR (HLG / Dolby Vision) clips to SDR;
- writes a poster frame (`<name>.poster.jpg`) for each video;
- converts images (`.jpg/.jpeg/.png`) to JPEG, shrinking anything larger than 1920px (never upscaling);
- rebuilds `src/data/media.generated.json` (committed) with dimensions and durations.

It is incremental: re-run it after adding files and only new/changed clips are
encoded. After importing, add the new clip's key to the right slide file (see
Configuration); the build warns about imported clips no page lists. Options: `-- snoopy speeches` (only those sections),
`-- --force` (re-encode all), `-- --prune` (delete outputs whose source is gone).

Output names are the source names with spaces/parentheses replaced by `_`
(`01_IMG_1894 (1).mov` → `snoopy/01_IMG_1894_1`). That key is what the config
files reference.

### Media admin (dev only)

With `npm run dev` running, open **http://localhost:4321/__media/** (there is
also a small "media admin" badge bottom-left on every page in dev). It is a
plain-JS page served by a Vite dev-server plugin
(`scripts/dev-media-admin.mjs`) and is never part of the build. It lets you:

- browse the bucket by folder with previews (proxied through the dev server,
  so they work before the bucket is public), sizes and dates;
- create a folder, upload one or more files into a folder (with progress),
  delete an object, copy or open its public URL;
- **Add to manifest**: for an uploaded `.mp4` or image inside a section
  folder, probe it with ffprobe and add it to `src/data/media.generated.json`
  so the slide files can reference it (upload `name.poster.jpg` alongside an
  mp4 and it is picked up as the poster).

Uploads are stored as-is: upload web-ready H.264/AAC `.mp4` files. The
Dropbox → `import-media` → `upload-media` path remains the way to transcode
iPhone `.mov` footage.

### Hosting the media on Cloudflare R2

The videos are served from a Cloudflare R2 bucket in production; `public/media`
is only the local working copy.

1. `cp .env.example .env` and fill in the R2 account id, API token keys and
   bucket name (the example file walks through where to find each one).
2. `npm run upload-media` syncs `public/media/**` to the bucket under the same
   paths (`media/snoopy/01_IMG_1894_1.mp4`). Re-run after `import-media`; only
   new or changed files are transferred. `-- --dry-run` previews, `-- --prune`
   deletes remote files that are gone locally, `-- --check` HEADs every public URL.
3. Make the bucket public (custom domain such as `media.lillyrosenthal.com`,
   or the r2.dev subdomain for testing) and set `PUBLIC_MEDIA_BASE` in `.env`
   to that origin. The build then writes every media URL against it; leave it
   blank to serve the local files (handy for offline work).

## Configuration

| File | What it controls |
| --- | --- |
| `src/data/siteConfig.ts` | Breakpoints, stage height, image duration, default fit rules per viewport × orientation, default colors, counter, localStorage keys. `mediaBase` is read from `PUBLIC_MEDIA_BASE` in `.env`. |
| `src/data/homeSlides.ts` | Which clips are on the homepage, in order, with title + link + any options. |
| `src/data/snoopySlides.ts`, `annabethSlides.ts`, `gomezSlides.ts`, `speechesSlides.ts` | Each section page's clips, in order, with per-slide options (title, colors, fit rules). The option list is documented at the top of each file. |
| `src/data/sections.ts` | Maps section slugs to those slide files. |
| `src/data/menu.ts` | Header menu. |
| `src/pages/bio.mdx` | Bio text and headshot. |

### Fit rules

Each slide resolves a `wide` (≥ 1000px) and a `narrow` rule:

- `fit`: `cover` (fill + crop), `contain` (whole frame, bars), `height` (fit height; crop/pillarbox width), `width` (fit width; crop/letterbox height).
- `scale`: zoom after fitting (`1.2` = 20% closer).
- `centerX`, `centerY` (0–100): the point of the media kept at the center of the stage when it overflows. Clamped so no gap shows. `centerY: 0` keeps the top visible.
- `alignX`, `alignY`: where the media sits when it is smaller than the stage (where the bars go).

In `npm run dev`, **shift+click** anywhere on the slideshow logs and copies the
`centerX`/`centerY` of that spot for the current clip and viewport, ready to
paste into that slide's `wide` or `narrow` rule.

### Per-slide clip trimming and transitions

- `start` / `end` (seconds, videos only): play from `start`; the clip is fully faded out by `end` (or by the end of the file when `end` is omitted), because the transition starts early by its fade-out length. So with a 1.5 s crossfade and no `end`, the next clip starts 1.5 s before this one's file ends and is at full strength when it does. The homepage and a section page can use different cuts of the same clip because each lists its own options.
- `transition`: what happens when *leaving* that slide: `{ type: 'crossfade' | 'fade' | 'none', duration }`. `crossfade` fades the next clip in on top of the old one while the old one keeps playing, and blends the sound down/up over the same time. `fade` goes out to `transition.color` (siteConfig), then fades the next slide in. The site-wide default is `siteConfig.transition`.
- **Clip clock**: in `npm run dev` a small `13.4 / 34.4` readout sits next to the player controls showing the video's own file time, so you can read off `start` / `end` values while watching. Control it with `showClock` in siteConfig (`'dev'`, `'always'`, `'never'`).

### Player

- Videos autoplay muted and advance when they end; images stay `imageDuration` seconds (per-slide `duration`). Holding a finger on an image pauses the countdown.
- Bottom-right buttons: sound on/off (remembered in `localStorage`) and pause/play (videos only). Browsers often refuse to autoplay with sound on a fresh load (Safari and mobile always, Chrome until it trusts the site); when that happens and sound was left on, the icon shows on with a "tap for sound" hint, and the first tap, click or key anywhere turns the audio on. Keyboard: ← → navigate, space pauses, `m` toggles sound.
- The player remembers which clips were watched (localStorage, a clip counts after `seenAfterSeconds`). Section pages open on their first clip not seen in the last `seenWindowMinutes` (both in siteConfig), so after watching the homepage you do not see the same clip again right away. The homepage always starts at its first slide.
- Clicking or tapping a slide pauses or plays the video. A slide's `link` makes its title box a link (the homepage titles link to their section pages).
