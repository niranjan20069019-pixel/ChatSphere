'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuthStore } from '@/store/authStore';
import { usersApi, authApi } from '@/lib/api';
import { cn } from '@/lib/utils';

const THEME_COLORS = [
  { id: 'yellow', color: '#f5dd42' },
  { id: 'indigo', color: '#6366f1' },
  { id: 'blue', color: '#3b82f6' },
  { id: 'emerald', color: '#10b981' },
  { id: 'rose', color: '#f43f5e' },
  { id: 'amber', color: '#f59e0b' },
];

export default function SettingsPage() {
  const { user, setUser } = useAuthStore();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [section, setSection] = useState<'appearance' | 'privacy' | 'notifications' | 'security'>(
    'appearance'
  );

  const update = async (data: Record<string, unknown>) => {
    const res = await usersApi.updateProfile(data);
    setUser(res.data.data.user);
    toast.success('Settings saved');
  };

  const changePassword = async () => {
    try {
      await usersApi.changePassword(currentPassword, newPassword);
      toast.success('Password updated');
      setCurrentPassword('');
      setNewPassword('');
    } catch {
      toast.error('Failed to change password');
    }
  };

  if (!user) return null;

  const sections = [
    { id: 'appearance' as const, label: 'Appearance' },
    { id: 'privacy' as const, label: 'Privacy' },
    { id: 'notifications' as const, label: 'Notifications' },
    { id: 'security' as const, label: 'Security' },
  ];

  return (
    <AppShell>
      <div className="mx-auto h-full max-w-3xl overflow-y-auto p-4 pb-24 lg:p-6">
        <h1 className="mb-6 text-2xl font-bold">Settings</h1>

        <div className="mb-6 flex flex-wrap gap-2">
          {sections.map((s) => (
            <button
              key={s.id}
              onClick={() => setSection(s.id)}
              className={cn(
                'rounded-xl px-4 py-2 text-sm font-medium transition',
                section === s.id
                  ? 'bg-[#1a1a1a] text-white'
                  : 'bg-black/[0.04] text-[var(--muted)]'
              )}
            >
              {s.label}
            </button>
          ))}
        </div>

        <div className="card-rounded p-6">
          {section === 'appearance' && (
            <div className="space-y-6">
              <div>
                <h3 className="mb-3 font-medium">Accent color</h3>
                <div className="flex gap-3">
                  {THEME_COLORS.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => update({ themeColor: c.id })}
                      className={cn(
                        'h-10 w-10 rounded-full ring-2 ring-offset-2 ring-offset-white transition active:scale-90',
                        user.themeColor === c.id ? 'ring-[#1a1a1a]' : 'ring-transparent'
                      )}
                      style={{ background: c.color }}
                    />
                  ))}
                </div>
              </div>
              <div>
                <h3 className="mb-3 font-medium">Chat wallpaper URL</h3>
                <Input
                  placeholder="https://..."
                  defaultValue={user.wallpaper || ''}
                  onBlur={(e) => update({ wallpaper: e.target.value || null })}
                />
              </div>
            </div>
          )}

          {section === 'privacy' && (
            <div className="space-y-4">
              {[
                { key: 'showOnlineStatus', label: 'Show online status' },
                { key: 'showLastSeen', label: 'Show last seen' },
                { key: 'allowFriendRequests', label: 'Allow friend requests' },
              ].map((item) => (
                <label key={item.key} className="flex items-center justify-between py-2">
                  <span className="text-sm">{item.label}</span>
                  <input
                    type="checkbox"
                    checked={!!user[item.key as keyof typeof user]}
                    onChange={(e) => update({ [item.key]: e.target.checked })}
                    className="h-5 w-5 rounded accent-[var(--accent)]"
                  />
                </label>
              ))}
            </div>
          )}

          {section === 'notifications' && (
            <div className="space-y-4">
              {[
                { key: 'notifyMessages', label: 'Message notifications' },
                { key: 'notifyFriendRequests', label: 'Friend request notifications' },
                { key: 'notifyGroups', label: 'Group notifications' },
              ].map((item) => (
                <label key={item.key} className="flex items-center justify-between py-2">
                  <span className="text-sm">{item.label}</span>
                  <input
                    type="checkbox"
                    checked={!!user[item.key as keyof typeof user]}
                    onChange={(e) => update({ [item.key]: e.target.checked })}
                    className="h-5 w-5 rounded accent-[var(--accent)]"
                  />
                </label>
              ))}
            </div>
          )}

          {section === 'security' && (
            <div className="space-y-4">
              <h3 className="font-medium">Change password</h3>
              <Input
                label="Current password"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
              <Input
                label="New password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
              <Button onClick={changePassword}>Update password</Button>

              <SessionsPanel />
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}

function SessionsPanel() {
  const [sessions, setSessions] = useState<
    { id: string; userAgent?: string; ipAddress?: string; createdAt: string }[]
  >([]);

  useEffect(() => {
    authApi.getSessions().then((r) => setSessions(r.data.data.sessions));
  }, []);

  return (
    <div className="mt-8">
      <h3 className="mb-3 font-medium">Active sessions</h3>
      <div className="space-y-2">
        {sessions.map((s) => (
          <div
            key={s.id}
            className="flex items-center justify-between rounded-xl bg-black/[0.03] p-3 text-sm"
          >
            <div>
              <p className="max-w-xs truncate">{s.userAgent || 'Unknown device'}</p>
              <p className="text-xs text-[var(--muted)]">{s.ipAddress}</p>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={async () => {
                await authApi.revokeSession(s.id);
                setSessions((prev) => prev.filter((x) => x.id !== s.id));
                toast.success('Session revoked');
              }}
            >
              Revoke
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
