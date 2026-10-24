import {
  Building2,
  FileStack,
  Globe,
  Images,
  LayoutDashboard,
  Mail,
  Users,
  type LucideIcon,
} from 'lucide-react';

export interface StudioSection {
  key: string;
  name: string;
  href: string;
  icon: LucideIcon;
  /** Section accent, used for the active nav pill, page header band and highlights. */
  accent: string;
  /** Paths (prefixes) that belong to this section. */
  match: string[];
  links?: { name: string; href: string }[];
}

export const STUDIO_SECTIONS: StudioSection[] = [
  { key: 'overview', name: 'Overview', href: '/studio', icon: LayoutDashboard, accent: '#B9A2FF', match: [] },
  {
    key: 'website',
    name: 'Website',
    href: '/studio/website',
    icon: Globe,
    accent: '#F36C65',
    match: ['/studio/website'],
    links: [
      { name: 'Presentation', href: '/studio/website' },
      { name: 'Artist profile', href: '/studio/website/profile' },
    ],
  },
  {
    key: 'archive',
    name: 'Artwork Archive',
    href: '/studio/archive',
    icon: Images,
    accent: '#5B8DEF',
    match: ['/studio/archive'],
    links: [
      { name: 'Artworks & PDFs', href: '/studio/archive' },
      { name: 'Complete catalogue', href: '/studio/archive/catalog' },
      { name: 'Add artwork', href: '/studio/archive/new' },
    ],
  },
  { key: 'email', name: 'Email Studio', href: '/studio/email', icon: Mail, accent: '#F6CE61', match: ['/studio/email'] },
  {
    key: 'sales',
    name: 'Collectors & Sales',
    href: '/studio/collectors',
    icon: Users,
    accent: '#7FD8B0',
    match: ['/studio/collectors', '/studio/sales', '/studio/enquiries', '/studio/invoices'],
    links: [
      { name: 'Collectors', href: '/studio/collectors' },
      { name: 'Enquiries', href: '/studio/enquiries' },
      { name: 'Sales tracker', href: '/studio/sales' },
      { name: 'Invoices', href: '/studio/invoices' },
    ],
  },
  {
    key: 'exhibitions',
    name: 'Exhibitions',
    href: '/studio/exhibitions',
    icon: Building2,
    accent: '#FFB38A',
    match: ['/studio/exhibitions', '/studio/viewing-rooms'],
    links: [
      { name: 'Exhibitions', href: '/studio/exhibitions' },
      { name: 'Viewing rooms', href: '/studio/viewing-rooms' },
    ],
  },
  { key: 'tools', name: 'PDF & Tools', href: '/studio/tools', icon: FileStack, accent: '#C9B8F5', match: ['/studio/tools'] },
];

export function findSection(pathname: string): StudioSection {
  return (
    STUDIO_SECTIONS.find((section) => section.match.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))) ??
    STUDIO_SECTIONS[0]
  );
}
