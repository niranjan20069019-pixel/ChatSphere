'use client';

import { useRouter } from 'next/navigation';
import { MessageCircle, UserPlus, Users, X } from 'lucide-react';

interface NewChatBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NewChatBottomSheet({ isOpen, onClose }: NewChatBottomSheetProps) {
  const router = useRouter();

  if (!isOpen) return null;

  const handleNewChat = () => {
    onClose();
    router.push('/search');
  };

  const handleNewContact = () => {
    onClose();
    router.push('/search');
  };

  const handleNewCommunity = () => {
    onClose();
    router.push('/groups');
  };

  return (
    <>
      <div className="bottom-sheet-overlay" onClick={onClose} />
      <div className="bottom-sheet">
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-[var(--card-border)]" />
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Create</h2>
          <button onClick={onClose} className="rounded-full p-2 hover:bg-black/5">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-1">
          <button
            onClick={handleNewChat}
            className="flex w-full items-center gap-4 rounded-xl px-3 py-3.5 transition hover:bg-black/[0.03] active:bg-black/[0.06]"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#f5dd42]/20">
              <MessageCircle className="h-6 w-6 text-[#1a1a1a]" />
            </div>
            <div className="text-left">
              <p className="font-medium text-sm">New Chat</p>
              <p className="text-xs text-[var(--muted)]">Send a message to your contact</p>
            </div>
          </button>

          <button
            onClick={handleNewContact}
            className="flex w-full items-center gap-4 rounded-xl px-3 py-3.5 transition hover:bg-black/[0.03] active:bg-black/[0.06]"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#f5dd42]/20">
              <UserPlus className="h-6 w-6 text-[#1a1a1a]" />
            </div>
            <div className="text-left">
              <p className="font-medium text-sm">New Contact</p>
              <p className="text-xs text-[var(--muted)]">Add a contact to be able to send messages</p>
            </div>
          </button>

          <button
            onClick={handleNewCommunity}
            className="flex w-full items-center gap-4 rounded-xl px-3 py-3.5 transition hover:bg-black/[0.03] active:bg-black/[0.06]"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#f5dd42]/20">
              <Users className="h-6 w-6 text-[#1a1a1a]" />
            </div>
            <div className="text-left">
              <p className="font-medium text-sm">New Community</p>
              <p className="text-xs text-[var(--muted)]">Join the community around you</p>
            </div>
          </button>
        </div>
      </div>
    </>
  );
}
