import { SiteFooter } from '@/components/site/site-footer';
import { SiteHeader } from '@/components/site/site-header';
import { SITE } from '@/lib/site/config';

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="site min-h-screen">
      <SiteHeader artistName={SITE.artistName} />
      <main id="main">{children}</main>
      <SiteFooter />
    </div>
  );
}
