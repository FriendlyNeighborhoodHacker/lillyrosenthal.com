/**
 * Projects shown on the /tech/ page, in order.
 *
 *   name         heading
 *   description  one short paragraph
 *   screenshots  file names under src/assets/images/tech/ (png/jpg/jpeg/webp), shown
 *                stacked in this order. Optional: a project with none, or whose files
 *                are all missing, shows a neutral placeholder box instead.
 *   link         optional URL; makes the heading clickable and is shown under the description
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
    extraLinks: [{ title: 'Walkthrough', url: 'https://docs.hackleyclubz.org/walkthroughs/overview/' }],
    shotAspect: '1 / 1',
    description:
      'I built Hackley Clubz for my high school (Hackley High School) so that students could more easily track what clubs they’re in and so that club leaders could more easily manage their clubs. It’s an iOS application (published on the Apple App Store) and a web application as well. Launched in September 2026, it is used by 400+ students and faculty to manage 75 clubs.',
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
      'This is a non-profit that offers low-cost private music classes to children in the Bronx. They wanted to have a central way to manage enrollment and lesson management so the staff can focus on delivering their program well instead of the significant administration work of tracking student registrations and lesson attendance. Built for 150+ students and 20+ teachers.',
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
