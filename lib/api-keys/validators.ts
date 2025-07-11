import { OpenAI } from 'openai'
import { Resend } from 'resend'

export type ValidationResult = {
  isValid: boolean
  error?: string
}

export async function validateOpenAIKey(apiKey: string): Promise<ValidationResult> {
  // In test environment, skip real API calls
  if (process.env.NODE_ENV === 'test') {
    // Mock validation for tests
    if (apiKey.startsWith('sk-test-') || apiKey.includes('mock')) {
      return { isValid: true }
    }
    return {
      isValid: false,
      error: 'Invalid OpenAI API key format'
    }
  }

  try {
    const openai = new OpenAI({ apiKey })
    await openai.models.list()
    return { isValid: true }
  } catch (error: any) {
    return {
      isValid: false,
      error: error.message || 'Invalid OpenAI API key'
    }
  }
}

export async function validateResendKey(apiKey: string): Promise<ValidationResult> {
  // In test environment, skip real API calls
  if (process.env.NODE_ENV === 'test') {
    // Mock validation for tests
    if (apiKey.startsWith('re_test_') || apiKey.includes('mock')) {
      return { isValid: true }
    }
    return {
      isValid: false,
      error: 'Invalid Resend API key format'
    }
  }

  try {
    const resend = new Resend(apiKey)    
    const apiKeys = await resend.apiKeys.list()
    
    if (apiKeys.error) {
      return {
        isValid: false,
        error: apiKeys.error.message || 'Invalid Resend API key'
      }
    }
    
    return { isValid: true }
  } catch (error: any) {
    return {
      isValid: false,
      error: error.message || 'Failed to validate Resend API key'
    }
  }
}

export async function validateStripeKey(apiKey: string): Promise<ValidationResult> {
  // In test environment, skip real API calls
  if (process.env.NODE_ENV === 'test') {
    // Mock validation for tests
    if (apiKey.startsWith('sk_test_') || apiKey.startsWith('sk_live_') || apiKey.includes('mock')) {
      return { isValid: true }
    }
    return {
      isValid: false,
      error: 'Invalid Stripe API key format'
    }
  }

  try {
    // For Stripe, we'd typically validate by making a test API call
    // For now, we'll just validate the format
    if (apiKey.startsWith('sk_test_') || apiKey.startsWith('sk_live_')) {
      return { isValid: true }
    }
    return {
      isValid: false,
      error: 'Invalid Stripe API key format'
    }
  } catch (error: any) {
    return {
      isValid: false,
      error: error.message || 'Failed to validate Stripe API key'
    }
  }
}

export async function validateApiKey(serviceType: string, apiKey: string): Promise<ValidationResult> {
  const isMockKey = apiKey.includes('mock')
  const isProductionEnvironment = process.env.NODE_ENV !== 'development' && process.env.NODE_ENV !== 'test'
  
  if (isMockKey && isProductionEnvironment) {
    return {
      isValid: false,
      error: 'Mock API keys are not allowed in production'
    }
  }
  
  if (isMockKey) {
    return { isValid: true }
  }

  switch (serviceType) {
    case 'openai':
      return validateOpenAIKey(apiKey)
    
    case 'stripe':
      return validateStripeKey(apiKey)
    
    case 'resend':
      return validateResendKey(apiKey)
    
    default:
      return {
        isValid: false,
        error: 'Unknown service type'
      }
  }
}