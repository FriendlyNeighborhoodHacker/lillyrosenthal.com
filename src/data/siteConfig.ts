/**
 * Site-wide settings. Everything the slideshow needs to size and time media
 * lives here; per-clip overrides go in `sections.ts` (clipOverrides) and the
 * homepage list in `homeSlides.ts`.
 */
import type { Fit, FitRule, Transition } from './slides';

export const siteConfig = {
  siteName: 'Lilly Rosenthal',

  /**
   * Prefix for every media URL. Comes from PUBLIC_MEDIA_BASE in `.env`
   * (see .env.example): blank = same origin (the files in public/media);
   * 'https://media.lillyrosenthal.com' = the Cloudflare R2 bucket after
   * `npm run upload-media`. Paths are identical in both places.
   */
  mediaBase: (import.meta.env.PUBLIC_MEDIA_BASE || '').replace(/\/+$/, ''),

  /** Viewports at least this wide (px) use the `wide` rules; narrower use `narrow`. */
  breakpoint: 1000,

  /** At or below this width the title becomes a full-width bar at the bottom (as on judyrosenthal.com). */
  mobileBarBreakpoint: 800,

  /** Height of the slideshow stage per viewport class. Any CSS length. */
  stage: {
    wide: { height: '100vh' },
    narrow: { height: '100svh' },
  },

  /** Seconds an IMAGE slide stays before advancing (videos advance when they end, or at their `end` second). */
  imageDuration: 6,

  /**
   * Default transition between slides. Per-slide `transition` overrides it for
   * the slide being LEFT.
   *   type: 'crossfade'  the next clip fades in on top of the old one while the old
   *                      one keeps playing; sound blends down/up over the same time
   *         'fade'       fade out to `color` (old keeps playing while it fades), then fade the next one in
   *         'none'       hard cut
   *   duration: total seconds. color: what shows mid-'fade'.
   */
  transition: { type: 'crossfade', duration: 0.8, color: '#000' } satisfies Transition,

  /**
   * Default fit rules by viewport class × media orientation.
   *
   *   fit: 'cover'   fill the stage, crop whatever overflows
   *        'contain' show the whole frame, bars on two sides (sideColor)
   *        'height'  fit the stage height; crop or pillarbox the width  (judyrosenthal.com desktop "cover")
   *        'width'   fit the stage width; crop or letterbox the height
   *   scale: zoom after fitting (1 = none, 1.2 = 20% closer)
   *   centerX / centerY: 0–100, the point of the MEDIA that should sit at the
   *        center of the stage when the media overflows on that axis. It is
   *        clamped so an edge never shows a gap. 50/50 = centered,
   *        centerY: 0 = keep the top of the frame visible (Judy's "center top").
   *   alignX / alignY: where the media sits when it is SMALLER than the stage
   *        on that axis (i.e. where the bars go). Default center.
   *
   * Tip: in `npm run dev`, shift+click on the slideshow logs the centerX/centerY
   * of the clicked point (and copies it) so you can paste it into clipOverrides.
   */
  display: {
    wide: {
      landscape: { fit: 'height', centerX: 50, centerY: 50 },
      portrait: { fit: 'contain', centerX: 50, centerY: 50 },
    },
    narrow: {
      landscape: { fit: 'contain', centerX: 50, centerY: 50 },
      portrait: { fit: 'cover', centerX: 50, centerY: 0 },
    },
  } satisfies Record<'wide' | 'narrow', Record<'landscape' | 'portrait', FitRule & { fit: Fit }>>,

  /** Default color behind letterboxed / pillarboxed media (per-slide: sideColor). */
  backgroundColor: '#000',

  /** Default boxed title colors (per-slide: titleBackground / titleColor). */
  title: { background: 'white', color: '#222' },

  /** Default header text color over the slideshow (per-slide: menuColor). */
  menuColor: 'white' as 'white' | 'black',

  /** Glow behind header text and non-boxed titles (per-slide: shadowColor). */
  shadowColor: 'rgba(0, 0, 0, 0.75)',

  /** Append " · 2 / 6" to the title on section pages. */
  showCounter: true,

  /**
   * Clip clock next to the player controls: "13.4 / 34.4" = the video's own
   * file time, so you can read off `start` / `end` values for the slide files.
   * 'dev' = only in `npm run dev`, 'always', or 'never'.
   */
  showClock: 'dev' as 'dev' | 'always' | 'never',

  /** localStorage key for the persisted sound on/off choice. */
  soundStorageKey: 'lr-sound',

  /**
   * "Seen" memory. A clip counts as seen once it has played `seenAfterSeconds`.
   * Section pages open on their first clip NOT seen in the last
   * `seenWindowMinutes` (the homepage always starts at its first slide).
   */
  seenStorageKey: 'lr-seen',
  seenAfterSeconds: 3,
  seenWindowMinutes: 10,
};
