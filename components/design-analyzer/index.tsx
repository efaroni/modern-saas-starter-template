'use client';

import { useState } from 'react';

import { Loader2, ArrowLeft } from 'lucide-react';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import type { DesignAnalysisResult } from '@/lib/ai/vision/types';
import { useAuth } from '@/lib/hooks/useAuth';

import { ImagePreview } from './image-preview';
import { ResultTabs } from './result-tabs';
import { UploadZone } from './upload-zone';

export function DesignAnalyzer() {
  const { user, isLoading: authLoading } = useAuth();
  const [images, setImages] = useState<File[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<DesignAnalysisResult | null>(null);

  const isAuthenticated = !!user && !authLoading;

  const handleFilesSelected = (files: File[]) => {
    setImages(files);
    setError(null);
  };

  const handleRemoveImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index);
    setImages(newImages);
  };

  const handleAnalyze = async () => {
    if (images.length === 0) return;

    setAnalyzing(true);
    setError(null);

    const formData = new FormData();
    images.forEach(image => formData.append('images', image));

    try {
      const response = await fetch('/api/ai/analyze-design', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Analysis failed');
      }

      setResult(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze design');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleReset = () => {
    setImages([]);
    setResult(null);
    setError(null);
  };

  // Show loading state while checking auth
  if (authLoading) {
    return (
      <div className='flex items-center justify-center py-12'>
        <div className='flex items-center gap-2'>
          <Loader2 className='h-4 w-4 animate-spin' />
          <span>Loading...</span>
        </div>
      </div>
    );
  }

  // Show auth required message
  if (!isAuthenticated) {
    return (
      <Alert>
        <AlertDescription>
          Please{' '}
          <a
            href='/auth'
            className='text-primary hover:text-primary/80 underline'
          >
            sign in
          </a>{' '}
          to use the Design System Analyzer.
        </AlertDescription>
      </Alert>
    );
  }

  // Show results view
  if (result) {
    return (
      <div className='space-y-6'>
        <div className='flex items-center gap-4'>
          <Button
            variant='outline'
            onClick={handleReset}
            className='flex items-center gap-2'
          >
            <ArrowLeft className='h-4 w-4' />
            Analyze New Design
          </Button>
        </div>

        <ResultTabs result={result} />
      </div>
    );
  }

  // Show upload and analysis view
  return (
    <div className='space-y-6'>
      <UploadZone
        onFilesSelected={handleFilesSelected}
        disabled={analyzing}
        acceptedFiles={images}
      />

      {images.length > 0 && (
        <ImagePreview images={images} onRemove={handleRemoveImage} />
      )}

      {error && (
        <Alert variant='destructive'>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {images.length > 0 && (
        <div className='flex justify-center gap-4'>
          <Button
            onClick={handleAnalyze}
            disabled={analyzing || images.length === 0}
            size='lg'
            className='min-w-[160px]'
          >
            {analyzing && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
            {analyzing ? 'Analyzing...' : 'Analyze Design'}
          </Button>

          <Button
            onClick={handleReset}
            variant='outline'
            disabled={analyzing}
            size='lg'
          >
            Clear All
          </Button>
        </div>
      )}

      {analyzing && (
        <div className='py-8 text-center'>
          <div className='mx-auto max-w-md space-y-4'>
            <Loader2 className='text-primary mx-auto h-8 w-8 animate-spin' />
            <div className='space-y-2'>
              <p className='font-medium'>
                Analyzing your design screenshots...
              </p>
              <p className='text-sm text-gray-600'>
                This may take 30-60 seconds. We&apos;re extracting colors,
                typography, spacing patterns, and generating your custom design
                system files.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
