'use client'

import { useState } from 'react'
import { userApiKeyService } from '@/lib/user-api-keys/service'
import { SelectUserApiKey } from '@/lib/db/schema'

export default function ServiceTestPage() {
  const [keys, setKeys] = useState<SelectUserApiKey[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const testService = async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await userApiKeyService.list()
      setKeys(result)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-4">Service Test</h1>
      
      <button 
        onClick={testService}
        disabled={loading}
        className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
      >
        {loading ? 'Testing...' : 'Test User API Key Service'}
      </button>
      
      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded">
          <h2 className="font-semibold text-red-800">Error:</h2>
          <p className="text-red-700">{error}</p>
        </div>
      )}
      
      {keys.length > 0 && (
        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded">
          <h2 className="font-semibold text-green-800">Success! Keys found:</h2>
          <pre className="text-sm mt-2">{JSON.stringify(keys, null, 2)}</pre>
        </div>
      )}
    </div>
  )
}