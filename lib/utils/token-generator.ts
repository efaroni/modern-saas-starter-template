import { randomBytes } from 'crypto'

/**
 * Token generation utilities for consistent and secure token creation
 * 
 * SECURITY GUIDELINES:
 * 1. Always use crypto.randomBytes() for cryptographically secure tokens
 * 2. Use appropriate security levels based on token purpose:
 *    - HIGH for password reset, email verification (security-critical)
 *    - MEDIUM for session tokens (moderate security)
 *    - LOW only for non-sensitive operations (UI state, etc.)
 * 3. Never use Math.random() for security-critical operations
 * 4. Legacy functions are provided for backward compatibility only
 */

export interface TokenOptions {
  length?: number
  includeTimestamp?: boolean
  prefix?: string
  charset?: 'hex' | 'base64' | 'alphanumeric' | 'base62'
}

/**
 * Security levels for different token types
 */
export enum TokenSecurityLevel {
  LOW = 'low',      // For non-sensitive operations (e.g., UI state)
  MEDIUM = 'medium', // For session tokens
  HIGH = 'high',     // For password reset, email verification
  CRITICAL = 'critical' // For API keys, encryption keys
}

/**
 * Token configurations for different security levels
 */
const TOKEN_CONFIGS: Record<TokenSecurityLevel, TokenOptions> = {
  [TokenSecurityLevel.LOW]: {
    length: 8,
    charset: 'alphanumeric'
  },
  [TokenSecurityLevel.MEDIUM]: {
    length: 32,
    charset: 'hex'
  },
  [TokenSecurityLevel.HIGH]: {
    length: 64,
    charset: 'hex'
  },
  [TokenSecurityLevel.CRITICAL]: {
    length: 128,
    charset: 'hex'
  }
}

/**
 * Generates a cryptographically secure random token
 */
export function generateSecureToken(
  securityLevel: TokenSecurityLevel = TokenSecurityLevel.MEDIUM,
  options: Partial<TokenOptions> = {}
): string {
  const config = { ...TOKEN_CONFIGS[securityLevel], ...options }
  
  let token: string
  
  switch (config.charset) {
    case 'hex':
      token = randomBytes(config.length! / 2).toString('hex')
      break
    case 'base64':
      token = randomBytes(config.length! * 3 / 4).toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '')
      break
    case 'base62':
      token = generateBase62Token(config.length!)
      break
    case 'alphanumeric':
    default:
      token = generateAlphanumericToken(config.length!)
      break
  }
  
  // Add timestamp if requested
  if (config.includeTimestamp) {
    const timestamp = Date.now().toString(36)
    token = `${timestamp}_${token}`
  }
  
  // Add prefix if requested
  if (config.prefix) {
    token = `${config.prefix}_${token}`
  }
  
  return token
}

/**
 * Generates a base62 token (alphanumeric without special characters)
 */
function generateBase62Token(length: number): string {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let token = ''
  
  for (let i = 0; i < length; i++) {
    const randomByte = randomBytes(1)[0]
    token += charset[randomByte % charset.length]
  }
  
  return token
}

/**
 * Generates an alphanumeric token (legacy method for compatibility)
 * ⚠️ SECURITY WARNING: Uses Math.random() - avoid for security-critical operations
 */
function generateAlphanumericToken(length: number): string {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let token = ''
  
  for (let i = 0; i < length; i++) {
    token += charset.charAt(Math.floor(Math.random() * charset.length))
  }
  
  return token
}

/**
 * Pre-configured token generators for common use cases
 */
export const TokenGenerators = {
  /**
   * For email verification tokens (high security, 64 chars)
   */
  emailVerification: (): string => 
    generateSecureToken(TokenSecurityLevel.HIGH, { prefix: 'email_verification' }),
  
  /**
   * For password reset tokens (high security, 64 chars)
   */
  passwordReset: (): string => 
    generateSecureToken(TokenSecurityLevel.HIGH, { prefix: 'password_reset' }),
  
  /**
   * For session tokens (medium security, 32 chars)
   */
  session: (): string => 
    generateSecureToken(TokenSecurityLevel.MEDIUM),
  
  /**
   * For API keys (critical security, 128 chars)
   */
  apiKey: (): string => 
    generateSecureToken(TokenSecurityLevel.CRITICAL, { prefix: 'sk' }),
  
  /**
   * For CSRF tokens (medium security, 32 chars)
   */
  csrf: (): string => 
    generateSecureToken(TokenSecurityLevel.MEDIUM, { prefix: 'csrf' }),
  
  /**
   * For temporary codes (low security, 8 chars, alphanumeric)
   */
  tempCode: (): string => 
    generateSecureToken(TokenSecurityLevel.LOW),
  
  /**
   * For test tokens (low security, predictable for testing)
   */
  test: (prefix?: string): string => {
    const timestamp = Date.now().toString(36)
    const random = Math.random().toString(36).substring(2, 8)
    return prefix ? `${prefix}_${timestamp}_${random}` : `${timestamp}_${random}`
  }
}

/**
 * Validates token format and structure
 */
export function validateTokenFormat(token: string, expectedPrefix?: string): boolean {
  if (!token || typeof token !== 'string') {
    return false
  }
  
  // Check minimum length
  if (token.length < 8) {
    return false
  }
  
  // Check prefix if expected
  if (expectedPrefix && !token.startsWith(`${expectedPrefix}_`)) {
    return false
  }
  
  // Check for valid characters (alphanumeric, hyphens, underscores)
  const validChars = /^[a-zA-Z0-9_-]+$/
  return validChars.test(token)
}

/**
 * Extracts prefix from a token
 */
export function extractTokenPrefix(token: string): string | null {
  if (!token || typeof token !== 'string') {
    return null
  }
  
  const parts = token.split('_')
  return parts.length > 1 ? parts[0] : null
}

/**
 * Generates a token with custom options
 */
export function generateCustomToken(options: TokenOptions): string {
  const defaultOptions: TokenOptions = {
    length: 32,
    charset: 'hex',
    includeTimestamp: false
  }
  
  const mergedOptions = { ...defaultOptions, ...options }
  
  return generateSecureToken(TokenSecurityLevel.MEDIUM, mergedOptions)
}

/**
 * Legacy token generation methods for backward compatibility
 * 
 * ⚠️ SECURITY WARNING: These methods use Math.random() which is NOT cryptographically secure!
 * - Use ONLY for non-security-critical operations (UI state, temporary IDs, etc.)
 * - NEVER use for passwords, tokens, session IDs, or any security-sensitive data
 * - Prefer generateSecureToken() or TokenGenerators for all security-critical use cases
 */
export const LegacyTokens = {
  /**
   * ⚠️ INSECURE: Uses Math.random() - only for non-security-critical operations
   */
  random: (length: number = 32): string => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    let token = ''
    
    for (let i = 0; i < length; i++) {
      token += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    
    return token
  },
  
  /**
   * Generates a simple numeric code
   */
  numericCode: (length: number = 6): string => {
    return Math.floor(Math.random() * Math.pow(10, length))
      .toString()
      .padStart(length, '0')
  }
}