/**
 * Projects shown on the /tech/ page, in order.
 *
 *   name         heading
 *   description  one short paragraph
 *   screenshots  file names under src/assets/images/tech/ (png/jpg/jpeg/webp), shown
 *                stacked in this order. Optional: a project with none, or whose files
 *                are all missing, shows a neutral placeholder box instead.
 *   link         optional URL; makes the heading and screenshots clickable
 *   extraLinks   optional further links shown under the description, e.g. [{ title: 'Walkthrough', url: '...' }]
 *   shotAspect   optional CSS aspect ratio the screenshots are cropped to when displayed,
 *                e.g. '1 / 1' for a square (tall phone shots), '16 / 10'. Default: natural size.
 *   shotPosition which part of the image to keep when cropping (CSS object-position),
 *                e.g. 'top' (default), 'center', '50% 20%'.
 */
export interface TechProject {
  name: string;
  description: string;
  screenshots?: string[];
  link?: string;
  extraLinks?: { title: string; url: string }[];
  shotAspect?: string;
  shotPosition?: string;
}

export const techProjects: TechProject[] = [
  {
    name: 'Hackley Clubz',
    link: 'https://www.hackleyclubz.org/public/',
    extraLinks: [{ title: 'Walkthrough', url: 'https://docs.hackleyclubz.org/walkthroughs/overview/' }],
    shotAspect: '1 / 1',
    description:
      'Hackley School wanted to create a club management portal so that students could know what clubs they’re in and club leaders could manage their roster and events in a centralized way. I built an iOS application (published on the Apple App Store) and a web application as well.',
    screenshots: [
      'hackley-clubz-logo.png',
      'hackley-clubz-browse.webp',
      'hackley-clubz-calendar.webp',
      'hackley-clubz-chats.webp',
      'hackley-clubz-club-info.webp',
      'hackley-clubz-new-club.webp',
    ],
  },
  {
    name: 'Bronx Conservatory of Music Portal',
    description:
      'This is a non-profit that offers low-cost private music classes to children in the Bronx. They wanted to have a central way to manage enrollment and lesson management.',
    screenshots: ['bronx-conservatory-1.png', 'bronx-conservatory-2.png', 'bronx-conservatory-3.png'],
  },
  {
    name: 'Judy Rosenthal Portfolio',
    link: 'https://www.judyrosenthal.com',
    description:
      'Judy Rosenthal is an artist in Houston, Texas, and the site showcases her artwork.',
    screenshots: [
      'judy-rosenthal-1.png',
      'judy-rosenthal-2.png',
      'judy-rosenthal-3.png',
      'judy-rosenthal-4.png',
      'judy-rosenthal-5.png',
      'judy-rosenthal-6.png',
      'judy-rosenthal-7.png',
    ],
  },
  {
    name: 'Ecumenical Emergency Food Pantry',
    link: 'https://eefoodpantry.org/',
    description:
      'This is a food pantry in White Plains that needed a web site to showcase what it is doing and tell people how to help them.',
    screenshots: ['food-pantry.png'],
  },
];
