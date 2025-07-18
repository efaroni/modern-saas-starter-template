import { db } from '@/lib/db'
import { verificationTokens } from '@/lib/db/schema'
import { eq, and, lt, like } from 'drizzle-orm'
import { randomBytes } from 'crypto'

export type TokenType = 'email_verification' | 'password_reset'

export interface TokenData {
  token: string
  expires: Date
  type: TokenType
}

export class TokenService {
  private readonly database: typeof db

  constructor(database: typeof db = db) {
    this.database = database
  }
  /**
   * Generate a secure token for email verification or password reset
   */
  private generateToken(): string {
    return randomBytes(32).toString('hex')
  }

  /**
   * Create a new verification token
   */
  async createToken(identifier: string, type: TokenType, expiresInMinutes: number = 60): Promise<TokenData> {
    const token = this.generateToken()
    const expires = new Date(Date.now() + expiresInMinutes * 60 * 1000)
    
    // Create the full token with type prefix for uniqueness
    const fullToken = `${type}:${token}`
    
    try {
      // Delete any existing tokens for this identifier and type
      await this.database
        .delete(verificationTokens)
        .where(
          and(
            eq(verificationTokens.identifier, identifier),
            like(verificationTokens.token, `${type}:%`)
          )
        )
      
      // Insert new token
      await this.database.insert(verificationTokens).values({
        identifier,
        token: fullToken,
        expires
      })
      
      return {
        token: fullToken,
        expires,
        type
      }
    } catch (error) {
      console.error('Failed to create verification token:', error)
      throw new Error('Failed to create verification token')
    }
  }

  /**
   * Verify and consume a token
   */
  async verifyToken(token: string, identifier: string): Promise<{ valid: boolean; type?: TokenType }> {
    try {
      // Find the token
      const [tokenRecord] = await this.database
        .select()
        .from(verificationTokens)
        .where(
          and(
            eq(verificationTokens.token, token),
            eq(verificationTokens.identifier, identifier)
          )
        )
        .limit(1)
      
      if (!tokenRecord) {
        return { valid: false }
      }
      
      // Check if token has expired
      if (new Date() > tokenRecord.expires) {
        // Delete expired token
        await this.database
          .delete(verificationTokens)
          .where(
            and(
              eq(verificationTokens.token, token),
              eq(verificationTokens.identifier, identifier)
            )
          )
        return { valid: false }
      }
      
      // Token is valid, delete it (consume it)
      await this.database
        .delete(verificationTokens)
        .where(
          and(
            eq(verificationTokens.token, token),
            eq(verificationTokens.identifier, identifier)
          )
        )
      
      // Extract type from token
      const type = token.split(':')[0] as TokenType
      
      return { valid: true, type }
    } catch (error) {
      console.error('Failed to verify token:', error)
      return { valid: false }
    }
  }

  /**
   * Clean up expired tokens
   */
  async cleanupExpiredTokens(): Promise<void> {
    try {
      await this.database
        .delete(verificationTokens)
        .where(
          // Remove tokens that have expired
          lt(verificationTokens.expires, new Date())
        )
    } catch (error) {
      console.error('Failed to cleanup expired tokens:', error)
    }
  }

  /**
   * Get all tokens for an identifier (for testing purposes)
   */
  async getTokensForIdentifier(identifier: string): Promise<Array<{ token: string; expires: Date }>> {
    try {
      const tokens = await this.database
        .select()
        .from(verificationTokens)
        .where(eq(verificationTokens.identifier, identifier))
      
      return tokens.map(t => ({
        token: t.token,
        expires: t.expires
      }))
    } catch (error) {
      console.error('Failed to get tokens:', error)
      return []
    }
  }

  /**
   * Delete all tokens for an identifier
   */
  async deleteTokensForIdentifier(identifier: string): Promise<void> {
    try {
      await this.database
        .delete(verificationTokens)
        .where(eq(verificationTokens.identifier, identifier))
    } catch (error) {
      console.error('Failed to delete tokens:', error)
    }
  }
}