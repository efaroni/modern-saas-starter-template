'use client';

import { useState, useRef } from 'react';

import Image from 'next/image';

// TODO: Implement avatar upload with server actions
import { Spinner } from '@/components/ui/spinner';
import type { AuthUser } from '@/lib/auth/types';

interface AvatarUploadProps {
  user: AuthUser;
  onSuccess: (user: AuthUser) => void;
  onError: (error: string) => void;
}

export function AvatarUpload({ user, onError }: AvatarUploadProps) {
  const [isUploading, _setIsUploading] = useState(false);
  const [isDeleting, _setIsDeleting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // TODO: Implement avatar upload server action
    onError('Avatar upload not yet implemented');

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDeleteAvatar = () => {
    // TODO: Implement avatar deletion server action
    onError('Avatar deletion not yet implemented');
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className='space-y-4'>
      <div className='flex items-center gap-4'>
        {/* Avatar Preview */}
        <div className='relative'>
          <div className='flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-gray-200'>
            {user.image ? (
              <Image
                src={user.image}
                alt={`${user.name || 'User'}'s avatar`}
                width={80}
                height={80}
                className='h-full w-full object-cover'
              />
            ) : (
              <div className='text-2xl text-gray-400'>
                {user.name ? user.name.charAt(0).toUpperCase() : '?'}
              </div>
            )}
          </div>

          {/* Loading overlay */}
          {(isUploading || isDeleting) && (
            <div className='bg-opacity-50 absolute inset-0 flex items-center justify-center rounded-full bg-black'>
              <Spinner size='sm' />
            </div>
          )}
        </div>

        {/* Avatar Controls */}
        <div className='space-y-2'>
          <div className='flex items-center gap-2'>
            <button
              type='button'
              onClick={handleUploadClick}
              disabled={isUploading || isDeleting}
              className='rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50'
            >
              {(() => {
                if (isUploading) return 'Uploading...';
                if (user.image) return 'Change Avatar';
                return 'Upload Avatar';
              })()}
            </button>

            {user.image && (
              <button
                type='button'
                onClick={handleDeleteAvatar}
                disabled={isUploading || isDeleting}
                className='rounded-md bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700 focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50'
              >
                {isDeleting ? 'Deleting...' : 'Remove'}
              </button>
            )}
          </div>

          <p className='text-xs text-gray-500'>
            JPG, PNG, GIF or WebP. Max 5MB.
          </p>
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type='file'
        accept='image/jpeg,image/png,image/gif,image/webp'
        onChange={handleFileSelect}
        className='hidden'
      />
    </div>
  );
}
