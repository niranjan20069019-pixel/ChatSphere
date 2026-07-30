import type { Metadata } from 'next';
import { Toaster } from 'react-hot-toast';
import './globals.css';

export const metadata: Metadata = {
  title: 'ChatSphere — Real-time Messaging',
  description:
    'Modern real-time messaging platform. Connect with friends using unique usernames.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            className: '!rounded-2xl !bg-white !text-[#1a1a1a] !shadow-lg',
            duration: 3000,
          }}
        />
      </body>
    </html>
  );
}
