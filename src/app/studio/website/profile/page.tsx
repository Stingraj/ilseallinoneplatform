import { getArtistProfileAction } from '@/app/actions/db';
import { ProfileForm } from './profile-form';

export const dynamic = 'force-dynamic';

export default async function ProfilePage() {
  const response = await getArtistProfileAction();
  const profile = response.success ? response.data : null;

  return (
    <div className="mx-auto max-w-4xl space-y-8 pb-24">
      <div className="border-b border-slate-100 pb-6">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Artist Profile</h1>
        <p className="mt-1 text-sm text-slate-500">
          Manage the public profile information displayed on the gallery About page.
        </p>
      </div>

      <ProfileForm initialProfile={profile} />
    </div>
  );
}
