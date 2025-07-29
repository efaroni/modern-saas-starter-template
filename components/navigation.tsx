'use client';

import { useState } from 'react';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import {
  Menu,
  X,
  Settings,
  Palette,
  Code2,
  Gauge,
  ShieldAlert,
  User,
  LogOut,
} from 'lucide-react';

import { logoutAction } from '@/app/actions/auth';
import type { AuthUser } from '@/lib/auth/types';

interface NavigationProps {
  user: AuthUser | null;
}

const navItems = [
  {
    name: 'API Keys',
    href: '/configuration',
    icon: Settings,
    description: 'Manage your API keys',
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

export function Navigation({ user }: NavigationProps) {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  if (!user) return null;

  const handleSignOut = async () => {
    await logoutAction();
    window.location.href = '/?message=logged-out';
  };

  return (
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

          {/* User Menu */}
          <div className='hidden md:flex md:items-center md:space-x-4'>
            <div className='group relative'>
              <button className='flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100'>
                <User className='h-4 w-4' />
                <span className='max-w-[150px] truncate'>{user.email}</span>
              </button>

              {/* Dropdown */}
              <div className='ring-opacity-5 invisible absolute right-0 mt-1 w-48 rounded-md bg-white opacity-0 shadow-lg ring-1 ring-black transition-all group-hover:visible group-hover:opacity-100'>
                <div className='py-1'>
                  <Link
                    href='/auth'
                    className='flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100'
                  >
                    <User className='h-4 w-4' />
                    Account Settings
                  </Link>
                  <button
                    onClick={handleSignOut}
                    className='flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100'
                  >
                    <LogOut className='h-4 w-4' />
                    Sign Out
                  </button>
                </div>
              </div>
            </div>
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
              <div className='truncate text-sm text-gray-500'>{user.email}</div>
            </div>

            <Link
              href='/auth'
              className='flex items-center gap-2 rounded-md px-3 py-2 text-base font-medium text-gray-700 hover:bg-gray-100'
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <User className='h-5 w-5' />
              Account Settings
            </Link>

            <button
              onClick={handleSignOut}
              className='flex w-full items-center gap-2 rounded-md px-3 py-2 text-base font-medium text-gray-700 hover:bg-gray-100'
            >
              <LogOut className='h-5 w-5' />
              Sign Out
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}
