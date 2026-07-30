export interface User {
  id: string;
  username: string;
  email?: string;
  displayName: string;
  avatarUrl?: string | null;
  bio?: string | null;
  role?: string;
  onlineStatus?: 'ONLINE' | 'AWAY' | 'OFFLINE' | 'BUSY';
  lastSeenAt?: string | null;
  emailVerified?: boolean;
  theme?: string;
  themeColor?: string;
  wallpaper?: string | null;
  showOnlineStatus?: boolean;
  showLastSeen?: boolean;
  allowFriendRequests?: boolean;
  notifyMessages?: boolean;
  notifyFriendRequests?: boolean;
  notifyGroups?: boolean;
  createdAt?: string;
}

export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  content?: string | null;
  type: string;
  fileUrl?: string | null;
  fileName?: string | null;
  fileSize?: number | null;
  mimeType?: string | null;
  replyToId?: string | null;
  isEdited: boolean;
  isDeleted: boolean;
  deletedForAll?: boolean;
  deliveredAt?: string | null;
  readAt?: string | null;
  createdAt: string;
  updatedAt?: string;
  sender?: User;
  receiver?: User;
  replyTo?: Message | null;
  reactions?: MessageReaction[];
}

export interface MessageReaction {
  id: string;
  messageId: string;
  userId: string;
  emoji: string;
  user?: User;
}

export interface Conversation {
  peer: User;
  lastMessage: Message;
  unreadCount: number;
  isMuted: boolean;
  isArchived: boolean;
  isPinned: boolean;
  wallpaper?: string | null;
}

export interface Friendship {
  id: string;
  requesterId: string;
  addresseeId: string;
  status: string;
  createdAt: string;
  requester?: User;
  addressee?: User;
}

export interface Group {
  id: string;
  name: string;
  description?: string | null;
  avatarUrl?: string | null;
  ownerId: string;
  myRole?: string;
  isMuted?: boolean;
  members?: GroupMember[];
  lastMessage?: GroupMessage | null;
  createdAt: string;
  _count?: { members: number };
}

export interface GroupMember {
  id: string;
  groupId: string;
  userId: string;
  role: string;
  user: User;
}

export interface GroupMessage {
  id: string;
  groupId: string;
  senderId: string;
  content?: string | null;
  type: string;
  fileUrl?: string | null;
  fileName?: string | null;
  isEdited: boolean;
  isDeleted: boolean;
  createdAt: string;
  sender?: User;
  replyTo?: GroupMessage | null;
}

export interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  isRead: boolean;
  createdAt: string;
}

export interface CallState {
  callId?: string;
  peerId?: string;
  peer?: User;
  type?: 'VOICE' | 'VIDEO';
  status: 'idle' | 'ringing' | 'calling' | 'active' | 'ended';
  isMuted: boolean;
  isCameraOff: boolean;
  isScreenSharing: boolean;
  localStream?: MediaStream | null;
  remoteStream?: MediaStream | null;
}
