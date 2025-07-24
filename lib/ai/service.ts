import { createAIProvider, isRealAIProvider } from './factory';

import type { AIService, AnalysisResult } from './types';

export class AIServiceImpl implements AIService {
  private provider = createAIProvider();

  analyzeScreenshot(imageBuffer: Buffer): Promise<AnalysisResult> {
    return this.provider.analyzeScreenshot(imageBuffer);
  }

  getProviderStatus(): { connected: boolean; provider: 'openai' | 'mock' } {
    const isReal = isRealAIProvider();
    return {
      connected: true,
      provider: isReal ? 'openai' : 'mock',
    };
  }
}

// Singleton instance
export const aiService = new AIServiceImpl();
