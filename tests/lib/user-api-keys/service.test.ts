import { eq } from 'drizzle-orm';

import { users, userApiKeys } from '@/lib/db/schema';
import { testDb } from '@/lib/db/test';
import { encrypt, decrypt } from '@/lib/encryption';
import { userApiKeyService } from '@/lib/user-api-keys/service';

describe('userApiKeyService', () => {
  const testUserId = '550e8400-e29b-41d4-a716-446655440000';
  const testEmail = 'test@example.com';

  beforeEach(async () => {
    // Clean up any existing data
    await testDb.delete(userApiKeys);
    await testDb.delete(users);

    // Create test user
    await testDb.insert(users).values({
      id: testUserId,
      clerkId: 'user_clerk_test_123',
      email: testEmail,
      name: 'Test User',
    });
  });

  afterEach(async () => {
    await testDb.delete(userApiKeys);
    await testDb.delete(users);
  });

  describe('list', () => {
    it('should return empty array when no API keys exist', async () => {
      const keys = await userApiKeyService.list(testUserId);
      expect(keys).toEqual([]);
    });

    it('should return user API keys with masked values', async () => {
      // Insert test API key
      const apiKey = 'sk-test-1234567890abcdef';
      const encryptedKey = encrypt(apiKey);

      await testDb.insert(userApiKeys).values({
        userId: testUserId,
        provider: 'openai',
        privateKeyEncrypted: encryptedKey,
        publicKey: null,
        metadata: {},
      });

      const keys = await userApiKeyService.list(testUserId);

      expect(keys).toHaveLength(1);
      expect(keys[0].provider).toBe('openai');
      expect(keys[0].privateKeyEncrypted).toBe('sk-tes....cdef'); // Masked format
      expect(keys[0].userId).toBe(testUserId);
    });

    it('should only return keys for the specified user', async () => {
      // Create another user
      const otherUserId = '660e8400-e29b-41d4-a716-446655440001';
      await testDb.insert(users).values({
        id: otherUserId,
        clerkId: 'test_clerk_id_other_user_1',
        email: 'other@example.com',
        name: 'Other User',
      });

      // Insert keys for both users
      await testDb.insert(userApiKeys).values([
        {
          userId: testUserId,
          provider: 'openai',
          privateKeyEncrypted: encrypt('sk-test-1234'),
          publicKey: null,
          metadata: {},
        },
        {
          userId: otherUserId,
          provider: 'stripe',
          privateKeyEncrypted: encrypt('sk-test-5678'),
          publicKey: null,
          metadata: {},
        },
      ]);

      const keys = await userApiKeyService.list(testUserId);

      expect(keys).toHaveLength(1);
      expect(keys[0].provider).toBe('openai');
    });
  });

  describe('create', () => {
    it('should create a new API key with encrypted storage', async () => {
      const apiKey = 'sk-test-1234567890abcdef';

      const created = await userApiKeyService.create(
        {
          provider: 'openai',
          privateKeyEncrypted: apiKey,
          publicKey: null,
          metadata: { test: true },
        },
        testUserId,
      );

      expect(created.provider).toBe('openai');
      expect(created.privateKeyEncrypted).toBe('sk-tes....cdef'); // Masked
      expect(created.metadata).toEqual({ test: true });

      // Verify it's encrypted in the database
      const [dbKey] = await testDb
        .select()
        .from(userApiKeys)
        .where(eq(userApiKeys.id, created.id));

      expect(dbKey.privateKeyEncrypted).not.toBe(apiKey); // Should be encrypted
      expect(decrypt(dbKey.privateKeyEncrypted)).toBe(apiKey); // Should decrypt correctly
    });

    it('should throw error when creating duplicate provider key', async () => {
      // Create first key
      await userApiKeyService.create(
        {
          provider: 'openai',
          privateKeyEncrypted: 'sk-test-first',
          publicKey: null,
          metadata: {},
        },
        testUserId,
      );

      // Try to create duplicate
      await expect(
        userApiKeyService.create(
          {
            provider: 'openai',
            privateKeyEncrypted: 'sk-test-second',
            publicKey: null,
            metadata: {},
          },
          testUserId,
        ),
      ).rejects.toThrow('API_KEY_DUPLICATE');
    });

    it('should mask public keys when provided', async () => {
      const created = await userApiKeyService.create(
        {
          provider: 'stripe',
          privateKeyEncrypted: 'sk_test_1234567890',
          publicKey: 'pk_test_abcdefghij',
          metadata: {},
        },
        testUserId,
      );

      expect(created.publicKey).toBe('pk_tes....ghij'); // Masked
    });
  });

  describe('getByProvider', () => {
    it('should return null when no key exists for provider', async () => {
      const key = await userApiKeyService.getByProvider('openai', testUserId);
      expect(key).toBeNull();
    });

    it('should return key for specific provider', async () => {
      // Create keys for multiple providers
      await testDb.insert(userApiKeys).values([
        {
          userId: testUserId,
          provider: 'openai',
          privateKeyEncrypted: encrypt('sk-test-openai'),
          publicKey: null,
          metadata: {},
        },
        {
          userId: testUserId,
          provider: 'stripe',
          privateKeyEncrypted: encrypt('sk-test-stripe'),
          publicKey: null,
          metadata: {},
        },
      ]);

      const key = await userApiKeyService.getByProvider('openai', testUserId);

      expect(key).toBeTruthy();
      expect(key?.provider).toBe('openai');
    });
  });

  describe('getDecryptedPrivateKey', () => {
    it('should return decrypted private key for server-side use', async () => {
      const apiKey = 'sk-test-1234567890abcdef';

      await testDb.insert(userApiKeys).values({
        userId: testUserId,
        provider: 'openai',
        privateKeyEncrypted: encrypt(apiKey),
        publicKey: null,
        metadata: {},
      });

      const decryptedKey = await userApiKeyService.getDecryptedPrivateKey(
        'openai',
        testUserId,
      );

      expect(decryptedKey).toBe(apiKey); // Should return actual key, not masked
    });

    it('should return null when no key exists', async () => {
      const decryptedKey = await userApiKeyService.getDecryptedPrivateKey(
        'openai',
        testUserId,
      );

      expect(decryptedKey).toBeNull();
    });
  });

  describe('delete', () => {
    it('should delete API key by id', async () => {
      // Create a key
      const [created] = await testDb
        .insert(userApiKeys)
        .values({
          userId: testUserId,
          provider: 'openai',
          privateKeyEncrypted: encrypt('sk-test-1234'),
          publicKey: null,
          metadata: {},
        })
        .returning();

      // Delete it
      await userApiKeyService.delete(created.id, testUserId);

      // Verify it's gone
      const keys = await userApiKeyService.list(testUserId);
      expect(keys).toHaveLength(0);
    });

    it('should throw error when deleting non-existent key', async () => {
      await expect(
        userApiKeyService.delete('non-existent-id', testUserId),
      ).rejects.toThrow('Failed to delete API key');
    });

    it('should not delete keys belonging to other users', async () => {
      // Create another user
      const otherUserId = '660e8400-e29b-41d4-a716-446655440001';
      await testDb.insert(users).values({
        id: otherUserId,
        clerkId: 'test_clerk_id_other_user_2',
        email: 'other@example.com',
        name: 'Other User',
      });

      // Create key for other user
      const [created] = await testDb
        .insert(userApiKeys)
        .values({
          userId: otherUserId,
          provider: 'openai',
          privateKeyEncrypted: encrypt('sk-test-1234'),
          publicKey: null,
          metadata: {},
        })
        .returning();

      // Try to delete with wrong user
      await expect(
        userApiKeyService.delete(created.id, testUserId),
      ).rejects.toThrow('Failed to delete API key');

      // Verify key still exists
      const keys = await userApiKeyService.list(otherUserId);
      expect(keys).toHaveLength(1);
    });
  });
});
