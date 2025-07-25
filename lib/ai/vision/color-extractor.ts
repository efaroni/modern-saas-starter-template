import Color from 'colorjs.io';

import type { ColorPalette } from '../types';

export interface ExtractedColors {
  dominant: string[];
  palette: ColorPalette;
}

export class ColorExtractor {
  /**
   * Check if a string is a valid hex color
   */
  private static isValidHexColor(color: string): boolean {
    return /^#[0-9a-fA-F]{6}$/.test(color);
  }

  /**
   * Normalize hex color to 6-character format
   */
  private static normalizeHexColor(color: string): string {
    if (!color.startsWith('#')) return color;

    // Convert 3-char hex to 6-char hex
    if (color.length === 4) {
      return (
        '#' + color[1] + color[1] + color[2] + color[2] + color[3] + color[3]
      );
    }

    return color;
  }

  /**
   * Extract colors from an array of hex color strings
   * (In a real implementation, this would process image pixels)
   */
  static extractColorsFromData(colorData: string[]): ExtractedColors {
    // Sort colors by frequency (mock implementation)
    const dominantColors = this.getDominantColors(colorData);

    // Generate semantic palette
    const palette = this.generateSemanticPalette(dominantColors);

    return {
      dominant: dominantColors,
      palette,
    };
  }

  private static getDominantColors(colors: string[]): string[] {
    // In a real implementation, this would analyze pixel frequency
    // For mock purposes, return a curated selection
    return colors.slice(0, 8);
  }

  private static generateSemanticPalette(
    dominantColors: string[],
  ): ColorPalette {
    // Algorithm to assign semantic meaning to colors
    // Filter out invalid colors first
    const validColors = dominantColors.filter(this.isValidHexColor);

    const sortedByLightness = validColors
      .map(hex => {
        try {
          const color = new Color(hex);
          return {
            hex,
            color,
            lightness: color.to('hsl').coords[2] || 0,
          };
        } catch {
          // Skip invalid colors
          return null;
        }
      })
      .filter(item => item !== null)
      .sort((a, b) => (a?.lightness || 0) - (b?.lightness || 0));

    const darkest = sortedByLightness[0]?.hex || '#1f2937';
    const lightest =
      sortedByLightness[sortedByLightness.length - 1]?.hex || '#ffffff';

    // Find most saturated color for primary
    const mostSaturated =
      validColors
        .map(hex => {
          try {
            const color = new Color(hex);
            return {
              hex,
              saturation: color.to('hsl').coords[1] || 0,
            };
          } catch {
            return { hex, saturation: 0 };
          }
        })
        .sort((a, b) => b.saturation - a.saturation)[0]?.hex || '#3b82f6';

    return {
      primary: mostSaturated,
      secondary: this.findSecondaryColor(dominantColors, mostSaturated),
      accent: this.findAccentColor(dominantColors, mostSaturated),
      neutral: this.findNeutralColor(dominantColors),
      background: lightest,
      text: darkest,
      colors: dominantColors,
    };
  }

  private static findSecondaryColor(colors: string[], primary: string): string {
    // Find a color that complements the primary
    const alternatives = colors.filter(c => c !== primary);
    return alternatives[0] || '#64748b';
  }

  private static findAccentColor(colors: string[], primary: string): string {
    // Find a vibrant accent color
    const alternatives = colors.filter(c => c !== primary);

    // Prefer warm colors for accents
    const warmColors = alternatives.filter(hex => {
      try {
        const hsl = new Color(hex).to('hsl');
        const hue = hsl.coords[0] || 0;
        return (hue >= 0 && hue <= 60) || (hue >= 300 && hue <= 360); // Red-Yellow range
      } catch {
        return false;
      }
    });

    return warmColors[0] || alternatives[1] || '#f59e0b';
  }

  private static findNeutralColor(colors: string[]): string {
    // Find a low-saturation color for neutral uses
    const neutrals = colors.filter(hex => {
      try {
        const hsl = new Color(hex).to('hsl');
        const saturation = hsl.coords[1] || 0;
        return saturation < 0.3; // Low saturation
      } catch {
        return false;
      }
    });

    return neutrals[0] || '#6b7280';
  }

  /**
   * Convert color formats for different uses
   */
  static convertColor(
    hex: string,
    format: 'rgb' | 'hsl' | 'hex' = 'hex',
  ): string {
    try {
      const normalizedHex = this.normalizeHexColor(hex);
      const color = new Color(normalizedHex);

      switch (format) {
        case 'rgb':
          const rgb = color.to('srgb');
          return `rgb(${Math.round(rgb.coords[0] * 255)}, ${Math.round(rgb.coords[1] * 255)}, ${Math.round(rgb.coords[2] * 255)})`;
        case 'hsl':
          const hsl = color.to('hsl');
          return `hsl(${Math.round(hsl.coords[0] || 0)}, ${Math.round((hsl.coords[1] || 0) * 100)}%, ${Math.round((hsl.coords[2] || 0) * 100)}%)`;
        default:
          return normalizedHex;
      }
    } catch {
      // Return fallback for invalid colors
      switch (format) {
        case 'rgb':
          return 'rgb(0, 0, 0)';
        case 'hsl':
          return 'hsl(0, 0%, 0%)';
        default:
          return '#000000';
      }
    }
  }

  /**
   * Generate color variations (lighter/darker)
   */
  static generateVariations(hex: string): { lighter: string; darker: string } {
    try {
      const normalizedHex = this.normalizeHexColor(hex);
      const color = new Color(normalizedHex);
      const hsl = color.to('hsl');

      const lighter = new Color('hsl', [
        hsl.coords[0] || 0,
        hsl.coords[1] || 0,
        Math.min((hsl.coords[2] || 0) + 0.2, 1),
      ])
        .to('srgb')
        .toString({ format: 'hex' });

      const darker = new Color('hsl', [
        hsl.coords[0] || 0,
        hsl.coords[1] || 0,
        Math.max((hsl.coords[2] || 0) - 0.2, 0),
      ])
        .to('srgb')
        .toString({ format: 'hex' });

      return {
        lighter: this.normalizeHexColor(lighter),
        darker: this.normalizeHexColor(darker),
      };
    } catch {
      // Return fallback variations for invalid colors
      return { lighter: '#333333', darker: '#000000' };
    }
  }
}
