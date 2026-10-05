import { buildSlide, type Slide } from './slides';

/**
 * Snoopy page slideshow, in order. One entry per clip: the manifest key
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
 *   wide / narrow    fit rule for viewports >= / < siteConfig.breakpoint:
 *                      { fit: 'cover'|'contain'|'height'|'width', scale, centerX, centerY, alignX, alignY }
 *                    (merged over siteConfig.display defaults; see README "Fit rules")
 *
 * Example:
 *   buildSlide('snoopy/SOME_CLIP', {
 *     title: 'Act II opening',
 *     start: 3, end: 18,
 *     transition: { type: 'fade', duration: 1 },
 *     sideColor: '#111',
 *     narrow: { fit: 'cover', centerX: 40, centerY: 25 },
 *   }),
 */
export const snoopySlides: Slide[] = [
  buildSlide('snoopy/01_IMG_1894_1', { title: 'Snoopy - Supertime, Ending' }),
  buildSlide('snoopy/02_IMG_1863', { title: 'Snoopy - I\'ll Get You, Red Baron' }),
  buildSlide('snoopy/03_IMG_1883', { title: 'Snoopy - You\'re a Good Man, Charlie Brown' }),
  buildSlide('snoopy/03a_IMG_1894', { title: 'Snoopy - Suppertime"}),
  buildSlide('snoopy/04_IMG_1884', { title: 'Snoopy - Not Bad At All' }),
  buildSlide('snoopy/05_IMG_1885', { title: 'Snoopy - Today, I'm a Dog' }),
].filter((s): s is Slide => Boolean(s));
