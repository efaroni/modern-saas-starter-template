import { db } from '@/lib/db/server'
import { userSessions, sessionActivity, users } from '@/lib/db/schema'
import { eq, and, lt, desc } from 'drizzle-orm'
import { SessionStorage, SessionData } from './session-storage'
import { randomBytes } from 'crypto'
import { AUTH_CONFIG } from '@/lib/config/app-config'

export interface SessionConfig {
  maxAge: number // Session max age in seconds
  maxConcurrentSessions: number // Maximum concurrent sessions per user
  suspiciousActivityThreshold: number // IP changes that trigger suspicious activity
  inactivityTimeout: number // Inactivity timeout in seconds
}

export const DEFAULT_SESSION_CONFIG: SessionConfig = {
  maxAge: AUTH_CONFIG.SESSION_DURATION_HOURS * 60 * 60, // Convert hours to seconds
  maxConcurrentSessions: 3,
  suspiciousActivityThreshold: 2,
  inactivityTimeout: 60 * 60 // 1 hour
}

export class DatabaseSessionStorage implements SessionStorage {
  private sessionToken: string | null = null
  private config: SessionConfig
  private readonly database: typeof db

  constructor(database: typeof db = db, config: SessionConfig = DEFAULT_SESSION_CONFIG) {
    this.database = database
    this.config = config
  }

  isAvailable(): boolean {
    return true
  }

  /**
   * Generate a secure session token
   */
  private generateSessionToken(): string {
    return randomBytes(32).toString('hex')
  }

  /**
   * Create a new session in the database
   */
  async createSession(
    userId: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<string> {
    try {
      // Clean up expired sessions first
      await this.cleanupExpiredSessions()

      // Check concurrent session limit
      await this.enforceConcurrentSessionLimit(userId)

      // Generate session token
      const sessionToken = this.generateSessionToken()
      const expiresAt = new Date(Date.now() + this.config.maxAge * 1000)

      // Create session record
      const [session] = await this.database
        .insert(userSessions)
        .values({
          userId,
          sessionToken,
          ipAddress,
          userAgent,
          expiresAt,
          isActive: true,
          lastActivity: new Date()
        })
        .returning()

      // Log session creation
      await this.logSessionActivity(session.id, 'login', ipAddress, userAgent)

      this.sessionToken = sessionToken
      return sessionToken
    } catch (error) {
      console.error('Failed to create session:', error)
      throw new Error('Session creation failed')
    }
  }

  /**
   * Get session data from database
   */
  async getSession(): Promise<SessionData | null> {
    if (!this.sessionToken) {
      return null
    }

    try {
      const [result] = await this.database
        .select({
          session: userSessions,
          user: users
        })
        .from(userSessions)
        .innerJoin(users, eq(userSessions.userId, users.id))
        .where(
          and(
            eq(userSessions.sessionToken, this.sessionToken),
            eq(userSessions.isActive, true)
          )
        )
        .limit(1)

      if (!result) {
        this.sessionToken = null
        return null
      }

      const { session, user } = result

      // Check if session is expired
      if (session.expiresAt < new Date()) {
        await this.invalidateSession(session.id, 'timeout')
        this.sessionToken = null
        return null
      }

      // Check inactivity timeout
      const inactivityThreshold = new Date(Date.now() - this.config.inactivityTimeout * 1000)
      if (session.lastActivity < inactivityThreshold) {
        await this.invalidateSession(session.id, 'timeout')
        this.sessionToken = null
        return null
      }

      // Update last activity
      await this.database
        .update(userSessions)
        .set({ lastActivity: new Date() })
        .where(eq(userSessions.id, session.id))

      // Return session data with user information
      return {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          emailVerified: user.emailVerified
        },
        expires: session.expiresAt.toISOString()
      }
    } catch (error) {
      console.error('Failed to get session:', error)
      return null
    }
  }

  /**
   * Set session data (update existing session)
   */
  async setSession(sessionData: SessionData): Promise<void> {
    if (!this.sessionToken || !sessionData.user) {
      return
    }

    try {
      await this.database
        .update(userSessions)
        .set({
          lastActivity: new Date(),
          expiresAt: sessionData.expires ? new Date(sessionData.expires) : new Date(Date.now() + this.config.maxAge * 1000)
        })
        .where(eq(userSessions.sessionToken, this.sessionToken))
    } catch (error) {
      console.error('Failed to update session:', error)
    }
  }

  /**
   * Remove session from database
   */
  async removeSession(): Promise<void> {
    if (!this.sessionToken) {
      return
    }

    try {
      const [session] = await this.database
        .select()
        .from(userSessions)
        .where(eq(userSessions.sessionToken, this.sessionToken))
        .limit(1)

      if (session) {
        await this.invalidateSession(session.id, 'logout')
      }

      this.sessionToken = null
    } catch (error) {
      console.error('Failed to remove session:', error)
    }
  }

