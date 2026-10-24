/** Site identity. Biography and statement come from the archive's artist_profile row, not from here. */
export const SITE = {
  url: process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000',
  artistName: 'Ilse Sørensen Murdock',
  description: 'Paintings and works on paper by Ilse Sørensen Murdock.',
  contactEmail: 'ilsemurdock@yahoo.com',
  instagram: 'ilsesorensenmurdock',
} as const;

/** Main navigation, shared by the header and the footer. */
export const SITE_NAV = [
  { name: 'Works', href: '/artworks' },
  { name: 'Collections', href: '/collections' },
  { name: 'Exhibitions', href: '/exhibitions' },
  { name: 'Gallery Walk', href: '/gallery-walk' },
  { name: 'About', href: '/about' },
  { name: 'Contact', href: '/contact' },
];
