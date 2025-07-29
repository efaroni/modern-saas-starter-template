/**
 * Integration tests for AI design analysis flow
 * Tests the complete flow from API endpoint to vision service
 */

/**
 * @jest-environment node
 */

// Add global mocks before imports
global.Request = class Request {
  constructor(input: any, _init?: any) {
    return input;
  }
} as any;

global.Response = class Response {
  constructor(body?: any, _init?: any) {
    return body;
  }
} as any;

import { testDb } from '@/lib/db/test';
import { users, userApiKeys } from '@/lib/db/schema';
import { encrypt } from '@/lib/encryption';

// Import the handler after mocks are set
let analyzeDesignHandler: any;

// Mock NextRequest
class MockNextRequest {
  method: string;
  url: string;
  headers: Map<string, string>;
  body: FormData | null;

  constructor(url: string, init?: { method?: string; body?: FormData }) {
    this.url = url;
    this.method = init?.method || 'GET';
    this.body = init?.body || null;
    this.headers = new Map();
  }

  formData() {
    return this.body;
  }
}

// Mock auth to return our test user
jest.mock('@/lib/auth/auth', () => ({
  auth: jest.fn().mockResolvedValue({
    user: { id: '550e8400-e29b-41d4-a716-446655440000' },
  }),
}));

// Mock rate limiting to avoid test interference
jest.mock('@/lib/middleware/rate-limit', () => ({
  applyRateLimit: jest.fn().mockResolvedValue({ allowed: true }),
}));

// Mock OpenAI to avoid real API calls
jest.mock('openai', () => ({
  OpenAI: jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn(),
      },
    },
  })),
}));

// Import OpenAI after mocking
import { OpenAI } from 'openai';

