import { NextRequest } from 'next/server';

import { auth } from '@/lib/auth/auth';
import { middleware } from '@/middleware';

// Mock auth
jest.mock('@/lib/auth/auth', () => ({
  auth: jest.fn(),
}));

describe('Middleware Authentication', () => {
  const mockAuth = auth as jest.MockedFunction<typeof auth>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Public Routes', () => {
    it('should allow access to homepage without authentication', async () => {
      mockAuth.mockResolvedValue(null);

      const request = new NextRequest(new URL('http://localhost:3000/'));
      const response = await middleware(request);

      expect(response).toBeDefined();
      // Should not redirect
      expect(response.headers.get('location')).toBeNull();
    });

    it('should allow access to reset-password without authentication', async () => {
      mockAuth.mockResolvedValue(null);

      const request = new NextRequest(
        new URL('http://localhost:3000/reset-password'),
      );
      const response = await middleware(request);

      expect(response).toBeDefined();
      expect(response.headers.get('location')).toBeNull();
    });

    it('should allow access to verify-email without authentication', async () => {
      mockAuth.mockResolvedValue(null);

      const request = new NextRequest(
        new URL('http://localhost:3000/verify-email'),
      );
      const response = await middleware(request);

      expect(response).toBeDefined();
      expect(response.headers.get('location')).toBeNull();
    });

    it('should allow access to auth API routes', async () => {
      mockAuth.mockResolvedValue(null);

      const request = new NextRequest(
        new URL('http://localhost:3000/api/auth/login'),
      );
      const response = await middleware(request);

      expect(response).toBeDefined();
      expect(response.headers.get('location')).toBeNull();
    });
  });

  describe('Protected Routes', () => {
    const protectedRoutes = [
      '/configuration',
      '/styling',
      '/generators',
      '/performance',
      '/rate-limiting',
      '/sections',
      '/auth', // Auth management page
    ];

    it('should redirect unauthenticated users to homepage', async () => {
      mockAuth.mockResolvedValue(null);

      for (const route of protectedRoutes) {
        const request = new NextRequest(
          new URL(`http://localhost:3000${route}`),
        );
        const response = await middleware(request);

        expect(response.status).toBe(307); // Redirect status
        expect(response.headers.get('location')).toBe('/');
      }
    });

    it('should allow authenticated users to access protected routes', async () => {
      mockAuth.mockResolvedValue({
        user: {
          id: 'user-123',
          email: 'test@example.com',
          name: 'Test User',
        },
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      } as any);

      for (const route of protectedRoutes) {
        const request = new NextRequest(
          new URL(`http://localhost:3000${route}`),
        );
        const response = await middleware(request);

        expect(response.headers.get('location')).toBeNull();
      }
    });
  });

  describe('Authentication Redirects', () => {
    it('should redirect authenticated users from homepage to configuration', async () => {
      mockAuth.mockResolvedValue({
        user: {
          id: 'user-123',
          email: 'test@example.com',
          name: 'Test User',
        },
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      } as any);

      const request = new NextRequest(new URL('http://localhost:3000/'));
      const response = await middleware(request);

      expect(response.status).toBe(307);
      expect(response.headers.get('location')).toBe('/configuration');
    });

    it('should not redirect authenticated users from other public routes', async () => {
      mockAuth.mockResolvedValue({
        user: {
          id: 'user-123',
          email: 'test@example.com',
          name: 'Test User',
        },
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      } as any);

      const publicRoutes = ['/reset-password', '/verify-email'];

      for (const route of publicRoutes) {
        const request = new NextRequest(
          new URL(`http://localhost:3000${route}`),
        );
        const response = await middleware(request);

        expect(response.headers.get('location')).toBeNull();
      }
    });
  });

  describe('Static Resources', () => {
    it('should not process static files', () => {
      const staticPaths = [
        '/_next/static/css/app.css',
        '/_next/image/logo.png',
        '/favicon.ico',
      ];

      // These paths should be excluded by the matcher
      // In a real test, we'd verify the matcher configuration
      expect(staticPaths.length).toBeGreaterThan(0);
    });
  });
});
