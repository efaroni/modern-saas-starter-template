import { userApiKeyService } from '@/lib/user-api-keys/service';

import { MockVisionService } from './mock';
import { OpenAIVisionService } from './openai';

import type { VisionService } from './types';

export async function createVisionService(
  userId?: string,
): Promise<VisionService> {
  if (process.env.NODE_ENV === 'test') {
    return new MockVisionService();
  }

  // Use user's stored API key if userId provided
  if (userId) {
    const userApiKey = await userApiKeyService.getDecryptedPrivateKey(
      'openai',
      userId,
    );
    if (userApiKey) {
      return new OpenAIVisionService(userApiKey);
    }
  }

  // Fallback to environment variable
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return new MockVisionService();
  }

  return new OpenAIVisionService(apiKey);
}

export async function hasValidOpenAIKey(userId: string): Promise<boolean> {
  // Check if user has a stored API key
  const userApiKey = await userApiKeyService.getDecryptedPrivateKey(
    'openai',
    userId,
  );
  if (userApiKey) {
    return true;
  }

  // Check if there's a fallback environment variable
  return !!process.env.OPENAI_API_KEY;
}
