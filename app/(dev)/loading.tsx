import { Spinner } from '@/components/ui/spinner'

export default function DevLoading() {
  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="text-center">
        <Spinner className="mx-auto mb-4" />
        <p className="text-gray-600">Loading development tools...</p>
      </div>
    </div>
  )
}