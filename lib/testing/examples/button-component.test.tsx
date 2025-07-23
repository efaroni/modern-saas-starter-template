import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { screen } from '@testing-library/react';

import '@testing-library/jest-dom';
import {
  renderWithProviders,
  componentTestUtils,
  mockUtils,
} from '../component-utils';
import { testTemplates } from '../test-templates';

// Example Button component for testing
const Button = ({
  children,
  onClick,
  disabled = false,
  loading = false,
  variant = 'primary',
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
}) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`btn btn-${variant} ${loading ? 'loading' : ''}`}
      data-testid='button'
    >
      {loading ? 'Loading...' : children}
    </button>
  );
};

describe('Button Component - Example Tests', () => {
  let mockOnClick: jest.MockedFunction<() => void>;

  beforeEach(() => {
    mockOnClick = mockUtils.createMockFunction<() => void>('onClick');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('should render with text', async () => {
      const button = <Button>Click me</Button>;
      await componentTestUtils.shouldRender(button);
      expect(screen.getByText('Click me')).toBeInTheDocument();
    });

    it('should render with different variants', async () => {
      const propVariations = [
        { children: 'Primary', variant: 'primary' as const },
        { children: 'Secondary', variant: 'secondary' as const },
        { children: 'Danger', variant: 'danger' as const },
      ];

      const results = await componentTestUtils.testWithProps(
        Button,
        propVariations,
      );
      results.forEach(result => {
        expect(result.success).toBe(true);
      });
    });
  });

  describe('Interactions', () => {
    it('should handle click events', async () => {
      const { user } = renderWithProviders(
        <Button onClick={mockOnClick}>Click me</Button>,
      );

      const button = screen.getByTestId('button');
      await user.click(button);

      expect(mockOnClick).toHaveBeenCalledTimes(1);
    });

    it('should not trigger onClick when disabled', async () => {
      const { user } = renderWithProviders(
        <Button onClick={mockOnClick} disabled>
          Click me
        </Button>,
      );

      const button = screen.getByTestId('button');
      await user.click(button);

      expect(mockOnClick).not.toHaveBeenCalled();
    });
  });

  describe('Loading States', () => {
    it('should display loading state correctly', async () => {
      const loadingProps = { loading: true };
      const results = await componentTestUtils.testLoadingStates(
        <Button>Click me</Button>,
        loadingProps,
      );

      const loadingResult = results.find(r => r.propName === 'loading');
      expect(loadingResult?.hasLoadingIndicator).toBe(true);
    });

    it('should show loading text when loading', () => {
      renderWithProviders(<Button loading>Click me</Button>);
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('should disable button when loading', () => {
      renderWithProviders(<Button loading>Click me</Button>);
      expect(screen.getByTestId('button')).toBeDisabled();
    });
  });

  describe('Accessibility', () => {
    it('should be accessible', async () => {
      const button = <Button>Accessible Button</Button>;
      const result = await componentTestUtils.testAccessibility(button);
      expect(result.passed).toBe(true);
    });

    it('should have proper ARIA attributes when disabled', () => {
      renderWithProviders(<Button disabled>Disabled Button</Button>);
      const button = screen.getByTestId('button');
      expect(button).toHaveAttribute('disabled');
    });
  });

  describe('Using Test Templates', () => {
    it('should pass component template tests', () => {
      const buttonComponent = <Button>Template Test</Button>;

      const testConfig = testTemplates.component('Button', buttonComponent, {
        testRendering: true,
        testProps: true,
        testAccessibility: true,
        testLoadingStates: true,
        propVariations: [
          { children: 'Test 1', variant: 'primary' },
          { children: 'Test 2', variant: 'secondary' },
        ],
        loadingProps: { loading: true },
      });

      // This demonstrates how the template would be used
      expect(testConfig.describe).toBe('Button Component Tests');
      expect(testConfig.tests.length).toBeGreaterThan(0);
    });
  });
});
