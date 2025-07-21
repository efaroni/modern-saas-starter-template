import { NextAuthConfig } from 'next-auth'
import { DrizzleAdapter } from '@auth/drizzle-adapter'
import Google from 'next-auth/providers/google'
import GitHub from 'next-auth/providers/github'
import { db } from '@/lib/db/server'
import { accounts, sessions, users, verificationTokens } from '@/lib/db/schema'
import { AUTH_CONFIG } from '@/lib/config/app-config'

export const authConfig = {
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: AUTH_CONFIG.ALLOW_DANGEROUS_EMAIL_ACCOUNT_LINKING,
    }),
    GitHub({
      clientId: process.env.GITHUB_ID!,
      clientSecret: process.env.GITHUB_SECRET!,
      allowDangerousEmailAccountLinking: AUTH_CONFIG.ALLOW_DANGEROUS_EMAIL_ACCOUNT_LINKING,
    }),
  ],
  pages: {
    signIn: '/auth',
    error: '/auth',
  },
  callbacks: {
    async signIn({ user, account, profile: _profile }) {
      // Allow OAuth sign-ins
      if (account?.type === 'oauth') {
        try {
          // Import here to avoid circular dependencies
          const { oauthIntegration } = await import('./oauth-integration')
          
          // Handle OAuth callback
          const result = await oauthIntegration.handleOAuthCallback(
            account.provider,
            user,
            account
          )
          
          return result.success
        } catch (error) {
          console.error('OAuth sign-in callback error:', error)
          return false
        }
      }
      
      // For email/password sign-ins, we'll handle this through our custom auth
      return false
    },
    async session({ token, session }) {
      if (token.sub && session.user) {
        session.user.id = token.sub
      }
      return session
    },
    async jwt({ user, token }) {
      if (user) {
        token.sub = user.id
      }
      return token
    },
    async redirect({ url, baseUrl }) {
      // Redirect to our auth page after OAuth success
      if (url.includes('/api/auth/callback/')) {
        return `${baseUrl}/auth?oauth=success`
      }
      
      // Allows relative callback URLs
      if (url.startsWith('/')) return `${baseUrl}${url}`
      // Allows callback URLs on the same origin
      else if (new URL(url).origin === baseUrl) return url
      return baseUrl
    },
  },
  events: {
    async signIn({ user, account, profile: _profile, isNewUser }) {
      // Log OAuth sign-ins for security monitoring
      console.log('OAuth sign-in:', {
        userId: user.id,
        provider: account?.provider,
        isNewUser,
        email: user.email,
      })
    },
    async linkAccount({ user, account, profile: _profile }) {
      // Log account linking
      console.log('Account linked:', {
        userId: user.id,
        provider: account.provider,
        email: user.email,
      })
    },
  },
  session: {
    strategy: 'jwt',
    maxAge: AUTH_CONFIG.SESSION_DURATION_HOURS * 60 * 60, // Convert hours to seconds
  },
  useSecureCookies: process.env.NODE_ENV === 'production',
  cookies: {
    sessionToken: {
      name: process.env.NODE_ENV === 'production' 
        ? '__Secure-next-auth.session-token' 
        : 'next-auth.session-token',
      options: {
        httpOnly: true,
        sameSite: AUTH_CONFIG.COOKIE_SAME_SITE,
        path: '/',
        secure: AUTH_CONFIG.COOKIE_SECURE,
      },
    },
  },
  debug: process.env.NODE_ENV === 'development',
} satisfies NextAuthConfig

// For server-side usage
export default authConfig