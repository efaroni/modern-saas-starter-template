import { type NextAuthConfig } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import GitHub from 'next-auth/providers/github';
import Google from 'next-auth/providers/google';

import { authLogger } from '@/lib/auth/logger';
import { AUTH_CONFIG } from '@/lib/config/app-config';

export const authConfig = {
  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        try {
          // Import minimal credentials auth to avoid server module chain
          const { authenticateCredentials } = await import(
            './credentials-auth.server'
          );

          const result = await authenticateCredentials(
            credentials.email as string,
            credentials.password as string,
          );

          if (result.success && result.user) {
            return {
              id: result.user.id,
              email: result.user.email,
              name: result.user.name,
              image: result.user.image,
            };
          }

          return null;
        } catch (error) {
          console.error('Credentials auth error:', error);
          return null;
        }
      },
    }),
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID ?? '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
      allowDangerousEmailAccountLinking:
        AUTH_CONFIG.ALLOW_DANGEROUS_EMAIL_ACCOUNT_LINKING,
    }),
    GitHub({
      clientId: process.env.GITHUB_ID ?? '',
      clientSecret: process.env.GITHUB_SECRET ?? '',
      allowDangerousEmailAccountLinking:
        AUTH_CONFIG.ALLOW_DANGEROUS_EMAIL_ACCOUNT_LINKING,
    }),
  ],
  pages: {
    signIn: '/',
    error: '/',
  },
  callbacks: {
    async signIn({ user, account, profile: _profile }) {
      // Allow OAuth sign-ins
      if (account?.type === 'oauth') {
        try {
          // Import server-only OAuth callback handler
          const { handleOAuthCallback } = await import(
            './oauth-callback.server'
          );

          // Validate and map user data to our OAuthUser interface
          if (!user.id || !user.email || !user.name) {
            console.error('OAuth sign-in: Missing required user data', {
              user,
            });
            return false;
          }

          const oauthUser = {
            id: user.id,
            email: user.email,
            name: user.name,
            image: user.image || undefined,
          };

          // Handle OAuth callback
          const result = await handleOAuthCallback(
            account.provider,
            oauthUser,
            account,
          );

          return result.success;
        } catch (error) {
          console.error('OAuth sign-in callback error:', error);
          return false;
        }
      }

      // For email/password sign-ins, allow them to proceed
      // The credentials provider has already authenticated the user
      return true;
    },
    session({ token, session }) {
      if (token.sub && session.user) {
        session.user.id = token.sub;
      }
      return session;
    },
    jwt({ user, token }) {
      if (user) {
        token.sub = user.id;
      }
      return token;
    },
    redirect({ url, baseUrl }) {
      // Redirect to configuration page after OAuth success
      if (url.includes('/api/auth/callback/')) {
        return `${baseUrl}/configuration`;
      }

      // Default redirect to configuration page
      if (url === baseUrl || url === `${baseUrl}/`) {
        return `${baseUrl}/configuration`;
      }

      // Allows relative callback URLs
      if (url.startsWith('/')) return `${baseUrl}${url}`;
      // Allows callback URLs on the same origin
      else if (new URL(url).origin === baseUrl) return url;
      return `${baseUrl}/configuration`;
    },
  },
  events: {
    signIn({ user, account, profile: _profile, isNewUser }) {
      // Log OAuth sign-ins for security monitoring
      authLogger.logAuthEvent({
        type: 'oauth_login',
        userId: user.id,
        email: user.email || undefined,
        success: true,
        timestamp: new Date(),
        metadata: {
          provider: account?.provider,
          isNewUser,
        },
      });
    },
    linkAccount({ user, account, profile: _profile }) {
      // Log account linking
      authLogger.logAuthEvent({
        type: 'oauth_login',
        userId: user.id,
        email: user.email || undefined,
        success: true,
        timestamp: new Date(),
        metadata: {
          provider: account.provider,
          isAccountLink: true,
        },
      });
    },
  },
  session: {
    strategy: 'jwt',
    maxAge: AUTH_CONFIG.SESSION_DURATION_HOURS * 60 * 60, // Convert hours to seconds
  },
  useSecureCookies: process.env.NODE_ENV === 'production',
  cookies: {
    sessionToken: {
      name:
        process.env.NODE_ENV === 'production'
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
} satisfies NextAuthConfig;

// For server-side usage
export default authConfig;
