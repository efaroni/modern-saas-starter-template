import { validateApiKey, validateOpenAIKey, validateResendKey } from './validators'

// Mock the external services
jest.mock('openai', () => ({
  OpenAI: jest.fn().mockImplementation(() => ({
    models: {
      list: jest.fn().mockResolvedValue({})
    }
  }))
}))

jest.mock('stripe', () => 
  jest.fn().mockImplementation(() => ({
    accounts: {
      retrieve: jest.fn().mockResolvedValue({})
    }
  }))
)

jest.mock('resend', () => ({
  Resend: jest.fn().mockImplementation(() => ({
    apiKeys: {
      list: jest.fn().mockResolvedValue({})
    }
  }))
}))

describe('API Key Validators', () => {
  describe('validateOpenAIKey', () => {
    it('should return valid for good key', async () => {
      const result = await validateOpenAIKey('sk-test-valid-key')
      
      expect(result.isValid).toBe(true)
      expect(result.error).toBeUndefined()
    })

    test('should return invalid when API throws error', async () => {
      const { OpenAI } = require('openai')
      OpenAI.mockImplementationOnce(() => ({
        models: {
          list: jest.fn().mockRejectedValue(new Error('Invalid API key'))
        }
      }))

      const result = await validateOpenAIKey('sk-bad-key')
      
      expect(result.isValid).toBe(false)
      expect(result.error).toBeDefined()
    })
  })

  describe('validateResendKey', () => {
    it('should return valid for good key', async () => {
      const result = await validateResendKey('re_test_valid_key')
      
      expect(result.isValid).toBe(true)
      expect(result.error).toBeUndefined()
    })

    test('should return invalid when API throws error', async () => {
      const { Resend } = require('resend')
      Resend.mockImplementationOnce(() => ({
        apiKeys: {
          list: jest.fn().mockRejectedValue(new Error('Invalid API key'))
        }
      }))

      const result = await validateResendKey('re_bad_key')
      
      expect(result.isValid).toBe(false)
      expect(result.error).toBeDefined()
    })
  })

  describe('validateApiKey', () => {
    test('should handle unknown service type', async () => {
      const result = await validateApiKey('unknown', 'any-key')
      
      expect(result.isValid).toBe(false)
      expect(result.error).toBe('Unknown service type')
    })

    test('should skip validation for mock keys', async () => {
      const result = await validateApiKey('openai', 'sk-mock-test')
      
      expect(result.isValid).toBe(true)
      expect(result.error).toBeUndefined()
    })
  })
})