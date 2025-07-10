'use server'

import { userApiKeyService } from '@/lib/user-api-keys/service'
import { validateApiKey } from '@/lib/api-keys/validators'
import { revalidatePath } from 'next/cache'

export async function getUserApiKeys() {
  try {
    const apiKeys = await userApiKeyService.list()
    return { success: true, data: apiKeys }
  } catch (error) {
    console.error('Error fetching user API keys:', error)
    return { success: false, error: 'Failed to fetch API keys' }
  }
}

export async function createUserApiKey(data: {
  provider: string
  privateKey: string
  publicKey?: string
}) {
  try {
    // Validate the private key format first
    if (data.provider === 'openai' && !data.privateKey.startsWith('sk-')) {
      return { success: false, error: 'OpenAI keys must start with sk-' }
    }
    if (data.provider === 'resend' && !data.privateKey.startsWith('re_')) {
      return { success: false, error: 'Resend keys must start with re_' }
    }

    // Mock keys only allowed in development
    const isMockKey = data.privateKey.includes('mock')
    if (isMockKey && process.env.NODE_ENV !== 'development') {
      return { 
        success: false, 
        error: 'Mock API keys are not allowed in production'
      }
    }

    // Real API validation (skip for mock keys in development)
    if (!isMockKey) {
      const validation = await validateApiKey(data.provider, data.privateKey)
      if (!validation.isValid) {
        return { 
          success: false, 
          error: validation.error || 'API key validation failed'
        }
      }
    }

    // Check if user already has a key for this provider
    const existing = await userApiKeyService.getByProvider(data.provider)
    if (existing) {
      return { 
        success: false, 
        error: `You already have a ${data.provider} API key configured. Delete the existing one first.`
      }
    }

    const created = await userApiKeyService.create({
      provider: data.provider,
      privateKeyEncrypted: data.privateKey,
      publicKey: data.publicKey || null,
      metadata: {},
    })

    revalidatePath('/dev/configuration')
    return { success: true, data: created }
  } catch (error) {
    console.error('Error creating user API key:', error)
    return { success: false, error: 'Failed to create API key' }
  }
}

export async function deleteUserApiKey(id: string) {
  try {
    await userApiKeyService.delete(id)
    revalidatePath('/dev/configuration')
    return { success: true }
  } catch (error) {
    console.error('Error deleting user API key:', error)
    return { success: false, error: 'Failed to delete API key' }
  }
}

export async function testUserApiKey(provider: string, privateKey: string) {
  try {
    // Mock keys only allowed in development
    const isMockKey = privateKey.includes('mock')
    if (isMockKey && process.env.NODE_ENV !== 'development') {
      return { 
        success: false, 
        error: 'Mock API keys are not allowed in production'
      }
    }

    // Skip real validation for mock keys in development
    if (isMockKey) {
      return {
        success: true,
        isMock: true,
        message: 'Mock API key - validation skipped'
      }
    }

    // Real API validation
    const validation = await validateApiKey(provider, privateKey)
    
    if (validation.isValid) {
      return {
        success: true,
        message: 'API key is valid and working!'
      }
    } else {
      return {
        success: false,
        error: validation.error || 'API key validation failed'
      }
    }
  } catch (error: any) {
    console.error('Error testing user API key:', error)
    return { 
      success: false, 
      error: error.message || 'Failed to test API key' 
    }
  }
}