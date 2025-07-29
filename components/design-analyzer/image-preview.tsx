'use client';

import { useState, useEffect } from 'react';

import { X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface ImagePreviewProps {
  images: File[];
  onRemove?: (index: number) => void;
  maxDisplay?: number;
}

export function ImagePreview({
  images,
  onRemove,
  maxDisplay = 5,
}: ImagePreviewProps) {
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);

  useEffect(() => {
    // Create object URLs for image previews
    const urls = images
      .slice(0, maxDisplay)
      .map(file => URL.createObjectURL(file));
    setPreviewUrls(urls);

    // Cleanup object URLs when component unmounts or images change
    return () => {
      urls.forEach(url => URL.revokeObjectURL(url));
    };
  }, [images, maxDisplay]);

  if (images.length === 0) {
    return null;
  }

  const displayImages = images.slice(0, maxDisplay);
  const hasMore = images.length > maxDisplay;

  return (
    <div className='space-y-4'>
      <div className='flex items-center justify-between'>
        <h3 className='text-lg font-semibold'>
          Design Screenshots ({images.length})
        </h3>
        {hasMore && (
          <span className='text-sm text-gray-500'>
            Showing {maxDisplay} of {images.length}
          </span>
        )}
      </div>

      <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3'>
        {displayImages.map((file, index) => (
          <Card
            key={`${file.name}-${file.size}-${index}`}
            className='relative overflow-hidden'
          >
            <div className='flex aspect-video items-center justify-center bg-gray-100'>
              {previewUrls[index] ? (
                <img
                  src={previewUrls[index]}
                  alt={`Preview of ${file.name}`}
                  className='max-h-full max-w-full object-contain'
                />
              ) : (
                <div className='flex h-full w-full animate-pulse items-center justify-center bg-gray-200'>
                  <span className='text-gray-400'>Loading...</span>
                </div>
              )}
            </div>

            {onRemove && (
              <Button
                variant='destructive'
                size='sm'
                className='absolute top-2 right-2 h-6 w-6 p-0'
                onClick={() => onRemove(index)}
                title={`Remove ${file.name}`}
              >
                <X className='h-3 w-3' />
              </Button>
            )}

            <div className='border-t p-3'>
              <p className='truncate text-sm font-medium' title={file.name}>
                {file.name}
              </p>
              <div className='mt-1 flex justify-between text-xs text-gray-500'>
                <span>{(file.size / 1024).toFixed(1)} KB</span>
                <span className='capitalize'>{file.type.split('/')[1]}</span>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {hasMore && (
        <div className='py-4 text-center'>
          <p className='text-sm text-gray-500'>
            {images.length - maxDisplay} more image
            {images.length - maxDisplay > 1 ? 's' : ''} selected
          </p>
        </div>
      )}
    </div>
  );
}
