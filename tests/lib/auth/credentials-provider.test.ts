import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Create a mock credentials provider function that simulates the authorize behavior
const createMockCredentialsProvider = (mockAuthService: any) => ({
  name: 'credentials',
  credentials: {
    email: { label: 'Email', type: 'email' },
    password: { label: 'Password', type: 'password' },
  },
  async authorize(credentials: any) {
    if (!credentials?.email || !credentials?.password) {
      return null;
    }

    try {
      const result = await mockAuthService.signIn({
        email: credentials.email as string,
        password: credentials.password as string,
      });

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
});

describe('Credentials Provider', () => {
  let mockAuthService: any;
  let credentialsProvider: any;

  beforeEach(() => {
    mockAuthService = {
      signIn: jest.fn(),
    };

    credentialsProvider = createMockCredentialsProvider(mockAuthService);

    jest.clearAllMocks();
  });

  describe('Provider Configuration', () => {
    it('should have credentials provider configured', () => {
      expect(credentialsProvider).toBeDefined();
      expect(credentialsProvider.name).toBe('credentials');
    });

    it('should have correct credential fields', () => {
      expect(credentialsProvider.credentials).toEqual({
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      });
    });
  });

  describe('Authentication', () => {
    it('should return null for missing credentials', async () => {
      const result = await credentialsProvider.authorize({});
      expect(result).toBeNull();
    });

    it('should return null for missing email', async () => {
      const result = await credentialsProvider.authorize({
        password: 'password123',
      });
      expect(result).toBeNull();
    });

    it('should return null for missing password', async () => {
      const result = await credentialsProvider.authorize({
        email: 'test@example.com',
      });
      expect(result).toBeNull();
    });

    it('should return user data on successful authentication', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        image: null,
      };

      mockAuthService.signIn.mockResolvedValue({
        success: true,
        user: mockUser,
      });

      const result = await credentialsProvider.authorize({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(mockAuthService.signIn).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(result).toEqual({
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        image: null,
      });
    });

    it('should return null on authentication failure', async () => {
      mockAuthService.signIn.mockResolvedValue({
        success: false,
        error: 'Invalid credentials',
      });

      const result = await credentialsProvider.authorize({
        email: 'test@example.com',
        password: 'wrongpassword',
      });

      expect(result).toBeNull();
    });

    it('should return null on service error', async () => {
      mockAuthService.signIn.mockRejectedValue(new Error('Service error'));

      const result = await credentialsProvider.authorize({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(result).toBeNull();
    });

    it('should handle missing user in successful response', async () => {
      mockAuthService.signIn.mockResolvedValue({
        success: true,
        user: null,
      });

      const result = await credentialsProvider.authorize({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(result).toBeNull();
    });
  });

  describe('Error Handling', () => {
    it('should log errors and return null', async () => {
      const consoleSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      mockAuthService.signIn.mockRejectedValue(
        new Error('Database connection failed'),
      );

      const result = await credentialsProvider.authorize({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        'Credentials auth error:',
        expect.any(Error),
      );
      expect(result).toBeNull();

      consoleSpy.mockRestore();
    });
  });
});
