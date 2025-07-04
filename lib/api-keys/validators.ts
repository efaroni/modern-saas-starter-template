import { OpenAI } from 'openai'
import Stripe from 'stripe'
import { Resend } from 'resend'

export type ValidationResult = {
  isValid: boolean
  error?: string
}

// Validate OpenAI API key by making a minimal API call
export async function validateOpenAIKey(apiKey: string): Promise<ValidationResult> {
  try {
    const openai = new OpenAI({ apiKey })
    
    // Use the models endpoint - it's free and doesn't consume tokens
    const models = await openai.models.list()
    
    return {
      isValid: true
    }
  } catch (error: any) {
    return {
      isValid: false,
      error: error.message || 'Invalid OpenAI API key'
    }
  }
}

// Validate Stripe API key by retrieving account info
export async function validateStripeKey(apiKey: string): Promise<ValidationResult> {
  try {
    const stripe = new Stripe(apiKey, { apiVersion: '2025-06-30.basil' })
    
    // Get account details - this is a free API call
    const account = await stripe.accounts.retrieve()
    
    return {
      isValid: true
    }
  } catch (error: any) {
    return {
      isValid: false,
      error: error.message || 'Invalid Stripe API key'
    }
  }
}

// Validate Resend API key
export async function validateResendKey(apiKey: string): Promise<ValidationResult> {
  try {
    const resend = new Resend(apiKey)
    
    // Get API key info - this is a free API call
    const apiKeys = await resend.apiKeys.list()
    
    return {
      isValid: true
    }
  } catch (error: any) {
    // Resend returns specific error codes
    if (error.message?.includes('Invalid API Key')) {
      return {
        isValid: false,
        error: 'Invalid Resend API key'
      }
    }
    
    return {
      isValid: false,
      error: error.message || 'Failed to validate Resend API key'
    }
  }
}

// Main validation function that routes to the appropriate validator
export async function validateApiKey(serviceType: string, apiKey: string): Promise<ValidationResult> {
  // Skip validation for mock keys
  if (apiKey.includes('mock')) {
    return {
      isValid: true
    }
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