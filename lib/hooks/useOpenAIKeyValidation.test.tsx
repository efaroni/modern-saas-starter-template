/**
 * @jest-environment jsdom
 */
import { act, renderHook, waitFor } from '@testing-library/react';

import { useOpenAIKeyValidation } from './useOpenAIKeyValidation';

// Mock fetch
global.fetch = jest.fn();

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  key: jest.fn(),
  length: 0,
};
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
  writable: true,
});

describe('useOpenAIKeyValidation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    jest.useFakeTimers();
    mockLocalStorage.getItem.mockReturnValue(null);
    console.log = jest.fn();
    console.warn = jest.fn();
    console.error = jest.fn();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should initialize with loading state when no cache exists', () => {
    const { result } = renderHook(() => useOpenAIKeyValidation());

    expect(result.current.isLoading).toBe(true);
    expect(result.current.isValid).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should load cached result on initialization if available', () => {
    // Arrange
    const cachedData = {
      result: {
        isValid: true,
        isLoading: false,
        error: null,
        hasVisionModel: true,
        lastValidated: new Date().toISOString(),
      },
      timestamp: new Date().toISOString(),
    };
    mockLocalStorage.getItem.mockReturnValue(JSON.stringify(cachedData));

    // Act
    const { result } = renderHook(() => useOpenAIKeyValidation());

    // Assert
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isValid).toBe(true);
    expect(result.current.hasVisionModel).toBe(true);
  });

  it('should perform quick check on mount after delay', async () => {
    // Arrange
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ hasKey: true }),
    });

    // Act
    const { result } = renderHook(() => useOpenAIKeyValidation());

    // Initially loading
    expect(result.current.isLoading).toBe(true);

    // Advance timer to trigger validation
    act(() => {
      jest.advanceTimersByTime(100);
    });

    // Wait for async operations
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/ai/check-key', {
        signal: expect.any(AbortSignal),
      });
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isValid).toBe(true);
    });
  });

  it('should handle no API key scenario', async () => {
    // Arrange
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ hasKey: false }),
    });

    // Act
    const { result } = renderHook(() => useOpenAIKeyValidation());

    act(() => {
      jest.advanceTimersByTime(100);
    });

    // Assert
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isValid).toBe(false);
      expect(result.current.error?.code).toBe('NO_API_KEY');
      expect(result.current.error?.message).toBe('No OpenAI API key found');
    });
  });

  it('should handle authentication failure gracefully', async () => {
    // Arrange
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: () => Promise.resolve({}),
    });

    // Act
    const { result } = renderHook(() => useOpenAIKeyValidation());

    act(() => {
      jest.advanceTimersByTime(100);
    });

    // Assert
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isValid).toBe(false);
      expect(result.current.error).toBeNull(); // No error shown for auth issues
    });
  });

  it('should timeout after 5 seconds with global failsafe', async () => {
    // Arrange
    (global.fetch as jest.Mock).mockImplementation(() => new Promise(() => {})); // Never resolves

    // Act
    const { result } = renderHook(() => useOpenAIKeyValidation());

    act(() => {
      jest.advanceTimersByTime(100); // Trigger validation
    });

    expect(result.current.isLoading).toBe(true);

    // Advance to timeout
    act(() => {
      jest.advanceTimersByTime(5000);
    });

    // Assert
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isValid).toBe(false);
      expect(result.current.error?.code).toBe('TIMEOUT');
      expect(result.current.error?.message).toBe('Validation timeout');
    });
  });

  it('should perform full validation when requested', async () => {
    // Arrange
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ hasKey: true }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ hasKey: true }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            message: 'Valid',
            details: { hasVisionModel: true, modelCount: 5, validated: true },
          }),
      });

    // Act
    const { result } = renderHook(() => useOpenAIKeyValidation());

    // Skip initial validation
    act(() => {
      jest.advanceTimersByTime(100);
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Clear mock calls from initial validation
    (global.fetch as jest.Mock).mockClear();

    // Trigger full validation
    act(() => {
      result.current.fullValidation();
    });

    // Assert - first it calls check-key, then validate-key
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    expect(global.fetch).toHaveBeenNthCalledWith(1, '/api/ai/check-key', {
      signal: expect.any(AbortSignal),
    });

    expect(global.fetch).toHaveBeenNthCalledWith(2, '/api/ai/validate-key', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: expect.any(AbortSignal),
    });

    await waitFor(() => {
      expect(result.current.isValid).toBe(true);
      expect(result.current.hasVisionModel).toBe(true);
    });
  });

  it('should cache results in localStorage', async () => {
    // Arrange
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ hasKey: true }),
    });

    // Act
    renderHook(() => useOpenAIKeyValidation());

    act(() => {
      jest.advanceTimersByTime(100);
    });

    // Assert
    await waitFor(() => {
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'openai_key_validation',
        expect.stringContaining('"isValid":true'),
      );
    });
  });

  it('should skip validation if cache is fresh', () => {
    // Arrange
    const recentCache = {
      result: {
        isValid: true,
        isLoading: false,
        error: null,
        lastValidated: new Date().toISOString(),
      },
      timestamp: new Date().toISOString(),
    };
    mockLocalStorage.getItem.mockReturnValue(JSON.stringify(recentCache));

    // Act
    renderHook(() => useOpenAIKeyValidation());

    act(() => {
      jest.advanceTimersByTime(100);
    });

    // Assert
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('should handle network errors', async () => {
    // Arrange
    (global.fetch as jest.Mock).mockRejectedValueOnce(
      new Error('Network error'),
    );

    // Act
    const { result } = renderHook(() => useOpenAIKeyValidation());

    act(() => {
      jest.advanceTimersByTime(100);
    });

    // Assert
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isValid).toBe(false);
      expect(result.current.error?.code).toBe('NETWORK_ERROR');
      expect(result.current.error?.message).toBe('Network error');
    });
  });

  it('should handle abort errors specifically', async () => {
    // Arrange
    const abortError = new Error('Aborted');
    abortError.name = 'AbortError';
    (global.fetch as jest.Mock).mockRejectedValueOnce(abortError);

    // Act
    const { result } = renderHook(() => useOpenAIKeyValidation());

    act(() => {
      jest.advanceTimersByTime(100);
    });

    // Assert
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isValid).toBe(false);
      expect(result.current.error?.code).toBe('NETWORK_ERROR');
      expect(result.current.error?.message).toBe('Request timeout');
    });
  });

  it('should provide retry function that forces full validation', async () => {
    // Arrange
    (global.fetch as jest.Mock)
      .mockRejectedValueOnce(new Error('Initial failure'))
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ hasKey: true }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            message: 'Valid',
            details: { hasVisionModel: true, modelCount: 5, validated: true },
          }),
      });

    // Act
    const { result } = renderHook(() => useOpenAIKeyValidation());

    // Initial validation fails
    act(() => {
      jest.advanceTimersByTime(100);
    });

    await waitFor(() => {
      expect(result.current.error).toBeDefined();
    });

    // Retry
    act(() => {
      result.current.validateKey();
    });

    // Assert
    await waitFor(() => {
      expect(result.current.isValid).toBe(true);
      expect(result.current.error).toBeNull();
    });
  });
});
