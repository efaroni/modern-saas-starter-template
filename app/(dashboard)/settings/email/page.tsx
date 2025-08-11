'use client';

import { useEffect } from 'react';

import { useRouter } from 'next/navigation';

export default function EmailSettingsPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to the consolidated email management page
    router.replace('/emails');
  }, [router]);

  return (
    <div className='mx-auto max-w-2xl px-4 py-6 sm:px-6 lg:px-8'>
      <div className='text-center'>
        <div className='mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600' />
        <p className='mt-2 text-gray-600'>Redirecting to email management...</p>
      </div>
    </div>
  );
}
