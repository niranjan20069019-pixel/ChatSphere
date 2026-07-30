'use client';

import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { Plus, Users, Send, X, UserPlus, Camera, ChevronRight, Shield, Crown, Check } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { groupsApi, friendsApi } from '@/lib/api';
import { getSocket as getSock } from '@/lib/socket';
import { Group, GroupMessage, User } from '@/types';
import { useAuthStore } from '@/store/authStore';
import { formatMessageTime } from '@/lib/utils';

export default function GroupsPage() {
  const user = useAuthStore((s) => s.user);
  const [groups, setGroups] = useState<Group[]>([]);
  const [active, setActive] = useState<Group | null>(null);
  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [text, setText] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [friends, setFriends] = useState<User[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [showAddMembers, setShowAddMembers] = useState(false);
  const [addMemberIds, setAddMemberIds] = useState<string[]>([]);
  const [showGroupInfo, setShowGroupInfo] = useState(false);
  const [showAvatarPreview, setShowAvatarPreview] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    const res = await groupsApi.list();
    setGroups(res.data.data.groups);
  };

  useEffect(() => {
    load();
    friendsApi.list().then((r) => setFriends(r.data.data.friends));
  }, []);

  const openGroup = async (g: Group) => {
    setActive(g);
    const res = await groupsApi.messages(g.id);
    setMessages(res.data.data.messages);
    getSock()?.emit('group:join', { groupId: g.id });
  };

  useEffect(() => {
    const socket = getSock();
    if (!socket) return;
    const handler = ({ message }: { message: GroupMessage }) => {
      if (message.groupId === active?.id) {
        setMessages((prev) => prev.some((m) => m.id === message.id) ? prev : [...prev, message]);
      }
    };
    socket.on('group:message', handler);
    return () => {
      socket.off('group:message', handler);
    };
  }, [active?.id]);

  const loadGroup = async (id: string) => {
    const res = await groupsApi.get(id);
    setActive(res.data.data.group);
    setGroups((prev) => prev.map((g) => (g.id === id ? res.data.data.group : g)));
  };

  const openGroupInfo = () => {
    if (!active) return;
    setEditName(active.name);
    setEditDescription(active.description || '');
    setShowGroupInfo(true);
  };

  const handleUpdateGroup = async () => {
    if (!active || !editName.trim()) return;
    setSaving(true);
    try {
      const res = await groupsApi.update(active.id, { name: editName.trim(), description: editDescription.trim() || undefined });
      const updated = res.data.data.group;
      setActive(updated);
      setGroups((prev) => prev.map((g) => (g.id === updated.id ? updated : g)));
      toast.success('Group updated');
    } catch {
      toast.error('Failed to update group');
    } finally {
      setSaving(false);
    }
  };

  const openAvatarPreview = () => {
    if (active?.avatarUrl) setShowAvatarPreview(true);
  };

  const handleAddMembers = async () => {
    if (!active || !addMemberIds.length) return;
    await groupsApi.addMembers(active.id, addMemberIds);
    toast.success('Members added');
    setShowAddMembers(false);
    setAddMemberIds([]);
    await loadGroup(active.id);
  };

  const create = async () => {
    if (!name.trim()) return;
    await groupsApi.create({ name, description, memberIds: selectedMembers });
    toast.success('Group created');
    setShowCreate(false);
    setName('');
    setDescription('');
    setSelectedMembers([]);
    load();
  };

  const uploadAvatar = async (file: File) => {
    if (!active) return;
    try {
      const res = await groupsApi.uploadAvatar(active.id, file);
      setActive(res.data.data.group);
      setGroups((prev) => prev.map((g) => (g.id === active.id ? res.data.data.group : g)));
      toast.success('Group photo updated');
    } catch (err: unknown) {
      toast.error(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          'Upload failed'
      );
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const send = () => {
    if (!active || !text.trim()) return;
    getSock()?.emit(
      'group:message',
      { groupId: active.id, content: text.trim(), type: 'TEXT' },
      (res: { success: boolean; message?: GroupMessage }) => {
        if (res.success && res.message) {
          setMessages((prev) => [...prev, res.message!]);
        }
      }
    );
    setText('');
  };

  return (
    <AppShell>
      <div className="flex h-full">
        <div className="flex w-full flex-col border-r border-[var(--card-border)] md:w-80 lg:w-96">
          <div className="flex items-center justify-between p-4">
            <h1 className="text-xl font-semibold">Groups</h1>
            <Button size="sm" onClick={() => setShowCreate(true)}>
              <Plus className="h-4 w-4" /> New
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto px-2 pb-4">
            {groups.map((g) => (
              <button
                key={g.id}
                onClick={() => openGroup(g)}
                className={`mb-1 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition ${
                  active?.id === g.id ? 'bg-brand-600/15' : 'hover:bg-black/5 dark:hover:bg-white/5'
                }`}
              >
                <Avatar src={g.avatarUrl} name={g.name} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{g.name}</p>
                  <p className="truncate text-xs text-[var(--muted)]">
                    {g.lastMessage?.content || g.description || 'No messages yet'}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="hidden flex-1 flex-col md:flex">
          {!active ? (
            <div className="flex flex-1 flex-col items-center justify-center text-[var(--muted)]">
              <Users className="mb-3 h-12 w-12 opacity-40" />
              <p>Select a group or create one</p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between border-b border-[var(--card-border)] px-4 py-3">
                <div onClick={openGroupInfo} className="flex cursor-pointer items-center gap-3">
                  <div className="relative shrink-0">
                    <Avatar src={active.avatarUrl} name={active.name} size="md" />
                    <button
                      onClick={(e) => { e.stopPropagation(); fileRef.current?.click(); }}
                      className="absolute -bottom-0.5 -right-0.5 rounded-full bg-brand-600 p-1 text-white shadow-lg"
                    >
                      <Camera className="h-3 w-3" />
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
                  <div>
                    <h2 className="font-semibold">{active.name}</h2>
                    <p className="text-xs text-[var(--muted)]">
                      {active.members?.length || active._count?.members || 0} members · {active.myRole}
                    </p>
                  </div>
                  <ChevronRight className="ml-2 h-4 w-4 text-[var(--muted)]" />
                </div>
                {active.myRole !== 'MEMBER' && (
                  <button
                    onClick={() => {
                      setAddMemberIds([]);
                      setShowAddMembers(true);
                    }}
                    className="flex items-center gap-1 rounded-full bg-brand-600/15 px-3 py-1.5 text-xs font-medium text-brand-500 transition hover:bg-brand-600/25"
                  >
                    <UserPlus className="h-3.5 w-3.5" /> Add
                  </button>
                )}
              </div>
              <div className="flex-1 space-y-3 overflow-y-auto p-4">
                {messages.filter((m, i, arr) => arr.findIndex((x) => x.id === m.id) === i).map((m) => {
                  const isMe = m.senderId === user?.id;
                  return (
                    <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                      <div className={isMe ? 'message-bubble-me' : 'message-bubble-them'}>
                        {!isMe && (
                          <p className="mb-1 text-xs font-medium text-brand-400">
                            {m.sender?.displayName}
                          </p>
                        )}
                        <p>{m.content}</p>
                        <p className={`mt-1 text-[10px] ${isMe ? 'text-white/70' : 'text-[var(--muted)]'}`}>
                          {formatMessageTime(m.createdAt)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex gap-2 border-t border-[var(--card-border)] p-3">
                <input
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && send()}
                  placeholder="Message the group..."
                  className="input-field flex-1"
                />
                <Button onClick={send}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </>
          )}
        </div>
      </div>

      {showAddMembers && active && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="glass w-full max-w-md rounded-3xl p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Add members to {active.name}</h2>
              <button onClick={() => { setShowAddMembers(false); setAddMemberIds([]); }}>
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <p className="mb-2 text-sm font-medium">Select friends to add</p>
                <div className="max-h-60 space-y-1 overflow-y-auto">
                  {friends
                    .filter((f) => !active.members?.some((m) => m.userId === f.id))
                    .map((f) => (
                      <label key={f.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-black/5 dark:hover:bg-white/5">
                        <input
                          type="checkbox"
                          checked={addMemberIds.includes(f.id)}
                          onChange={(e) =>
                            setAddMemberIds((prev) =>
                              e.target.checked ? [...prev, f.id] : prev.filter((id) => id !== f.id)
                            )
                          }
                        />
                        <Avatar src={f.avatarUrl} name={f.displayName} size="sm" />
                        <span className="text-sm">{f.displayName}</span>
                      </label>
                    ))}
                  {friends.filter((f) => !active.members?.some((m) => m.userId === f.id)).length === 0 && (
                    <p className="py-4 text-center text-sm text-[var(--muted)]">All your friends are already in this group</p>
                  )}
                </div>
              </div>
              <Button onClick={handleAddMembers} className="w-full" disabled={!addMemberIds.length}>
                Add {addMemberIds.length > 0 ? `(${addMemberIds.length})` : ''}
              </Button>
            </div>
          </div>
        </div>
      )}

      {showGroupInfo && active && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="glass w-full max-w-lg rounded-3xl p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Group Info</h2>
              <button onClick={() => setShowGroupInfo(false)}>
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-5">
              <div className="flex justify-center">
                <button onClick={openAvatarPreview} className="relative">
                  <Avatar src={active.avatarUrl} name={active.name} size="xl" />
                  {active.avatarUrl && (
                    <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/0 text-white/0 transition hover:bg-black/40 hover:text-white">
                      <Camera className="h-6 w-6" />
                    </span>
                  )}
                </button>
              </div>

              <div className="space-y-1">
                <label className="block text-sm font-medium text-[var(--foreground)]">Group Name</label>
                {active.myRole !== 'MEMBER' ? (
                  <div className="flex gap-2">
                    <input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="input-field flex-1"
                      placeholder="Group name"
                    />
                  </div>
                ) : (
                  <p className="text-sm text-[var(--foreground)]">{active.name}</p>
                )}
              </div>

              <div className="space-y-1">
                <label className="block text-sm font-medium text-[var(--foreground)]">Description</label>
                {active.myRole !== 'MEMBER' ? (
                  <textarea
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    className="input-field min-h-[80px] w-full resize-none"
                    placeholder="Add a description..."
                    rows={3}
                  />
                ) : (
                  <p className="text-sm text-[var(--muted)]">{active.description || 'No description'}</p>
                )}
              </div>

              {active.myRole !== 'MEMBER' && (
                <Button onClick={handleUpdateGroup} loading={saving} className="w-full">
                  <Check className="h-4 w-4" /> Save
                </Button>
              )}

              <div>
                <h3 className="mb-2 text-sm font-semibold text-[var(--foreground)]">
                  Members ({active.members?.length || 0})
                </h3>
                <div className="max-h-48 space-y-1 overflow-y-auto">
                  {active.members?.map((m) => (
                    <div key={m.id} className="flex items-center gap-3 rounded-lg px-2 py-2">
                      <Avatar src={m.user.avatarUrl} name={m.user.displayName} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{m.user.displayName}</p>
                        <p className="truncate text-xs text-[var(--muted)]">@{m.user.username}</p>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-[var(--muted)]">
                        {m.role === 'OWNER' && <Crown className="h-3.5 w-3.5 text-amber-500" />}
                        {m.role === 'ADMIN' && <Shield className="h-3.5 w-3.5 text-brand-500" />}
                        <span>{m.role}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showAvatarPreview && active?.avatarUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          onClick={() => setShowAvatarPreview(false)}
        >
          <button
            onClick={() => setShowAvatarPreview(false)}
            className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white transition hover:bg-white/20"
          >
            <X className="h-6 w-6" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={active.avatarUrl}
            alt={active.name}
            className="max-h-[80vh] max-w-full rounded-2xl object-contain shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="glass w-full max-w-md rounded-3xl p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Create group</h2>
              <button onClick={() => setShowCreate(false)}>
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} />
              <Input
                label="Description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
              <div>
                <p className="mb-2 text-sm font-medium">Add members</p>
                <div className="max-h-40 space-y-1 overflow-y-auto">
                  {friends.map((f) => (
                    <label key={f.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-black/5 dark:hover:bg-white/5">
                      <input
                        type="checkbox"
                        checked={selectedMembers.includes(f.id)}
                        onChange={(e) =>
                          setSelectedMembers((prev) =>
                            e.target.checked
                              ? [...prev, f.id]
                              : prev.filter((id) => id !== f.id)
                          )
                        }
                      />
                      <Avatar src={f.avatarUrl} name={f.displayName} size="sm" />
                      <span className="text-sm">{f.displayName}</span>
                    </label>
                  ))}
                </div>
              </div>
              <Button onClick={create} className="w-full">
                Create group
              </Button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