describe('AI Design Analysis Integration Flow', () => {
  const testUserId = '550e8400-e29b-41d4-a716-446655440000'; // Valid UUID
  let mockOpenAI: any;

  beforeAll(async () => {
    // Dynamically import the handler after mocks are set
    const handlerModule = await import('@/app/api/ai/analyze-design/route');
    analyzeDesignHandler = handlerModule.POST;
  });

  beforeEach(async () => {
    jest.clearAllMocks();

    // Clean up database
    try {
      await testDb.delete(userApiKeys);
      await testDb.delete(users);
    } catch {
      // Tables might not exist, that's okay
    }

    // Create test user
    await testDb.insert(users).values({
      id: testUserId,
      email: 'test@example.com',
    });

    // Setup OpenAI mock
    mockOpenAI = {
      chat: {
        completions: {
          create: jest.fn(),
        },
      },
    };
    (OpenAI as jest.MockedClass<typeof OpenAI>).mockImplementation(
      () => mockOpenAI,
    );
  });

  afterEach(async () => {
    // Clean up
    await testDb.delete(userApiKeys);
    await testDb.delete(users);
  });

  const createMockFile = (name: string, type: string): File => {
    const blob = new Blob(['test image data'], { type });
    return new File([blob], name, { type });
  };

  const createFormData = (files: File[]): FormData => {
    const formData = new FormData();
    files.forEach(file => formData.append('images', file));
    return formData;
  };

  const mockSuccessfulAnalysisResponse = {
    styleGuide: '# Design System Style Guide\n\nPrimary color: #3B82F6',
    tailwindConfig:
      'module.exports = { theme: { extend: { colors: { primary: "#3B82F6" } } } }',
    globalsCss: ':root { --color-primary: #3B82F6; }',
    metadata: {
      colors: { primary: '#3B82F6', secondary: '#10B981', accent: '#F59E0B' },
      fonts: ['Inter', 'Roboto'],
      primaryColor: '#3B82F6',
      theme: 'light' as const,
    },
  };

  it('should successfully analyze design with valid OpenAI key', async () => {
    // Arrange
    await testDb.insert(userApiKeys).values({
      id: 'key-1',
      userId: testUserId,
      provider: 'openai',
      privateKeyEncrypted: encrypt('sk-test-valid-key'),
    });

    mockOpenAI.chat.completions.create.mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify(mockSuccessfulAnalysisResponse),
          },
        },
      ],
    });

    const formData = createFormData([
      createMockFile('design1.png', 'image/png'),
      createMockFile('design2.png', 'image/png'),
    ]);

    const request = new MockNextRequest(
      'http://localhost:3000/api/ai/analyze-design',
      {
        method: 'POST',
        body: formData,
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ) as any;

    // Act
    const response = await analyzeDesignHandler(request);
    const data = await response.json();

    // Assert
    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toEqual(mockSuccessfulAnalysisResponse);
    expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith({
      model: 'gpt-4o',
      messages: expect.any(Array),
      max_tokens: 4000,
      temperature: 0.2,
    });
  });

  it('should handle markdown-wrapped JSON responses', async () => {
    // Arrange
    await testDb.insert(userApiKeys).values({
      id: 'key-1',
      userId: testUserId,
      provider: 'openai',
      privateKeyEncrypted: encrypt('sk-test-valid-key'),
    });

    mockOpenAI.chat.completions.create.mockResolvedValue({
      choices: [
        {
          message: {
            content:
              '```json\n' +
              JSON.stringify(mockSuccessfulAnalysisResponse) +
              '\n```',
          },
        },
      ],
    });

    const formData = createFormData([
      createMockFile('design.png', 'image/png'),
    ]);
    const request = new MockNextRequest(
      'http://localhost:3000/api/ai/analyze-design',
      {
        method: 'POST',
        body: formData,
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ) as any;

    // Act
    const response = await analyzeDesignHandler(request);
    const data = await response.json();

    // Assert
    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toEqual(mockSuccessfulAnalysisResponse);
  });

  it('should return 401 when user is not authenticated', async () => {
    // Arrange
    const { auth } = require('@/lib/auth/auth');
    auth.mockResolvedValueOnce(null); // No session

    const formData = createFormData([
      createMockFile('design.png', 'image/png'),
    ]);
    const request = new MockNextRequest(
      'http://localhost:3000/api/ai/analyze-design',
      {
        method: 'POST',
        body: formData,
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ) as any;

    // Act
    const response = await analyzeDesignHandler(request);
    const data = await response.json();

    // Assert
    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('should handle rate limiting', async () => {
    // Arrange
    const { applyRateLimit } = require('@/lib/middleware/rate-limit');
    applyRateLimit.mockResolvedValueOnce({
      allowed: false,
      response: new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
        status: 429,
      }),
    });

    const formData = createFormData([
      createMockFile('design.png', 'image/png'),
    ]);
    const request = new MockNextRequest(
      'http://localhost:3000/api/ai/analyze-design',
      {
        method: 'POST',
        body: formData,
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ) as any;

    // Act
    const response = await analyzeDesignHandler(request);
    const data = await response.json();

    // Assert
    expect(response.status).toBe(429);
    expect(data.error).toBe('Rate limit exceeded');
  });

  it('should validate image types', async () => {
    // Arrange
    const formData = createFormData([
      createMockFile('document.pdf', 'application/pdf'), // Invalid type
    ]);

    const request = new MockNextRequest(
      'http://localhost:3000/api/ai/analyze-design',
      {
        method: 'POST',
        body: formData,
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ) as any;

    // Act
    const response = await analyzeDesignHandler(request);
    const data = await response.json();

    // Assert
    expect(response.status).toBe(400);
    expect(data.error).toContain('Invalid image');
  });

  it('should handle parse errors with user-friendly message', async () => {
    // Arrange
    await testDb.insert(userApiKeys).values({
      id: 'key-1',
      userId: testUserId,
      provider: 'openai',
      privateKeyEncrypted: encrypt('sk-test-valid-key'),
    });

    mockOpenAI.chat.completions.create.mockResolvedValue({
      choices: [
        {
          message: {
            content: 'This is not valid JSON',
          },
        },
      ],
    });

    const formData = createFormData([
      createMockFile('design.png', 'image/png'),
    ]);
    const request = new MockNextRequest(
      'http://localhost:3000/api/ai/analyze-design',
      {
        method: 'POST',
        body: formData,
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ) as any;

    // Act
    const response = await analyzeDesignHandler(request);
    const data = await response.json();

    // Assert
    expect(response.status).toBe(400);
    expect(data.error).toBe('Failed to process AI response');
    expect(data.details).toContain('unexpected format');
  });

  it('should use mock service when no API key is configured', async () => {
    // Arrange - No API key in database
    const formData = createFormData([
      createMockFile('design.png', 'image/png'),
    ]);
    const request = new MockNextRequest(
      'http://localhost:3000/api/ai/analyze-design',
      {
        method: 'POST',
        body: formData,
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ) as any;

    // Act
    const response = await analyzeDesignHandler(request);
    const data = await response.json();

    // Assert
    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toBeDefined();
    expect(data.data.metadata.theme).toBe('light'); // Mock service returns light theme
    expect(mockOpenAI.chat.completions.create).not.toHaveBeenCalled(); // No OpenAI call
  });

  it('should handle OpenAI rate limit errors', async () => {
    // Arrange
    await testDb.insert(userApiKeys).values({
      id: 'key-1',
      userId: testUserId,
      provider: 'openai',
      privateKeyEncrypted: encrypt('sk-test-valid-key'),
    });

    const rateLimitError = new Error('Rate limit exceeded');
    (rateLimitError as any).status = 429;
    mockOpenAI.chat.completions.create.mockRejectedValue(rateLimitError);

    const formData = createFormData([
      createMockFile('design.png', 'image/png'),
    ]);
    const request = new MockNextRequest(
      'http://localhost:3000/api/ai/analyze-design',
      {
        method: 'POST',
        body: formData,
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ) as any;

    // Act
    const response = await analyzeDesignHandler(request);
    const data = await response.json();

    // Assert
    expect(response.status).toBe(400);
    expect(data.error).toBe('Rate limit exceeded');
    expect(data.details).toContain('OpenAI API rate limit');
  });

  it('should handle invalid API key errors', async () => {
    // Arrange
    await testDb.insert(userApiKeys).values({
      id: 'key-1',
      userId: testUserId,
      provider: 'openai',
      privateKeyEncrypted: encrypt('sk-test-invalid-key'),
    });

    const authError = new Error('Unauthorized');
    (authError as any).status = 401;
    mockOpenAI.chat.completions.create.mockRejectedValue(authError);

    const formData = createFormData([
      createMockFile('design.png', 'image/png'),
    ]);
    const request = new MockNextRequest(
      'http://localhost:3000/api/ai/analyze-design',
      {
        method: 'POST',
        body: formData,
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ) as any;

    // Act
    const response = await analyzeDesignHandler(request);
    const data = await response.json();

    // Assert
    expect(response.status).toBe(400);
    expect(data.error).toBe('Invalid or missing OpenAI API key');
    expect(data.action).toBeDefined();
    expect(data.action.text).toBe('Configure API Key');
  });
});