  /**
   * Set the session token for this storage instance
   */
  setSessionToken(token: string): void {
    this.sessionToken = token
  }

  /**
   * Get the current session token
   */
  getSessionToken(): string | null {
    return this.sessionToken
  }

  /**
   * Invalidate a session
   */
  private async invalidateSession(sessionId: string, reason: string): Promise<void> {
    try {
      await this.database
        .update(userSessions)
        .set({ isActive: false })
        .where(eq(userSessions.id, sessionId))

      await this.logSessionActivity(sessionId, reason)
    } catch (error) {
      console.error('Failed to invalidate session:', error)
    }
  }

  /**
   * Log session activity
   */
  private async logSessionActivity(
    sessionId: string,
    action: string,
    ipAddress?: string,
    userAgent?: string,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    try {
      await this.database
        .insert(sessionActivity)
        .values({
          sessionId,
          action,
          ipAddress,
          userAgent,
          metadata: metadata || {}
        })
    } catch (error) {
      console.error('Failed to log session activity:', error)
    }
  }

  /**
   * Clean up expired sessions
   */
  private async cleanupExpiredSessions(): Promise<void> {
    try {
      await this.database
        .update(userSessions)
        .set({ isActive: false })
        .where(lt(userSessions.expiresAt, new Date()))
    } catch (error) {
      console.error('Failed to cleanup expired sessions:', error)
    }
  }

  /**
   * Enforce concurrent session limit
   */
  private async enforceConcurrentSessionLimit(userId: string): Promise<void> {
    try {
      const activeSessions = await this.database
        .select()
        .from(userSessions)
        .where(
          and(
            eq(userSessions.userId, userId),
            eq(userSessions.isActive, true)
          )
        )
        .orderBy(desc(userSessions.lastActivity))

      if (activeSessions.length >= this.config.maxConcurrentSessions) {
        // Deactivate oldest sessions
        const sessionsToDeactivate = activeSessions.slice(this.config.maxConcurrentSessions - 1)
        
        for (const session of sessionsToDeactivate) {
          await this.invalidateSession(session.id, 'concurrent_limit')
        }
      }
    } catch (error) {
      console.error('Failed to enforce concurrent session limit:', error)
    }
  }

  /**
   * Detect suspicious activity
   */
  async detectSuspiciousActivity(
    sessionId: string,
    currentIpAddress: string,
    currentUserAgent: string
  ): Promise<boolean> {
    try {
      // Get recent session activities
      const recentActivities = await this.database
        .select()
        .from(sessionActivity)
        .where(eq(sessionActivity.sessionId, sessionId))
        .orderBy(desc(sessionActivity.createdAt))
        .limit(10)

      // Check for rapid IP changes
      const uniqueIPs = new Set(
        recentActivities
          .filter(activity => activity.ipAddress)
          .map(activity => activity.ipAddress)
      )

      if (uniqueIPs.size >= this.config.suspiciousActivityThreshold) {
        await this.logSessionActivity(
          sessionId,
          'suspicious',
          currentIpAddress,
          currentUserAgent,
          { reason: 'rapid_ip_changes', unique_ips: Array.from(uniqueIPs) }
        )
        return true
      }

      // Check for unusual user agent changes
      const uniqueUserAgents = new Set(
        recentActivities
          .filter(activity => activity.userAgent)
          .map(activity => activity.userAgent)
      )

      if (uniqueUserAgents.size >= this.config.suspiciousActivityThreshold) {
        await this.logSessionActivity(
          sessionId,
          'suspicious',
          currentIpAddress,
          currentUserAgent,
          { reason: 'user_agent_changes', unique_user_agents: Array.from(uniqueUserAgents) }
        )
        return true
      }

      return false
    } catch (error) {
      console.error('Failed to detect suspicious activity:', error)
      return false
    }
  }

  /**
   * Get all active sessions for a user
   */
  async getUserSessions(userId: string): Promise<unknown[]> {
    try {
      return await this.database
        .select()
        .from(userSessions)
        .where(
          and(
            eq(userSessions.userId, userId),
            eq(userSessions.isActive, true)
          )
        )
        .orderBy(desc(userSessions.lastActivity))
    } catch (error) {
      console.error('Failed to get user sessions:', error)
      return []
    }
  }

  /**
   * Invalidate all sessions for a user
   */
  async invalidateUserSessions(userId: string, reason: string = 'security'): Promise<void> {
    try {
      const sessions = await this.getUserSessions(userId)
      
      for (const session of sessions) {
        await this.invalidateSession(session.id, reason)
      }
    } catch (error) {
      console.error('Failed to invalidate user sessions:', error)
    }
  }
}