// Global mock data store
let mockApiKeysData: any[] = [];

beforeEach(() => {
  jest.resetModules();
  mockApiKeysData = [];

  jest.doMock('@/lib/api-keys/validators', () => ({
    validateApiKey: jest.fn().mockResolvedValue({ isValid: true })
  }));
  jest.doMock('next/cache', () => ({
    revalidatePath: jest.fn()
  }));
  jest.doMock('@/lib/user-api-keys/service', () => ({
    userApiKeyService: {
      async list() {
        return [...mockApiKeysData];
      },
      async create(data: any) {
        const id = Date.now().toString();
        const key = {
          id,
          userId: 'test-user-123',
          provider: data.provider,
          publicKey: data.publicKey || null,
          privateKeyEncrypted: data.privateKeyEncrypted,
          metadata: data.metadata || {},
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        mockApiKeysData.push(key);
        return key;
      },
      async delete(id: string) {
        const index = mockApiKeysData.findIndex(key => key.id === id);
        if (index === -1) throw new Error('API key not found');
        mockApiKeysData.splice(index, 1);
      },
      async getByProvider(provider: string) {
        return mockApiKeysData.find(key => key.provider === provider) || null;
      }
    }
  }));
});

describe('User API Keys Integration Tests', () => {
  describe('createUserApiKey', () => {
    it('should create a new API key successfully', async () => {
      const { createUserApiKey } = require('./user-api-keys');
      const result = await createUserApiKey({
        provider: 'openai',
        privateKey: 'sk-test-1234567890abcdef'
      })

      expect(result.success).toBe(true)
      expect(result.data?.provider).toBe('openai')
      expect(result.data?.id).toBeDefined()
    })

    it('should prevent duplicate keys for the same provider', async () => {
      const { createUserApiKey } = require('./user-api-keys');
      // Create first key
      const firstResult = await createUserApiKey({
        provider: 'openai',
        privateKey: 'sk-test-first-key'
      })
      expect(firstResult.success).toBe(true)

      // Try to create second key for same provider
      const secondResult = await createUserApiKey({
        provider: 'openai',
        privateKey: 'sk-test-second-key'
      })
      expect(secondResult.success).toBe(false)
      expect(secondResult.error).toContain('already have')
    })

    it('should allow different providers for the same user', async () => {
      const { createUserApiKey } = require('./user-api-keys');
      // Create OpenAI key
      const openaiResult = await createUserApiKey({
        provider: 'openai',
        privateKey: 'sk-test-openai-key'
      })
      expect(openaiResult.success).toBe(true)

      // Create Resend key
      const resendResult = await createUserApiKey({
        provider: 'resend',
        privateKey: 're_test_resend_key'
      })
      expect(resendResult.success).toBe(true)
    })
  })

  describe('getUserApiKeys', () => {
    it('should return empty array when no keys exist', async () => {
      const { getUserApiKeys } = require('./user-api-keys');
      const result = await getUserApiKeys()
      
      expect(result.success).toBe(true)
      expect(result.data).toEqual([])
    })

    it('should return all keys for the user', async () => {
      const { createUserApiKey, getUserApiKeys } = require('./user-api-keys');
      // Create keys for different providers
      const openaiResult = await createUserApiKey({
        provider: 'openai',
        privateKey: 'sk-test-openai'
      });
      expect(openaiResult.success).toBe(true);
      
      const resendResult = await createUserApiKey({
        provider: 'resend',
        privateKey: 're_test_resend'
      });
      expect(resendResult.success).toBe(true);

      const result = await getUserApiKeys()
      
      expect(result.success).toBe(true)
      expect(result.data).toHaveLength(2)
      expect(result.data?.map((k: any) => k.provider)).toContain('openai')
      expect(result.data?.map((k: any) => k.provider)).toContain('resend')
    })
  })

  describe('deleteUserApiKey', () => {
    it('should fail when deleting non-existent key', async () => {
      const { deleteUserApiKey } = require('./user-api-keys');
      const result = await deleteUserApiKey('non-existent-id')
      
      expect(result.success).toBe(false)
      expect(result.error).toContain('Failed to delete')
    })

    it('should successfully delete an existing key', async () => {
      const { createUserApiKey, deleteUserApiKey, getUserApiKeys } = require('./user-api-keys');
      // Create a key first
      const createResult = await createUserApiKey({
        provider: 'openai',
        privateKey: 'sk-test-for-deletion'
      })
      expect(createResult.success).toBe(true)

      const keyId = createResult.data!.id

      // Delete the key
      const deleteResult = await deleteUserApiKey(keyId)
      expect(deleteResult.success).toBe(true)

      // Verify it's gone
      const listResult = await getUserApiKeys()
      expect(listResult.data).toHaveLength(0)
    })
  })

  describe('testUserApiKey', () => {
    it('should validate a key without saving it', async () => {
      const { testUserApiKey, getUserApiKeys } = require('./user-api-keys');
      const result = await testUserApiKey('openai', 'sk-test-validation')

      expect(result.success).toBe(true)
      expect(result.message).toBeDefined()
      
      // Verify no key was actually saved
      const listResult = await getUserApiKeys()
      expect(listResult.data).toHaveLength(0)
    })
  })
})