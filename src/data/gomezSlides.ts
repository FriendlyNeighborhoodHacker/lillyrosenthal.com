import { buildSlide, type Slide } from './slides';

/**
 * Gomez page slideshow, in order. One entry per clip: the manifest key
 * (see media.generated.json) plus any options. Only clips listed here appear.
 *
 * Options (all optional):
 *   title            text in the title box (default: section name)
 *   link             makes the title box a link (e.g. homepage titles link to their section page)
 *   duration         images only: seconds on screen (default siteConfig.imageDuration)
 *   start / end      videos only: play from `start` seconds; be fully faded out by `end` seconds (the
 *                    transition starts early by its fade-out length). Omit `end` to run to the end of the file.
 *                    Lets the homepage show a shorter cut than the section page.
 *   transition       what happens when LEAVING this slide: { type: 'crossfade' | 'fade' | 'none', duration }
 *                    e.g. { type: 'fade', duration: 1.2 } fades to black then fades the next clip in (default siteConfig.transition)
 *   menuColor        'white' | 'black' header text over this slide
 *   titleBackground  title box color ('none' for text with a glow instead of a box)
 *   titleColor       title text color
 *   sideColor        color behind the clip where it does not fill the stage
 *   shadowColor      glow behind header / un-boxed title text
 *   orientation      'landscape' | 'portrait' (default: from the clip's dimensions)
 *   narrowShift      on phones / narrow screens move this slide N positions later (negative = earlier);
 *                    e.g. narrowShift: 1 on the first slide swaps it with the second there
 *   wide / narrow    fit rule for viewports >= / < siteConfig.breakpoint:
 *                      { fit: 'cover'|'contain'|'height'|'width', scale, centerX, centerY, alignX, alignY }
 *                    (merged over siteConfig.display defaults; see README "Fit rules")
 *
 * Example:
 *   buildSlide('gomez/SOME_CLIP', {
 *     title: 'Act II opening',
 *     start: 3, end: 18,
 *     transition: { type: 'fade', duration: 1 },
 *     sideColor: '#111',
 *     narrow: { fit: 'cover', centerX: 40, centerY: 25 },
 *   }),
 */
const stillSeconds = 6;
export const gomezSlides: Slide[] = [
  buildSlide('gomez/01_IMG_1136', { title: 'Gomez - Full Disclosure',
    title: 'Addams Family / Gomez (2026)', link: '/gomez/',
    // Landscape clip on a phone: zoom in instead of letterboxing. scale 1 = full
    // width with bars; ~1.8 = smaller bars, sides cropped; fit: 'cover' = fills the
    // screen. centerX/centerY = the point of the frame kept at screen center
    // (shift+click the video in dev, with the window < 1000px wide, to get them).
    narrow: { fit: 'contain', scale: 1.6, centerX: 50, centerY: 45 },
  }),
  buildSlide('gomez/02_IMG_1212', { title: 'Gomez - Summoning Ancestors',
    // Landscape clip on a phone: zoom in instead of letterboxing. scale 1 = full
    // width with bars; ~1.8 = smaller bars, sides cropped; fit: 'cover' = fills the
    // screen. centerX/centerY = the point of the frame kept at screen center
    // (shift+click the video in dev, with the window < 1000px wide, to get them).
    narrow: { fit: 'contain', scale: 1.6, centerX: 50, centerY: 45 },
    narrowShift: 2,
  }),
  buildSlide('gomez/03_IMG_1232', { title: 'Gomez - Florida' }),
  buildSlide('gomez/04_IMG_1126', { title: 'Gomez - Introduction',
    // Landscape clip on a phone: zoom in instead of letterboxing. scale 1 = full
    // width with bars; ~1.8 = smaller bars, sides cropped; fit: 'cover' = fills the
    // screen. centerX/centerY = the point of the frame kept at screen center
    // (shift+click the video in dev, with the window < 1000px wide, to get them).
    narrow: { fit: 'contain', scale: 2.8, centerX: 50, centerY: 45 },
  }),
  buildSlide('stills/gomez_dipping', { title: 'Addams Fmaily / Gomez', link: '/gomez/', duration: stillSeconds,
    narrow: { fit: 'contain', scale: 1.8, centerX: 50, centerY: 45 },
  }),
  buildSlide('stills/gomez_waving_cape', { title: 'Addams Fmaily / Gomez', link: '/gomez/', duration: stillSeconds}),
].filter((s): s is Slide => Boolean(s));
