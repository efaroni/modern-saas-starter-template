import { Spinner } from '@/components/ui/spinner';

export default function Loading() {
  return (
    <div className='flex min-h-screen items-center justify-center bg-gray-50'>
      <div className='text-center'>
        <Spinner className='mx-auto mb-4' />
        <p className='text-gray-600'>Loading...</p>
      </div>
    </div>
  );
}
