import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  jest,
} from '@jest/globals';

// Mock the provider classes
jest.mock('./providers/mock', () => ({
  MockAIProvider: jest.fn().mockImplementation(() => ({
    analyzeScreenshot: jest.fn(),
    estimateCost: jest.fn(),
  })),
}));

jest.mock('./providers/openai', () => ({
  OpenAIProvider: jest.fn().mockImplementation(() => ({
    analyzeScreenshot: jest.fn(),
    estimateCost: jest.fn(),
  })),
}));

describe('AI Factory', () => {
  // Store original environment variables
  const originalEnv = process.env;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Clear module cache to ensure fresh imports
    jest.resetModules();

    // Reset process.env to a clean state
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe('createAIProvider', () => {
    it('should return MockAI Provider in test environment', async () => {
      // Arrange
      process.env.NODE_ENV = 'test';
      process.env.OPENAI_API_KEY = 'sk-test-api-key';

      // Act
      const factory = await import('./factory');
      const provider = factory.createAIProvider();

      // Assert
      const { MockAIProvider } = await import('./providers/mock');
      expect(MockAIProvider).toHaveBeenCalledTimes(1);
      expect(provider).toBeDefined();
    });

    it('should return OpenAI Provider when API key is available in non-test environment', async () => {
      // Arrange
      process.env.NODE_ENV = 'development';
      process.env.OPENAI_API_KEY = 'sk-test-api-key';

      // Act
      const factory = await import('./factory');
      const provider = factory.createAIProvider();

      // Assert
      const { OpenAIProvider } = await import('./providers/openai');
      expect(OpenAIProvider).toHaveBeenCalledTimes(1);
      expect(OpenAIProvider).toHaveBeenCalledWith('sk-test-api-key');
      expect(provider).toBeDefined();
    });

    it('should return MockAI Provider when API key is missing in development', async () => {
      // Arrange
      process.env.NODE_ENV = 'development';
      delete process.env.OPENAI_API_KEY;

      // Mock console.warn to avoid noise in test output
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      // Act
      const factory = await import('./factory');
      const _provider = factory.createAIProvider();

      // Assert
      const { MockAIProvider } = await import('./providers/mock');
      expect(MockAIProvider).toHaveBeenCalledTimes(1);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'OPENAI_API_KEY not found, using mock AI provider',
      );
      expect(_provider).toBeDefined();

      // Cleanup
      consoleWarnSpy.mockRestore();
    });

    it('should return MockAI Provider when API key is empty string', async () => {
      // Arrange
      process.env.NODE_ENV = 'development';
      process.env.OPENAI_API_KEY = '';

      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      // Act
      const factory = await import('./factory');
      const _provider = factory.createAIProvider();

      // Assert
      const { MockAIProvider } = await import('./providers/mock');
      expect(MockAIProvider).toHaveBeenCalledTimes(1);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'OPENAI_API_KEY not found, using mock AI provider',
      );

      consoleWarnSpy.mockRestore();
    });

    it('should return OpenAI Provider in production with API key', async () => {
      // Arrange
      process.env.NODE_ENV = 'production';
      process.env.OPENAI_API_KEY = 'sk-prod-api-key';

      // Act
      const factory = await import('./factory');
      const _provider = factory.createAIProvider();

      // Assert
      const { OpenAIProvider } = await import('./providers/openai');
      expect(OpenAIProvider).toHaveBeenCalledTimes(1);
      expect(OpenAIProvider).toHaveBeenCalledWith('sk-prod-api-key');
    });

    it('should create new instance on each call', async () => {
      // Arrange
      process.env.NODE_ENV = 'development';
      process.env.OPENAI_API_KEY = 'sk-test-api-key';

      // Act
      const factory = await import('./factory');
      const _provider1 = factory.createAIProvider();
      const _provider2 = factory.createAIProvider();

      // Assert
      const { OpenAIProvider } = await import('./providers/openai');
      expect(OpenAIProvider).toHaveBeenCalledTimes(2);
    });
  });

  describe('isRealAIProvider', () => {
    it('should return false in test environment even with API key', async () => {
      // Arrange
      process.env.NODE_ENV = 'test';
      process.env.OPENAI_API_KEY = 'sk-test-api-key';

      // Act
      const factory = await import('./factory');
      const isReal = factory.isRealAIProvider();

      // Assert
      expect(isReal).toBe(false);
    });

    it('should return false when API key is missing', async () => {
      // Arrange
      process.env.NODE_ENV = 'development';
      delete process.env.OPENAI_API_KEY;

      // Act
      const factory = await import('./factory');
      const isReal = factory.isRealAIProvider();

      // Assert
      expect(isReal).toBe(false);
    });

    it('should return true when not in test and API key is present', async () => {
      // Arrange
      process.env.NODE_ENV = 'development';
      process.env.OPENAI_API_KEY = 'sk-test-api-key';

      // Act
      const factory = await import('./factory');
      const isReal = factory.isRealAIProvider();

      // Assert
      expect(isReal).toBe(true);
    });
  });
});
