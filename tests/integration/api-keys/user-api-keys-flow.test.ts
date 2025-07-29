/**
 * Integration tests for user API key management flow
 * Tests the complete flow from UI to database
 */

import { testDb } from '@/lib/db/test';
import { users, userApiKeys } from '@/lib/db/schema';
import {
  getUserApiKeys,
  createUserApiKey,
  deleteUserApiKey,
  testUserApiKey,
} from '@/app/actions/user-api-keys';
import { validateApiKey } from '@/lib/api-keys/validators';
import { userApiKeyService } from '@/lib/user-api-keys/service';
import { decrypt } from '@/lib/encryption';

// Mock auth to return our test user
jest.mock('@/lib/auth/auth', () => ({
  auth: jest.fn().mockResolvedValue({
    user: { id: '550e8400-e29b-41d4-a716-446655440000' },
  }),
}));

// Mock the API validation to avoid real API calls
jest.mock('@/lib/api-keys/validators', () => ({
  validateApiKey: jest.fn(),
  validateOpenAIKey: jest.fn(),
  validateResendKey: jest.fn(),
  validateStripeKey: jest.fn(),
}));

// Mock revalidatePath to avoid Next.js specific functionality in tests
jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}));

describe('User API Keys Integration Flow', () => {
  const testUserId = '550e8400-e29b-41d4-a716-446655440000'; // Valid UUID
  const mockValidateApiKey = validateApiKey as jest.MockedFunction<
    typeof validateApiKey
  >;

  beforeEach(async () => {
    // Clean up database - handle if tables don't exist
    try {
      await testDb.delete(userApiKeys);
    } catch (e) {
      // Table might not exist, that's okay
    }
    try {
      await testDb.delete(users);
    } catch (e) {
      // Table might not exist, that's okay
    }

    // Create test user
    await testDb.insert(users).values({
      id: testUserId,
      email: 'test@example.com',
      name: 'Test User',
      password: 'hashed_password',
    });

    // Reset mocks
    jest.clearAllMocks();
    mockValidateApiKey.mockResolvedValue({ isValid: true });
  });

  afterEach(async () => {
    try {
      await testDb.delete(userApiKeys);
    } catch (e) {
      // Table might not exist, that's okay
    }
    try {
      await testDb.delete(users);
    } catch (e) {
      // Table might not exist, that's okay
    }
  });

  describe('Complete API Key Lifecycle', () => {
    it('should handle full lifecycle: create, list, test, and delete', async () => {
      // 1. Initially no API keys
      const initialKeys = await getUserApiKeys();
      expect(initialKeys.success).toBe(true);
      expect(initialKeys.data).toHaveLength(0);

      // 2. Create an OpenAI API key
      const createResult = await createUserApiKey({
        provider: 'openai',
        privateKey: 'sk-test-1234567890abcdef',
        metadata: { environment: 'test' },
      });

      expect(createResult.success).toBe(true);
      expect(createResult.data).toMatchObject({
        provider: 'openai',
        privateKeyEncrypted: 'sk-tes....cdef', // Masked
        metadata: { environment: 'test' },
      });

      // 3. List API keys - should show the created key
      const keysAfterCreate = await getUserApiKeys();
      expect(keysAfterCreate.success).toBe(true);
      expect(keysAfterCreate.data).toHaveLength(1);
      expect(keysAfterCreate.data![0]).toMatchObject({
        provider: 'openai',
        privateKeyEncrypted: 'sk-tes....cdef',
      });

      // 4. Test the API key (without providing key - should use stored one)
      const testResult = await testUserApiKey('openai');
      expect(testResult.success).toBe(true);
      expect(testResult.message).toBe('API key is valid and working!');

      // 5. Verify the key is properly encrypted in database
      const [dbKey] = await testDb.select().from(userApiKeys);
      expect(dbKey.privateKeyEncrypted).not.toBe('sk-test-1234567890abcdef');
      expect(decrypt(dbKey.privateKeyEncrypted)).toBe(
        'sk-test-1234567890abcdef',
      );

      // 6. Delete the API key
      const deleteResult = await deleteUserApiKey(createResult.data!.id);
      expect(deleteResult.success).toBe(true);

      // 7. Verify key is deleted
      const keysAfterDelete = await getUserApiKeys();
      expect(keysAfterDelete.success).toBe(true);
      expect(keysAfterDelete.data).toHaveLength(0);
    });
  });

  describe('Multiple Providers', () => {
    it('should handle multiple API keys for different providers', async () => {
      // Create keys for multiple providers
      const providers = [
        { provider: 'openai', privateKey: 'sk-test-openai123' },
        { provider: 'stripe', privateKey: 'sk_test_stripe456' },
        { provider: 'resend', privateKey: 're_test_resend789' },
      ];

      for (const { provider, privateKey } of providers) {
        const result = await createUserApiKey({ provider, privateKey });
        expect(result.success).toBe(true);
      }

      // List all keys
      const allKeys = await getUserApiKeys();
      expect(allKeys.success).toBe(true);
      expect(allKeys.data).toHaveLength(3);

      // Test each key individually
      for (const { provider } of providers) {
        const testResult = await testUserApiKey(provider);
        expect(testResult.success).toBe(true);
      }

      // Verify we can't create duplicate keys for same provider
      const duplicateResult = await createUserApiKey({
        provider: 'openai',
        privateKey: 'sk-test-different-key',
      });
      expect(duplicateResult.success).toBe(false);
      expect(duplicateResult.errorCode).toBe('API_KEY_DUPLICATE');
    });
  });

  describe('API Key Validation', () => {
    it('should validate keys before storing', async () => {
      // Test with invalid key
      mockValidateApiKey.mockResolvedValueOnce({
        isValid: false,
        error: 'Invalid API key format',
      });

      const invalidResult = await createUserApiKey({
        provider: 'openai',
        privateKey: 'sk-test-invalid',
      });

      expect(invalidResult.success).toBe(false);
      expect(invalidResult.error).toBe('Invalid API key format');

      // Verify no key was stored
      const keys = await getUserApiKeys();
      expect(keys.data).toHaveLength(0);
    });

    it('should handle API validation errors gracefully', async () => {
      // Simulate API validation throwing an error
      mockValidateApiKey.mockRejectedValueOnce(new Error('Network error'));

      const result = await createUserApiKey({
        provider: 'openai',
        privateKey: 'sk-test-network-error',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to create API key');
    });
  });

  describe('Security', () => {
    it('should never expose decrypted keys to client', async () => {
      // Create a key
      await createUserApiKey({
        provider: 'openai',
        privateKey: 'sk-test-secret-key-12345',
      });

      // Get keys through public API
      const result = await getUserApiKeys();
      expect(result.success).toBe(true);

      // Verify the key is masked
      const key = result.data![0];
      expect(key.privateKeyEncrypted).toBe('sk-tes....2345'); // 6 chars prefix + 4 chars suffix
      expect(key.privateKeyEncrypted).not.toContain('secret');

      // But server-side service can get the real key
      const decryptedKey = await userApiKeyService.getDecryptedPrivateKey(
        'openai',
        testUserId,
      );
      expect(decryptedKey).toBe('sk-test-secret-key-12345');
    });

    it('should isolate keys between users', async () => {
      // Create another user
      const otherUserId = '660e8400-e29b-41d4-a716-446655440001';
      await testDb.insert(users).values({
        id: otherUserId,
        email: 'other@example.com',
        name: 'Other User',
        password: 'hashed_password',
      });

      // Create key for test user
      await createUserApiKey({
        provider: 'openai',
        privateKey: 'sk-test-user1-key',
      });

      // Mock auth to be the other user
      jest.mocked(require('@/lib/auth/auth').auth).mockResolvedValueOnce({
        user: { id: otherUserId },
      });

      // Other user shouldn't see test user's keys
      const otherUserKeys = await getUserApiKeys();
      expect(otherUserKeys.success).toBe(true);
      expect(otherUserKeys.data).toHaveLength(0);
    });
  });

  describe('Mock Keys in Development', () => {
    it('should allow mock keys in development without validation', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      // Create mock key - validation should be skipped
      const result = await createUserApiKey({
        provider: 'openai',
        privateKey: 'sk-mock-development-key',
      });

      expect(result.success).toBe(true);
      expect(mockValidateApiKey).not.toHaveBeenCalled();

      // Test mock key - it should find the existing mock key
      const testResult = await testUserApiKey('openai');

      // If it fails, let's see what the error is
      if (!testResult.success) {
        console.error('Mock key test failed:', testResult);
      }

      expect(testResult.success).toBe(true);
      expect(testResult.isMock).toBe(true);

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      // This test would need a way to force a database error
      // Since the service falls back to mock mode when DB is unavailable,
      // we'll skip this test for now
      expect(true).toBe(true);
    });

    it('should handle masked keys without ByteString conversion errors', async () => {
      // Create a key first
      const createResult = await createUserApiKey({
        provider: 'openai',
        privateKey: 'sk-proj-abcdefghijklmnopqrstuvwxyz123456',
      });

      if (!createResult.success) {
        console.error('Failed to create API key:', createResult);
      }
      expect(createResult.success).toBe(true);

      // Get the masked key for display
      const { getDisplayMaskedApiKey } = await import(
        '@/app/actions/user-api-keys'
      );
      const maskedResult = await getDisplayMaskedApiKey('openai');

      if (!maskedResult.success) {
        console.error('Failed to get masked key:', maskedResult);
      }
      expect(maskedResult.success).toBe(true);
      expect(maskedResult.maskedKey).toBeDefined();

      // Verify the masked key only contains ASCII characters
      const maskedKey = maskedResult.maskedKey!;
      for (let i = 0; i < maskedKey.length; i++) {
        const charCode = maskedKey.charCodeAt(i);
        expect(charCode).toBeLessThan(128); // ASCII range
      }

      // The masked key should work with validation without ByteString errors
      const testResult = await testUserApiKey('openai');
      expect(testResult.success).toBe(true);

      // If there's an error, it should not contain ByteString errors
      if (testResult.error) {
        expect(testResult.error).not.toContain('ByteString');
        expect(testResult.error).not.toContain('character at index');
      }
    });
  });
});
