'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import Link from 'next/link';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const supabase = useMemo(() => createClient(), []);

  // Messages from the proxy and the magic-link callback.
  useEffect(() => {
    const reason = new URLSearchParams(window.location.search).get('error');
    if (reason === 'not-owner') setError('This account is not allowed to manage the studio.');
    if (reason === 'link') setError('That sign-in link is invalid or has expired. Please request a new one.');
  }, []);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      window.location.href = '/studio';
    }
  };

  const handleMagicLink = async () => {
    if (!email) {
      setError('Please enter your email address');
      return;
    }
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/studio`,
        // Only existing accounts may sign in; a magic link must never create a new user.
        shouldCreateUser: false,
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      setMagicLinkSent(true);
      setLoading(false);
    }
  };

  if (magicLinkSent) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <Card className="w-full max-w-md bg-white border-gray-100">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-xl font-medium text-gray-900 mb-2">Check your email</CardTitle>
            <CardDescription className="text-gray-500">
              We sent a magic link to {email}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center text-sm text-gray-500">
            Click the link in the email to sign in.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <Card className="w-full max-w-md bg-white border-gray-100">
        <CardHeader className="text-center pb-4">
          <Link href="/" className="inline-block mb-6">
            <span className="text-2xl font-medium text-gray-900">Ilse Sørensen Murdock</span>
          </Link>
          <CardTitle className="text-xl font-medium text-gray-900">Sign in</CardTitle>
          <CardDescription className="text-gray-500">
            Access your portfolio dashboard
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleEmailLogin} className="space-y-4">
            {error && (
              <Alert variant="destructive" className="bg-red-50 border-red-200 text-red-800">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-gray-700">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-white border-gray-200 focus:border-gray-900"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium text-gray-700">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-white border-gray-200 focus:border-gray-900"
              />
            </div>
            <Button
              type="submit"
              className="w-full bg-gray-900 text-white hover:bg-gray-800"
              disabled={loading}
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </Button>
          </form>
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-100"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-gray-400">Or</span>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={handleMagicLink}
            disabled={loading}
            className="w-full border-gray-200 text-gray-600 hover:bg-gray-50"
          >
            Send magic link
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
