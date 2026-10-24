import type { Config } from 'tailwindcss';
import animate from 'tailwindcss-animate';
import typography from '@tailwindcss/typography';

const config: Config = {
  darkMode: ['class'],
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-inter)', 'Helvetica Neue', 'Arial', 'sans-serif'],
        display: ['var(--font-display)', 'Georgia', 'serif'],
        studio: ['var(--font-studio)', 'var(--font-inter)', 'sans-serif'],
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      colors: {
        // shadcn/ui tokens, unchanged from the archive app
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: { DEFAULT: 'hsl(var(--card))', foreground: 'hsl(var(--card-foreground))' },
        popover: { DEFAULT: 'hsl(var(--popover))', foreground: 'hsl(var(--popover-foreground))' },
        primary: { DEFAULT: 'hsl(var(--primary))', foreground: 'hsl(var(--primary-foreground))' },
        secondary: { DEFAULT: 'hsl(var(--secondary))', foreground: 'hsl(var(--secondary-foreground))' },
        muted: { DEFAULT: 'hsl(var(--muted))', foreground: 'hsl(var(--muted-foreground))' },
        accent: { DEFAULT: 'hsl(var(--accent))', foreground: 'hsl(var(--accent-foreground))' },
        destructive: { DEFAULT: 'hsl(var(--destructive))', foreground: 'hsl(var(--destructive-foreground))' },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        // Public gallery (from the existing website's identity)
        ink: '#1C1B1A',
        paper: '#F5F2EE',
        stone: '#8A857F',
        signal: '#CC0000',
        // Studio section accents
        studio: {
          base: '#F7F6FB',
          lilac: '#B9A2FF',
          coral: '#F36C65',
          blue: '#5B8DEF',
          yellow: '#F6CE61',
          mint: '#7FD8B0',
          peach: '#FFB38A',
          lavender: '#C9B8F5',
        },
      },
      keyframes: {
        'accordion-down': { from: { height: '0' }, to: { height: 'var(--radix-accordion-content-height)' } },
        'accordion-up': { from: { height: 'var(--radix-accordion-content-height)' }, to: { height: '0' } },
        'fade-up': { from: { opacity: '0', transform: 'translateY(16px)' }, to: { opacity: '1', transform: 'none' } },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'fade-up': 'fade-up 0.8s cubic-bezier(0.22, 1, 0.36, 1) both',
      },
    },
  },
  plugins: [animate, typography],
};

export default config;
