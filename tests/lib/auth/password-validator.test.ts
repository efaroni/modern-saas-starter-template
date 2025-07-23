import { describe, it, expect } from '@jest/globals';
import {
  PasswordValidator,
  DEFAULT_PASSWORD_POLICY,
} from '@/lib/auth/password-validator';

describe('PasswordValidator', () => {
  const validator = new PasswordValidator();

  describe('validate', () => {
    it('should accept a strong password', () => {
      const result = validator.validate('StrongP@ssw0rd!');
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.score).toBeGreaterThan(70);
    });

    it('should reject password that is too short', () => {
      const result = validator.validate('Pass1!');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'Password must be at least 8 characters long',
      );
    });

    it('should reject password without uppercase letters', () => {
      const result = validator.validate('password123!');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'Password must contain at least one uppercase letter',
      );
    });

    it('should reject password without lowercase letters', () => {
      const result = validator.validate('PASSWORD123!');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'Password must contain at least one lowercase letter',
      );
    });

    it('should reject password without numbers', () => {
      const result = validator.validate('Password!');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'Password must contain at least one number',
      );
    });

    it('should reject password without special characters', () => {
      const result = validator.validate('Password123');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'Password must contain at least one special character',
      );
    });

    it('should reject common passwords', () => {
      const result = validator.validate('Password123');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'Password is too common, please choose a more unique password',
      );
    });

    it('should reject password containing user email', () => {
      const result = validator.validate('JohnDoe123!', {
        email: 'john@example.com',
      });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'Password should not contain your email or name',
      );
    });

    it('should reject password containing user name', () => {
      const result = validator.validate('JohnSmith123!', {
        name: 'John Smith',
      });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'Password should not contain your email or name',
      );
    });

    it('should provide multiple error messages for weak password', () => {
      const result = validator.validate('pass');
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
      expect(result.errors).toContain(
        'Password must be at least 8 characters long',
      );
      expect(result.errors).toContain(
        'Password must contain at least one uppercase letter',
      );
      expect(result.errors).toContain(
        'Password must contain at least one number',
      );
      expect(result.errors).toContain(
        'Password must contain at least one special character',
      );
    });

    it('should calculate password strength score', () => {
      const weakResult = validator.validate('Pass123!');
      const strongResult = validator.validate('VeryStr0ngP@ssw0rd2024!');

      expect(strongResult.score).toBeGreaterThan(weakResult.score);
      expect(strongResult.score).toBeGreaterThan(80);
    });

    it('should penalize passwords with repeating characters', () => {
      const normalResult = validator.validate('StrongP@ssw0rd!');
      const repeatingResult = validator.validate('StrongP@ssw0rd1111');

      expect(normalResult.score).toBeGreaterThanOrEqual(
        repeatingResult.score - 1,
      );
    });

    it('should penalize passwords with sequential characters', () => {
      const normalResult = validator.validate('StrongP@ssw0rd!');
      const sequentialResult = validator.validate('Abc123P@ssw0rd!');

      expect(normalResult.score).toBeGreaterThan(sequentialResult.score);
    });

    it('should give bonus for longer passwords', () => {
      const shortResult = validator.validate('Pass123!');
      const longResult = validator.validate('ThisIsAVeryLongP@ssw0rd!');

      expect(longResult.score).toBeGreaterThan(shortResult.score);
    });
  });

  describe('getStrengthDescription', () => {
    it('should return correct strength descriptions', () => {
      expect(validator.getStrengthDescription(90)).toBe('Very Strong');
      expect(validator.getStrengthDescription(70)).toBe('Strong');
      expect(validator.getStrengthDescription(50)).toBe('Good');
      expect(validator.getStrengthDescription(30)).toBe('Weak');
      expect(validator.getStrengthDescription(10)).toBe('Very Weak');
    });
  });

  describe('getSuggestions', () => {
    it('should provide helpful suggestions for weak passwords', () => {
      const suggestions = validator.getSuggestions('pass');

      expect(suggestions).toContain(
        'Make your password longer (12+ characters recommended)',
      );
      expect(suggestions).toContain('Add uppercase letters');
      expect(suggestions).toContain('Add numbers');
      expect(suggestions).toContain('Add special characters (!@#$%^&*)');
    });

    it('should suggest avoiding common passwords', () => {
      const suggestions = validator.getSuggestions('password123');

      expect(suggestions).toContain('Avoid common passwords');
    });

    it('should suggest avoiding repeating characters', () => {
      const suggestions = validator.getSuggestions('Passsword123!');

      expect(suggestions).toContain('Avoid repeating characters');
    });

    it('should suggest avoiding sequential characters', () => {
      const suggestions = validator.getSuggestions('Abc123Password!');

      expect(suggestions).toContain('Avoid sequential characters (abc, 123)');
    });

    it('should return empty suggestions for strong passwords', () => {
      const suggestions = validator.getSuggestions('VeryStr0ngP@ssw0rd!');

      expect(suggestions).toHaveLength(0);
    });
  });

  describe('custom policy', () => {
    it('should work with custom password policy', () => {
      const customValidator = new PasswordValidator({
        minLength: 12,
        requireUppercase: true,
        requireLowercase: true,
        requireNumbers: true,
        requireSpecialChars: false,
        forbidCommonPasswords: false,
        forbidUserInfo: false,
      });

      const result = customValidator.validate('Password123456');
      expect(result.isValid).toBe(true);
    });

    it('should reject passwords shorter than custom minimum', () => {
      const customValidator = new PasswordValidator({
        minLength: 16,
        requireUppercase: true,
        requireLowercase: true,
        requireNumbers: true,
        requireSpecialChars: true,
        forbidCommonPasswords: true,
        forbidUserInfo: true,
      });

      const result = customValidator.validate('ShortP@ss1');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'Password must be at least 16 characters long',
      );
    });

    it('should allow passwords without special chars if not required', () => {
      const customValidator = new PasswordValidator({
        minLength: 8,
        requireUppercase: true,
        requireLowercase: true,
        requireNumbers: true,
        requireSpecialChars: false,
        forbidCommonPasswords: false,
        forbidUserInfo: false,
      });

      const result = customValidator.validate('Password123');
      expect(result.isValid).toBe(true);
    });
  });
});
