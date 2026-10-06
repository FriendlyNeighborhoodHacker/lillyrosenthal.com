import { buildSlide, type Slide } from './slides';

/**
 * Annabeth page slideshow, in order. One entry per clip: the manifest key
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
 *   buildSlide('annabeth/SOME_CLIP', {
 *     title: 'Act II opening',
 *     start: 3, end: 18,
 *     transition: { type: 'fade', duration: 1 },
 *     sideColor: '#111',
 *     narrow: { fit: 'cover', centerX: 40, centerY: 25 },
 *   }),
 */
const stillSeconds = 6;
export const annabethSlides: Slide[] = [
  buildSlide('annabeth/01_IMG_3655', { title: 'Annabeth - I Will Be Remembered' }),
  buildSlide('annabeth/02_IMG_6923', { title: 'Annabeth - Fighting Scene',
    narrow: { fit: 'contain', scale: 1.8, centerX: 50, centerY: 45 },
  }),
  // ---- stills (each stays `stillSeconds`)
  buildSlide('stills/annabeth_fighting', { title: 'Percy Jackson / Annabeth', link: '/annabeth/', duration: stillSeconds }),
  buildSlide('stills/lilly_as_annabeth', { title: 'Percy Jackson / Annabeth', link: '/annabeth/', duration: stillSeconds }),

].filter((s): s is Slide => Boolean(s));
