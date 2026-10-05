import { mediaClips, type Slide } from './slides';
import { snoopySlides } from './snoopySlides';
import { annabethSlides } from './annabethSlides';
import { gomezSlides } from './gomezSlides';
import { speechesSlides } from './speechesSlides';
import { homeSlides } from './homeSlides';

export interface Section {
  slug: string;
  name: string;
  slides: Slide[];
}

/**
 * The section pages. Each section's slides are an explicit list in its own
 * file (snoopySlides.ts, annabethSlides.ts, ...), written like homeSlides.ts.
 * To add a page: add a file, list it here, and add it to menu.ts.
 */
export const sections: Section[] = [
  { slug: 'snoopy', name: 'Snoopy', slides: snoopySlides },
  { slug: 'annabeth', name: 'Annabeth', slides: annabethSlides },
  { slug: 'gomez', name: 'Gomez', slides: gomezSlides },
  { slug: 'speeches', name: 'Speeches', slides: speechesSlides },
];

export const sectionBySlug = (slug: string) => sections.find((s) => s.slug === slug);

// Friendly reminder at build time: imported clips that no page lists.
const used = new Set([...sections.flatMap((s) => s.slides.map((sl) => sl.key)), ...homeSlides.map((sl) => sl.key)]);
const unused = Object.keys(mediaClips).filter((k) => !used.has(k));
if (unused.length) {
  console.warn(`[sections] ${unused.length} imported clip(s) are not listed in any slide file: ${unused.join(', ')}`);
}
