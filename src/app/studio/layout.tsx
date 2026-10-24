import type { Metadata } from 'next';
import { AuthProvider } from '@/components/auth/auth-provider';
import { StudioShell } from '@/components/studio/studio-shell';
import { Toaster } from '@/components/ui/sonner';

export const metadata: Metadata = {
  title: 'Studio',
  robots: { index: false, follow: false },
};

// Access is enforced in src/proxy.ts (owner-only) and again inside every server action and route.
export default function StudioLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <StudioShell>{children}</StudioShell>
      <Toaster position="bottom-right" />
    </AuthProvider>
  );
}
