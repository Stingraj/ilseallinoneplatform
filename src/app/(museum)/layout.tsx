import { Cinzel, Inter, Playfair_Display } from "next/font/google";
import "@/components/museum/museum-root.css";

// Cinzel for the architectural inscription and small capitals, Playfair Display for titles, Inter for text.
// The variables are set on the museum's own wrapper, so they do not touch the site's or the studio's fonts.
const display = Cinzel({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-display", display: "swap" });
const serif = Playfair_Display({ subsets: ["latin"], weight: ["400", "500"], style: ["normal", "italic"], variable: "--font-serif", display: "swap" });
const sans = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" });

export default function MuseumLayout({ children }: { children: React.ReactNode }) {
  return (
    <div id="top" className={`museum-root ${display.variable} ${serif.variable} ${sans.variable}`}>
      {children}
    </div>
  );
}
