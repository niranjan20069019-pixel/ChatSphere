'use client';

import { Plus } from 'lucide-react';

interface NewChatFABProps {
  onClick: () => void;
}

export function NewChatFAB({ onClick }: NewChatFABProps) {
  return (
    <div className="fixed bottom-24 right-5 z-30 lg:bottom-8">
      <button onClick={onClick} className="fab-button shadow-2xl">
        <Plus className="h-5 w-5" />
        <span className="hidden sm:inline">New Chat</span>
      </button>
    </div>
  );
}
