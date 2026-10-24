'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Save, Upload, Loader2, User } from 'lucide-react';
import { ArtistProfile } from '@/lib/types/database';
import { saveProfileAction } from './actions';
import { compressImage } from '@/lib/image-compression';

export function ProfileForm({ initialProfile }: { initialProfile: ArtistProfile | null }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  const [formData, setFormData] = useState({
    full_name: initialProfile?.full_name || '',
    bio: initialProfile?.bio || '',
    statement: initialProfile?.statement || '',
    birth_year: initialProfile?.birth_year?.toString() || '',
    location: initialProfile?.location || '',
    website: initialProfile?.website || '',
    email: initialProfile?.email || '',
    phone: initialProfile?.phone || '',
    studio_address: initialProfile?.studio_address || '',
    profile_photo_url: initialProfile?.profile_photo_url || '',
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    try {
      const data = new FormData();
      Object.entries(formData).forEach(([key, value]) => {
        data.append(key, value || '');
      });

      await saveProfileAction(data);
      toast.success('Profile updated successfully');
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const originalSize = (file.size / 1024).toFixed(0);
      const compressedFile = await compressImage(file, 1600, 1600, 0.85);
      const compressedSize = (compressedFile.size / 1024).toFixed(0);
      toast(`Uploading compressed photo: ${originalSize}KB → ${compressedSize}KB`);

      const formData = new FormData();
      formData.append('file', compressedFile);
      formData.append('bucket', 'artist-profile');
      formData.append('path', `avatar-${Date.now()}.jpg`);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to upload photo');
      }

      const { url } = await res.json();
      setFormData((prev) => ({ ...prev, profile_photo_url: url }));
      toast.success('Photo uploaded');
    } catch (error: any) {
      toast.error(error.message || 'Error uploading photo');
    } finally {
      setUploading(false);
    }
  }

  return (
    <Card className="border-slate-100 shadow-sm">
      <CardHeader>
        <CardTitle className="text-xl font-medium tracking-tight text-slate-900">Artist Details</CardTitle>
        <CardDescription>
          Information displayed on the public About page.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex flex-col sm:flex-row gap-8 items-start">
            <div className="w-full sm:w-1/3 flex flex-col items-center gap-4">
              <div className="w-40 h-40 rounded-full border-4 border-slate-50 bg-slate-100 flex items-center justify-center overflow-hidden relative shadow-sm">
                {formData.profile_photo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={formData.profile_photo_url}
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="w-12 h-12 text-slate-300" />
                )}
                {uploading && (
                  <div className="absolute inset-0 bg-white/50 flex items-center justify-center backdrop-blur-sm">
                    <Loader2 className="w-6 h-6 animate-spin text-slate-900" />
                  </div>
                )}
              </div>
              <div className="w-full">
                <Label
                  htmlFor="photo-upload"
                  className="w-full cursor-pointer flex items-center justify-center gap-2 border border-slate-200 bg-white hover:bg-slate-50 px-4 py-2 rounded-lg text-sm font-medium text-slate-700 transition-colors"
                >
                  <Upload className="w-4 h-4" />
                  Upload Photo
                </Label>
                <input
                  id="photo-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileUpload}
                  disabled={uploading}
                />
              </div>
            </div>

            <div className="w-full sm:w-2/3 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="full_name">Full Name</Label>
                <Input
                  id="full_name"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  placeholder="e.g. Ilse Sørensen Murdock"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="birth_year">Birth Year</Label>
                  <Input
                    id="birth_year"
                    type="number"
                    value={formData.birth_year}
                    onChange={(e) => setFormData({ ...formData, birth_year: e.target.value })}
                    placeholder="e.g. 1980"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="e.g. New York, NY"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="website">Website URL</Label>
                <Input
                  id="website"
                  type="url"
                  value={formData.website}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  placeholder="https://"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label htmlFor="email">Email</Label><Input id="email" type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} /></div>
                <div className="space-y-2"><Label htmlFor="phone">Phone</Label><Input id="phone" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} /></div>
              </div>
              <div className="space-y-2"><Label htmlFor="studio_address">Studio Address</Label><Input id="studio_address" value={formData.studio_address} onChange={(e) => setFormData({ ...formData, studio_address: e.target.value })} /></div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="bio">Biography</Label>
            <Textarea
              id="bio"
              value={formData.bio}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              className="min-h-[120px]"
              placeholder="Full artist biography..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="statement">Artist Statement</Label>
            <Textarea
              id="statement"
              value={formData.statement}
              onChange={(e) => setFormData({ ...formData, statement: e.target.value })}
              className="min-h-[120px]"
              placeholder="Artist statement..."
            />
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-100">
            <Button type="submit" disabled={saving || uploading} className="bg-slate-900 text-white hover:bg-slate-800">
              {saving ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Save Profile
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
