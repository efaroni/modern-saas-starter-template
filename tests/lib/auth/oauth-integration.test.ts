import { describe, test, expect } from '@jest/globals';
import { OAuthService } from '@/lib/auth/oauth-service';

describe('OAuthIntegration', () => {
  describe('OAuth Service Basic Functionality', () => {
    test('should initialize OAuth service', () => {
      const oauthService = new OAuthService();
      expect(oauthService).toBeDefined();
    });

    test('should return available providers', () => {
      const oauthService = new OAuthService();
      const providers = oauthService.getAvailableProviders();

      expect(Array.isArray(providers)).toBe(true);
      expect(providers.length).toBeGreaterThanOrEqual(0);

      providers.forEach(provider => {
        expect(provider).toHaveProperty('id');
        expect(provider).toHaveProperty('name');
        expect(provider).toHaveProperty('configured');
        expect(typeof provider.configured).toBe('boolean');
      });
    });

    test('should handle provider configuration check', () => {
      const oauthService = new OAuthService();
      const providers = oauthService.getAvailableProviders();

      // Without env vars set, providers should not be configured
      const googleProvider = providers.find(p => p.id === 'google');
      const githubProvider = providers.find(p => p.id === 'github');

      if (googleProvider) {
        expect(googleProvider.configured).toBe(false);
      }
      if (githubProvider) {
        expect(githubProvider.configured).toBe(false);
      }
    });
  });

  describe('OAuth Provider Edge Cases', () => {
    test('should handle missing environment variables gracefully', () => {
      // Test that OAuth service doesn't crash when env vars are missing
      const oauthService = new OAuthService();
      const providers = oauthService.getAvailableProviders();

      expect(() => providers).not.toThrow();
      expect(Array.isArray(providers)).toBe(true);
    });

    test('should return consistent provider structure', () => {
      const oauthService = new OAuthService();
      const providers = oauthService.getAvailableProviders();

      // Ensure all providers have the expected structure
      providers.forEach(provider => {
        expect(typeof provider.id).toBe('string');
        expect(typeof provider.name).toBe('string');
        expect(typeof provider.configured).toBe('boolean');
        expect(provider.id.length).toBeGreaterThan(0);
        expect(provider.name.length).toBeGreaterThan(0);
      });
    });
  });
});
