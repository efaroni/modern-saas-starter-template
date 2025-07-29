import { auth } from '@/lib/auth/auth';
import { validateApiKey } from '@/lib/api-keys/validators';
import { userApiKeyService } from '@/lib/user-api-keys/service';
import {
  getUserApiKeys,
  createUserApiKey,
  deleteUserApiKey,
  testUserApiKey,
} from '@/app/actions/user-api-keys';

// Mock dependencies
jest.mock('@/lib/auth/auth');
jest.mock('@/lib/api-keys/validators');
jest.mock('@/lib/user-api-keys/service');
jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}));

describe('User API Keys Actions', () => {
  const mockAuth = auth as jest.MockedFunction<typeof auth>;
  const mockValidateApiKey = validateApiKey as jest.MockedFunction<
    typeof validateApiKey
  >;
  const mockUserId = 'test-user-id';
  const mockSession = { user: { id: mockUserId } };

  beforeEach(() => {
    jest.clearAllMocks();
    mockAuth.mockResolvedValue(mockSession as any);
  });

  describe('getUserApiKeys', () => {
    it('should return user API keys when authenticated', async () => {
      const mockKeys = [
        {
          id: '1',
          userId: mockUserId,
          provider: 'openai',
          privateKeyEncrypted: 'sk-***cdef',
          publicKey: null,
          metadata: {},
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      (userApiKeyService.list as jest.Mock).mockResolvedValue(mockKeys);

      const result = await getUserApiKeys();

      expect(result).toEqual({
        success: true,
        data: mockKeys,
      });
      expect(userApiKeyService.list).toHaveBeenCalledWith(mockUserId);
    });

    it('should return error when not authenticated', async () => {
      mockAuth.mockResolvedValue(null);

      const result = await getUserApiKeys();

      expect(result).toEqual({
        success: false,
        error: 'Not authenticated',
      });
    });

    it('should handle service errors gracefully', async () => {
      (userApiKeyService.list as jest.Mock).mockRejectedValue(
        new Error('DB error'),
      );

      const result = await getUserApiKeys();

      expect(result).toEqual({
        success: false,
        error: 'Failed to fetch API keys',
      });
    });
  });

  describe('createUserApiKey', () => {
    const validOpenAIKey = {
      provider: 'openai',
      privateKey: 'sk-test-1234567890',
    };

    it('should create API key when valid', async () => {
      mockValidateApiKey.mockResolvedValue({ isValid: true });
      (userApiKeyService.getByProvider as jest.Mock).mockResolvedValue(null);
      (userApiKeyService.create as jest.Mock).mockResolvedValue({
        id: 'new-key-id',
        ...validOpenAIKey,
      });

      const result = await createUserApiKey(validOpenAIKey);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        id: 'new-key-id',
        ...validOpenAIKey,
      });
      expect(validateApiKey).toHaveBeenCalledWith(
        'openai',
        'sk-test-1234567890',
      );
    });

    it('should reject invalid OpenAI key format', async () => {
      const result = await createUserApiKey({
        provider: 'openai',
        privateKey: 'invalid-key',
      });

      expect(result).toEqual({
        success: false,
        error: 'OpenAI keys must start with sk-',
      });
      expect(validateApiKey).not.toHaveBeenCalled();
    });

    it('should reject invalid Resend key format', async () => {
      const result = await createUserApiKey({
        provider: 'resend',
        privateKey: 'invalid-key',
      });

      expect(result).toEqual({
        success: false,
        error: 'Resend keys must start with re_',
      });
    });

    it('should handle duplicate provider keys', async () => {
      (userApiKeyService.getByProvider as jest.Mock).mockResolvedValue({
        id: 'existing-key',
        provider: 'openai',
      });

      const result = await createUserApiKey(validOpenAIKey);

      expect(result).toEqual({
        success: false,
        error:
          'You already have a openai API key configured. Delete the existing one first.',
        errorCode: 'API_KEY_DUPLICATE',
      });
    });

    it('should allow mock keys in development', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      (userApiKeyService.getByProvider as jest.Mock).mockResolvedValue(null);
      (userApiKeyService.create as jest.Mock).mockResolvedValue({
        id: 'mock-key-id',
      });

      const result = await createUserApiKey({
        provider: 'openai',
        privateKey: 'sk-mock-1234567890',
      });

      expect(result.success).toBe(true);
      expect(validateApiKey).not.toHaveBeenCalled(); // Mock keys skip validation

      process.env.NODE_ENV = originalEnv;
    });

    it('should reject mock keys in production', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const result = await createUserApiKey({
        provider: 'openai',
        privateKey: 'sk-mock-1234567890',
      });

      expect(result).toEqual({
        success: false,
        error: 'Mock API keys are not allowed in production',
      });

      process.env.NODE_ENV = originalEnv;
    });

    it('should handle validation failures', async () => {
      mockValidateApiKey.mockResolvedValue({
        isValid: false,
        error: 'Invalid API key',
      });
      (userApiKeyService.getByProvider as jest.Mock).mockResolvedValue(null);

      const result = await createUserApiKey(validOpenAIKey);

      expect(result).toEqual({
        success: false,
        error: 'Invalid API key',
      });
    });
  });

  describe('deleteUserApiKey', () => {
    it('should delete API key when authenticated', async () => {
      (userApiKeyService.delete as jest.Mock).mockResolvedValue(undefined);

      const result = await deleteUserApiKey('key-id-to-delete');

      expect(result).toEqual({ success: true });
      expect(userApiKeyService.delete).toHaveBeenCalledWith(
        'key-id-to-delete',
        mockUserId,
      );
    });

    it('should return error when not authenticated', async () => {
      mockAuth.mockResolvedValue(null);

      const result = await deleteUserApiKey('key-id');

      expect(result).toEqual({
        success: false,
        error: 'Not authenticated',
      });
    });

    it('should handle deletion errors', async () => {
      (userApiKeyService.delete as jest.Mock).mockRejectedValue(
        new Error('Not found'),
      );

      const result = await deleteUserApiKey('key-id');

      expect(result).toEqual({
        success: false,
        error: 'Failed to delete API key',
      });
    });
  });

  describe('testUserApiKey', () => {
    it('should test provided API key', async () => {
      mockValidateApiKey.mockResolvedValue({ isValid: true });

      const result = await testUserApiKey('openai', 'sk-test-1234567890');

      expect(result).toEqual({
        success: true,
        message: 'API key is valid and working!',
      });
      expect(validateApiKey).toHaveBeenCalledWith(
        'openai',
        'sk-test-1234567890',
      );
    });

    it('should test existing API key when no key provided', async () => {
      (userApiKeyService.getDecryptedPrivateKey as jest.Mock).mockResolvedValue(
        'sk-test-existing',
      );
      mockValidateApiKey.mockResolvedValue({ isValid: true });

      const result = await testUserApiKey('openai');

      expect(result).toEqual({
        success: true,
        message: 'API key is valid and working!',
      });
      expect(userApiKeyService.getDecryptedPrivateKey).toHaveBeenCalledWith(
        'openai',
        mockUserId,
      );
      expect(validateApiKey).toHaveBeenCalledWith('openai', 'sk-test-existing');
    });

    it('should return error when no existing key found', async () => {
      (userApiKeyService.getDecryptedPrivateKey as jest.Mock).mockResolvedValue(
        null,
      );

      const result = await testUserApiKey('openai');

      expect(result).toEqual({
        success: false,
        error: 'No API key found for this provider',
      });
    });

    it('should handle validation failures', async () => {
      mockValidateApiKey.mockResolvedValue({
        isValid: false,
        error: 'API rate limit exceeded',
      });

      const result = await testUserApiKey('openai', 'sk-test-1234567890');

      expect(result).toEqual({
        success: false,
        error: 'API rate limit exceeded',
      });
    });

    it('should handle mock keys in development', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const result = await testUserApiKey('openai', 'sk-mock-1234567890');

      expect(result).toEqual({
        success: true,
        isMock: true,
        message: 'Mock API key - validation skipped',
      });
      expect(validateApiKey).not.toHaveBeenCalled();

      process.env.NODE_ENV = originalEnv;
    });

    it('should require authentication', async () => {
      mockAuth.mockResolvedValue(null);

      const result = await testUserApiKey('openai', 'sk-test-1234567890');

      expect(result).toEqual({
        success: false,
        error: 'Not authenticated',
      });
    });
  });
});
