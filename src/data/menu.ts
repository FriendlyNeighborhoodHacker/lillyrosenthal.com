export interface MenuItem {
  name: string;
  url: string;
}

export const menu: MenuItem[] = [
  { name: 'Snoopy', url: '/snoopy/' },
  { name: 'Annabeth', url: '/annabeth/' },
  { name: 'Gomez', url: '/gomez/' },
  { name: 'Speeches', url: '/speeches/' },
  { name: 'Bio', url: '/bio/' },
];
