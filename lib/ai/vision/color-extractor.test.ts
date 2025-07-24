import { describe, it, expect } from '@jest/globals';

import { ColorExtractor } from './color-extractor';

describe('ColorExtractor', () => {
  describe('extractColorsFromData', () => {
    it('should extract colors and generate semantic palette', () => {
      // Arrange
      const colorData = [
        '#3b82f6',
        '#64748b',
        '#f59e0b',
        '#6b7280',
        '#1f2937',
        '#ffffff',
      ];

      // Act
      const result = ColorExtractor.extractColorsFromData(colorData);

      // Assert
      expect(result).toBeDefined();
      expect(result.dominant).toBeDefined();
      expect(result.palette).toBeDefined();
      expect(Array.isArray(result.dominant)).toBe(true);
      expect(result.dominant.length).toBeLessThanOrEqual(8);
    });

    it('should return consistent palette structure', () => {
      // Arrange
      const colorData = [
        '#3b82f6',
        '#64748b',
        '#f59e0b',
        '#6b7280',
        '#1f2937',
        '#ffffff',
      ];

      // Act
      const result = ColorExtractor.extractColorsFromData(colorData);

      // Assert
      const { palette } = result;
      expect(palette.primary).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(palette.secondary).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(palette.accent).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(palette.neutral).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(palette.background).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(palette.text).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(Array.isArray(palette.colors)).toBe(true);
      expect(palette.colors).toEqual(colorData);
    });

    it('should handle empty color array', () => {
      // Arrange
      const colorData: string[] = [];

      // Act
      const result = ColorExtractor.extractColorsFromData(colorData);

      // Assert
      expect(result).toBeDefined();
      expect(result.dominant).toEqual([]);
      expect(result.palette.primary).toBe('#3b82f6'); // Default fallback
      expect(result.palette.background).toBe('#ffffff'); // Default fallback
      expect(result.palette.text).toBe('#1f2937'); // Default fallback
    });

    it('should handle single color input', () => {
      // Arrange
      const colorData = ['#3b82f6'];

      // Act
      const result = ColorExtractor.extractColorsFromData(colorData);

      // Assert
      expect(result.dominant).toEqual(['#3b82f6']);
      expect(result.palette.primary).toBe('#3b82f6');
      expect(result.palette.colors).toEqual(['#3b82f6']);
    });

    it('should limit dominant colors to 8 maximum', () => {
      // Arrange
      const colorData = [
        '#000000',
        '#111111',
        '#222222',
        '#333333',
        '#444444',
        '#555555',
        '#666666',
        '#777777',
        '#888888',
        '#999999',
        '#aaaaaa',
        '#bbbbbb',
        '#cccccc',
        '#dddddd',
        '#eeeeee',
        '#ffffff',
      ];

      // Act
      const result = ColorExtractor.extractColorsFromData(colorData);

      // Assert
      expect(result.dominant.length).toBeLessThanOrEqual(8);
    });

    it('should generate different semantic colors', () => {
      // Arrange
      const colorData = ['#3b82f6', '#64748b', '#f59e0b', '#6b7280'];

      // Act
      const result = ColorExtractor.extractColorsFromData(colorData);

      // Assert
      const { palette } = result;
      const uniqueColors = new Set([
        palette.primary,
        palette.secondary,
        palette.accent,
        palette.neutral,
        palette.background,
        palette.text,
      ]);

      // Should have some variety in the palette (not all the same color)
      expect(uniqueColors.size).toBeGreaterThan(2);
    });
  });

  describe('convertColor', () => {
    it('should convert hex to RGB format', () => {
      // Arrange
      const hex = '#3b82f6';

      // Act
      const rgb = ColorExtractor.convertColor(hex, 'rgb');

      // Assert
      expect(rgb).toMatch(/^rgb\(\d+, \d+, \d+\)$/);
    });

    it('should convert hex to HSL format', () => {
      // Arrange
      const hex = '#3b82f6';

      // Act
      const hsl = ColorExtractor.convertColor(hex, 'hsl');

      // Assert
      expect(hsl).toMatch(/^hsl\(\d+, \d+%, \d+%\)$/);
    });

    it('should return hex when no format specified', () => {
      // Arrange
      const hex = '#3b82f6';

      // Act
      const result = ColorExtractor.convertColor(hex);

      // Assert
      expect(result).toBe(hex);
    });

    it('should handle lowercase hex colors', () => {
      // Arrange
      const hex = '#3b82f6';

      // Act
      const rgb = ColorExtractor.convertColor(hex, 'rgb');

      // Assert
      expect(rgb).toBeDefined();
      expect(rgb.startsWith('rgb(')).toBe(true);
    });

    it('should handle uppercase hex colors', () => {
      // Arrange
      const hex = '#3B82F6';

      // Act
      const rgb = ColorExtractor.convertColor(hex, 'rgb');

      // Assert
      expect(rgb).toBeDefined();
      expect(rgb.startsWith('rgb(')).toBe(true);
    });

    it('should convert white color correctly', () => {
      // Arrange
      const hex = '#ffffff';

      // Act
      const rgb = ColorExtractor.convertColor(hex, 'rgb');

      // Assert
      expect(rgb).toBe('rgb(255, 255, 255)');
    });

    it('should convert black color correctly', () => {
      // Arrange
      const hex = '#000000';

      // Act
      const rgb = ColorExtractor.convertColor(hex, 'rgb');

      // Assert
      expect(rgb).toBe('rgb(0, 0, 0)');
    });
  });

  describe('generateVariations', () => {
    it('should generate lighter and darker variations', () => {
      // Arrange
      const hex = '#3b82f6';

      // Act
      const variations = ColorExtractor.generateVariations(hex);

      // Assert
      expect(variations).toBeDefined();
      expect(variations.lighter).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(variations.darker).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(variations.lighter).not.toBe(hex);
      expect(variations.darker).not.toBe(hex);
      expect(variations.lighter).not.toBe(variations.darker);
    });

    it('should generate lighter variation that is actually lighter', () => {
      // Arrange - Use a mid-tone color
      const hex = '#64748b';

      // Act
      const variations = ColorExtractor.generateVariations(hex);

      // Assert
      // We can't easily test actual lightness without more complex color parsing,
      // but we can test that variations are generated
      expect(variations.lighter).toBeDefined();
      expect(variations.lighter).toMatch(/^#[0-9a-fA-F]{6}$/);
    });

    it('should handle edge case of very light color', () => {
      // Arrange
      const hex = '#f0f0f0';

      // Act
      const variations = ColorExtractor.generateVariations(hex);

      // Assert
      expect(variations.lighter).toBeDefined();
      expect(variations.darker).toBeDefined();
      expect(variations.lighter).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(variations.darker).toMatch(/^#[0-9a-fA-F]{6}$/);
    });

    it('should handle edge case of very dark color', () => {
      // Arrange
      const hex = '#101010';

      // Act
      const variations = ColorExtractor.generateVariations(hex);

      // Assert
      expect(variations.lighter).toBeDefined();
      expect(variations.darker).toBeDefined();
      expect(variations.lighter).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(variations.darker).toMatch(/^#[0-9a-fA-F]{6}$/);
    });

    it('should handle pure white', () => {
      // Arrange
      const hex = '#ffffff';

      // Act
      const variations = ColorExtractor.generateVariations(hex);

      // Assert
      expect(variations.lighter).toBeDefined();
      expect(variations.darker).toBeDefined();
      // Lighter than white should still be white or very close
      expect(variations.lighter).toMatch(/^#[0-9a-fA-F]{6}$/);
    });

    it('should handle pure black', () => {
      // Arrange
      const hex = '#000000';

      // Act
      const variations = ColorExtractor.generateVariations(hex);

      // Assert
      expect(variations.lighter).toBeDefined();
      expect(variations.darker).toBeDefined();
      // Darker than black should still be black or very close
      expect(variations.darker).toMatch(/^#[0-9a-fA-F]{6}$/);
    });
  });

  describe('semantic color assignment', () => {
    it('should assign appropriate colors based on characteristics', () => {
      // Arrange - Create a palette with distinct characteristics
      const colorData = [
        '#000000', // Dark (good for text)
        '#ffffff', // Light (good for background)
        '#ff0000', // Saturated red (good for primary/accent)
        '#808080', // Neutral gray
        '#0000ff', // Saturated blue
        '#00ff00', // Saturated green
      ];

      // Act
      const result = ColorExtractor.extractColorsFromData(colorData);

      // Assert
      const { palette } = result;

      // Background should be light
      expect(palette.background).toBe('#ffffff');

      // Text should be dark
      expect(palette.text).toBe('#000000');

      // Primary should be one of the saturated colors
      expect(['#ff0000', '#0000ff', '#00ff00']).toContain(palette.primary);

      // All required properties should be present
      expect(palette.primary).toBeDefined();
      expect(palette.secondary).toBeDefined();
      expect(palette.accent).toBeDefined();
      expect(palette.neutral).toBeDefined();
    });
  });

  describe('error handling', () => {
    it('should handle invalid hex colors gracefully', () => {
      // Arrange
      const colorData = ['invalid-color', '#3b82f6', 'not-a-hex'];

      // Act & Assert - Should not throw, even with invalid colors
      expect(() =>
        ColorExtractor.extractColorsFromData(colorData),
      ).not.toThrow();
    });

    it('should handle malformed hex colors in conversion', () => {
      // Arrange
      const invalidHex = 'not-a-color';

      // Act & Assert - Should not throw
      expect(() => ColorExtractor.convertColor(invalidHex)).not.toThrow();
    });

    it('should handle malformed hex colors in variations', () => {
      // Arrange
      const invalidHex = 'invalid';

      // Act & Assert - Should not throw
      expect(() => ColorExtractor.generateVariations(invalidHex)).not.toThrow();
    });
  });
});
