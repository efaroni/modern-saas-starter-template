import { OpenAI } from 'openai';

import { OpenAIVisionService } from '@/lib/ai/vision/openai';

import type { AnalyzeDesignInput } from '@/lib/ai/vision/types';

// Mock OpenAI
jest.mock('openai');

// Create mock APIError class
class MockAPIError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = 'APIError';
    this.status = status;
  }
}

describe('OpenAIVisionService', () => {
  let service: OpenAIVisionService;
  let mockOpenAI: jest.Mocked<OpenAI>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockOpenAI = {
      chat: {
        completions: {
          create: jest.fn(),
        },
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;

    (OpenAI as jest.MockedClass<typeof OpenAI>).mockImplementation(
      () => mockOpenAI,
    );
    service = new OpenAIVisionService('test-api-key');
  });

  describe('analyzeDesign', () => {
    const createMockFile = (
      name: string,
      type: string,
      size: number = 1024,
    ): File => {
      const file = {
        name,
        type,
        size,
        arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(8)),
        slice: jest.fn(),
        stream: jest.fn(),
        text: jest.fn(),
        lastModified: Date.now(),
      } as unknown as File;

      return file;
    };

    const validInput: AnalyzeDesignInput = {
      images: [createMockFile('test.png', 'image/png')],
    };

    const mockDesignAnalysisResult = {
      styleGuide: 'Test style guide',
      tailwindConfig: 'module.exports = { theme: {} }',
      globalsCss: ':root { --primary: #000; }',
      metadata: {
        colors: { primary: '#000000', secondary: '#ffffff', accent: '#ff0000' },
        fonts: ['Inter', 'Roboto'],
        primaryColor: '#000000',
        theme: 'light' as const,
      },
    };

    it('should successfully analyze valid images', async () => {
      // Arrange
      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify(mockDesignAnalysisResult),
            },
          },
        ],
      } as any);

      // Act
      const result = await service.analyzeDesign(validInput);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockDesignAnalysisResult);
      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith({
        model: 'gpt-4o',
        messages: expect.any(Array),
        max_tokens: 4000,
        temperature: 0.2,
      });
    });

    it('should handle markdown-wrapped JSON responses', async () => {
      // Arrange
      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [
          {
            message: {
              content:
                '```json\n' +
                JSON.stringify(mockDesignAnalysisResult) +
                '\n```',
            },
          },
        ],
      } as any);

      // Act
      const result = await service.analyzeDesign(validInput);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockDesignAnalysisResult);
    });

    it('should extract JSON from mixed content', async () => {
      // Arrange
      const mixedContent = `Here's the analysis:
${JSON.stringify(mockDesignAnalysisResult)}
That's all!`;

      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [
          {
            message: {
              content: mixedContent,
            },
          },
        ],
      } as any);

      // Act
      const result = await service.analyzeDesign(validInput);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockDesignAnalysisResult);
    });

    it('should reject invalid image types', async () => {
      // Arrange
      const invalidInput = {
        images: [createMockFile('test.txt', 'text/plain')],
      };

      // Act
      const result = await service.analyzeDesign(invalidInput);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('INVALID_IMAGE');
      expect(result.error?.message).toContain('Invalid image: test.txt');
    });

    it('should reject oversized images', async () => {
      // Arrange
      const oversizedFile = createMockFile(
        'large.png',
        'image/png',
        21 * 1024 * 1024,
      ); // 21MB
      const invalidInput = {
        images: [oversizedFile],
      };

      // Act
      const result = await service.analyzeDesign(invalidInput);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('INVALID_IMAGE');
    });

    it('should handle rate limit errors', async () => {
      // Arrange
      const rateLimitError = new MockAPIError('Rate limit exceeded', 429);
      // Make it instanceof check work
      (OpenAI as any).APIError = MockAPIError;
      mockOpenAI.chat.completions.create.mockRejectedValue(rateLimitError);

      // Act
      const result = await service.analyzeDesign(validInput);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('RATE_LIMIT');
      expect(result.error?.message).toContain('Rate limit exceeded');
    });

    it('should handle parse errors gracefully', async () => {
      // Arrange
      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [
          {
            message: {
              content: 'Invalid JSON content',
            },
          },
        ],
      } as any);

      // Act
      const result = await service.analyzeDesign(validInput);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('INVALID_RESPONSE');
      expect(result.error?.message).toContain('Failed to parse AI response');
    });

    it('should handle empty response', async () => {
      // Arrange
      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [
          {
            message: {
              content: null,
            },
          },
        ],
      } as any);

      // Act
      const result = await service.analyzeDesign(validInput);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('INVALID_RESPONSE');
      expect(result.error?.message).toBe('No response from AI');
    });

    it('should handle API errors', async () => {
      // Arrange
      mockOpenAI.chat.completions.create.mockRejectedValue(
        new Error('API connection failed'),
      );

      // Act
      const result = await service.analyzeDesign(validInput);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('API_ERROR');
      expect(result.error?.message).toBe('API connection failed');
    });
  });

  describe('validateImage', () => {
    it('should accept valid image types', async () => {
      const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];

      for (const type of validTypes) {
        const file = new File(['test'], 'test', { type });
        const isValid = await service.validateImage(file);
        expect(isValid).toBe(true);
      }
    });

    it('should reject invalid image types', async () => {
      const file = new File(['test'], 'test.pdf', { type: 'application/pdf' });
      const isValid = await service.validateImage(file);
      expect(isValid).toBe(false);
    });

    it('should reject files over 20MB', async () => {
      const largeFile = new File(
        [new ArrayBuffer(21 * 1024 * 1024)],
        'large.png',
        {
          type: 'image/png',
        },
      );
      const isValid = await service.validateImage(largeFile);
      expect(isValid).toBe(false);
    });
  });
});
