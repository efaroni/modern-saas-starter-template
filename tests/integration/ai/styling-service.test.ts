import { describe, it, expect, beforeEach } from '@jest/globals';

import { isRealAIProvider } from '@/lib/ai/factory';
import { AIServiceImpl } from '@/lib/ai/service';

describe('AI Service Integration Tests', () => {
  let aiService: AIServiceImpl;

  beforeEach(() => {
    // Create service instance - this will use the factory internally
    aiService = new AIServiceImpl();
  });

  describe('service initialization', () => {
    it('should initialize successfully', () => {
      expect(aiService).toBeDefined();
      expect(typeof aiService.analyzeScreenshot).toBe('function');
      expect(typeof aiService.getProviderStatus).toBe('function');
    });
  });

  describe('getProviderStatus integration', () => {
    it('should return consistent status with factory logic', async () => {
      // Act
      const status = await aiService.getProviderStatus();
      const isReal = isRealAIProvider();

      // Assert
      expect(status).toBeDefined();
      expect(status.connected).toBe(true);
      expect(typeof status.provider).toBe('string');
      expect(['openai', 'mock']).toContain(status.provider);

      // Should be consistent with factory
      if (isReal) {
        expect(status.provider).toBe('openai');
      } else {
        expect(status.provider).toBe('mock');
      }
    });
  });

  describe('analyzeScreenshot with mock provider', () => {
    it('should analyze screenshot using mock provider in test environment', async () => {
      // Arrange
      const testImageBuffer = Buffer.from('test-image-data');

      // Act
      const result = await aiService.analyzeScreenshot(testImageBuffer);

      // Assert - Test the structure without caring about exact values
      expect(result).toBeDefined();
      expect(result.analysis).toBeDefined();
      expect(result.styleGuide).toBeDefined();
      expect(result.tailwindConfig).toBeDefined();
      expect(result.globalsCss).toBeDefined();
      expect(typeof result.estimatedCost).toBe('number');
      expect(typeof result.tokensUsed).toBe('number');

      // Verify analysis structure
      expect(result.analysis.designStyle).toBeDefined();
      expect(result.analysis.colorPalette).toBeDefined();
      expect(result.analysis.typography).toBeDefined();
      expect(result.analysis.spacing).toBeDefined();
      expect(result.analysis.components).toBeDefined();

      // Verify color palette structure
      const { colorPalette } = result.analysis;
      expect(colorPalette.primary).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(colorPalette.secondary).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(colorPalette.accent).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(Array.isArray(colorPalette.colors)).toBe(true);
    });

    it('should handle different buffer sizes consistently', async () => {
      // Arrange
      const smallBuffer = Buffer.from('small');
      const largeBuffer = Buffer.alloc(1000, 'x');

      // Act
      const smallResult = await aiService.analyzeScreenshot(smallBuffer);
      const largeResult = await aiService.analyzeScreenshot(largeBuffer);

      // Assert - Both should succeed with consistent structure
      expect(smallResult.analysis.designStyle).toBeDefined();
      expect(largeResult.analysis.designStyle).toBeDefined();

      // Mock provider should return same cost regardless of size
      expect(smallResult.estimatedCost).toBe(largeResult.estimatedCost);
      expect(smallResult.tokensUsed).toBe(largeResult.tokensUsed);
    });
  });

  describe('complete workflow validation', () => {
    it('should provide valid output files that could be used in a project', async () => {
      // Arrange
      const testImageBuffer = Buffer.from('workflow-test-image');

      // Act
      const result = await aiService.analyzeScreenshot(testImageBuffer);

      // Assert - Validate the generated files contain expected content

      // Style guide should be valid markdown
      expect(result.styleGuide).toContain('# Style Guide');
      expect(result.styleGuide).toContain('## Color Palette');
      expect(result.styleGuide).toContain('```tsx');

      // Tailwind config should be valid JavaScript
      expect(result.tailwindConfig).toContain('module.exports');
      expect(result.tailwindConfig).toContain('theme:');
      expect(result.tailwindConfig).toContain('extend:');
      expect(result.tailwindConfig).toContain('colors:');

      // Globals CSS should be valid CSS
      expect(result.globalsCss).toContain(':root {');
      expect(result.globalsCss).toContain('--color-primary:');
      expect(result.globalsCss).toContain('body {');

      // Files should contain consistent color references
      const primaryColor = result.analysis.colorPalette.primary;
      expect(result.tailwindConfig).toContain(primaryColor);
      expect(result.globalsCss).toContain(primaryColor);
    });
  });

  describe('error resilience', () => {
    it('should handle empty buffers gracefully', async () => {
      // Arrange
      const emptyBuffer = Buffer.alloc(0);

      // Act
      const result = await aiService.analyzeScreenshot(emptyBuffer);

      // Assert - Should still return valid structure
      expect(result).toBeDefined();
      expect(result.analysis).toBeDefined();
      expect(result.styleGuide).toBeDefined();
    });

    it('should maintain consistent interface across calls', async () => {
      // Arrange
      const buffer1 = Buffer.from('test1');
      const buffer2 = Buffer.from('test2');

      // Act
      const result1 = await aiService.analyzeScreenshot(buffer1);
      const result2 = await aiService.analyzeScreenshot(buffer2);

      // Assert - Both results should have same structure
      expect(Object.keys(result1)).toEqual(Object.keys(result2));
      expect(Object.keys(result1.analysis)).toEqual(
        Object.keys(result2.analysis),
      );
      expect(Object.keys(result1.analysis.colorPalette)).toEqual(
        Object.keys(result2.analysis.colorPalette),
      );
    });
  });

  describe('provider abstraction', () => {
    it('should work regardless of which provider is active', async () => {
      // Arrange
      const testBuffer = Buffer.from('abstraction-test');

      // Act
      const result = await aiService.analyzeScreenshot(testBuffer);
      const status = await aiService.getProviderStatus();

      // Assert - Should work with any provider
      expect(result).toBeDefined();
      expect(status.connected).toBe(true);

      // Result structure should be consistent regardless of provider
      expect(result.analysis).toBeDefined();
      expect(result.styleGuide).toBeDefined();
      expect(result.tailwindConfig).toBeDefined();
      expect(result.globalsCss).toBeDefined();
    });
  });
});
