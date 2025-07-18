import { DatabaseSessionStorage, SessionConfig, DEFAULT_SESSION_CONFIG } from './database-session-storage'
import { AuthUser } from './types'
import { db } from '@/lib/db'
import { AUTH_CONFIG } from '@/lib/config/app-config'

export interface SessionSecurityConfig {
  // Session timeouts
  maxAge: number
  inactivityTimeout: number
  
  // Security policies
  maxConcurrentSessions: number
  suspiciousActivityThreshold: number
  
  // Cookie settings
  cookieName: string
  cookieOptions: {
    httpOnly: boolean
    secure: boolean
    sameSite: 'strict' | 'lax' | 'none'
    path: string
    domain?: string
  }
}

export const DEFAULT_SECURITY_CONFIG: SessionSecurityConfig = {
  maxAge: AUTH_CONFIG.SESSION_DURATION_HOURS * 60 * 60, // Convert hours to seconds
  inactivityTimeout: 60 * 60, // 1 hour
  maxConcurrentSessions: 3,
  suspiciousActivityThreshold: 2,
  cookieName: 'auth_session',
  cookieOptions: {
    httpOnly: true,
    secure: AUTH_CONFIG.COOKIE_SECURE,
    sameSite: AUTH_CONFIG.COOKIE_SAME_SITE,
    path: '/',
    domain: undefined
  }
}

export class SessionManager {
  private storage: DatabaseSessionStorage
  private config: SessionSecurityConfig

  constructor(database: typeof db = db, config: SessionSecurityConfig = DEFAULT_SECURITY_CONFIG) {
    this.config = config
    this.storage = new DatabaseSessionStorage(database, {
      maxAge: config.maxAge,
      maxConcurrentSessions: config.maxConcurrentSessions,
      suspiciousActivityThreshold: config.suspiciousActivityThreshold,
      inactivityTimeout: config.inactivityTimeout
    })
  }

  /**
   * Create a new session for a user
   */
  async createSession(
    user: AuthUser,
    ipAddress?: string,
    userAgent?: string
  ): Promise<{
    sessionToken: string
    expires: Date
    cookieOptions: any
  }> {
    try {
      const sessionToken = await this.storage.createSession(
        user.id,
        ipAddress,
        userAgent
      )

      const expires = new Date(Date.now() + this.config.maxAge * 1000)

      return {
        sessionToken,
        expires,
        cookieOptions: {
          ...this.config.cookieOptions,
          expires,
          maxAge: this.config.maxAge
        }
      }
    } catch (error) {
      throw new Error(`Session creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Validate and refresh a session
   */
  async validateSession(
    sessionToken: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<{
    valid: boolean
    user?: AuthUser
    suspicious?: boolean
    action?: 'refresh' | 'invalidate'
  }> {
    try {
      this.storage.setSessionToken(sessionToken)
      const sessionData = await this.storage.getSession()

      if (!sessionData || !sessionData.user) {
        return { valid: false }
      }

      // Check for suspicious activity
      const suspicious = ipAddress && userAgent ? 
        await this.detectSuspiciousActivity(sessionToken, ipAddress, userAgent) : 
        false

      if (suspicious) {
        // Invalidate session on suspicious activity
        await this.storage.removeSession()
        return { 
          valid: false, 
          suspicious: true, 
          action: 'invalidate' 
        }
      }

      // Session is valid, refresh it
      const refreshedExpires = new Date(Date.now() + this.config.maxAge * 1000)
      await this.storage.setSession({
        ...sessionData,
        expires: refreshedExpires.toISOString()
      })

      return {
        valid: true,
        user: sessionData.user,
        action: 'refresh'
      }
    } catch (error) {
      console.error('Failed to validate session:', error)
      return { valid: false }
    }
  }

  /**
   * Destroy a session
   */
  async destroySession(sessionToken: string): Promise<void> {
    try {
      this.storage.setSessionToken(sessionToken)
      await this.storage.removeSession()
    } catch (error) {
      console.error('Failed to destroy session:', error)
    }
  }

  /**
   * Get all active sessions for a user
   */
  async getUserSessions(userId: string): Promise<any[]> {
    return await this.storage.getUserSessions(userId)
  }

  /**
   * Invalidate all sessions for a user (security action)
   */
  async invalidateUserSessions(userId: string, reason: string = 'security'): Promise<void> {
    await this.storage.invalidateUserSessions(userId, reason)
  }

  /**
   * Detect suspicious activity
   */
  private async detectSuspiciousActivity(
    sessionToken: string,
    ipAddress: string,
    userAgent: string
  ): Promise<boolean> {
    try {
      // Get session info to find session ID
      this.storage.setSessionToken(sessionToken)
      const sessionData = await this.storage.getSession()
      
      if (!sessionData) {
        return false
      }

      // For now, we'll implement a simple check
      // In a real implementation, you'd get the session ID from the database
      // and call storage.detectSuspiciousActivity(sessionId, ipAddress, userAgent)
      
      return false // Simplified for now
    } catch (error) {
      console.error('Failed to detect suspicious activity:', error)
      return false
    }
  }

  /**
   * Get cookie configuration for setting secure cookies
   */
  getCookieConfig(): {
    name: string
    options: any
  } {
    return {
      name: this.config.cookieName,
      options: this.config.cookieOptions
    }
  }

  /**
   * Create cookie string for HTTP response
   */
  createCookieString(sessionToken: string, expires: Date): string {
    const options = this.config.cookieOptions
    let cookieString = `${this.config.cookieName}=${sessionToken}`
    
    if (expires) {
      cookieString += `; Expires=${expires.toUTCString()}`
    }
    
    if (options.maxAge) {
      cookieString += `; Max-Age=${options.maxAge}`
    }
    
    if (options.path) {
      cookieString += `; Path=${options.path}`
    }
    
    if (options.domain) {
      cookieString += `; Domain=${options.domain}`
    }
    
    if (options.secure) {
      cookieString += '; Secure'
    }
    
    if (options.httpOnly) {
      cookieString += '; HttpOnly'
    }
    
    if (options.sameSite) {
      cookieString += `; SameSite=${options.sameSite}`
    }
    
    return cookieString
  }

  /**
   * Create cookie string for clearing the session
   */
  createClearCookieString(): string {
    return `${this.config.cookieName}=; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Path=${this.config.cookieOptions.path}`
  }

  /**
   * Clean up expired sessions (maintenance function)
   */
  async cleanupExpiredSessions(): Promise<void> {
    // This would be called by a background job
    try {
      // The cleanup is handled internally by DatabaseSessionStorage
      // We could add more sophisticated cleanup logic here
    } catch (error) {
      console.error('Failed to cleanup expired sessions:', error)
    }
  }
}