'use client';

import { useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { Camera } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuthStore } from '@/store/authStore';
import { usersApi } from '@/lib/api';

export default function ProfilePage() {
  const { user, setUser } = useAuthStore();
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [loading, setLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const save = async () => {
    setLoading(true);
    try {
      const res = await usersApi.updateProfile({ displayName, bio });
      setUser(res.data.data.user);
      toast.success('Profile updated');
    } catch (err: unknown) {
      toast.error(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          'Failed to update'
      );
    } finally {
      setLoading(false);
    }
  };

  const uploadAvatar = async (file: File) => {
    try {
      const res = await usersApi.uploadAvatar(file);
      setUser({ ...user!, ...res.data.data.user });
      toast.success('Avatar updated');
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Upload failed';
      toast.error(message);
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  if (!user) return null;

  return (
    <AppShell>
      <div className="mx-auto h-full max-w-xl overflow-y-auto p-6">
        <h1 className="mb-8 text-2xl font-semibold">Profile</h1>

        <div className="glass rounded-3xl p-8">
          <div className="mb-8 flex flex-col items-center">
            <div className="relative">
              <Avatar src={user.avatarUrl} name={user.displayName} size="xl" online />
              <button
                onClick={() => fileRef.current?.click()}
                className="absolute bottom-0 right-0 rounded-full bg-brand-600 p-2 text-white shadow-lg"
              >
                <Camera className="h-4 w-4" />
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) uploadAvatar(f);
                }}
              />
            </div>
            <p className="mt-4 text-xl font-semibold">{user.displayName}</p>
            <p className="text-sm text-[var(--muted)]">@{user.username}</p>
            {user.emailVerified ? (
              <span className="mt-2 rounded-full bg-emerald-500/15 px-3 py-0.5 text-xs text-emerald-500">
                Email verified
              </span>
            ) : (
              <span className="mt-2 rounded-full bg-amber-500/15 px-3 py-0.5 text-xs text-amber-500">
                Email not verified
              </span>
            )}
          </div>

          <div className="space-y-4">
            <Input
              label="Display name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
            <div>
              <label className="mb-1.5 block text-sm font-medium">Bio</label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                maxLength={500}
                rows={3}
                className="input-field resize-none"
                placeholder="Tell others about yourself..."
              />
            </div>
            <Input label="Email" value={user.email || ''} disabled />
            <Input label="Username" value={user.username} disabled />
            <Button onClick={save} loading={loading} className="w-full">
              Save changes
            </Button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
