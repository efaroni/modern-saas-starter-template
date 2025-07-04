import { describe, it, expect } from '@jest/globals'
import { validateApiKey } from '@/lib/api-keys/validators'

describe('API Validators', () => {
  it('should handle mock keys', async () => {
    const result = await validateApiKey('openai', 'sk-mock-test')
    expect(result.isValid).toBe(true)
    expect(result.details?.isMock).toBe(true)
  })

  it('should validate unknown service types', async () => {
    const result = await validateApiKey('unknown', 'test-key')
    expect(result.isValid).toBe(false)
    expect(result.error).toBe('Unknown service type')
  })

  it('should validate basic service types', async () => {
    const result = await validateApiKey('github', 'long-enough-key-for-github')
    expect(result.isValid).toBe(true)
  })

  it('should reject short keys for basic services', async () => {
    const result = await validateApiKey('github', 'short')
    expect(result.isValid).toBe(false)
    expect(result.error).toBe('API key seems too short')
  })
})