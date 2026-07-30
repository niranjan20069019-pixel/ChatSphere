import { prisma } from '../config/database';
import { AppError } from './errors';

export async function assertDmParticipant(messageId: string, userId: string) {
  const message = await prisma.message.findUnique({ where: { id: messageId } });
  if (!message) throw new AppError('Message not found', 404);
  if (message.senderId !== userId && message.receiverId !== userId) {
    throw new AppError('Forbidden', 403);
  }
  return message;
}

export async function assertNotBlocked(userA: string, userB: string) {
  const blocked = await prisma.friendship.findFirst({
    where: {
      status: 'BLOCKED',
      OR: [
        { requesterId: userA, addresseeId: userB },
        { requesterId: userB, addresseeId: userA },
      ],
    },
  });
  if (blocked) throw new AppError('Cannot message this user', 403);
}

export async function assertValidDmReply(
  replyToId: string | undefined,
  senderId: string,
  receiverId: string
) {
  if (!replyToId) return;
  const reply = await prisma.message.findUnique({ where: { id: replyToId } });
  if (!reply) throw new AppError('Reply target not found', 400);
  const participants = new Set([reply.senderId, reply.receiverId]);
  if (!participants.has(senderId) || !participants.has(receiverId)) {
    throw new AppError('Invalid reply target', 400);
  }
}

export async function assertValidGroupReply(replyToId: string | undefined, groupId: string) {
  if (!replyToId) return;
  const reply = await prisma.groupMessage.findUnique({ where: { id: replyToId } });
  if (!reply || reply.groupId !== groupId) {
    throw new AppError('Invalid reply target', 400);
  }
}

export async function assertForwardAccess(forwardedFromId: string | undefined, userId: string) {
  if (!forwardedFromId) return;
  await assertDmParticipant(forwardedFromId, userId);
}

const ALLOWED_FILE_URL_PREFIXES = ['https://res.cloudinary.com/', 'http://localhost:', 'https://localhost:'];

export function isAllowedFileUrl(url: string | undefined | null): boolean {
  if (!url) return true;
  if (url.startsWith('data:image/') || url.startsWith('data:audio/')) {
    return process.env.NODE_ENV !== 'production';
  }
  return ALLOWED_FILE_URL_PREFIXES.some((p) => url.startsWith(p));
}

export function assertAllowedFileUrl(url: string | undefined | null) {
  if (url && !isAllowedFileUrl(url)) {
    throw new AppError('Invalid file URL', 400);
  }
}
