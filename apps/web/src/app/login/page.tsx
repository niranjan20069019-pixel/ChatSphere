'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { MessageCircle, Eye, EyeOff, Mail } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/store/authStore';
import { authApi } from '@/lib/api';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

export default function LoginPage() {
  const router = useRouter();
  const login = useAuthStore((s) => s.login);
  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [emailNotVerified, setEmailNotVerified] = useState(false);
  const [resent, setResent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setEmailNotVerified(false);
    setResent(false);
    try {
      await login(emailOrUsername, password);
      toast.success('Welcome back!');
      router.push('/dashboard');
    } catch (err: unknown) {
      const code = (err as { response?: { data?: { code?: string } } })?.response?.data?.code;
      if (code === 'EMAIL_NOT_VERIFIED') {
        setEmailNotVerified(true);
      } else {
        toast.error('Login failed');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResent(false);
    try {
      await authApi.resendVerification(emailOrUsername);
      setResent(true);
      toast.success('Verification email sent');
    } catch {
      toast.error('Failed to resend');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--background)] px-4">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md rounded-3xl bg-white p-8 shadow-sm"
      >
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#1a1a1a]">
            <MessageCircle className="h-7 w-7 text-[var(--accent)]" />
          </div>
          <h1 className="text-2xl font-bold text-[#1a1a1a]">Welcome back</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">Sign in to ChatSphere</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            id="emailOrUsername"
            label="Email or username"
            value={emailOrUsername}
            onChange={(e) => setEmailOrUsername(e.target.value)}
            placeholder="demo or demo@chatsphere.app"
            required
          />
          <div className="relative">
            <Input
              id="password"
              label="Password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-[38px] text-[var(--muted)] hover:text-[#1a1a1a]"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <div className="text-right">
            <Link href="/forgot-password" className="text-xs text-[var(--muted)] hover:text-[#1a1a1a]">
              Forgot password?
            </Link>
          </div>
          {emailNotVerified && (
            <div className="rounded-xl bg-amber-50 p-4 text-center">
              <Mail className="mx-auto mb-2 h-5 w-5 text-amber-600" />
              <p className="text-sm font-medium text-amber-800">Email not verified</p>
              <p className="mt-1 text-xs text-amber-600">
                We sent a verification link to your email. Please check your inbox.
              </p>
              {resent ? (
                <p className="mt-2 text-xs text-green-600">Verification email sent! Check your inbox.</p>
              ) : (
                <button
                  type="button"
                  onClick={handleResend}
                  className="mt-2 text-xs font-medium text-[#6366f1] hover:underline"
                >
                  Resend verification email
                </button>
              )}
            </div>
          )}
          <Button type="submit" loading={loading} className="w-full">
            Sign in
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-[var(--muted)]">
          Don&apos;t have an account?{' '}
          <Link href="/register" className="font-medium text-[#1a1a1a] hover:underline">
            Register
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
