import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';

import { loginAction } from '@/app/actions/auth';
import { authTestHelpers } from '@/lib/db/test-helpers';
import type { AuthUser } from '@/lib/auth/types';

// Mock Next.js Auth signIn function
jest.mock('@/lib/auth/auth', () => ({
  signIn: jest.fn(),
}));

// Mock revalidatePath
jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}));

describe('Login Redirect Integration', () => {
  let testUser: AuthUser;
  let mockSignIn: jest.MockedFunction<any>;

  beforeEach(async () => {
    // Get the mocked signIn function
    const { signIn } = await import('@/lib/auth/auth');
    mockSignIn = signIn as jest.MockedFunction<any>;

    // Create a test user
    testUser = await authTestHelpers.createTestUser({
      email: authTestHelpers.generateUniqueEmail(),
      password: 'password123',
      name: 'Test User',
    });

    jest.clearAllMocks();
  });

  afterEach(async () => {
    // Clean up test user (using testHelpers generic cleanup)
    if (testUser?.id) {
      await authTestHelpers.cleanupUser(testUser.id);
    }
  });

  describe('Successful Login Flow', () => {
    it('should call Next.js Auth signIn and return user data', async () => {
      // Mock successful signIn
      mockSignIn.mockResolvedValue({
        error: null,
      });

      const result = await loginAction({
        email: testUser.email,
        password: 'password123',
      });

      expect(mockSignIn).toHaveBeenCalledWith('credentials', {
        email: testUser.email,
        password: 'password123',
        redirect: false,
      });

      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
      expect(result.user?.email).toBe(testUser.email);
      expect(result.error).toBeUndefined();
    });

    it('should revalidate root path on successful login', async () => {
      const { revalidatePath } = await import('next/cache');

      mockSignIn.mockResolvedValue({
        error: null,
      });

      await loginAction({
        email: testUser.email,
        password: 'password123',
      });

      expect(revalidatePath).toHaveBeenCalledWith('/');
    });
  });

  describe('Failed Login Flow', () => {
    it('should return error when signIn fails', async () => {
      mockSignIn.mockResolvedValue({
        error: 'CredentialsSignin',
      });

      const result = await loginAction({
        email: testUser.email,
        password: 'wrongpassword',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid credentials');
      expect(result.user).toBeUndefined();
    });

    it('should handle non-existent user', async () => {
      mockSignIn.mockResolvedValue({
        error: 'CredentialsSignin',
      });

      const result = await loginAction({
        email: 'nonexistent@example.com',
        password: 'password123',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid credentials');
    });
  });

  describe('Error Handling', () => {
    it('should handle signIn throwing an error', async () => {
      const consoleSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      mockSignIn.mockRejectedValue(new Error('Network error'));

      const result = await loginAction({
        email: testUser.email,
        password: 'password123',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
      expect(consoleSpy).toHaveBeenCalledWith(
        'Login action error:',
        expect.any(Error),
      );

      consoleSpy.mockRestore();
    });

    it('should handle getUserByEmail failure', async () => {
      // Mock signIn success but getUserByEmail failure
      mockSignIn.mockResolvedValue({
        error: null,
      });

      // Delete the user to simulate getUserByEmail failure
      await authTestHelpers.cleanupUser(testUser.id);

      const result = await loginAction({
        email: testUser.email,
        password: 'password123',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Login failed');
    });
  });

  describe('Integration with Middleware', () => {
    it('should work with auth middleware redirect flow', async () => {
      // This test verifies the login action integrates properly with the middleware
      mockSignIn.mockResolvedValue({
        error: null,
      });

      const result = await loginAction({
        email: testUser.email,
        password: 'password123',
      });

      // Verify the user data structure matches what middleware expects
      expect(result.success).toBe(true);
      expect(result.user).toMatchObject({
        id: expect.any(String),
        email: testUser.email,
        name: expect.any(String),
      });

      // Verify all required auth user fields are present
      const requiredFields = [
        'id',
        'email',
        'name',
        'emailVerified',
        'createdAt',
        'updatedAt',
      ];
      requiredFields.forEach(field => {
        expect(result.user).toHaveProperty(field);
      });
    });
  });
});
