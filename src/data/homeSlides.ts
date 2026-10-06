import { buildSlide, type Slide } from './slides';

/**
 * Homepage slideshow, in order. Each entry is a manifest key plus options;
 * `link` makes the title box a link to that page. Add more lines to extend the homepage.
 *
 * All options (title, link, start/end seconds, transition, colors, wide/narrow
 * fit rules) are documented at the top of snoopySlides.ts. Example of a
 * shorter cut on the homepage than on the section page:
 *   buildSlide('snoopy/03a_IMG_1894', { title: 'Snoopy', link: '/snoopy/', start: 20, end: 40,
 *     transition: { type: 'fade', duration: 1 } }),
 */
/** Homepage transition: the next clip fades in over the old one (still playing) while the sound blends. */
const crossfade = { type: 'crossfade', duration: 1.5 } as const;

/**
 * Shared look for every homepage slide. These are the site defaults from
 * siteConfig written out so you can see them; change one here to change the
 * whole homepage, or add the same key after `...look` on a slide to change
 * just that slide.
 */
const look = {
  menuColor: 'white',                   // header text over the slide: 'white' | 'black'
  narrowTitleBackground: 'black',       // PHONE title bar color (the full-width bar at the bottom)
  narrowTitleColor: 'white',            // PHONE title bar text color
  sideColor: '#000',                    // color behind the media where it does not fill the stage
  shadowColor: 'rgba(0, 0, 0, 0.75)',   // glow behind header text / un-boxed titles
  transition: crossfade,                // what happens when leaving the slide
} as const;

/** Stills stay this many seconds (siteConfig.imageDuration is 6). */
const stillSeconds = 4;

export const homeSlides: Slide[] = [
  // ---- videos
  //buildSlide('gomez/01_IMG_1136', { title: 'Gomez', link: '/gomez/', start: 13 }),
  buildSlide('gomez/01_IMG_1136', {
    ...look, title: 'Addams Family / Gomez (2026)', link: '/gomez/', end: 20.5,

    // Landscape clip on a phone: zoom in instead of letterboxing. scale 1 = full
    // width with bars; ~1.8 = smaller bars, sides cropped; fit: 'cover' = fills the
    // screen. centerX/centerY = the point of the frame kept at screen center
    // (shift+click the video in dev, with the window < 1000px wide, to get them).
    narrow: { fit: 'contain', scale: 2.8, centerX: 50, centerY: 45 },
    // On phones, show this one second (swap with the next slide); desktop keeps this order.
    narrowShift: 1,
  }),
  buildSlide('annabeth/01_IMG_3655', { ...look, title: 'Percy Jackson / Annabeth (2025)', link: '/annabeth/', start: 11, end: 40, 
  }),
  buildSlide('snoopy/01_IMG_1894_1', { ...look, title: 'You\'re a Good Man Charlie Brown / Snoopy (2024)', link: '/snoopy/',
    // Landscape clip on a phone: zoom in instead of letterboxing. scale 1 = full
    // width with bars; ~1.8 = smaller bars, sides cropped; fit: 'cover' = fills the
    // screen. centerX/centerY = the point of the frame kept at screen center
    // (shift+click the video in dev, with the window < 1000px wide, to get them).
    narrow: { fit: 'contain', scale: 1.8, centerX: 50, centerY: 45 },
  }),
  buildSlide('speeches/MOV_8271', { ...look, title: 'Student Council Speech', link: '/speeches/', start: 3 }),
  buildSlide('speeches/01_IMG_8899', { ...look, title: 'Annie / Little Girls', link: '/speeches/', start: 3 }),

  // ---- stills (each stays `stillSeconds`)
  buildSlide('stills/annabeth_fighting', { ...look, title: 'Percy Jackson / Annabeth', link: '/annabeth/', duration: stillSeconds }),
  buildSlide('stills/gomez_dipping', { ...look, title: 'Addams Fmaily / Gomez', link: '/gomez/', duration: stillSeconds,
    narrow: { fit: 'contain', scale: 1.8, centerX: 50, centerY: 45 },
  }),
  buildSlide('stills/gomez_waving_cape', { ...look, title: 'Addams Fmaily / Gomez', link: '/gomez/', duration: stillSeconds}),
  buildSlide('stills/jumping', { ...look, title: 'You\'re a Good Man Charlie Brown / Snoopy', link: '/snoopy/', duration: stillSeconds,
    narrow: { fit: 'contain', scale: 1.8, centerX: 50, centerY: 45 },
  }),
  buildSlide('stills/lilly_as_annabeth', { ...look, title: 'Percy Jackson / Annabeth', link: '/annabeth/', duration: stillSeconds }),
  //buildSlide('stills/annabeth_still1', { ...look, title: 'Percy Jackson / Annabeth', link: '/annabeth/', duration: stillSeconds }),
  //buildSlide('stills/kicking', { ...look, title: 'Addams Family / Gomez', link: '/gomez/', duration: stillSeconds }),
].filter((s): s is Slide => Boolean(s));
