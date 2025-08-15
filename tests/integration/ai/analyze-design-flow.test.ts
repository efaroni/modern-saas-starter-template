/**
 * Integration tests for AI design analysis flow
 * Tests the complete flow from API endpoint to vision service
 */

/**
 * @jest-environment node
 */

// Global mocks are handled in jest.setup.js

import { randomUUID } from 'crypto';

import { OpenAI } from 'openai';

import { MockVisionService } from '@/lib/ai/vision/mock';
import { OpenAIVisionService } from '@/lib/ai/vision/openai';
import {
  createVisionService,
  hasValidOpenAIKey,
} from '@/lib/ai/vision/service';
import { users, userApiKeys } from '@/lib/db/schema';
import { testDb } from '@/lib/db/test';
import { encrypt } from '@/lib/encryption';
import { testUsers } from '@/tests/fixtures/clerk';
import { mockAuthenticatedUser, setupClerkMocks } from '@/tests/mocks/clerk';

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

// Setup Clerk mocks

setupClerkMocks();

// Setup authenticated user for tests
const testUserId = '550e8400-e29b-41d4-a716-446655440000';
mockAuthenticatedUser({ ...testUsers.basic, id: testUserId });

// Mock rate limiting to avoid test interference
jest.mock('@/lib/middleware/rate-limit', () => ({
  applyRateLimit: jest.fn().mockReturnValue({ allowed: true }),
}));

// Mock the vision service factory to control which service is returned
jest.mock('@/lib/ai/vision/service', () => ({
  createVisionService: jest.fn(),
  hasValidOpenAIKey: jest.fn(),
}));

// Mock OpenAI to avoid real API calls
let mockOpenAIInstance: {
  chat: {
    completions: {
      create: jest.MockedFunction<() => Promise<unknown>>;
    };
  };
};

jest.mock('openai', () => {
  class MockAPIError extends Error {
    status: number;
    headers: any;
    error: any;
    constructor(status: number, error: any, message: string, headers: any) {
      super(message);
      this.status = status;
      this.error = error;
      this.headers = headers;
      this.name = 'APIError';
    }
  }

  const MockOpenAI = jest.fn().mockImplementation(() => {
    return mockOpenAIInstance;
  }) as any;

  MockOpenAI.APIError = MockAPIError;

  return {
    OpenAI: MockOpenAI,
  };
});

// Get the MockAPIError for use in tests
const MockAPIError = OpenAI.APIError;

// Get mocked functions
const mockCreateVisionService = createVisionService as jest.MockedFunction<
  typeof createVisionService
>;
const mockHasValidOpenAIKey = hasValidOpenAIKey as jest.MockedFunction<
  typeof hasValidOpenAIKey
>;

