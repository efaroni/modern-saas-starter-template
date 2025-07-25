import type { DesignAnalysisResult } from './types';

export const mockDesignAnalysisResult: DesignAnalysisResult = {
  styleGuide: `# Design System Style Guide

## Overview
This design system emphasizes clean, modern aesthetics with a focus on accessibility and user experience. The design follows a minimal approach with strategic use of color and typography.

## Color Palette

### Primary Colors
- **Primary**: #3B82F6 (Blue-500) - Used for primary actions, links, and brand elements
- **Primary Dark**: #1D4ED8 (Blue-700) - Hover states and active elements
- **Primary Light**: #DBEAFE (Blue-100) - Background highlights and subtle accents

### Neutral Colors
- **Text Primary**: #111827 (Gray-900) - Main text content
- **Text Secondary**: #6B7280 (Gray-500) - Secondary text, captions
- **Background**: #FFFFFF - Main background
- **Surface**: #F9FAFB (Gray-50) - Card backgrounds, secondary surfaces
- **Border**: #E5E7EB (Gray-200) - Borders, dividers

### Semantic Colors
- **Success**: #10B981 (Emerald-500)
- **Warning**: #F59E0B (Amber-500)
- **Error**: #EF4444 (Red-500)
- **Info**: #3B82F6 (Blue-500)

## Typography

### Font Stack
- **Primary**: Inter, system-ui, sans-serif
- **Monospace**: 'JetBrains Mono', Consolas, monospace

### Type Scale
- **Heading 1**: 2.25rem (36px) / Bold / Line height 1.2
- **Heading 2**: 1.875rem (30px) / Semibold / Line height 1.3
- **Heading 3**: 1.5rem (24px) / Semibold / Line height 1.4
- **Body Large**: 1.125rem (18px) / Regular / Line height 1.6
- **Body**: 1rem (16px) / Regular / Line height 1.5
- **Body Small**: 0.875rem (14px) / Regular / Line height 1.4
- **Caption**: 0.75rem (12px) / Medium / Line height 1.3

## Spacing System

Uses an 8px base unit with a scaling factor:
- **xs**: 0.25rem (4px)
- **sm**: 0.5rem (8px)
- **md**: 1rem (16px)
- **lg**: 1.5rem (24px)
- **xl**: 2rem (32px)
- **2xl**: 3rem (48px)
- **3xl**: 4rem (64px)

## Border Radius
- **None**: 0
- **Small**: 0.25rem (4px) - Buttons, inputs
- **Default**: 0.375rem (6px) - Cards, containers
- **Large**: 0.5rem (8px) - Modal dialogs
- **Full**: 9999px - Pills, avatars

## Elevation (Shadows)
- **Level 1**: 0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06)
- **Level 2**: 0 4px 6px rgba(0, 0, 0, 0.07), 0 2px 4px rgba(0, 0, 0, 0.06)
- **Level 3**: 0 10px 15px rgba(0, 0, 0, 0.1), 0 4px 6px rgba(0, 0, 0, 0.05)
- **Level 4**: 0 20px 25px rgba(0, 0, 0, 0.1), 0 10px 10px rgba(0, 0, 0, 0.04)

## Component Patterns

### Buttons
- **Primary**: Blue background, white text, medium padding, rounded corners
- **Secondary**: White background, blue border and text
- **Ghost**: Transparent background, blue text
- **Destructive**: Red background, white text

### Cards
- White background, subtle shadow, rounded corners, consistent padding

### Forms
- Clean inputs with subtle borders, focus states with blue outline
- Labels positioned above inputs
- Consistent spacing between form elements

### Navigation
- Horizontal layout with clear hierarchy
- Active states clearly indicated
- Hover effects for interactive elements`,

  tailwindConfig: `/** @type {import('tailwindcss').Config} */
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
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
          950: '#172554',
        },
        gray: {
          50: '#f9fafb',
          100: '#f3f4f6',
          200: '#e5e7eb',
          300: '#d1d5db',
          400: '#9ca3af',
          500: '#6b7280',
          600: '#4b5563',
          700: '#374151',
          800: '#1f2937',
          900: '#111827',
          950: '#030712',
        },
        success: {
          50: '#ecfdf5',
          100: '#d1fae5',
          500: '#10b981',
          600: '#059669',
          700: '#047857',
        },
        warning: {
          50: '#fffbeb',
          100: '#fef3c7',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
        },
        error: {
          50: '#fef2f2',
          100: '#fee2e2',
          500: '#ef4444',
          600: '#dc2626',
          700: '#b91c1c',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Consolas', 'monospace'],
      },
      fontSize: {
        'xs': ['0.75rem', { lineHeight: '1.3' }],
        'sm': ['0.875rem', { lineHeight: '1.4' }],
        'base': ['1rem', { lineHeight: '1.5' }],
        'lg': ['1.125rem', { lineHeight: '1.6' }],
        'xl': ['1.25rem', { lineHeight: '1.6' }],
        '2xl': ['1.5rem', { lineHeight: '1.4' }],
        '3xl': ['1.875rem', { lineHeight: '1.3' }],
        '4xl': ['2.25rem', { lineHeight: '1.2' }],
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
      },
      borderRadius: {
        'xl': '0.75rem',
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      boxShadow: {
        'level-1': '0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06)',
        'level-2': '0 4px 6px rgba(0, 0, 0, 0.07), 0 2px 4px rgba(0, 0, 0, 0.06)',
        'level-3': '0 10px 15px rgba(0, 0, 0, 0.1), 0 4px 6px rgba(0, 0, 0, 0.05)',
        'level-4': '0 20px 25px rgba(0, 0, 0, 0.1), 0 10px 10px rgba(0, 0, 0, 0.04)',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
  ],
}`,

  globalsCss: `@import 'tailwindcss/base';
@import 'tailwindcss/components';
@import 'tailwindcss/utilities';

/* CSS Custom Properties */
:root {
  /* Colors */
  --color-primary: #3b82f6;
  --color-primary-dark: #1d4ed8;
  --color-primary-light: #dbeafe;
  
  --color-text-primary: #111827;
  --color-text-secondary: #6b7280;
  --color-background: #ffffff;
  --color-surface: #f9fafb;
  --color-border: #e5e7eb;
  
  --color-success: #10b981;
  --color-warning: #f59e0b;
  --color-error: #ef4444;
  
  /* Spacing */
  --spacing-xs: 0.25rem;
  --spacing-sm: 0.5rem;
  --spacing-md: 1rem;
  --spacing-lg: 1.5rem;
  --spacing-xl: 2rem;
  --spacing-2xl: 3rem;
  --spacing-3xl: 4rem;
  
  /* Border Radius */
  --radius-sm: 0.25rem;
  --radius-default: 0.375rem;
  --radius-lg: 0.5rem;
  --radius-full: 9999px;
  
  /* Shadows */
  --shadow-level-1: 0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06);
  --shadow-level-2: 0 4px 6px rgba(0, 0, 0, 0.07), 0 2px 4px rgba(0, 0, 0, 0.06);
  --shadow-level-3: 0 10px 15px rgba(0, 0, 0, 0.1), 0 4px 6px rgba(0, 0, 0, 0.05);
  --shadow-level-4: 0 20px 25px rgba(0, 0, 0, 0.1), 0 10px 10px rgba(0, 0, 0, 0.04);
  
  /* Typography */
  --font-family-sans: 'Inter', system-ui, sans-serif;
  --font-family-mono: 'JetBrains Mono', 'Consolas', monospace;
}

/* Base Styles */
* {
  box-sizing: border-box;
}

html {
  scroll-behavior: smooth;
}

body {
  font-family: var(--font-family-sans);
  color: var(--color-text-primary);
  background-color: var(--color-background);
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* Focus Styles */
:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

/* Custom Utility Classes */
.text-gradient {
  background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.glass-effect {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.card-hover {
  transition: all 0.2s ease-in-out;
}

.card-hover:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-level-3);
}

/* Button Base Styles */
.btn-base {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  font-weight: 500;
  border-radius: var(--radius-default);
  transition: all 0.2s ease-in-out;
  cursor: pointer;
  border: none;
  text-decoration: none;
}

.btn-base:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

.btn-base:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Input Base Styles */
.input-base {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-default);
  background-color: var(--color-background);
  color: var(--color-text-primary);
  transition: border-color 0.2s ease-in-out;
}

.input-base:focus {
  border-color: var(--color-primary);
  outline: none;
}

.input-base::placeholder {
  color: var(--color-text-secondary);
}

/* Animation Classes */
.animate-in {
  animation: fadeIn 0.5s ease-in-out;
}

.animate-slide-up {
  animation: slideUp 0.3s ease-out;
}

.animate-scale-in {
  animation: scaleIn 0.2s ease-out;
}

/* Responsive Typography */
@media (min-width: 768px) {
  body {
    font-size: 1rem;
  }
}

/* Print Styles */
@media print {
  * {
    background: transparent !important;
    color: black !important;
    box-shadow: none !important;
  }
}

/* High Contrast Mode Support */
@media (prefers-contrast: high) {
  :root {
    --color-border: #000000;
    --color-text-secondary: #000000;
  }
}

/* Reduced Motion Support */
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
  
  html {
    scroll-behavior: auto;
  }
}`,

  metadata: {
    colors: {
      primary: '#3b82f6',
      secondary: '#6b7280',
      accent: '#10b981',
      background: '#ffffff',
      surface: '#f9fafb',
      text: '#111827',
      textSecondary: '#6b7280',
      border: '#e5e7eb',
      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444',
    },
    fonts: ['Inter', 'JetBrains Mono'],
    primaryColor: '#3b82f6',
    theme: 'light',
  },
};
