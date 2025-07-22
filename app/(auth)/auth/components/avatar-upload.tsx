'use client';

import { useState, useRef } from 'react';

import Image from 'next/image';

// TODO: Implement avatar upload with server actions
import { Spinner } from '@/components/ui/spinner';
import type { AuthUser } from '@/lib/auth/types';

interface AvatarUploadProps {
  user: AuthUser
  onSuccess: (user: AuthUser) => void
  onError: (error: string) => void
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
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        {/* Avatar Preview */}
        <div className="relative">
          <div className="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
            {user.image ? (
              <Image
                src={user.image}
                alt={`${user.name || 'User'}'s avatar`}
                width={80}
                height={80}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="text-gray-400 text-2xl">
                {user.name ? user.name.charAt(0).toUpperCase() : '?'}
              </div>
            )}
          </div>

          {/* Loading overlay */}
          {(isUploading || isDeleting) && (
            <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
              <Spinner size="sm" />
            </div>
          )}
        </div>

        {/* Avatar Controls */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleUploadClick}
              disabled={isUploading || isDeleting}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              {isUploading ? 'Uploading...' : user.image ? 'Change Avatar' : 'Upload Avatar'}
            </button>

            {user.image && (
              <button
                type="button"
                onClick={handleDeleteAvatar}
                disabled={isUploading || isDeleting}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                {isDeleting ? 'Deleting...' : 'Remove'}
              </button>
            )}
          </div>

          <p className="text-xs text-gray-500">
            JPG, PNG, GIF or WebP. Max 5MB.
          </p>
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
}