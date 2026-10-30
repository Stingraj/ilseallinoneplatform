import type { NextConfig } from 'next';

const isDev = process.env.NODE_ENV === 'development';
const supabaseOrigin = process.env.NEXT_PUBLIC_SUPABASE_URL ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).origin : '';
const supabaseHost = supabaseOrigin ? new URL(supabaseOrigin).hostname : '';

/**
 * Scripts need 'unsafe-inline' for Next.js's inline bootstrap; development also needs 'unsafe-eval'. The browser only
 * talks to this site and to Supabase (auth, data and storage). n8n is called from the server, never from the browser.
 */
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''} https://va.vercel-scripts.com`,
  "style-src 'self' 'unsafe-inline'",
  ['img-src', "'self'", 'data:', 'blob:', supabaseOrigin].filter(Boolean).join(' '),
  "font-src 'self' data:",
  ['connect-src', "'self'", supabaseOrigin, supabaseOrigin.replace('https://', 'wss://'), 'https://va.vercel-scripts.com'].filter(Boolean).join(' '),
  "frame-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ');

const securityHeaders = [
  { key: 'Content-Security-Policy', value: contentSecurityPolicy },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  serverExternalPackages: ['@react-pdf/renderer'],
  images: {
    remotePatterns: supabaseHost
      ? [{ protocol: 'https', hostname: supabaseHost, pathname: '/storage/v1/object/public/**' }]
      : [],
  },
  async redirects() {
    // The previous 3D gallery lived here; the museum is now the home page.
    return [{ source: '/gallery-walk', destination: '/', permanent: true }];
  },
  async headers() {
    return [
      { source: '/(.*)', headers: securityHeaders },
      // Private areas are never indexed.
      { source: '/studio/:path*', headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }] },
      { source: '/viewing/:path*', headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }] },
    ];
  },
};

export default nextConfig;
