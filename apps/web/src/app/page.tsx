'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { MessageCircle, Shield, Zap, Users, Video, Globe } from 'lucide-react';
import { Button } from '@/components/ui/Button';

const features = [
  {
    icon: Zap,
    title: 'Real-time messaging',
    desc: 'Instant delivery with typing indicators, read receipts, and presence.',
  },
  {
    icon: Users,
    title: 'Friends & groups',
    desc: 'Find people by username, manage requests, and build communities.',
  },
  {
    icon: Video,
    title: 'Voice & video calls',
    desc: 'Crystal-clear WebRTC calls with screen sharing and mute controls.',
  },
  {
    icon: Shield,
    title: 'Secure by design',
    desc: 'JWT auth, refresh rotation, bcrypt hashing, and privacy controls.',
  },
  {
    icon: Globe,
    title: 'Rich media',
    desc: 'Share images, videos, voice notes, documents, GIFs, and more.',
  },
  {
    icon: MessageCircle,
    title: 'Premium experience',
    desc: 'Themes, wallpapers, reactions, replies, pins, and archives.',
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen overflow-hidden bg-[#1a1a1a] text-white">
      <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--accent)]">
            <MessageCircle className="h-5 w-5 text-[#1a1a1a]" />
          </div>
          <span className="text-xl font-semibold tracking-tight">ChatSphere</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login">
            <Button variant="ghost">Log in</Button>
          </Link>
          <Link href="/register">
            <Button>Get started</Button>
          </Link>
        </div>
      </header>

      <main className="relative z-10">
        <section className="mx-auto max-w-6xl px-6 pb-24 pt-16 text-center md:pt-28">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <p className="mb-4 text-sm font-medium uppercase tracking-widest text-[var(--accent)]">
              Messaging, reimagined
            </p>
            <h1 className="mx-auto max-w-3xl text-4xl font-bold tracking-tight md:text-6xl md:leading-[1.1]">
              Connect with anyone through{' '}
              <span className="bg-gradient-to-r from-[var(--accent)] to-[#ff9500] bg-clip-text text-transparent">
                unique usernames
              </span>
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-lg text-white/60">
              ChatSphere brings WhatsApp-speed messaging, Discord-style groups, and Slack polish
              together — without phone numbers.
            </p>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
              <Link href="/register">
                <Button size="lg" className="shadow-xl">
                  Create free account
                </Button>
              </Link>
              <Link href="/login">
                <Button variant="secondary" size="lg">
                  Sign in
                </Button>
              </Link>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="mx-auto mt-16 max-w-4xl overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-2 shadow-2xl backdrop-blur-xl"
          >
            <div className="rounded-2xl bg-white/5 p-6">
              <div className="flex gap-4">
                <div className="hidden w-48 space-y-2 rounded-xl bg-white/10 p-3 sm:block">
                  {['Alice Chen', 'Bob Martinez', 'Design Team'].map((n, i) => (
                    <div
                      key={n}
                      className={`flex items-center gap-2 rounded-lg px-2 py-2 ${i === 0 ? 'bg-[var(--accent)]/20' : ''}`}
                    >
                      <div className="h-8 w-8 rounded-full bg-white/20" />
                      <span className="text-xs">{n}</span>
                    </div>
                  ))}
                </div>
                <div className="flex-1 space-y-3">
                  <div className="flex justify-start">
                    <div className="rounded-2xl rounded-bl-md bg-white/10 px-4 py-2 text-sm">
                      Hey! Ready for the launch? 🚀
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <div className="rounded-2xl rounded-br-md bg-[var(--accent)] px-4 py-2 text-sm text-[#1a1a1a]">
                      Absolutely. ChatSphere looks amazing!
                    </div>
                  </div>
                  <div className="flex justify-start">
                    <div className="rounded-2xl rounded-bl-md bg-white/10 px-4 py-2 text-sm text-white/60">
                      typing...
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </section>

        <section className="mx-auto max-w-6xl px-6 py-20">
          <h2 className="mb-12 text-center text-3xl font-bold">Everything you need to connect</h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm"
              >
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--accent)]/20 text-[var(--accent)]">
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="font-semibold">{f.title}</h3>
                <p className="mt-2 text-sm text-white/60">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </section>
      </main>

      <footer className="relative z-10 border-t border-white/10 py-8 text-center text-sm text-white/40">
        © {new Date().getFullYear()} ChatSphere. Built for modern conversations.
      </footer>
    </div>
  );
}
