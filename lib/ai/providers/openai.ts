import { openai } from '@ai-sdk/openai';
import { generateObject } from 'ai';
import { z } from 'zod';

import { ColorExtractor } from '../vision/color-extractor';

import type { AIProvider, AnalysisResult, DesignAnalysis } from '../types';

const analysisSchema = z.object({
  designStyle: z
    .string()
    .describe(
      'The overall design style (e.g., Modern Minimalist, Corporate, Playful)',
    ),
  dominantColors: z
    .array(z.string())
    .min(3)
    .max(8)
    .describe('Array of hex color codes extracted from the image'),
  typography: z.object({
    primaryFont: z.string().describe('Suggested primary font family'),
    secondaryFont: z.string().describe('Suggested secondary font family'),
    style: z.string().describe('Typography style characteristics'),
  }),
  spacing: z.object({
    style: z.string().describe('Spacing and layout characteristics'),
    density: z
      .enum(['tight', 'normal', 'loose'])
      .describe('Overall spacing density'),
  }),
  components: z.object({
    buttons: z.string().describe('Button style characteristics'),
    cards: z.string().describe('Card/container style characteristics'),
    inputs: z.string().describe('Input field style characteristics'),
    navigation: z.string().describe('Navigation style characteristics'),
  }),
  specialEffects: z
    .array(z.string())
    .describe('Special visual effects or patterns observed'),
});

export class OpenAIProvider implements AIProvider {
  constructor(private apiKey: string) {}

