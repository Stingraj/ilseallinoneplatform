import './globals.css';
import type { Metadata } from 'next';
import { Bricolage_Grotesque, Cormorant_Garamond, Inter } from 'next/font/google';
import { SITE } from '@/lib/site/config';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const display = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['300', '400', '500'],
  style: ['normal', 'italic'],
  variable: '--font-display',
});
const studio = Bricolage_Grotesque({ subsets: ['latin'], variable: '--font-studio' });

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: { default: SITE.artistName, template: `%s · ${SITE.artistName}` },
  description: SITE.description,
  openGraph: { title: SITE.artistName, description: SITE.description, type: 'website' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`light ${inter.variable} ${display.variable} ${studio.variable}`}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
