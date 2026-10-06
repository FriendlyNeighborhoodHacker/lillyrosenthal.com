import manifest from './media.generated.json';
import { siteConfig } from './siteConfig';

export type Fit = 'cover' | 'contain' | 'height' | 'width';

/** How a piece of media is fitted into the stage. See siteConfig.display for the meaning of each key. */
export interface FitRule {
  fit?: Fit;
  scale?: number;
  centerX?: number;
  centerY?: number;
  alignX?: 'left' | 'center' | 'right';
  alignY?: 'top' | 'center' | 'bottom';
}

export type Orientation = 'landscape' | 'portrait';

/** What happens between slides. Resolved per slide; used when LEAVING that slide. */
export interface Transition {
  /** 'crossfade' = old fades out while new fades in; 'fade' = fade to `color`, then fade the next in; 'none' = cut. */
  type: 'crossfade' | 'fade' | 'none';
  /** Total seconds (a 'fade' spends half going out and half coming in). */
  duration: number;
  /** What shows between slides during a 'fade' (site-wide; set in siteConfig). */
  color?: string;
}

export interface Slide {
  /** Manifest key, e.g. 'annabeth/01_IMG_3655'. */
  key: string;
  type: 'video' | 'image';
  src: string;
  poster?: string;
  width: number;
  height: number;
  orientation: Orientation;

  /** Text in the title box. */
  title?: string;
  /** Where clicking the slide navigates (homepage slides link to their section). */
  link?: string;
  /** Images only: seconds on screen (default siteConfig.imageDuration). */
  duration?: number;
  /** Videos only: begin playback this many seconds in (default 0). */
  start?: number;
  /** Videos only: stop here and move on, in seconds from the start of the file (default: play to the end). */
  end?: number;
  /** Transition used when leaving this slide. */
  transition: Transition;
  /**
   * On narrow screens (below siteConfig.breakpoint) move this slide this many
   * positions later (negative = earlier). Wide screens keep the file order.
   * e.g. narrowShift: 1 on the first slide swaps it with the second on phones.
   */
  narrowShift?: number;

  menuColor: 'white' | 'black';
  titleBackground: string;
  titleColor: string;
  sideColor: string;
  shadowColor: string;

  /** Fully resolved fit rules (defaults merged with overrides). */
  wide: FitRule;
  narrow: FitRule;
}

/** The subset of Slide you may override per clip. */
export type SlideOverrides = Partial<
  Pick<Slide, 'title' | 'link' | 'duration' | 'start' | 'end' | 'menuColor' | 'titleBackground' | 'titleColor' | 'sideColor' | 'shadowColor' | 'orientation' | 'narrowShift'>
> & { wide?: FitRule; narrow?: FitRule; transition?: Partial<Transition> };

interface ManifestClip {
  section: string;
  type: 'video' | 'image';
  src: string;
  poster?: string;
  width: number;
  height: number;
  duration?: number;
  bytes: number;
}

export const mediaClips = manifest.clips as Record<string, ManifestClip>;

const withBase = (p?: string) => (p ? `${siteConfig.mediaBase}${p}` : undefined);

/**
 * Build a Slide from a manifest key plus optional overrides. Returns undefined
 * (with a warning) when the key is not in the manifest, so a missing clip
 * never breaks the build — run `npm run import-media` to regenerate.
 */
export function buildSlide(key: string, overrides: SlideOverrides = {}): Slide | undefined {
  const clip = mediaClips[key];
  if (!clip) {
    console.warn(`[slides] "${key}" is not in src/data/media.generated.json — run \`npm run import-media\``);
    return undefined;
  }
  const orientation: Orientation = overrides.orientation ?? (clip.height > clip.width ? 'portrait' : 'landscape');
  return {
    key,
    type: clip.type,
    src: withBase(clip.src)!,
    poster: withBase(clip.poster),
    width: clip.width,
    height: clip.height,
    orientation,
    title: overrides.title,
    link: overrides.link,
    duration: overrides.duration,
    start: overrides.start,
    end: overrides.end,
    transition: { ...siteConfig.transition, ...overrides.transition },
    narrowShift: overrides.narrowShift,
    menuColor: overrides.menuColor ?? siteConfig.menuColor,
    titleBackground: overrides.titleBackground ?? siteConfig.title.background,
    titleColor: overrides.titleColor ?? siteConfig.title.color,
    sideColor: overrides.sideColor ?? siteConfig.backgroundColor,
    shadowColor: overrides.shadowColor ?? siteConfig.shadowColor,
    wide: { ...siteConfig.display.wide[orientation], ...overrides.wide },
    narrow: { ...siteConfig.display.narrow[orientation], ...overrides.narrow },
  };
}
