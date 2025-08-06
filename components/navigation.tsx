'use client';

import { useState } from 'react';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { SignedIn, SignedOut, UserButton, useUser } from '@clerk/nextjs';
import {
  Menu,
  X,
  Settings,
  Palette,
  Code2,
  Gauge,
  ShieldAlert,
  CreditCard,
} from 'lucide-react';

const navItems = [
  {
    name: 'API Keys',
    href: '/configuration',
    icon: Settings,
    description: 'Manage your API keys',
  },
  {
    name: 'Billing System',
    href: '/billing-test',
    icon: CreditCard,
    description: 'Test billing integration',
  },
  {
    name: 'AI Styling',
    href: '/styling',
    icon: Palette,
    description: 'Design system generator',
  },
  {
    name: 'Generators',
    href: '/generators',
    icon: Code2,
    description: 'Code generation tools',
  },
  {
    name: 'Performance',
    href: '/performance',
    icon: Gauge,
    description: 'Monitor app performance',
  },
  {
    name: 'Rate Limiting',
    href: '/rate-limiting',
    icon: ShieldAlert,
    description: 'API rate limit dashboard',
  },
];

export function Navigation() {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user } = useUser();

  return (
    <>
      <SignedIn>
        <nav className='bg-white shadow-md'>
          <div className='mx-auto max-w-7xl px-4 sm:px-6 lg:px-8'>
            <div className='flex h-16 items-center justify-between'>
              {/* Logo */}
              <div className='flex items-center'>
                <Link href='/configuration' className='flex items-center'>
                  <span className='text-xl font-bold text-gray-900'>
                    SaaS Starter
                  </span>
                </Link>
              </div>

              {/* Desktop Navigation */}
              <div className='hidden md:flex md:items-center md:space-x-4'>
                {navItems.map(item => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center gap-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-blue-100 text-blue-700'
                          : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                      }`}
                      title={item.description}
                    >
                      <Icon className='h-4 w-4' />
                      <span>{item.name}</span>
                    </Link>
                  );
                })}
              </div>

              {/* User Menu - Using Clerk's UserButton */}
              <div className='hidden md:flex md:items-center md:space-x-4'>
                <UserButton
                  appearance={{
                    elements: {
                      avatarBox: 'h-8 w-8',
                    },
                  }}
                />
              </div>

              {/* Mobile menu button */}
              <div className='flex md:hidden'>
                <button
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                  className='inline-flex items-center justify-center rounded-md p-2 text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                >
                  <span className='sr-only'>Open main menu</span>
                  {isMobileMenuOpen ? (
                    <X className='h-6 w-6' />
                  ) : (
                    <Menu className='h-6 w-6' />
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Mobile menu */}
          {isMobileMenuOpen && (
            <div className='md:hidden'>
              <div className='space-y-1 px-2 pt-2 pb-3'>
                {navItems.map(item => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center gap-2 rounded-md px-3 py-2 text-base font-medium ${
                        isActive
                          ? 'bg-blue-100 text-blue-700'
                          : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                      }`}
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <Icon className='h-5 w-5' />
                      <div>
                        <div>{item.name}</div>
                        <div className='text-xs text-gray-500'>
                          {item.description}
                        </div>
                      </div>
                    </Link>
                  );
                })}

                <div className='my-2 border-t border-gray-200' />

                {/* Mobile User Info */}
                <div className='px-3 py-2'>
                  <div className='text-sm font-medium text-gray-900'>
                    Signed in as
                  </div>
                  <div className='truncate text-sm text-gray-500'>
                    {user?.emailAddresses[0]?.emailAddress}
                  </div>
                </div>

                {/* Mobile User Button */}
                <div className='px-3 py-2'>
                  <UserButton
                    appearance={{
                      elements: {
                        avatarBox: 'h-8 w-8',
                      },
                    }}
                  />
                </div>
              </div>
            </div>
          )}
        </nav>
      </SignedIn>
      <SignedOut>{/* No navigation for signed out users */}</SignedOut>
    </>
  );
}
