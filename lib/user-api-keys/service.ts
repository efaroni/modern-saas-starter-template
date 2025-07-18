import { config } from '@/lib/config'
import { userApiKeys, type SelectUserApiKey, type InsertUserApiKey } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { encrypt, decrypt, maskApiKey } from '@/lib/encryption'

// Lazy load db to avoid connection issues during import
const getDb = async () => {
  // Use test database in test environment
  if (process.env.NODE_ENV === 'test') {
    const { testDb } = await import('@/lib/db/test')
    return testDb
  }
  
  const { db } = await import('@/lib/db')
  return db
}

// Check if we should use database or mock mode
const shouldUseMock = () => {
  // If no DATABASE_URL is set, always use mock
  if (!process.env.DATABASE_URL) {
    return true
  }
  // If config says database is disabled, use mock
  return !config.database.enabled
}

// Mock data for when database is not available
const mockUserApiKeys: SelectUserApiKey[] = [
  {
    id: '1',
    userId: 'mock-user-1',
    provider: 'openai',
    publicKey: null,
    privateKeyEncrypted: 'sk-mock-1234567890abcdef',
    metadata: {},
    createdAt: new Date(),
    updatedAt: new Date(),
  },
]

// For development, we'll use a mock user ID since auth isn't implemented yet
const MOCK_USER_ID = process.env.NODE_ENV === 'test'
  ? '00000000-0000-0000-0000-000000000001'
  : 'mock-user-1'

export const userApiKeyService = {
  async list(userId?: string): Promise<SelectUserApiKey[]> {
    const currentUserId = userId || MOCK_USER_ID

    if (shouldUseMock()) {
      return mockUserApiKeys.filter(k => k.userId === currentUserId)
    }
    
    try {
      const db = await getDb()
      const keys = await db.select()
        .from(userApiKeys)
        .where(eq(userApiKeys.userId, currentUserId))
        .orderBy(userApiKeys.createdAt)

      // Return with masked private keys - NEVER send encrypted keys to client
      return keys.map(key => ({
        ...key,
        privateKeyEncrypted: maskApiKey(decrypt(key.privateKeyEncrypted)),
        publicKey: key.publicKey ? maskApiKey(key.publicKey) : null,
      }))
    } catch (error) {
      console.error('Database error, falling back to mock:', error)
      return mockUserApiKeys.filter(k => k.userId === currentUserId)
    }
  },

  async create(data: Omit<InsertUserApiKey, 'id' | 'createdAt' | 'updatedAt' | 'userId'>): Promise<SelectUserApiKey> {
    const userId = MOCK_USER_ID // Will be replaced with actual user ID from auth
    
    if (shouldUseMock()) {
      const newKey: SelectUserApiKey = {
        id: Date.now().toString(),
        userId,
        provider: data.provider,
        publicKey: data.publicKey || null,
        privateKeyEncrypted: data.privateKeyEncrypted, // Store unencrypted in mock
        metadata: data.metadata || {},
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      // In mock mode, we'd normally persist this to a real store
      // For now, just return the created key without actually storing it
      return {
        ...newKey,
        privateKeyEncrypted: maskApiKey(data.privateKeyEncrypted),
        publicKey: data.publicKey ? maskApiKey(data.publicKey) : null,
      }
    }

    try {
      // Encrypt the private key before storing
      const encryptedPrivateKey = encrypt(data.privateKeyEncrypted)
      
      const db = await getDb()
      const [created] = await db.insert(userApiKeys).values({
        ...data,
        userId,
        privateKeyEncrypted: encryptedPrivateKey,
      }).returning()
      
      // Return with masked keys - NEVER return the encrypted or real keys
      return {
        ...created,
        privateKeyEncrypted: maskApiKey(data.privateKeyEncrypted),
        publicKey: data.publicKey ? maskApiKey(data.publicKey) : null,
      }
    } catch (error: unknown) {
      // Check for unique constraint violation (Postgres error code 23505)
      // Handle both direct PostgreSQL errors and DrizzleQueryError with cause
      const postgresError = (error as { cause?: unknown }).cause || error
      if ((postgresError as { code?: string }).code === '23505' || 
          (error as { message?: string }).message?.includes('duplicate key value') ||
          (postgresError as { message?: string }).message?.includes('duplicate key value')) {
        throw new Error('API_KEY_DUPLICATE')
      }
      
      throw new Error('Failed to create API key')
    }
  },

  async delete(id: string, userId?: string): Promise<void> {
    const currentUserId = userId || MOCK_USER_ID

    if (shouldUseMock()) {
      const index = mockUserApiKeys.findIndex(k => k.id === id && k.userId === currentUserId)
      if (index === -1) throw new Error('API key not found')
      // In mock mode, we'd normally remove from a real store
      return
    }

    try {
      const db = await getDb()
      const [deleted] = await db.delete(userApiKeys)
        .where(and(
          eq(userApiKeys.id, id),
          eq(userApiKeys.userId, currentUserId)
        ))
        .returning()
      
      if (!deleted) throw new Error('API key not found')
    } catch {
      throw new Error('Failed to delete API key')
    }
  },

  async getByProvider(provider: string, userId?: string): Promise<SelectUserApiKey | null> {
    const currentUserId = userId || MOCK_USER_ID

    if (shouldUseMock()) {
      return mockUserApiKeys.find(k => k.provider === provider && k.userId === currentUserId) || null
    }

    try {
      const db = await getDb()
      const [result] = await db.select()
        .from(userApiKeys)
        .where(and(
          eq(userApiKeys.provider, provider),
          eq(userApiKeys.userId, currentUserId)
        ))
        .limit(1)
      
      return result || null
    } catch (error) {
      console.error('Failed to get API key by provider:', error)
      return null
    }
  },

  // SERVER-SIDE ONLY: Get decrypted private key for actual API calls
  async getDecryptedPrivateKey(provider: string, userId?: string): Promise<string | null> {
    const currentUserId = userId || MOCK_USER_ID

    if (shouldUseMock()) {
      const key = mockUserApiKeys.find(k => k.provider === provider && k.userId === currentUserId)
      return key?.privateKeyEncrypted || null
    }

    try {
      const db = await getDb()
      const [result] = await db.select({ privateKeyEncrypted: userApiKeys.privateKeyEncrypted })
        .from(userApiKeys)
        .where(and(
          eq(userApiKeys.provider, provider),
          eq(userApiKeys.userId, currentUserId)
        ))
        .limit(1)
      
      if (!result) return null
      
      // Decrypt the key for server-side use only
      return decrypt(result.privateKeyEncrypted)
    } catch (error) {
      console.error('Failed to get decrypted private key:', error)
      return null
    }
  },

  // SERVER-SIDE ONLY: Get decrypted public key for actual API calls
  async getDecryptedPublicKey(provider: string, userId?: string): Promise<string | null> {
    const currentUserId = userId || MOCK_USER_ID

    if (shouldUseMock()) {
      const key = mockUserApiKeys.find(k => k.provider === provider && k.userId === currentUserId)
      return key?.publicKey || null
    }

    try {
      const db = await getDb()
      const [result] = await db.select({ publicKey: userApiKeys.publicKey })
        .from(userApiKeys)
        .where(and(
          eq(userApiKeys.provider, provider),
          eq(userApiKeys.userId, currentUserId)
        ))
        .limit(1)
      
      if (!result?.publicKey) return null
      
      // Public keys aren't encrypted, but we store them securely
      return result.publicKey
    } catch (error) {
      console.error('Failed to get public key:', error)
      return null
    }
  },
}