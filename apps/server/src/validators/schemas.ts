import { z } from 'zod';

export const registerSchema = z.object({
  body: z.object({
    username: z
      .string()
      .min(3)
      .max(30)
      .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
    email: z.string().email(),
    password: z.string().min(8).max(128),
    displayName: z.preprocess(
      (v) => (v === '' ? undefined : v),
      z.string().min(1).max(50).optional()
    ),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    emailOrUsername: z.string().min(1),
    password: z.string().min(1),
  }),
});

export const forgotPasswordSchema = z.object({
  body: z.object({
    email: z.string().email(),
  }),
});

export const resetPasswordSchema = z.object({
  body: z.object({
    token: z.string().min(1),
    password: z.string().min(8).max(128),
  }),
});

export const updateProfileSchema = z.object({
  body: z.object({
    displayName: z.string().min(1).max(50).optional(),
    bio: z.string().max(500).optional().nullable(),
    theme: z.enum(['light', 'dark', 'system']).optional(),
    themeColor: z.string().max(30).optional(),
    wallpaper: z.string().optional().nullable(),
    showOnlineStatus: z.boolean().optional(),
    showLastSeen: z.boolean().optional(),
    allowFriendRequests: z.boolean().optional(),
    notifyMessages: z.boolean().optional(),
    notifyFriendRequests: z.boolean().optional(),
    notifyGroups: z.boolean().optional(),
  }),
});

export const changePasswordSchema = z.object({
  body: z.object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(8).max(128),
  }),
});

export const sendMessageSchema = z.object({
  body: z.object({
    receiverId: z.string().min(1),
    content: z.string().max(10000).optional(),
    type: z
      .enum(['TEXT', 'IMAGE', 'VIDEO', 'AUDIO', 'VOICE', 'DOCUMENT', 'GIF'])
      .optional(),
    fileUrl: z.string().optional(),
    fileName: z.string().optional(),
    fileSize: z.number().optional(),
    mimeType: z.string().optional(),
    replyToId: z.string().optional(),
    forwardedFromId: z.string().optional(),
  }),
});

export const createGroupSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(100),
    description: z.string().max(500).optional(),
    memberIds: z.array(z.string()).optional(),
  }),
});

export const reportSchema = z.object({
  body: z.object({
    reportedId: z.string().min(1),
    reason: z.string().min(1).max(200),
    description: z.string().max(1000).optional(),
  }),
});

export const editMessageSchema = z.object({
  body: z.object({
    content: z.string().min(1).max(10000),
  }),
});

export const reactMessageSchema = z.object({
  body: z.object({
    emoji: z.string().min(1).max(16),
  }),
});

export const sendFriendRequestSchema = z.object({
  body: z.object({
    userId: z.string().min(1, 'userId is required'),
  }),
});

export const addGroupMembersSchema = z.object({
  body: z.object({
    memberIds: z.array(z.string().min(1)).min(1).max(100),
  }),
});

export const updateMemberRoleSchema = z.object({
  body: z.object({
    role: z.enum(['ADMIN', 'MEMBER']),
  }),
});

export const groupMessageSchema = z.object({
  body: z.object({
    content: z.string().max(10000).optional(),
    type: z
      .enum(['TEXT', 'IMAGE', 'VIDEO', 'AUDIO', 'VOICE', 'DOCUMENT', 'GIF'])
      .optional(),
    fileUrl: z.string().optional(),
    fileName: z.string().max(255).optional(),
    fileSize: z.number().int().nonnegative().optional(),
    mimeType: z.string().max(128).optional(),
    replyToId: z.string().optional(),
  }),
});

export const chatSettingSchema = z.object({
  body: z.object({
    isMuted: z.boolean().optional(),
    isArchived: z.boolean().optional(),
    isPinned: z.boolean().optional(),
    wallpaper: z.string().max(500).optional().nullable(),
  }),
});

export const blockUserSchema = z.object({
  body: z.object({
    userId: z.string().min(1, 'userId is required'),
  }),
});

export const adminUpdateUserSchema = z.object({
  body: z.object({
    status: z.enum(['ACTIVE', 'SUSPENDED', 'BANNED']).optional(),
    role: z.enum(['USER', 'ADMIN', 'MODERATOR']).optional(),
  }),
});

export const adminUpdateReportSchema = z.object({
  body: z.object({
    status: z.enum(['PENDING', 'REVIEWED', 'RESOLVED', 'DISMISSED']),
    reviewNote: z.string().max(1000).optional(),
  }),
});
