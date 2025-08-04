'use client';

import { useState } from 'react';

import Link from 'next/link';

import { useUser } from '@clerk/nextjs';
import {
  Loader2,
  ArrowLeft,
  CheckCircle,
  XCircle,
  AlertCircle,
} from 'lucide-react';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import type { DesignAnalysisResult } from '@/lib/ai/vision/types';
import { useOpenAIKeyValidation } from '@/lib/hooks/useOpenAIKeyValidation';

import { ImagePreview } from './image-preview';
import { ResultTabs } from './result-tabs';
import { UploadZone } from './upload-zone';

export function DesignAnalyzer() {
  const { isLoaded, isSignedIn, user: _user } = useUser();
  const {
    isValid: isKeyValid,
    isLoading: keyValidating,
    error: keyError,
    hasVisionModel,
    fullValidation,
  } = useOpenAIKeyValidation();
  const [images, setImages] = useState<File[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<{
    message: string;
    details?: string;
    action?: { text: string; url: string };
  } | null>(null);
  const [result, setResult] = useState<DesignAnalysisResult | null>(null);

  const canUseAnalyzer = isLoaded && isSignedIn && isKeyValid && !keyValidating;

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
        // Enhanced error handling with action buttons
        const errorMessage = data.error || 'Analysis failed';
        const errorDetails = data.details;
        const actionButton = data.action;

        // Create a more detailed error object
        const enhancedError = new Error(errorMessage) as Error & {
          details?: string;
          action?: { text: string; url: string };
        };
        enhancedError.details = errorDetails;
        enhancedError.action = actionButton;

        throw enhancedError;
      }

      setResult(data.data);
    } catch (err) {
      if (err instanceof Error) {
        const errorWithDetails = err as Error & {
          details?: string;
          action?: { text: string; url: string };
        };
        setError({
          message: err.message,
          details: errorWithDetails.details,
          action: errorWithDetails.action,
        });
      } else {
        setError({
          message: 'Failed to analyze design',
        });
      }
    } finally {
      setAnalyzing(false);
    }
  };

  const handleReset = () => {
    setImages([]);
    setResult(null);
    setError(null);
  };

  // Show loading state while checking auth or key validation
  if (!isLoaded) {
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
  if (!isSignedIn) {
    return (
      <Alert>
        <AlertDescription>
          Please{' '}
          <Link
            href='/sign-in'
            className='text-primary hover:text-primary/80 underline'
          >
            sign in
          </Link>{' '}
          to use the Design System Analyzer.
        </AlertDescription>
      </Alert>
    );
  }

  // Show API key validation status
  const renderValidationStatus = () => {
    if (keyValidating) {
      return (
        <Alert>
          <AlertCircle className='h-4 w-4' />
          <AlertDescription>
            <div className='flex items-center gap-2'>
              <Loader2 className='h-4 w-4 animate-spin' />
              <span>Validating your OpenAI API key...</span>
            </div>
          </AlertDescription>
        </Alert>
      );
    }

    if (keyError) {
      return (
        <Alert variant='destructive'>
          <XCircle className='h-4 w-4' />
          <AlertDescription>
            <div className='space-y-3'>
              <p className='font-medium'>{keyError.message}</p>
              {keyError.details && (
                <p className='text-sm opacity-90'>{keyError.details}</p>
              )}
              <div className='flex gap-2'>
                {keyError.action && (
                  <a
                    href={keyError.action.url}
                    target={
                      keyError.action.url.startsWith('http')
                        ? '_blank'
                        : '_self'
                    }
                    rel={
                      keyError.action.url.startsWith('http')
                        ? 'noopener noreferrer'
                        : undefined
                    }
                    className='inline-flex items-center justify-center rounded-md border border-red-200 bg-white px-3 py-1.5 text-sm font-medium text-red-600 hover:border-red-300 hover:bg-gray-50 focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:outline-none'
                  >
                    {keyError.action.text}
                  </a>
                )}
                <Button
                  variant='outline'
                  size='sm'
                  onClick={fullValidation}
                  className='text-sm'
                >
                  Retry Validation
                </Button>
              </div>
            </div>
          </AlertDescription>
        </Alert>
      );
    }

    if (isKeyValid) {
      return (
        <Alert className='border-green-200 bg-green-50'>
          <CheckCircle className='h-4 w-4 text-green-600' />
          <AlertDescription className='text-green-800'>
            <div className='flex items-center justify-between'>
              <div>
                <span className='font-medium'>OpenAI API key is valid</span>
                {hasVisionModel && (
                  <p className='mt-1 text-sm'>
                    Vision models are available for design analysis
                  </p>
                )}
              </div>
              <Button
                variant='ghost'
                size='sm'
                onClick={fullValidation}
                className='text-green-700 hover:bg-green-100 hover:text-green-800'
              >
                Refresh
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      );
    }

    return null;
  };

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
      {renderValidationStatus()}

      <UploadZone
        onFilesSelected={handleFilesSelected}
        disabled={analyzing || !canUseAnalyzer}
        acceptedFiles={images}
      />

      {images.length > 0 && (
        <ImagePreview images={images} onRemove={handleRemoveImage} />
      )}

      {error && (
        <Alert variant='destructive'>
          <AlertDescription>
            <div className='space-y-3'>
              <p className='font-medium'>{error.message}</p>
              {error.details && (
                <p className='text-sm opacity-90'>{error.details}</p>
              )}
              {error.action && (
                <div className='flex gap-2'>
                  <a
                    href={error.action.url}
                    target={
                      error.action.url.startsWith('http') ? '_blank' : '_self'
                    }
                    rel={
                      error.action.url.startsWith('http')
                        ? 'noopener noreferrer'
                        : undefined
                    }
                    className='inline-flex items-center justify-center rounded-md border border-red-200 bg-white px-3 py-1.5 text-sm font-medium text-red-600 hover:border-red-300 hover:bg-gray-50 focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:outline-none'
                  >
                    {error.action.text}
                  </a>
                </div>
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {images.length > 0 && (
        <div className='flex justify-center gap-4'>
          <Button
            onClick={handleAnalyze}
            disabled={analyzing || images.length === 0 || !canUseAnalyzer}
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
