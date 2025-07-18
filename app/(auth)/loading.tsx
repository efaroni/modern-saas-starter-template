import { Spinner } from '@/components/ui/spinner'

export default function AuthLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <Spinner className="mx-auto mb-4" />
        <p className="text-gray-600">Processing authentication...</p>
      </div>
    </div>
  )
}