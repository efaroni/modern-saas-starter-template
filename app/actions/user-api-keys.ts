'use server';

import { revalidatePath } from 'next/cache';

import { auth } from '@clerk/nextjs/server';

import { validateApiKey } from '@/lib/api-keys/validators';
import { userApiKeyService } from '@/lib/user-api-keys/service';

export async function getUserApiKeys() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: 'Not authenticated' };
    }

    const apiKeys = await userApiKeyService.list(userId);
    return { success: true, data: apiKeys };
  } catch {
    return { success: false, error: 'Failed to fetch API keys' };
  }
}

export async function createUserApiKey(data: {
  provider: string;
  privateKey: string;
  publicKey?: string;
  metadata?: Record<string, unknown>;
}) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: 'Not authenticated' };
    }

    if (data.provider === 'openai' && !data.privateKey.startsWith('sk-')) {
      return { success: false, error: 'OpenAI keys must start with sk-' };
    }

    if (data.provider === 'resend' && !data.privateKey.startsWith('re_')) {
      return { success: false, error: 'Resend keys must start with re_' };
    }

    const isMockKey = data.privateKey.includes('mock');
    const isProductionEnvironment =
      process.env.NODE_ENV !== 'development' && process.env.NODE_ENV !== 'test';

    if (isMockKey && isProductionEnvironment) {
      return {
        success: false,
        error: 'Mock API keys are not allowed in production',
      };
    }

    if (!isMockKey) {
      const validation = await validateApiKey(data.provider, data.privateKey);
      if (!validation.isValid) {
        return {
          success: false,
          error: validation.error || 'API key validation failed',
        };
      }
    }

    const existing = await userApiKeyService.getByProvider(
      data.provider,
      userId,
    );
    if (existing) {
      return {
        success: false,
        error: `You already have a ${data.provider} API key configured. Delete the existing one first.`,
        errorCode: 'API_KEY_DUPLICATE',
      };
    }

    const created = await userApiKeyService.create(
      {
        provider: data.provider,
        privateKeyEncrypted: data.privateKey,
        publicKey: data.publicKey || null,
        metadata: data.metadata || {},
      },
      userId,
    );

    revalidatePath('/configuration');
    return { success: true, data: created };
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'API_KEY_DUPLICATE') {
      return {
        success: false,
        error: 'API key already exists for this provider',
        errorCode: 'API_KEY_DUPLICATE',
      };
    }

    return { success: false, error: 'Failed to create API key' };
  }
}

export async function deleteUserApiKey(idOrProvider: string) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: 'Not authenticated' };
    }

    // Check if this is a provider name or an ID
    const isProvider = [
      'openai',
      'stripe',
      'resend',
      'github',
      'google',
    ].includes(idOrProvider);

    if (isProvider) {
      // Get the key by provider first
      const existingKey = await userApiKeyService.getByProvider(
        idOrProvider,
        userId,
      );
      if (existingKey) {
        await userApiKeyService.delete(existingKey.id, userId);
      }
    } else {
      // It's an ID
      await userApiKeyService.delete(idOrProvider, userId);
    }

    revalidatePath('/configuration');
    return { success: true };
  } catch {
    return { success: false, error: 'Failed to delete API key' };
  }
}

export async function getDisplayMaskedApiKey(provider: string) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: 'Not authenticated' };
    }

    const maskedKey = await userApiKeyService.getDisplayMaskedKey(
      provider,
      userId,
    );
    if (!maskedKey) {
      return { success: false, error: 'No API key found for this provider' };
    }

    return { success: true, maskedKey };
  } catch {
    return { success: false, error: 'Failed to get API key' };
  }
}

export async function testUserApiKey(provider: string, privateKey?: string) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: 'Not authenticated' };
    }

    let keyToTest = privateKey;

    // If no key provided, try to get the existing key for this provider
    if (!keyToTest) {
      keyToTest =
        (await userApiKeyService.getDecryptedPrivateKey(provider, userId)) ??
        undefined;
      if (!keyToTest) {
        return { success: false, error: 'No API key found for this provider' };
      }
    }

    const isMockKey = keyToTest.includes('mock');
    const isProductionEnvironment =
      process.env.NODE_ENV !== 'development' && process.env.NODE_ENV !== 'test';

    if (isMockKey && isProductionEnvironment) {
      return {
        success: false,
        error: 'Mock API keys are not allowed in production',
      };
    }

    if (isMockKey) {
      return {
        success: true,
        isMock: true,
        message: 'Mock API key - validation skipped',
      };
    }

    const validation = await validateApiKey(provider, keyToTest);

    if (!validation.isValid) {
      return {
        success: false,
        error: validation.error || 'API key validation failed',
      };
    }

    return {
      success: true,
      message: 'API key is valid and working!',
    };
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to test API key',
    };
  }
}
