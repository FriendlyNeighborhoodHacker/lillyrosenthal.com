import { buildSlide, type Slide } from './slides';

/**
 * Speeches page slideshow, in order. One entry per clip: the manifest key
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
 *   titleBackground  DESKTOP title box color ('none' for text with a glow instead of a box)
 *   titleColor       DESKTOP title text color
 *   narrowTitleBackground / narrowTitleColor   the same for the PHONE title bar (default white on black)
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
 *   buildSlide('speeches/SOME_CLIP', {
 *     title: 'Act II opening',
 *     start: 3, end: 18,
 *     transition: { type: 'fade', duration: 1 },
 *     sideColor: '#111',
 *     narrow: { fit: 'cover', centerX: 40, centerY: 25 },
 *   }),
 */
export const speechesSlides: Slide[] = [
  buildSlide('speeches/MOV_8271', { title: 'Student Government Speech - Defying Gravity' }),
  // buildSlide('speeches/01_IMG_8899', { title: 'Annie / Little Girls' }),
  //buildSlide('speeches/02_b4094358-3c45-4aa4-927d-bebfa2a4e89b', { title: 'Speeches' }),
  //buildSlide('speeches/03_IMG_5230', { title: 'Speeches' }),
  buildSlide('speeches/2026_vice_president_speech_lilly', { title: 'Student Government Speech - Frozen',
    // Landscape clip on a phone: zoom in instead of letterboxing. scale 1 = full
    // width with bars; ~1.8 = smaller bars, sides cropped; fit: 'cover' = fills the
    // screen. centerX/centerY = the point of the frame kept at screen center
    // (shift+click the video in dev, with the window < 1000px wide, to get them).
    narrow: { fit: 'contain', scale: 2.8, centerX: 45, centerY: 45 },
  }),
].filter((s): s is Slide => Boolean(s));
