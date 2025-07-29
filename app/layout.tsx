import { Geist, Geist_Mono } from 'next/font/google';

import { Navigation } from '@/components/navigation';
import { auth } from '@/lib/auth/auth';

import type { Metadata } from 'next';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Modern SaaS Starter Template',
  description:
    'A comprehensive SaaS starter template with authentication, payments, AI, and more',
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Get current user session
  const session = await auth();
  const user = session?.user
    ? {
        id: session.user.id || '',
        email: session.user.email || '',
        name: session.user.name || null,
        emailVerified: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
    : null;

  return (
    <html lang='en'>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {/* Show navigation only for authenticated users */}
        <Navigation user={user} />

        {/* Main content */}
        <main className={user ? 'min-h-screen bg-gray-50' : ''}>
          {children}
        </main>
      </body>
    </html>
  );
}
