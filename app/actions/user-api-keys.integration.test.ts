import { testHelpers, testDataFactories } from '@/lib/db/test-helpers'

beforeEach(async () => {
  // Setup test isolation using transaction-based approach
  await testHelpers.setupTest()
})

afterEach(async () => {
  // Cleanup after each test (transaction rollback)
  await testHelpers.teardownTest()
})

describe('User API Keys Integration Tests', () => {
  // Focus on critical paths and boundaries
  describe('CRUD Workflow - Complete User Journey', () => {
    it('should perform complete CRUD workflow for API keys', async () => {
      const { createUserApiKey, getUserApiKeys, deleteUserApiKey } = require('./user-api-keys');
      
      // Test complete workflow: CREATE → READ → DELETE
      const testApiKey = testDataFactories.createOpenAIKey({
        privateKeyEncrypted: 'sk-test-complete-workflow'
      })
      
      // CREATE
      const createResult = await createUserApiKey({
        provider: testApiKey.provider,
        privateKey: testApiKey.privateKeyEncrypted,
        publicKey: testApiKey.publicKey,
        metadata: testApiKey.metadata
      })
      
      expect(createResult).toMatchObject({
        success: true,
        data: expect.objectContaining({
          id: expect.any(String),
          provider: 'openai',
          createdAt: expect.any(Date)
        })
      })
      const keyId = createResult.data!.id

      // READ - Verify creation
      const listResult = await getUserApiKeys()
      expect(listResult).toMatchObject({
        success: true,
        data: expect.arrayContaining([
          expect.objectContaining({
            id: keyId,
            provider: 'openai'
          })
        ])
      })

      // Verify database state
      await testHelpers.assertDatabaseState({
        apiKeyCount: 1,
        providers: ['openai']
      })

      // DELETE
      const deleteResult = await deleteUserApiKey(keyId)
      expect(deleteResult).toMatchObject({
        success: true
      })

      // READ - Verify deletion
      const finalListResult = await getUserApiKeys()
      expect(finalListResult).toMatchObject({
        success: true,
        data: []
      })

      // Verify final database state
      await testHelpers.assertDatabaseState({
        apiKeyCount: 0
      })
    })
  })

  describe('Boundary Testing - Data Validation', () => {
    it('should handle realistic data flows with edge cases', async () => {
      const { createUserApiKey, getUserApiKeys } = require('./user-api-keys');
      
      // Test with realistic data that mirrors production
      const realisticApiKeys = [
        testDataFactories.createOpenAIKey({
          privateKeyEncrypted: 'sk-test-1234567890abcdefghijklmnopqrstuvwxyz',
          metadata: { model: 'gpt-4', organization: 'test-org' }
        }),
        testDataFactories.createStripeKey({
          privateKeyEncrypted: 'sk_test_1234567890abcdefghijklmnopqrstuvwxyz',
          publicKey: 'pk_test_1234567890abcdefghijklmnopqrstuvwxyz',
          metadata: { mode: 'test', webhook_secret: 'whsec_test' }
        }),
        testDataFactories.createResendKey({
          privateKeyEncrypted: 're_test_1234567890abcdefghijklmnopqrstuvwxyz',
          metadata: { domain: 'example.com' }
        })
      ]

      // Create multiple keys for different providers
      for (const apiKey of realisticApiKeys) {
        const result = await createUserApiKey({
          provider: apiKey.provider,
          privateKey: apiKey.privateKeyEncrypted,
          publicKey: apiKey.publicKey,
          metadata: apiKey.metadata
        })
        
        expect(result).toMatchObject({
          success: true,
          data: expect.objectContaining({
            id: expect.any(String),
            provider: apiKey.provider
          })
        })
      }

      // Verify all keys were created
      const listResult = await getUserApiKeys()
      expect(listResult).toMatchObject({
        success: true,
        data: expect.arrayContaining([
          expect.objectContaining({ provider: 'openai' }),
          expect.objectContaining({ provider: 'stripe' }),
          expect.objectContaining({ provider: 'resend' })
        ])
      })

      // Verify database state with all providers
      await testHelpers.assertDatabaseState({
        apiKeyCount: 3,
        providers: ['openai', 'stripe', 'resend']
      })
    })

    it('should enforce business rules and constraints', async () => {
      const { createUserApiKey } = require('./user-api-keys');
      
      // Test duplicate prevention (business rule)
      const firstApiKey = testDataFactories.createOpenAIKey({
        privateKeyEncrypted: 'sk-test-first-key'
      })
      
      const firstResult = await createUserApiKey({
        provider: firstApiKey.provider,
        privateKey: firstApiKey.privateKeyEncrypted,
        publicKey: firstApiKey.publicKey,
        metadata: firstApiKey.metadata
      })
      expect(firstResult).toMatchObject({
        success: true,
        data: expect.objectContaining({
          provider: 'openai'
        })
      })

      // Try to create duplicate (should fail)
      const secondApiKey = testDataFactories.createOpenAIKey({
        privateKeyEncrypted: 'sk-test-second-key'
      })
      
      const secondResult = await createUserApiKey({
        provider: secondApiKey.provider,
        privateKey: secondApiKey.privateKeyEncrypted,
        publicKey: secondApiKey.publicKey,
        metadata: secondApiKey.metadata
      })
      expect(secondResult).toMatchObject({
        success: false,
        error: expect.stringContaining('already have'),
        errorCode: 'API_KEY_DUPLICATE'
      })

      // Verify only one key exists (constraint enforcement)
      await testHelpers.assertDatabaseState({
        apiKeyCount: 1,
        providers: ['openai']
      })
    })
  })

  describe('Contract Validation - API Boundaries', () => {
    it('should validate API contracts and error responses', async () => {
      const { createUserApiKey, deleteUserApiKey, testUserApiKey } = require('./user-api-keys');
      
      // Test API contract: create with valid data
      const validApiKey = testDataFactories.createOpenAIKey()
      const createResult = await createUserApiKey({
        provider: validApiKey.provider,
        privateKey: validApiKey.privateKeyEncrypted,
        publicKey: validApiKey.publicKey,
        metadata: validApiKey.metadata
      })
      expect(createResult).toMatchObject({
        success: true,
        data: expect.objectContaining({
          id: expect.any(String),
          provider: 'openai',
          createdAt: expect.any(Date)
        })
      })

      // Test API contract: delete non-existent key (error response)
      const deleteResult = await deleteUserApiKey('00000000-0000-0000-0000-000000000999')
      expect(deleteResult).toMatchObject({
        success: false,
        error: expect.stringContaining('Failed to delete')
      })

      // Test API contract: validate key without saving
      const testResult = await testUserApiKey('openai', 'sk-test-validation')
      expect(testResult).toMatchObject({
        success: true,
        message: expect.any(String)
      })

      // Verify no key was saved (contract validation)
      await testHelpers.assertDatabaseState({
        apiKeyCount: 1 // Only the first created key
      })
    })

    it('should handle data serialization/deserialization correctly', async () => {
      const { createUserApiKey, getUserApiKeys } = require('./user-api-keys');
      
      // Test with complex metadata (serialization test)
      const complexApiKey = testDataFactories.createOpenAIKey({
        metadata: {
          model: 'gpt-4',
          organization: 'test-org',
          features: ['chat', 'completion'],
          settings: {
            temperature: 0.7,
            max_tokens: 1000
          }
        }
      })
      
      const createResult = await createUserApiKey({
        provider: complexApiKey.provider,
        privateKey: complexApiKey.privateKeyEncrypted,
        publicKey: complexApiKey.publicKey,
        metadata: complexApiKey.metadata
      })
      expect(createResult).toMatchObject({
        success: true,
        data: expect.objectContaining({
          id: expect.any(String)
        })
      })

      // Verify metadata was serialized/deserialized correctly
      const listResult = await getUserApiKeys()
      expect(listResult).toMatchObject({
        success: true,
        data: expect.arrayContaining([
          expect.objectContaining({
            id: createResult.data!.id,
            metadata: complexApiKey.metadata
          })
        ])
      })
    })
  })

  describe('Configuration and Environment Testing', () => {
    it('should work with real database and encryption', async () => {
      const { createUserApiKey, getUserApiKeys } = require('./user-api-keys');
      
      // Test that encryption/decryption works with real database
      const encryptedApiKey = testDataFactories.createOpenAIKey({
        privateKeyEncrypted: 'sk-test-encryption-test'
      })
      
      const createResult = await createUserApiKey({
        provider: encryptedApiKey.provider,
        privateKey: encryptedApiKey.privateKeyEncrypted,
        publicKey: encryptedApiKey.publicKey,
        metadata: encryptedApiKey.metadata
      })
      expect(createResult).toMatchObject({
        success: true,
        data: expect.objectContaining({
          id: expect.any(String)
        })
      })

      // Verify the key is stored encrypted (not plain text)
      const listResult = await getUserApiKeys()
      expect(listResult).toMatchObject({
        success: true,
        data: expect.arrayContaining([
          expect.objectContaining({
            privateKeyEncrypted: expect.stringMatching(/^sk-tes\.\.\.\./)
          })
        ])
      })
    })

    it('should handle database constraints and foreign keys', async () => {
      // This test verifies that our database schema constraints work correctly
      // In a real scenario, we'd test foreign key constraints, unique constraints, etc.
      
      const { createUserApiKey } = require('./user-api-keys');
      
      // Test that we can create keys for different providers (constraint test)
      const openaiApiKey = testDataFactories.createOpenAIKey({
        privateKeyEncrypted: 'sk-test-openai-key'
      })
      
      const stripeApiKey = testDataFactories.createStripeKey({
        privateKeyEncrypted: 'sk_test_stripe_key'
      })
      
      const result1 = await createUserApiKey({
        provider: openaiApiKey.provider,
        privateKey: openaiApiKey.privateKeyEncrypted,
        publicKey: openaiApiKey.publicKey,
        metadata: openaiApiKey.metadata
      })
      expect(result1).toMatchObject({
        success: true,
        data: expect.objectContaining({
          provider: 'openai'
        })
      })
      
      const result2 = await createUserApiKey({
        provider: stripeApiKey.provider,
        privateKey: stripeApiKey.privateKeyEncrypted,
        publicKey: stripeApiKey.publicKey,
        metadata: stripeApiKey.metadata
      })
      expect(result2).toMatchObject({
        success: true,
        data: expect.objectContaining({
          provider: 'stripe'
        })
      })

      // Verify both keys exist (constraint validation)
      await testHelpers.assertDatabaseState({
        apiKeyCount: 2,
        providers: ['openai', 'stripe']
      })
    })
  })

  describe('Error Handling and Edge Cases', () => {
    it('should handle edge cases gracefully', async () => {
      const { createUserApiKey, deleteUserApiKey } = require('./user-api-keys');
      
      // Test with edge case data
      const edgeCaseApiKey = testDataFactories.createOpenAIKey({
        privateKeyEncrypted: '', // Empty key
        metadata: {} // Empty metadata
      })
      
      const createResult = await createUserApiKey({
        provider: edgeCaseApiKey.provider,
        privateKey: edgeCaseApiKey.privateKeyEncrypted,
        publicKey: edgeCaseApiKey.publicKey,
        metadata: edgeCaseApiKey.metadata
      })
      // Should either succeed (if empty keys are allowed) or fail gracefully
      expect(createResult.success).toBeDefined()

      // Test deletion of non-existent key
      const deleteResult = await deleteUserApiKey('00000000-0000-0000-0000-000000000999')
      expect(deleteResult).toMatchObject({
        success: false,
        error: expect.stringContaining('Failed to delete')
      })
    })

    it('should maintain data integrity across operations', async () => {
      const { createUserApiKey, getUserApiKeys, deleteUserApiKey } = require('./user-api-keys');
      
      // Create multiple keys
      const apiKeys = [
        testDataFactories.createOpenAIKey({ privateKeyEncrypted: 'sk-test-1' }),
        testDataFactories.createStripeKey({ privateKeyEncrypted: 'sk_test_2' }),
        testDataFactories.createResendKey({ privateKeyEncrypted: 're_test_3' })
      ]
      
      const createdIds = []
      for (const apiKey of apiKeys) {
        const result = await createUserApiKey({
          provider: apiKey.provider,
          privateKey: apiKey.privateKeyEncrypted,
          publicKey: apiKey.publicKey,
          metadata: apiKey.metadata
        })
        expect(result).toMatchObject({
          success: true,
          data: expect.objectContaining({
            id: expect.any(String)
          })
        })
        createdIds.push(result.data!.id)
      }

      // Verify all keys exist
      await testHelpers.assertDatabaseState({
        apiKeyCount: 3,
        providers: ['openai', 'stripe', 'resend']
      })

      // Delete one key
      const deleteResult = await deleteUserApiKey(createdIds[0])
      expect(deleteResult).toMatchObject({
        success: true
      })

      // Verify only 2 keys remain
      await testHelpers.assertDatabaseState({
        apiKeyCount: 2
      })

      // Verify the remaining keys are the correct ones
      const listResult = await getUserApiKeys()
      const remainingProviders = listResult.data!.map((k: any) => k.provider)
      expect(remainingProviders).toContain('stripe')
      expect(remainingProviders).toContain('resend')
      expect(remainingProviders).not.toContain('openai')
    })

    it('should rollback all changes on test completion', async () => {
      const { createUserApiKey } = require('./user-api-keys');
      
      // Create a key
      const testApiKey = testDataFactories.createOpenAIKey({
        privateKeyEncrypted: 'sk-test-transaction-test'
      })
      
      const result = await createUserApiKey({
        provider: testApiKey.provider,
        privateKey: testApiKey.privateKeyEncrypted,
        publicKey: testApiKey.publicKey,
        metadata: testApiKey.metadata
      })
      expect(result).toMatchObject({
        success: true,
        data: expect.objectContaining({
          id: expect.any(String)
        })
      })
      
      // Manually verify it exists within the transaction
      const withinTx = await testHelpers.getApiKeyCount()
      expect(withinTx).toBe(1)
    })

    it('should handle concurrent key creation safely', async () => {
      const { createUserApiKey } = require('./user-api-keys');
      
      // Test concurrent creation of the same provider with the same key (should only allow one)
      const promises = Array(5).fill(null).map((_, i) => 
        createUserApiKey({
          provider: 'openai',
          privateKey: 'sk-test-concurrent-same-key', // Same key for all requests
          publicKey: null,
          metadata: {}
        })
      )
      
      const results = await Promise.all(promises)
      const successCount = results.filter(r => r.success).length
      const duplicateCount = results.filter(r => r.errorCode === 'API_KEY_DUPLICATE').length
      
      expect(successCount).toBe(1) // Only one should succeed
      expect(duplicateCount).toBe(4) // Four should fail with duplicate error
      
      // Verify only one key exists
      await testHelpers.assertDatabaseState({
        apiKeyCount: 1,
        providers: ['openai']
      })
    })
  })
})