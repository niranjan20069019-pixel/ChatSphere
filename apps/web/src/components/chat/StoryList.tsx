'use client';

import { Plus } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { User } from '@/types';

interface StoryListProps {
  friends: User[];
  onStoryClick?: (userId: string) => void;
  onAddStory?: () => void;
}

export function StoryList({ friends, onStoryClick, onAddStory }: StoryListProps) {
  const displayFriends = friends.slice(0, 15);

  return (
    <div className="stories-scroll px-4 py-3">
      <button onClick={onAddStory} className="flex shrink-0 flex-col items-center gap-1">
        <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-dashed border-[var(--card-border)] bg-white">
          <Plus className="h-6 w-6 text-[var(--muted)]" />
        </div>
        <span className="w-16 truncate text-center text-[11px] text-[var(--muted)]">Add Story</span>
      </button>

      {displayFriends.map((friend) => (
        <button
          key={friend.id}
          onClick={() => onStoryClick?.(friend.id)}
          className="flex shrink-0 flex-col items-center gap-1"
        >
          <div className="story-ring">
            <div className="rounded-full bg-white p-[2px]">
              <Avatar
                src={friend.avatarUrl}
                name={friend.displayName}
                size="md"
                className="h-14 w-14"
              />
            </div>
          </div>
          <span className="w-16 truncate text-center text-[11px] text-[var(--muted)]">
            {friend.displayName.split(' ')[0]}
          </span>
        </button>
      ))}
    </div>
  );
}
