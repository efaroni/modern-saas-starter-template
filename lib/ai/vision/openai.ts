import { OpenAI } from 'openai';

import { designAnalyzerPrompt } from '../prompts/design-analyzer';

import type {
  AnalyzeDesignInput,
  DesignAnalysisResult,
  VisionResult,
  VisionService,
} from './types';

export class OpenAIVisionService implements VisionService {
  private client: OpenAI;

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey });
  }

  async analyzeDesign(
    input: AnalyzeDesignInput,
  ): Promise<VisionResult<DesignAnalysisResult>> {
    try {
      // Validate images
      for (const image of input.images) {
        const isValid = await this.validateImage(image);
        if (!isValid) {
          return {
            success: false,
            error: {
              code: 'INVALID_IMAGE',
              message: `Invalid image: ${image.name}`,
            },
          };
        }
      }

      // Convert images to base64
      const imageUrls = await Promise.all(
        input.images.map(async image => {
          const bytes = await image.arrayBuffer();
          const buffer = Buffer.from(bytes);
          return `data:${image.type};base64,${buffer.toString('base64')}`;
        }),
      );

      // Call OpenAI Vision API
      const response = await this.client.chat.completions.create({
        model: 'gpt-4-vision-preview',
        messages: [
          {
            role: 'system',
            content: designAnalyzerPrompt,
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Analyze these design screenshots and extract the design system:',
              },
              ...imageUrls.map(url => ({
                type: 'image_url' as const,
                image_url: { url },
              })),
            ],
          },
        ],
        max_tokens: 4000,
        temperature: 0.2,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        return {
          success: false,
          error: {
            code: 'INVALID_RESPONSE',
            message: 'No response from AI',
          },
        };
      }

      const result = JSON.parse(content) as DesignAnalysisResult;

      return { success: true, data: result };
    } catch (error) {
      console.error('Vision analysis error:', error);

      if (error instanceof OpenAI.APIError) {
        if (error.status === 429) {
          return {
            success: false,
            error: {
              code: 'RATE_LIMIT',
              message: 'Rate limit exceeded. Please try again later.',
            },
          };
        }
      }

      return {
        success: false,
        error: {
          code: 'API_ERROR',
          message:
            error instanceof Error ? error.message : 'Failed to analyze design',
        },
      };
    }
  }

  validateImage(file: File): Promise<boolean> {
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    const maxSize = 20 * 1024 * 1024; // 20MB

    return Promise.resolve(
      validTypes.includes(file.type) && file.size <= maxSize,
    );
  }
}
