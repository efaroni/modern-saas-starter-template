import { Geist, Geist_Mono } from 'next/font/google';

import { ClerkProvider } from '@clerk/nextjs';

import { Navigation } from '@/components/navigation';

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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang='en'>
        <body
          className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        >
          {/* Navigation will be updated to use Clerk's user */}
          <Navigation />

          {/* Main content */}
          <main>{children}</main>
        </body>
      </html>
    </ClerkProvider>
  );
}
