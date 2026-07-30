'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { MessageCircle, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { authApi } from '@/lib/api';

function Verify() {
  const params = useSearchParams();
  const token = params.get('token');
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setErrorMsg('No verification token found in the URL.');
      return;
    }
    authApi
      .verifyEmail(token)
      .then(() => {
        setStatus('success');
      })
      .catch((err: unknown) => {
        const msg =
          (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          'Verification link is invalid or has expired.';
        setErrorMsg(msg);
        setStatus('error');
      });
  }, [token]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--background)] px-4">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md rounded-3xl bg-white p-8 shadow-sm text-center"
      >
        <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#1a1a1a]">
          <MessageCircle className="h-7 w-7 text-[var(--accent)]" />
        </div>

        {status === 'loading' && (
          <div>
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-[#6366f1]" />
            <p className="mt-4 text-sm text-[var(--muted)]">Verifying your email...</p>
          </div>
        )}

        {status === 'success' && (
          <div>
            <CheckCircle2 className="mx-auto h-12 w-12 text-green-500" />
            <h1 className="mt-4 text-xl font-bold text-[#1a1a1a]">Email Verified</h1>
            <p className="mt-2 text-sm text-[var(--muted)]">
              Your ChatSphere account has been verified successfully.
            </p>
            <Link
              href="/login"
              className="mt-6 inline-block rounded-xl bg-[#1a1a1a] px-6 py-3 text-sm font-medium text-white hover:opacity-90"
            >
              Continue to Login
            </Link>
          </div>
        )}

        {status === 'error' && (
          <div>
            <XCircle className="mx-auto h-12 w-12 text-red-400" />
            <h1 className="mt-4 text-xl font-bold text-[#1a1a1a]">Verification Failed</h1>
            <p className="mt-2 text-sm text-[var(--muted)]">{errorMsg}</p>
            <Link
              href="/login"
              className="mt-6 inline-block rounded-xl bg-[#1a1a1a] px-6 py-3 text-sm font-medium text-white hover:opacity-90"
            >
              Back to Login
            </Link>
          </div>
        )}
      </motion.div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense>
      <Verify />
    </Suspense>
  );
}
