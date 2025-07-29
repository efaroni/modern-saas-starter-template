import { renderHook, act, waitFor } from '@testing-library/react';

import { testUserApiKey } from '@/app/actions/user-api-keys';
import { useApiKeyValidation } from '@/lib/hooks/useApiKeyValidation';

// Mock the server action
jest.mock('@/app/actions/user-api-keys', () => ({
  testUserApiKey: jest.fn(),
}));

// Mock the validation format check
jest.mock('@/lib/utils/api-key-validation', () => ({
  validateApiKeyFormat: jest.fn((key: string) => ({
    isValid: key.length > 0 && key.startsWith('sk-'),
    error: (() => {
      if (key.length === 0) return 'API key is required';
      if (key.startsWith('sk-')) return null;
      return 'Invalid format';
    })(),
  })),
}));

describe('useApiKeyValidation', () => {
  const mockTestUserApiKey = testUserApiKey as jest.MockedFunction<
    typeof testUserApiKey
  >;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should initialize with default state', () => {
    const { result } = renderHook(() =>
      useApiKeyValidation({ service: 'openai', title: 'OpenAI' }),
    );

    expect(result.current.isValidating).toBe(false);
    expect(result.current.message).toBeNull();
    expect(result.current.validationError).toBeNull();
    expect(result.current.hasValidatedKey).toBe(false);
  });

  it('should validate API key with debouncing', async () => {
    mockTestUserApiKey.mockResolvedValue({
      success: true,
      message: 'API key is valid and working!',
    });

    const { result } = renderHook(() =>
      useApiKeyValidation({ service: 'openai', title: 'OpenAI' }),
    );

    // Trigger validation
    act(() => {
      result.current.validateKey('sk-test-1234567890');
    });

    // Initially not validating
    expect(result.current.isValidating).toBe(false);

    // Fast forward past auto-validation timeout (1000ms)
    act(() => {
      jest.advanceTimersByTime(1000);
    });

    await waitFor(() => {
      expect(mockTestUserApiKey).toHaveBeenCalledWith(
        'openai',
        'sk-test-1234567890',
      );
    });

    await waitFor(() => {
      expect(result.current.isValidating).toBe(false);
      expect(result.current.hasValidatedKey).toBe(true);
      expect(result.current.message).toEqual({
        text: 'API key is valid and working!',
        type: 'success',
      });
    });
  });

  it('should handle validation errors', async () => {
    mockTestUserApiKey.mockResolvedValue({
      success: false,
      error: 'Invalid API key',
    });

    const { result } = renderHook(() =>
      useApiKeyValidation({ service: 'openai', title: 'OpenAI' }),
    );

    act(() => {
      result.current.validateKey('sk-invalid-key');
    });

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    await waitFor(() => {
      expect(result.current.isValidating).toBe(false);
      expect(result.current.validationError).toBeNull(); // Format is valid (sk-), so no validation error
      expect(result.current.message).toEqual({
        text: 'Invalid API key',
        type: 'error',
      });
    });
  });

  it('should skip validation for empty keys', () => {
    const { result } = renderHook(() =>
      useApiKeyValidation({ service: 'openai', title: 'OpenAI' }),
    );

    act(() => {
      result.current.validateKey('');
    });

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(mockTestUserApiKey).not.toHaveBeenCalled();
    expect(result.current.isValidating).toBe(false);
  });

  it('should handle paste events and validate immediately', async () => {
    mockTestUserApiKey.mockResolvedValue({
      success: true,
      message: 'API key is valid and working!',
    });

    const { result } = renderHook(() =>
      useApiKeyValidation({ service: 'openai', title: 'OpenAI' }),
    );

    const mockEvent = {
      target: {
        value: 'sk-test-pasted-key',
      },
    } as unknown as React.ClipboardEvent<HTMLInputElement>;

    act(() => {
      result.current.handlePaste(mockEvent);
    });

    // Fast forward to allow setTimeout(0) to execute
    act(() => {
      jest.advanceTimersByTime(0);
    });

    await waitFor(() => {
      expect(mockTestUserApiKey).toHaveBeenCalledWith(
        'openai',
        'sk-test-pasted-key',
      );
    });
  });

  it('should handle mock API keys', async () => {
    mockTestUserApiKey.mockResolvedValue({
      success: true,
      isMock: true,
      message: 'Mock API key - validation skipped',
    });

    const { result } = renderHook(() =>
      useApiKeyValidation({ service: 'openai', title: 'OpenAI' }),
    );

    act(() => {
      result.current.validateKey('sk-mock-1234567890');
    });

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    await waitFor(() => {
      expect(result.current.message).toEqual({
        text: 'Mock API key - validation skipped',
        type: 'success',
      });
    });
  });

  it('should cancel pending validation when key changes', async () => {
    mockTestUserApiKey.mockImplementation(async () => {
      // Simulate a slow API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      return { success: true, message: 'Valid' };
    });

    const { result } = renderHook(() =>
      useApiKeyValidation({ service: 'openai', title: 'OpenAI' }),
    );

    // Start first validation
    act(() => {
      result.current.validateKey('sk-test-first');
    });

    // Advance timer partially (500ms)
    act(() => {
      jest.advanceTimersByTime(500);
    });

    // Change key before first validation timeout completes
    act(() => {
      result.current.validateKey('sk-test-second');
    });

    // Complete the timeout for the second key
    act(() => {
      jest.advanceTimersByTime(1000);
    });

    // Only the second validation should be called
    await waitFor(() => {
      expect(mockTestUserApiKey).toHaveBeenCalledTimes(1);
      expect(mockTestUserApiKey).toHaveBeenCalledWith(
        'openai',
        'sk-test-second',
      );
    });
  });
});