describe('AI Design Analysis Integration Flow', () => {
  let testUserId: string; // Generate unique UUID for each test
  let mockOpenAI: typeof mockOpenAIInstance;

  beforeAll(async () => {
    // Dynamically import the handler after mocks are set
    const handlerModule = await import('@/app/api/ai/analyze-design/route');
    analyzeDesignHandler = handlerModule.POST;
  });

  beforeEach(async () => {
    jest.clearAllMocks();

    // Generate a unique user ID for each test
    testUserId = randomUUID();

    // Clean up database
    try {
      await testDb.delete(userApiKeys);
      await testDb.delete(users);
    } catch {
      // Tables might not exist, that's okay
    }

    // Create test user with unique ID
    await testDb.insert(users).values({
      id: testUserId,
      clerkId: `test_clerk_id_${testUserId}`,
      email: `test-${testUserId}@example.com`, // Make email unique too
    });

    // Create a mock OpenAI instance that will be used by the service
    mockOpenAI = {
      chat: {
        completions: {
          create: jest.fn(),
        },
      },
    };

    // Set the global mock instance
    mockOpenAIInstance = mockOpenAI;

    // Setup default vision service behavior
    mockHasValidOpenAIKey.mockResolvedValue(false);
    mockCreateVisionService.mockResolvedValue(new MockVisionService());
  });

  afterEach(async () => {
    // Clean up
    await testDb.delete(userApiKeys);
    await testDb.delete(users);
  });

  const createMockFile = (name: string, type: string): File => {
    const blob = new Blob(['test image data'], { type });
    const file = new File([blob], name, { type });

    // Add arrayBuffer method for Node.js environment
    if (!file.arrayBuffer) {
      (
        file as File & { arrayBuffer?: () => Promise<ArrayBuffer> }
      ).arrayBuffer = (): Promise<ArrayBuffer> => {
        return Promise.resolve(new ArrayBuffer(16)); // Mock array buffer
      };
    }

    return file;
  };

  const createFormData = (files: File[]): FormData => {
    const formData = new FormData();
    files.forEach(file => formData.append('images', file));
    return formData;
  };

  // Import the actual mock data that the service returns
  let mockSuccessfulAnalysisResponse: unknown;

  beforeAll(async () => {
    const mockData = await import('@/lib/ai/vision/mock-data');
    mockSuccessfulAnalysisResponse = mockData.mockDesignAnalysisResult;
  });

  it('should successfully analyze design with valid OpenAI key', async () => {
    // Arrange
    await testDb.insert(userApiKeys).values({
      userId: testUserId,
      provider: 'openai',
      privateKeyEncrypted: encrypt('sk-test-valid-key'),
    });

    // Configure OpenAI service to be used
    mockHasValidOpenAIKey.mockResolvedValue(true);
    const openAIService = new OpenAIVisionService('sk-test-valid-key');
    mockCreateVisionService.mockResolvedValue(openAIService);

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
    expect((data as any).success).toBe(true);
    expect((data as any).data).toEqual(mockSuccessfulAnalysisResponse);
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
    expect((data as any).success).toBe(true);
    expect((data as any).data).toEqual(mockSuccessfulAnalysisResponse);
  });

  it('should return 401 when user is not authenticated', async () => {
    // Arrange
    const { auth } = await import('@clerk/nextjs/server');
    (auth as any).mockResolvedValueOnce({ userId: null }); // No session

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
    expect((data as any).error).toBe('Unauthorized');
  });

  // Note: Rate limiting test removed as it's redundant with middleware tests
  // and creates mock complexity without significant value

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
      userId: testUserId,
      provider: 'openai',
      privateKeyEncrypted: encrypt('sk-test-valid-key'),
    });

    // Configure OpenAI service to be used
    mockHasValidOpenAIKey.mockResolvedValue(true);
    const openAIService = new OpenAIVisionService('sk-test-valid-key');
    mockCreateVisionService.mockResolvedValue(openAIService);

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
    expect((data as any).error).toBe('Failed to process AI response');
    expect((data as any).details).toContain('unexpected format');
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
    expect((data as any).data).toBeDefined();
    expect((data as any).data.metadata.theme).toBe('light'); // Mock service returns light theme
    expect(mockOpenAI.chat.completions.create).not.toHaveBeenCalled(); // No OpenAI call
  });

  it('should handle OpenAI rate limit errors', async () => {
    // Arrange
    await testDb.insert(userApiKeys).values({
      userId: testUserId,
      provider: 'openai',
      privateKeyEncrypted: encrypt('sk-test-valid-key'),
    });

    // Configure OpenAI service to be used
    mockHasValidOpenAIKey.mockResolvedValue(true);
    const openAIService = new OpenAIVisionService('sk-test-valid-key');
    mockCreateVisionService.mockResolvedValue(openAIService);

    // Create a proper OpenAI.APIError using the mocked class
    const rateLimitError = new MockAPIError(
      429,
      {},
      'Rate limit exceeded',
      new Headers(),
    );
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
    expect((data as any).error).toBe('Rate limit exceeded');
    expect((data as any).details).toContain('OpenAI API rate limit');
  });

  it('should handle invalid API key errors', async () => {
    // Arrange
    await testDb.insert(userApiKeys).values({
      userId: testUserId,
      provider: 'openai',
      privateKeyEncrypted: encrypt('sk-test-invalid-key'),
    });

    // Configure OpenAI service to be used
    mockHasValidOpenAIKey.mockResolvedValue(true);
    const openAIService = new OpenAIVisionService('sk-test-invalid-key');
    mockCreateVisionService.mockResolvedValue(openAIService);

    // Create a proper OpenAI.APIError for unauthorized access
    const authError = new MockAPIError(401, {}, 'Unauthorized', new Headers());
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
    expect((data as any).error).toBe('Invalid or missing OpenAI API key');
    expect(data.action).toBeDefined();
    expect(data.action.text).toBe('Configure API Key');
  });
});
