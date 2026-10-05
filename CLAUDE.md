Astro static site: acting portfolio for Lilly Rosenthal (lillyrosenthal.com), modeled on ../judyrosenthal.com.

- Homepage and section pages (/snoopy, /annabeth, /gomez, /speeches) are a full-bleed video/image slideshow (src/components/Slideshow.astro).
- Slide lists are explicit, one file per page: src/data/homeSlides.ts, snoopySlides.ts, annabethSlides.ts, gomezSlides.ts, speechesSlides.ts (order + per-slide options); src/data/sections.ts maps slugs to them. Site-wide defaults (fit rules, timings, colors, mediaBase): src/data/siteConfig.ts. Menu: src/data/menu.ts.
- Media is NOT committed. `npm run import-media` (scripts/import-media.mjs) transcodes ~/Dropbox/lilly_college/acting/<section>/ (snoopy, annabeth, gomez, speeches, stills) into public/media (git-ignored) and regenerates src/data/media.generated.json (committed). Re-run it after adding clips, then list the new key in the page's slide file.
- Media sizing uses a focal-point fit (fit/scale/centerX/centerY/alignX/alignY) computed in JS; see README "Fit rules".
- Plain `astro build`; no server code, no auth, no dev-only routes.
- Production media lives in a Cloudflare R2 bucket: `npm run upload-media` (scripts/upload-media.mjs) syncs public/media there using credentials in the git-ignored `.env` (template: .env.example). `PUBLIC_MEDIA_BASE` in `.env` sets the media origin at build time; blank = local files.
- Dev-only media admin at /__media/ (scripts/dev-media-admin.mjs, a Vite `apply: 'serve'` plugin registered in astro.config.mjs): browse/upload/delete bucket objects and add clips to the manifest. Not in the build.