  async analyzeScreenshot(imageBuffer: Buffer): Promise<AnalysisResult> {
    try {
      // Convert buffer to base64 for OpenAI API
      const base64Image = imageBuffer.toString('base64');
      const imageDataUrl = `data:image/png;base64,${base64Image}`;

      const { object: analysis } = await generateObject({
        model: openai('gpt-4-vision-preview'),
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Analyze this UI screenshot for design patterns, colors, typography, and component styles. Extract the dominant colors as hex codes and describe the overall design approach. Focus on:

1. Design style and aesthetic
2. Color palette (provide exact hex codes)
3. Typography characteristics
4. Spacing and layout patterns
5. Component styles (buttons, cards, inputs, navigation)
6. Special effects or unique design patterns

Be specific and actionable in your descriptions.`,
              },
              {
                type: 'image',
                image: imageDataUrl,
              },
            ],
          },
        ],
        schema: analysisSchema,
        temperature: 0.1, // Low temperature for consistent results
      });

      // Extract colors using our color extraction utility
      const colorExtraction = ColorExtractor.extractColorsFromData(
        analysis.dominantColors,
      );

      // Create full design analysis
      const designAnalysis: DesignAnalysis = {
        designStyle: analysis.designStyle,
        colorPalette: colorExtraction.palette,
        typography: {
          primaryFont: analysis.typography.primaryFont,
          secondaryFont: analysis.typography.secondaryFont,
          fontSizes: {
            xs: '0.75rem',
            sm: '0.875rem',
            base: '1rem',
            lg: '1.125rem',
            xl: '1.25rem',
            '2xl': '1.5rem',
            '3xl': '1.875rem',
            '4xl': '2.25rem',
          },
          fontWeights: {
            normal: '400',
            medium: '500',
            semibold: '600',
            bold: '700',
          },
          lineHeight: {
            tight: '1.25',
            normal: '1.5',
            relaxed: '1.75',
          },
        },
        spacing: this.generateSpacingSystem(analysis.spacing.density),
        components: analysis.components,
        specialEffects: analysis.specialEffects,
      };

      // Generate output files
      const styleGuide = this.generateStyleGuide(designAnalysis);
      const tailwindConfig = this.generateTailwindConfig(designAnalysis);
      const globalsCss = this.generateGlobalsCss(designAnalysis);

      // Estimate cost and tokens (rough estimate)
      const imageSize = imageBuffer.length;
      const estimatedTokens = Math.ceil(imageSize / 750) + 500; // Base cost + image processing
      const estimatedCost = (estimatedTokens / 1000) * 0.01; // $0.01 per 1K tokens (rough estimate)

      return {
        analysis: designAnalysis,
        styleGuide,
        tailwindConfig,
        globalsCss,
        estimatedCost,
        tokensUsed: estimatedTokens,
      };
    } catch (error) {
      console.error('OpenAI Vision API error:', error);
      throw new Error(
        `AI analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  estimateCost(imageSize: number): number {
    // Rough cost estimation for OpenAI Vision API
    const estimatedTokens = Math.ceil(imageSize / 750) + 500;
    return (estimatedTokens / 1000) * 0.01;
  }

  private generateSpacingSystem(density: 'tight' | 'normal' | 'loose') {
    let baseUnit: number;
    if (density === 'tight') {
      baseUnit = 2;
    } else if (density === 'loose') {
      baseUnit = 6;
    } else {
      baseUnit = 4;
    }
    const scale = Array.from(
      { length: 10 },
      (_, i) => `${i * baseUnit * 0.25}rem`,
    );

    const borderRadius = {
      none: '0px',
      sm: density === 'tight' ? '0.125rem' : '0.25rem',
      md: density === 'tight' ? '0.25rem' : '0.375rem',
      lg: density === 'tight' ? '0.375rem' : '0.5rem',
      xl: density === 'tight' ? '0.5rem' : '0.75rem',
      full: '9999px',
    };

    const shadows = {
      none: 'none',
      sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
      md: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
      lg: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
      xl: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
    };

    return {
      unit: baseUnit,
      scale,
      borderRadius,
      shadows,
    };
  }

  private generateStyleGuide(analysis: DesignAnalysis): string {
    return `# AI-Generated Style Guide - ${analysis.designStyle}

## Color Palette
- **Primary**: ${analysis.colorPalette.primary}
- **Secondary**: ${analysis.colorPalette.secondary}
- **Accent**: ${analysis.colorPalette.accent}
- **Neutral**: ${analysis.colorPalette.neutral}
- **Background**: ${analysis.colorPalette.background}
- **Text**: ${analysis.colorPalette.text}

### Full Color Set
${analysis.colorPalette.colors.map(color => `- ${color}`).join('\n')}

## Typography
- **Primary Font**: ${analysis.typography.primaryFont}
- **Secondary Font**: ${analysis.typography.secondaryFont}

## Component Patterns

### Buttons
${analysis.components.buttons}

\`\`\`tsx
<button className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-md transition-colors font-medium">
  Primary Button
</button>
\`\`\`

### Cards
${analysis.components.cards}

\`\`\`tsx
<div className="bg-white rounded-lg shadow-md p-6 border border-neutral/10">
  <h3 className="text-lg font-semibold text-text mb-2">Card Title</h3>
  <p className="text-neutral">Card content with proper spacing and hierarchy.</p>
</div>
\`\`\`

### Form Inputs
${analysis.components.inputs}

\`\`\`tsx
<input 
  className="w-full px-3 py-2 border border-neutral/20 rounded-md focus:ring-2 focus:ring-primary/20 focus:border-primary"
  placeholder="Enter text..."
/>
\`\`\`

### Navigation
${analysis.components.navigation}

## Special Effects
${analysis.specialEffects.map(effect => `- ${effect}`).join('\n')}

## Design Principles
Based on the analyzed design, follow these principles:

1. **Consistency**: Use the defined color palette and spacing system consistently
2. **Hierarchy**: Establish clear visual hierarchy using typography and spacing
3. **Accessibility**: Ensure sufficient color contrast and readable font sizes
4. **Responsive**: Design for multiple screen sizes using the spacing scale

## Usage Guidelines

### Do's ✅
- Use primary color for main actions and CTAs
- Apply consistent spacing using the defined scale
- Maintain the established visual hierarchy
- Use accent colors sparingly for highlights

### Don'ts ❌
- Don't use colors outside the defined palette
- Avoid inconsistent spacing patterns
- Don't mix too many font weights or sizes
- Avoid low contrast color combinations
`;
  }

  private generateTailwindConfig(analysis: DesignAnalysis): string {
    const { colorPalette, typography, spacing } = analysis;

    return `/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '${colorPalette.primary}',
          50: '${colorPalette.primary}08',
          100: '${colorPalette.primary}16',
          500: '${colorPalette.primary}',
          600: '${colorPalette.primary}',
          700: '${colorPalette.primary}',
        },
        secondary: {
          DEFAULT: '${colorPalette.secondary}',
          500: '${colorPalette.secondary}',
        },
        accent: {
          DEFAULT: '${colorPalette.accent}',
          500: '${colorPalette.accent}',
        },
        neutral: {
          DEFAULT: '${colorPalette.neutral}',
          50: '#f9fafb',
          100: '#f3f4f6',
          200: '#e5e7eb',
          300: '#d1d5db',
          400: '#9ca3af',
          500: '${colorPalette.neutral}',
          600: '#4b5563',
          700: '#374151',
          800: '#1f2937',
          900: '#111827',
        },
        background: '${colorPalette.background}',
        text: '${colorPalette.text}',
      },
      fontFamily: {
        sans: ['${typography.primaryFont}', '${typography.secondaryFont}', 'sans-serif'],
        primary: ['${typography.primaryFont}', 'sans-serif'],
        secondary: ['${typography.secondaryFont}', 'sans-serif'],
      },
      fontSize: {
        xs: ['${typography.fontSizes.xs}', '${typography.lineHeight.tight}'],
        sm: ['${typography.fontSizes.sm}', '${typography.lineHeight.tight}'],
        base: ['${typography.fontSizes.base}', '${typography.lineHeight.normal}'],
        lg: ['${typography.fontSizes.lg}', '${typography.lineHeight.normal}'],
        xl: ['${typography.fontSizes.xl}', '${typography.lineHeight.normal}'],
        '2xl': ['${typography.fontSizes['2xl']}', '${typography.lineHeight.tight}'],
        '3xl': ['${typography.fontSizes['3xl']}', '${typography.lineHeight.tight}'],
        '4xl': ['${typography.fontSizes['4xl']}', '${typography.lineHeight.tight}'],
      },
      fontWeight: {
        normal: '${typography.fontWeights.normal}',
        medium: '${typography.fontWeights.medium}',
        semibold: '${typography.fontWeights.semibold}',
        bold: '${typography.fontWeights.bold}',
      },
      spacing: {
        ${spacing.scale.map((value, index) => `'${index}': '${value}',`).join('\n        ')}
      },
      borderRadius: {
        none: '${spacing.borderRadius.none}',
        sm: '${spacing.borderRadius.sm}',
        DEFAULT: '${spacing.borderRadius.md}',
        md: '${spacing.borderRadius.md}',
        lg: '${spacing.borderRadius.lg}',
        xl: '${spacing.borderRadius.xl}',
        full: '${spacing.borderRadius.full}',
      },
      boxShadow: {
        none: '${spacing.shadows.none}',
        sm: '${spacing.shadows.sm}',
        DEFAULT: '${spacing.shadows.md}',
        md: '${spacing.shadows.md}',
        lg: '${spacing.shadows.lg}',
        xl: '${spacing.shadows.xl}',
      },
    },
  },
  plugins: [],
}`;
  }

  private generateGlobalsCss(analysis: DesignAnalysis): string {
    const { colorPalette, typography } = analysis;

    return `:root {
  /* AI-Generated Color Palette */
  --color-primary: ${colorPalette.primary};
  --color-secondary: ${colorPalette.secondary};
  --color-accent: ${colorPalette.accent};
  --color-neutral: ${colorPalette.neutral};
  --color-background: ${colorPalette.background};
  --color-text: ${colorPalette.text};
  
  /* Typography Variables */
  --font-primary: ${typography.primaryFont};
  --font-secondary: ${typography.secondaryFont};
  
  /* Additional Colors */
  ${analysis.colorPalette.colors.map((color, index) => `--color-palette-${index + 1}: ${color};`).join('\n  ')}
}

/* Base Styles */
html {
  font-family: var(--font-primary), var(--font-secondary), system-ui, sans-serif;
}

body {
  background-color: var(--color-background);
  color: var(--color-text);
  line-height: ${typography.lineHeight.normal};
}

/* Utility Classes */
.bg-primary { background-color: var(--color-primary); }
.bg-secondary { background-color: var(--color-secondary); }
.bg-accent { background-color: var(--color-accent); }
.bg-neutral { background-color: var(--color-neutral); }
.bg-background { background-color: var(--color-background); }

.text-primary { color: var(--color-primary); }
.text-secondary { color: var(--color-secondary); }
.text-accent { color: var(--color-accent); }
.text-neutral { color: var(--color-neutral); }
.text-text { color: var(--color-text); }

.font-primary { font-family: var(--font-primary), sans-serif; }
.font-secondary { font-family: var(--font-secondary), sans-serif; }

/* Component Base Styles */
.btn {
  padding: 0.5rem 1rem;
  border-radius: 0.375rem;
  font-weight: 500;
  transition: all 0.2s ease-in-out;
  cursor: pointer;
  border: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.btn-primary {
  background-color: var(--color-primary);
  color: white;
}

.btn-primary:hover {
  opacity: 0.9;
  transform: translateY(-1px);
}

.card {
  background-color: var(--color-background);
  border-radius: 0.5rem;
  box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
  padding: 1.5rem;
  border: 1px solid rgb(0 0 0 / 0.05);
}

.input {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid var(--color-neutral);
  border-radius: 0.375rem;
  background-color: var(--color-background);
  color: var(--color-text);
  transition: border-color 0.2s ease-in-out;
}

.input:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgb(var(--color-primary) / 0.1);
}`;
  }
}
