'use client';

import { useCallback } from 'react';

import { Upload, X } from 'lucide-react';
import { useDropzone } from 'react-dropzone';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface UploadZoneProps {
  onFilesSelected: (files: File[]) => void;
  disabled?: boolean;
  acceptedFiles?: File[];
}

export function UploadZone({
  onFilesSelected,
  disabled = false,
  acceptedFiles = [],
}: UploadZoneProps) {
  const onDrop = useCallback(
    (files: File[]) => {
      const validFiles = files.filter(file => {
        const validTypes = [
          'image/png',
          'image/jpeg',
          'image/jpg',
          'image/webp',
        ];
        const maxSize = 20 * 1024 * 1024; // 20MB
        return validTypes.includes(file.type) && file.size <= maxSize;
      });

      if (validFiles.length > 0) {
        const newFiles = [...acceptedFiles, ...validFiles].slice(0, 5); // Max 5 files
        onFilesSelected(newFiles);
      }
    },
    [onFilesSelected, acceptedFiles],
  );

  const { getRootProps, getInputProps, isDragActive, fileRejections } =
    useDropzone({
      onDrop,
      accept: {
        'image/png': ['.png'],
        'image/jpeg': ['.jpg', '.jpeg'],
        'image/webp': ['.webp'],
      },
      maxFiles: 5,
      maxSize: 20 * 1024 * 1024, // 20MB
      disabled,
    });

  const removeFile = (index: number) => {
    const newFiles = acceptedFiles.filter((_, i) => i !== index);
    onFilesSelected(newFiles);
  };

  return (
    <div className='space-y-4'>
      <Card
        {...getRootProps()}
        className={`cursor-pointer border-2 border-dashed p-8 text-center transition-colors ${
          isDragActive
            ? 'border-primary bg-primary/5'
            : 'border-gray-300 hover:border-gray-400'
        } ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
      >
        <input {...getInputProps()} />
        <Upload className='mx-auto mb-4 h-12 w-12 text-gray-400' />
        <div className='space-y-2'>
          <p className='text-lg font-medium'>
            {isDragActive
              ? 'Drop your design screenshots here'
              : 'Upload design screenshots'}
          </p>
          <p className='text-sm text-gray-500'>
            Drag & drop or click to select files
          </p>
          <p className='text-xs text-gray-400'>
            PNG, JPG, WebP up to 20MB • Max 5 files
          </p>
        </div>
      </Card>

      {fileRejections.length > 0 && (
        <div className='text-sm text-red-600'>
          <p className='font-medium'>Some files were rejected:</p>
          <ul className='mt-1 list-inside list-disc'>
            {fileRejections.map(({ file, errors }) => (
              <li key={file.name}>
                {file.name}: {errors.map(error => error.message).join(', ')}
              </li>
            ))}
          </ul>
        </div>
      )}

      {acceptedFiles.length > 0 && (
        <div className='space-y-2'>
          <h3 className='text-sm font-medium'>Selected Files:</h3>
          <div className='space-y-2'>
            {acceptedFiles.map((file, index) => (
              <div
                key={`${file.name}-${file.size}-${index}`}
                className='flex items-center justify-between rounded-md bg-gray-50 p-2'
              >
                <div className='flex items-center space-x-2'>
                  <div className='text-sm'>
                    <p className='font-medium'>{file.name}</p>
                    <p className='text-gray-500'>
                      {(file.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                </div>
                <Button
                  variant='ghost'
                  size='sm'
                  onClick={() => removeFile(index)}
                  disabled={disabled}
                >
                  <X className='h-4 w-4' />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
