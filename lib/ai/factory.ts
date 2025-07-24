import { MockAIProvider } from './providers/mock';
import { OpenAIProvider } from './providers/openai';

import type { AIProvider } from './types';

export function createAIProvider(): AIProvider {
  // Use mock provider in test environment
  if (process.env.NODE_ENV === 'test') {
    return new MockAIProvider();
  }

  // Use OpenAI provider in production/development with API key
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    console.warn('OPENAI_API_KEY not found, using mock AI provider');
    return new MockAIProvider();
  }

  return new OpenAIProvider(apiKey);
}

export function isRealAIProvider(): boolean {
  return process.env.NODE_ENV !== 'test' && !!process.env.OPENAI_API_KEY;
}
