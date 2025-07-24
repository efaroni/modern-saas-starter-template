import type {
  AIProvider,
  AnalysisResult,
  ColorPalette,
  TypographyStyle,
  SpacingSystem,
  DesignAnalysis,
} from '../types';

export class MockAIProvider implements AIProvider {
  async analyzeScreenshot(_imageBuffer: Buffer): Promise<AnalysisResult> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    const colorPalette: ColorPalette = {
      primary: '#3b82f6',
      secondary: '#64748b',
      accent: '#f59e0b',
      neutral: '#6b7280',
      background: '#ffffff',
      text: '#1f2937',
      colors: [
        '#3b82f6',
        '#64748b',
        '#f59e0b',
        '#6b7280',
        '#1f2937',
        '#ffffff',
      ],
    };

    const typography: TypographyStyle = {
      primaryFont: 'Inter',
      secondaryFont: 'system-ui',
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
    };

    const spacing: SpacingSystem = {
      unit: 4,
      scale: [
        '0',
        '0.25rem',
        '0.5rem',
        '0.75rem',
        '1rem',
        '1.25rem',
        '1.5rem',
        '2rem',
        '2.5rem',
        '3rem',
      ],
      borderRadius: {
        none: '0px',
        sm: '0.125rem',
        md: '0.375rem',
        lg: '0.5rem',
        xl: '0.75rem',
        full: '9999px',
      },
      shadows: {
        none: 'none',
        sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        md: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
        lg: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
        xl: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
      },
    };

    const analysis: DesignAnalysis = {
      designStyle: 'Modern Minimalist',
      colorPalette,
      typography,
      spacing,
      components: {
        buttons: 'Rounded corners with subtle shadows and hover effects',
        cards: 'Clean borders with soft shadows and proper spacing',
        inputs: 'Focused ring states with consistent padding',
        navigation: 'Horizontal layout with clear hierarchy',
      },
      specialEffects: ['Subtle shadows', 'Smooth transitions', 'Hover states'],
    };

    const styleGuide = this.generateStyleGuide(analysis);
    const tailwindConfig = this.generateTailwindConfig(analysis);
    const globalsCss = this.generateGlobalsCss(analysis);

    return {
      analysis,
      styleGuide,
      tailwindConfig,
      globalsCss,
      estimatedCost: 0.0, // Mock provider is free
      tokensUsed: 0,
    };
  }

  estimateCost(_imageSize: number): number {
    return 0.0; // Mock provider is always free
  }

  private generateStyleGuide(analysis: DesignAnalysis): string {
    return `# Style Guide - ${analysis.designStyle}

## Color Palette
- **Primary**: ${analysis.colorPalette.primary}
- **Secondary**: ${analysis.colorPalette.secondary}
- **Accent**: ${analysis.colorPalette.accent}
- **Neutral**: ${analysis.colorPalette.neutral}
- **Background**: ${analysis.colorPalette.background}
- **Text**: ${analysis.colorPalette.text}

## Typography
- **Primary Font**: ${analysis.typography.primaryFont}
- **Secondary Font**: ${analysis.typography.secondaryFont}

## Component Patterns
- **Buttons**: ${analysis.components.buttons}
- **Cards**: ${analysis.components.cards}
- **Inputs**: ${analysis.components.inputs}
- **Navigation**: ${analysis.components.navigation}

## Usage Examples

### Button Component
\`\`\`tsx
<button className="bg-primary text-white px-4 py-2 rounded-md hover:bg-primary/90 transition-colors">
  Click me
</button>
\`\`\`

### Card Component
\`\`\`tsx
<div className="bg-white rounded-lg shadow-md p-6 border border-neutral/10">
  <h3 className="text-lg font-semibold text-text mb-2">Card Title</h3>
  <p className="text-neutral">Card content goes here.</p>
</div>
\`\`\`
`;
  }

  private generateTailwindConfig(analysis: DesignAnalysis): string {
    const { colorPalette, typography, spacing } = analysis;

    return `module.exports = {
  theme: {
    extend: {
      colors: {
        primary: '${colorPalette.primary}',
        secondary: '${colorPalette.secondary}',
        accent: '${colorPalette.accent}',
        neutral: '${colorPalette.neutral}',
        background: '${colorPalette.background}',
        text: '${colorPalette.text}',
      },
      fontFamily: {
        sans: ['${typography.primaryFont}', '${typography.secondaryFont}', 'sans-serif'],
      },
      fontSize: {
        xs: '${typography.fontSizes.xs}',
        sm: '${typography.fontSizes.sm}',
        base: '${typography.fontSizes.base}',
        lg: '${typography.fontSizes.lg}',
        xl: '${typography.fontSizes.xl}',
        '2xl': '${typography.fontSizes['2xl']}',
        '3xl': '${typography.fontSizes['3xl']}',
        '4xl': '${typography.fontSizes['4xl']}',
      },
      fontWeight: {
        normal: '${typography.fontWeights.normal}',
        medium: '${typography.fontWeights.medium}',
        semibold: '${typography.fontWeights.semibold}',
        bold: '${typography.fontWeights.bold}',
      },
      borderRadius: {
        none: '${spacing.borderRadius.none}',
        sm: '${spacing.borderRadius.sm}',
        md: '${spacing.borderRadius.md}',
        lg: '${spacing.borderRadius.lg}',
        xl: '${spacing.borderRadius.xl}',
        full: '${spacing.borderRadius.full}',
      },
      boxShadow: {
        none: '${spacing.shadows.none}',
        sm: '${spacing.shadows.sm}',
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
  /* Colors */
  --color-primary: ${colorPalette.primary};
  --color-secondary: ${colorPalette.secondary};
  --color-accent: ${colorPalette.accent};
  --color-neutral: ${colorPalette.neutral};
  --color-background: ${colorPalette.background};
  --color-text: ${colorPalette.text};
  
  /* Typography */
  --font-primary: ${typography.primaryFont};
  --font-secondary: ${typography.secondaryFont};
}

body {
  font-family: var(--font-primary), var(--font-secondary), sans-serif;
  background-color: var(--color-background);
  color: var(--color-text);
}

/* Utility classes */
.bg-primary { background-color: var(--color-primary); }
.bg-secondary { background-color: var(--color-secondary); }
.bg-accent { background-color: var(--color-accent); }
.bg-neutral { background-color: var(--color-neutral); }
.bg-background { background-color: var(--color-background); }

.text-primary { color: var(--color-primary); }
.text-secondary { color: var(--color-secondary); }
.text-accent { color: var(--color-accent); }
.text-neutral { color: var(--color-neutral); }
.text-text { color: var(--color-text); }`;
  }
}
