import {
  BarChart3,
  Building2,
  FileStack,
  Globe,
  Images,
  LayoutDashboard,
  Mail,
  Settings,
  Users,
  type LucideIcon,
} from 'lucide-react';

export interface StudioSection {
  key: string;
  name: string;
  /** Short label for the mobile tab bar. */
  short: string;
  href: string;
  icon: LucideIcon;
  group: 'Main' | 'Tools' | 'General';
  /** Section accent, used for small highlights. */
  accent: string;
  /** Paths (prefixes) that belong to this section. */
  match: string[];
  links?: { name: string; href: string }[];
}

/** The one navigation registry: sidebar, mobile tabs, "More" sheet and breadcrumbs all read from it. */
export const STUDIO_SECTIONS: StudioSection[] = [
  { key: 'overview', name: 'Overview', short: 'Overview', href: '/studio', icon: LayoutDashboard, group: 'Main', accent: '#8C4E2B', match: [] },
  {
    key: 'archive',
    name: 'Artwork Archive',
    short: 'Archive',
    href: '/studio/archive',
    icon: Images,
    group: 'Main',
    accent: '#8C4E2B',
    match: ['/studio/archive'],
    links: [
      { name: 'Artworks & PDFs', href: '/studio/archive' },
      { name: 'Complete catalogue', href: '/studio/archive/catalog' },
      { name: 'Add artwork', href: '/studio/archive/new' },
    ],
  },
  {
    key: 'website',
    name: 'Portfolio Website',
    short: 'Website',
    href: '/studio/website',
    icon: Globe,
    group: 'Main',
    accent: '#8C4E2B',
    match: ['/studio/website'],
    links: [
      { name: 'Publishing', href: '/studio/website' },
      { name: 'Artist profile', href: '/studio/website/profile' },
    ],
  },
  {
    key: 'sales',
    name: 'Collectors',
    short: 'Collectors',
    href: '/studio/collectors',
    icon: Users,
    group: 'Main',
    accent: '#8C4E2B',
    match: ['/studio/collectors', '/studio/sales', '/studio/enquiries', '/studio/invoices'],
    links: [
      { name: 'Collectors', href: '/studio/collectors' },
      { name: 'Enquiries', href: '/studio/enquiries' },
      { name: 'Sales', href: '/studio/sales' },
      { name: 'Invoices', href: '/studio/invoices' },
    ],
  },
  { key: 'email', name: 'Email Studio', short: 'Email', href: '/studio/email', icon: Mail, group: 'Main', accent: '#8C4E2B', match: ['/studio/email'] },
  {
    key: 'exhibitions',
    name: 'Exhibitions',
    short: 'Exhibitions',
    href: '/studio/exhibitions',
    icon: Building2,
    group: 'Main',
    accent: '#8C4E2B',
    match: ['/studio/exhibitions', '/studio/viewing-rooms'],
    links: [
      { name: 'Exhibitions', href: '/studio/exhibitions' },
      { name: 'Viewing rooms', href: '/studio/viewing-rooms' },
    ],
  },
  { key: 'tools', name: 'Documents & PDFs', short: 'Documents', href: '/studio/tools', icon: FileStack, group: 'Tools', accent: '#8C4E2B', match: ['/studio/tools'] },
  { key: 'reports', name: 'Reports', short: 'Reports', href: '/studio/reports', icon: BarChart3, group: 'Tools', accent: '#8C4E2B', match: ['/studio/reports'] },
  { key: 'settings', name: 'Settings', short: 'Settings', href: '/studio/settings', icon: Settings, group: 'General', accent: '#8C4E2B', match: ['/studio/settings'] },
];

export const SECTION_GROUPS = ['Main', 'Tools', 'General'] as const;

/** Bottom tabs on phones; everything else is under "More". */
export const MOBILE_TABS = ['overview', 'archive', 'email'];

export function findSection(pathname: string): StudioSection {
  return (
    STUDIO_SECTIONS.find((section) => section.match.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))) ??
    STUDIO_SECTIONS[0]
  );
}
