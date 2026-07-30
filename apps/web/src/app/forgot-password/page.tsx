'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { MessageCircle, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import { authApi } from '@/lib/api';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await authApi.forgotPassword(email);
      setSent(true);
      toast.success('Check your email for reset instructions');
    } catch {
      toast.error('Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--background)] px-4">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md rounded-3xl bg-white p-8 shadow-sm"
      >
        <Link href="/login" className="mb-6 inline-flex items-center gap-1 text-sm text-[var(--muted)] hover:text-[#1a1a1a]">
          <ArrowLeft className="h-4 w-4" /> Back to login
        </Link>
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#1a1a1a]">
            <MessageCircle className="h-7 w-7 text-[var(--accent)]" />
          </div>
          <h1 className="text-2xl font-bold text-[#1a1a1a]">Forgot password</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            We&apos;ll send you a reset link
          </p>
        </div>

        {sent ? (
          <div className="rounded-xl bg-[#34c759]/10 p-4 text-center text-sm text-[var(--success)]">
            If an account exists for {email}, a reset link has been sent.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              id="email"
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Button type="submit" loading={loading} className="w-full">
              Send reset link
            </Button>
          </form>
        )}
      </motion.div>
    </div>
  );
}
