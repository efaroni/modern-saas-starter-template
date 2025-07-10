import { OpenAI } from 'openai'
import { Resend } from 'resend'

export type ValidationResult = {
  isValid: boolean
  error?: string
}

export async function validateOpenAIKey(apiKey: string): Promise<ValidationResult> {
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
    
    case 'resend':
      return validateResendKey(apiKey)
    
    default:
      return {
        isValid: false,
        error: 'Unknown service type'
      }
  }
}