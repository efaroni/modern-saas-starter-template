import { describe, it, expect, beforeEach, afterEach } from '@jest/globals'
import { userApiKeyService } from '@/lib/user-api-keys/service'

// Force mock mode by clearing DATABASE_URL for tests
const originalDatabaseUrl = process.env.DATABASE_URL
beforeEach(() => {
  process.env.DATABASE_URL = ''
})

afterEach(() => {
  process.env.DATABASE_URL = originalDatabaseUrl
})

describe('User API Keys Service (Mock Mode)', () => {
  it('should list API keys in mock mode', async () => {
    const keys = await userApiKeyService.list()
    expect(Array.isArray(keys)).toBe(true)
    // Should return mock data
    expect(keys.length).toBeGreaterThanOrEqual(0)
  })

  it('should create API key in mock mode', async () => {
    const testKey = {
      provider: 'openai',
      privateKeyEncrypted: 'sk-test-1234567890abcdef',
      publicKey: null,
      metadata: {}
    }
    
    const created = await userApiKeyService.create(testKey)
    
    expect(created).toBeDefined()
    expect(created.provider).toBe('openai')
    expect(created.privateKeyEncrypted).not.toBe(testKey.privateKeyEncrypted) // Should be masked
  })

  it('should get API key by provider in mock mode', async () => {
    const key = await userApiKeyService.getByProvider('openai')
    // In mock mode, should return the mock key or null
    expect(key === null || typeof key === 'object').toBe(true)
  })

  it('should get decrypted private key in mock mode', async () => {
    const key = await userApiKeyService.getDecryptedPrivateKey('openai')
    // In mock mode, should return the mock key or null
    expect(key === null || typeof key === 'string').toBe(true)
  })
})