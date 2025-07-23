import { type ReactNode } from 'react';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className='min-h-screen bg-gray-50'>
      {/* Future: Add navigation sidebar, header, etc. */}
      <div className='mx-auto max-w-7xl py-6 sm:px-6 lg:px-8'>{children}</div>
    </div>
  );
}
