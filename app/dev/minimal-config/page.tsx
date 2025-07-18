'use client'

import { useState } from 'react'

export default function MinimalConfigPage() {
  const [message, setMessage] = useState('')
  const [apiKey, setApiKey] = useState('')

  const testAction = async () => {
    try {
      // Test direct import
      const { userApiKeyService } = await import('@/lib/user-api-keys/service')
      const result = await userApiKeyService.list()
      setMessage(`Success: Found ${result.length} API keys`)
    } catch (error: unknown) {
      setMessage(`Error: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  const testActionImport = async () => {
    try {
      const { createUserApiKey } = await import('@/app/actions/user-api-keys')
      const result = await createUserApiKey({
        provider: 'openai',
        privateKey: 'sk-mock-test-key'
      })
      setMessage(`Action result: ${JSON.stringify(result)}`)
    } catch (error: unknown) {
      setMessage(`Action error: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-4">Minimal Config Test</h1>
      
      <div className="space-y-4">
        <div>
          <input
            type="text"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="Enter test API key"
            className="w-full px-3 py-2 border rounded"
          />
        </div>
        
        <div className="flex gap-4">
          <button 
            onClick={testAction}
            className="bg-blue-600 text-white px-4 py-2 rounded"
          >
            Test Service
          </button>
          
          <button 
            onClick={testActionImport}
            className="bg-green-600 text-white px-4 py-2 rounded"
          >
            Test Action
          </button>
        </div>
        
        {message && (
          <div className="mt-4 p-4 bg-gray-100 border rounded">
            <p className="font-mono text-sm">{message}</p>
          </div>
        )}
      </div>
    </div>
  )
}