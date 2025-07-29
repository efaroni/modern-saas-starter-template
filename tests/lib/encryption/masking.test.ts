import { maskApiKey, maskApiKeyForDisplay } from '@/lib/encryption';

describe('API Key Masking', () => {
  describe('maskApiKey (for storage display)', () => {
    it('should mask short keys completely', () => {
      expect(maskApiKey('short')).toBe('***');
      expect(maskApiKey('')).toBe('***');
    });

    it('should mask regular keys showing prefix and suffix', () => {
      expect(maskApiKey('sk-test-1234567890abcdef')).toBe('sk-tes....cdef');
      expect(maskApiKey('re_test_abcdefghijklmnop')).toBe('re_tes....mnop');
    });

    it('should handle Stripe test keys specially', () => {
      expect(maskApiKey('sk_test_4242424242424242')).toBe('sk_test_....4242');
    });

    it('should handle Stripe live keys specially', () => {
      expect(maskApiKey('sk_live_1234567890123456')).toBe('sk_live_....3456');
    });
  });

  describe('maskApiKeyForDisplay (for input fields)', () => {
    it('should return asterisks for empty or short keys', () => {
      expect(maskApiKeyForDisplay('')).toBe('*'.repeat(32));
      expect(maskApiKeyForDisplay('short')).toBe('*'.repeat(32));
    });

    it('should mask OpenAI style keys appropriately', () => {
      const key = 'sk-proj-abcdefghijklmnopqrstuvwxyz123456';
      const masked = maskApiKeyForDisplay(key);
      expect(masked).toMatch(/^sk-proj/); // Shows prefix
      expect(masked).toMatch(/3456$/); // Shows last 4
      expect(masked).toContain('********************'); // Has asterisks
    });

    it('should mask Stripe test keys with more visibility', () => {
      // Using a modified test key to avoid false positives in secret scanning
      const key = 'sk_test_4eC39HqLyjWDarjtT1zdp7dc_FAKE';
      const masked = maskApiKeyForDisplay(key);
      expect(masked).toMatch(/^sk_test_4eC/); // Shows prefix
      expect(masked).toMatch(/FAKE$/); // Shows last 4
      expect(masked).toContain('********************'); // Has at least 20 asterisks
    });

    it('should mask Stripe live keys more conservatively', () => {
      // Using a modified live key format for testing (not a real key)
      const key = 'sk_live_4eC39HqLyjWDarjtT1zdp7dc_FAKE';
      const masked = maskApiKeyForDisplay(key);
      expect(masked).toBe('sk_live_' + '*'.repeat(24) + 'FAKE');
    });

    it('should mask Resend keys appropriately', () => {
      const key = 're_test_1234567890abcdefghij';
      const masked = maskApiKeyForDisplay(key);
      expect(masked).toBe('re_test' + '*'.repeat(20) + 'ghij');
    });

    it('should mask generic keys conservatively', () => {
      const key = 'generic-api-key-1234567890';
      const masked = maskApiKeyForDisplay(key);
      expect(masked).toMatch(/^generi/); // Shows first 6
      expect(masked).toMatch(/7890$/); // Shows last 4
      expect(masked.match(/\*/g)?.length).toBeGreaterThanOrEqual(20); // At least 20 asterisks
    });

    it('should always show at least 20 asterisks for security', () => {
      const shortKey = 'abc123defg'; // 10 chars
      const masked = maskApiKeyForDisplay(shortKey);
      const asteriskCount = (masked.match(/\*/g) || []).length;
      expect(asteriskCount).toBeGreaterThanOrEqual(20);
    });

    it('should use only ASCII characters to prevent ByteString conversion errors', () => {
      // Test various key types to ensure no unicode characters are used
      const keys = [
        // Modified test keys to avoid secret scanning false positives
        'sk_test_4eC39HqLyjWDarjtT1zdp7dc_FAKE',
        'sk_live_4eC39HqLyjWDarjtT1zdp7dc_FAKE',
        'sk-proj-abcdefghijklmnopqrstuvwxyz123456',
        're_test_1234567890abcdefghij',
        'generic-api-key-1234567890',
      ];

      keys.forEach(key => {
        const masked = maskApiKeyForDisplay(key);
        // Check that all characters are ASCII (code point < 128)
        for (let i = 0; i < masked.length; i++) {
          const charCode = masked.charCodeAt(i);
          expect(charCode).toBeLessThan(128);
        }
      });
    });
  });
});
