'use client'

import { useState } from 'react'

export default function DebugErrorPage() {
  const [logs, setLogs] = useState<string[]>([])
  
  const log = (message: string) => {
    setLogs(prev => [...prev, `${new Date().toISOString()}: ${message}`])
  }

  const testConfig = async () => {
    try {
      log('Testing config import...')
      const { config } = await import('@/lib/config')
      log(`Config loaded successfully: database.enabled = ${config.database.enabled}`)
    } catch (error: any) {
      log(`Config error: ${error.message}`)
    }
  }

  const testDb = async () => {
    try {
      log('Testing database import...')
      const { db } = await import('@/lib/db')
      log('Database connection imported successfully')
    } catch (error: any) {
      log(`Database error: ${error.message}`)
    }
  }

  const testEncryption = async () => {
    try {
      log('Testing encryption module...')
      const { encrypt, decrypt } = await import('@/lib/encryption')
      const test = 'test-key'
      const encrypted = encrypt(test)
      const decrypted = decrypt(encrypted)
      log(`Encryption test: ${test} -> ${encrypted} -> ${decrypted}`)
    } catch (error: any) {
      log(`Encryption error: ${error.message}`)
    }
  }

  const testService = async () => {
    try {
      log('Testing user API key service...')
      const { userApiKeyService } = await import('@/lib/user-api-keys/service')
      const keys = await userApiKeyService.list()
      log(`Service test successful: found ${keys.length} keys`)
    } catch (error: any) {
      log(`Service error: ${error.message}`)
    }
  }

  const testValidators = async () => {
    try {
      log('Testing API validators...')
      const { validateApiKey } = await import('@/lib/api-keys/validators')
      const result = await validateApiKey('openai', 'sk-mock-test')
      log(`Validator test: ${JSON.stringify(result)}`)
    } catch (error: any) {
      log(`Validator error: ${error.message}`)
    }
  }

  const testActions = async () => {
    try {
      log('Testing server actions...')
      const { createUserApiKey } = await import('@/app/actions/user-api-keys')
      const result = await createUserApiKey({
        provider: 'openai',
        privateKey: 'sk-mock-test-key'
      })
      log(`Action test: ${JSON.stringify(result)}`)
    } catch (error: any) {
      log(`Action error: ${error.message}`)
    }
  }

  const testComponents = async () => {
    try {
      log('Testing component imports...')
      const { ServiceApiKeyInput } = await import('@/components/services/service-api-key-input')
      log('ServiceApiKeyInput component imported successfully')
    } catch (error: any) {
      log(`Component error: ${error.message}`)
    }
  }

  const runAllTests = async () => {
    setLogs([])
    log('Starting comprehensive test...')
    
    await testConfig()
    await testDb()
    await testEncryption()
    await testService()
    await testValidators()
    await testActions()
    await testComponents()
    
    log('All tests completed!')
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-4">Debug Error Page</h1>
      
      <div className="grid grid-cols-2 gap-4 mb-6">
        <button onClick={testConfig} className="bg-blue-600 text-white px-4 py-2 rounded">
          Test Config
        </button>
        <button onClick={testDb} className="bg-green-600 text-white px-4 py-2 rounded">
          Test Database
        </button>
        <button onClick={testEncryption} className="bg-purple-600 text-white px-4 py-2 rounded">
          Test Encryption
        </button>
        <button onClick={testService} className="bg-orange-600 text-white px-4 py-2 rounded">
          Test Service
        </button>
        <button onClick={testValidators} className="bg-red-600 text-white px-4 py-2 rounded">
          Test Validators
        </button>
        <button onClick={testActions} className="bg-yellow-600 text-white px-4 py-2 rounded">
          Test Actions
        </button>
        <button onClick={testComponents} className="bg-pink-600 text-white px-4 py-2 rounded">
          Test Components
        </button>
        <button onClick={runAllTests} className="bg-gray-800 text-white px-4 py-2 rounded">
          Run All Tests
        </button>
      </div>
      
      <div className="bg-black text-green-400 p-4 rounded-lg h-96 overflow-y-auto font-mono text-sm">
        {logs.map((log, index) => (
          <div key={index}>{log}</div>
        ))}
        {logs.length === 0 && (
          <div className="text-gray-500">Click a test button to start debugging...</div>
        )}
      </div>
    </div>
  )
}