import { describe, it, expect } from '@jest/globals'
import { encrypt, decrypt, maskApiKey } from '@/lib/encryption'

describe('Encryption', () => {
  it('should encrypt and decrypt text properly', () => {
    const original = 'sk-test-1234567890abcdef'
    const encrypted = encrypt(original)
    const decrypted = decrypt(encrypted)
    
    expect(encrypted).not.toBe(original)
    expect(decrypted).toBe(original)
  })

  it('should handle mock keys without encryption', () => {
    const mockKey = 'sk-mock-1234567890abcdef'
    const encrypted = encrypt(mockKey)
    const decrypted = decrypt(encrypted)
    
    expect(encrypted).toBe(`mock:${mockKey}`)
    expect(decrypted).toBe(mockKey)
  })

  it('should mask API keys properly', () => {
    const openaiKey = 'sk-test-1234567890abcdef'
    const stripeTestKey = 'sk_test_1234567890abcdef'
    const stripeLiveKey = 'sk_live_1234567890abcdef'
    
    expect(maskApiKey(openaiKey)).toBe('sk-tes....cdef')
    expect(maskApiKey(stripeTestKey)).toBe('sk_test_....cdef')
    expect(maskApiKey(stripeLiveKey)).toBe('sk_live_....cdef')
  })

  it('should handle short keys', () => {
    const shortKey = 'short'
    expect(maskApiKey(shortKey)).toBe('***')
  })
})