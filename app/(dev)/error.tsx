'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'

export default function DevError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Dev section error:', error)
  }, [error])

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="text-center max-w-md mx-auto">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Development Tools Error
          </h2>
          <p className="text-gray-600">
            Something went wrong in the development section.
          </p>
        </div>
        
        <div className="space-y-4">
          <Button
            onClick={reset}
            className="w-full"
          >
            Try again
          </Button>
          
          <Button
            variant="outline"
            onClick={() => window.location.href = '/dev'}
            className="w-full"
          >
            Back to dev dashboard
          </Button>
        </div>
        
        <details className="mt-6 text-left">
          <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
            Error details
          </summary>
          <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-auto max-h-40">
            {error.message}
            {error.stack}
          </pre>
        </details>
      </div>
    </div>
  )
}