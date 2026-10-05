// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import devMediaAdmin from './scripts/dev-media-admin.mjs';

// Pure static build. Production media is served from Cloudflare R2
// (scripts/upload-media.mjs, PUBLIC_MEDIA_BASE in .env); public/media is the
// local working copy. The media admin at /__media/ is a dev-server-only Vite
// plugin and is never part of the build.
export default defineConfig({
  integrations: [mdx()],
  output: 'static',
  vite: { plugins: [devMediaAdmin()] },
});
