import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('Password123!', 12);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@chatsphere.app' },
    update: {},
    create: {
      username: 'admin',
      email: 'admin@chatsphere.app',
      passwordHash,
      displayName: 'Admin',
      role: 'ADMIN',
      emailVerified: true,
      bio: 'ChatSphere platform administrator',
    },
  });

  const demo = await prisma.user.upsert({
    where: { email: 'demo@chatsphere.app' },
    update: {},
    create: {
      username: 'demo',
      email: 'demo@chatsphere.app',
      passwordHash,
      displayName: 'Demo User',
      emailVerified: true,
      bio: 'Welcome to ChatSphere!',
    },
  });

  const alice = await prisma.user.upsert({
    where: { email: 'alice@chatsphere.app' },
    update: {},
    create: {
      username: 'alice',
      email: 'alice@chatsphere.app',
      passwordHash,
      displayName: 'Alice Chen',
      emailVerified: true,
      bio: 'Coffee enthusiast ☕',
    },
  });

  const bob = await prisma.user.upsert({
    where: { email: 'bob@chatsphere.app' },
    update: {},
    create: {
      username: 'bob',
      email: 'bob@chatsphere.app',
      passwordHash,
      displayName: 'Bob Martinez',
      emailVerified: true,
      bio: 'Building cool things',
    },
  });

  await prisma.friendship.upsert({
    where: {
      requesterId_addresseeId: { requesterId: demo.id, addresseeId: alice.id },
    },
    update: { status: 'ACCEPTED' },
    create: {
      requesterId: demo.id,
      addresseeId: alice.id,
      status: 'ACCEPTED',
    },
  });

  await prisma.friendship.upsert({
    where: {
      requesterId_addresseeId: { requesterId: demo.id, addresseeId: bob.id },
    },
    update: { status: 'ACCEPTED' },
    create: {
      requesterId: demo.id,
      addresseeId: bob.id,
      status: 'ACCEPTED',
    },
  });

  console.log('Seed complete:');
  console.log(`  Admin: admin@chatsphere.app / Password123!`);
  console.log(`  Demo:  demo@chatsphere.app / Password123!`);
  console.log(`  Alice: alice@chatsphere.app / Password123!`);
  console.log(`  Bob:   bob@chatsphere.app / Password123!`);
  console.log(`  Users: ${admin.username}, ${demo.username}, ${alice.username}, ${bob.username}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
