import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { MockAuthProvider } from '@/lib/auth/providers/mock';
import { AuthService } from '@/lib/auth/service';
import type { AuthUser } from '@/lib/auth/types';

describe('Avatar Upload', () => {
  let authProvider: MockAuthProvider;
  let authService: AuthService;
  let testUser: AuthUser;

  beforeEach(async () => {
    authProvider = new MockAuthProvider();
    authService = new AuthService(authProvider);

    // Create a test user
    const result = await authService.signUp({
      email: 'avatar@example.com',
      password: 'password123',
      name: 'Avatar Test User',
    });

    if (result.success && result.user) {
      testUser = result.user;
    }
  });

  describe('Avatar Upload Service', () => {
    it('should upload avatar successfully', async () => {
      const mockFile = new File(['avatar content'], 'avatar.jpg', {
        type: 'image/jpeg',
      });

      const result = await authService.uploadAvatar(testUser.id, mockFile);

      expect(result.success).toBe(true);
      expect(result.user?.image).toMatch(
        /^https:\/\/storage\.example\.com\/avatars\/.*\.jpg$/,
      );
      expect(result.user?.id).toBe(testUser.id);
    });

    it('should handle upload failure with unsupported file type', async () => {
      const mockFile = new File(['document content'], 'document.pdf', {
        type: 'application/pdf',
      });

      const result = await authService.uploadAvatar(testUser.id, mockFile);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid file type. Only images are allowed.');
    });

    it('should validate file size', async () => {
      // Create a large file (>5MB)
      const largeContent = new Array(6 * 1024 * 1024).fill('x').join('');
      const mockFile = new File([largeContent], 'large.jpg', {
        type: 'image/jpeg',
      });

      const result = await authService.uploadAvatar(testUser.id, mockFile);

      expect(result.success).toBe(false);
      expect(result.error).toBe('File too large. Maximum size is 5MB.');
    });

    it('should replace existing avatar when uploading new one', async () => {
      // First upload
      const firstFile = new File(['first avatar'], 'first.jpg', {
        type: 'image/jpeg',
      });
      const firstResult = await authService.uploadAvatar(
        testUser.id,
        firstFile,
      );

      expect(firstResult.success).toBe(true);
      const firstImageUrl = firstResult.user?.image;

      // Second upload should replace the first
      const secondFile = new File(['second avatar'], 'second.jpg', {
        type: 'image/jpeg',
      });
      const secondResult = await authService.uploadAvatar(
        testUser.id,
        secondFile,
      );

      expect(secondResult.success).toBe(true);
      expect(secondResult.user?.image).not.toBe(firstImageUrl);
      expect(secondResult.user?.image).toMatch(
        /^https:\/\/storage\.example\.com\/avatars\/.*\.jpg$/,
      );
    });
  });

  describe('Avatar Deletion', () => {
    it('should delete avatar successfully', async () => {
      // First upload an avatar
      const mockFile = new File(['avatar content'], 'avatar.jpg', {
        type: 'image/jpeg',
      });
      const uploadResult = await authService.uploadAvatar(
        testUser.id,
        mockFile,
      );

      expect(uploadResult.success).toBe(true);
      expect(uploadResult.user?.image).toBeTruthy();

      // Then delete it
      const deleteResult = await authService.deleteAvatar(testUser.id);

      expect(deleteResult.success).toBe(true);
      expect(deleteResult.user?.image).toBeNull();
    });

    it('should handle user with no avatar', async () => {
      const result = await authService.deleteAvatar(testUser.id);

      expect(result.success).toBe(false);
      expect(result.error).toBe('User has no avatar to delete');
    });

    it('should handle non-existent user', async () => {
      const result = await authService.deleteAvatar('non-existent-id');

      expect(result.success).toBe(false);
      expect(result.error).toBe('User not found');
    });
  });

  describe('Avatar URL Generation', () => {
    it('should generate avatar URL from user ID', () => {
      const avatarUrl = authService.generateAvatarUrl(testUser.id, 'jpg');

      expect(avatarUrl).toMatch(/avatars\/.*\.jpg$/);
      expect(avatarUrl).toContain(testUser.id);
    });

    it('should handle different file extensions', () => {
      const jpgUrl = authService.generateAvatarUrl(testUser.id, 'jpg');
      const pngUrl = authService.generateAvatarUrl(testUser.id, 'png');

      expect(jpgUrl).toMatch(/\.jpg$/);
      expect(pngUrl).toMatch(/\.png$/);
    });
  });
});
