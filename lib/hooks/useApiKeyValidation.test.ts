import { renderHook, act, waitFor } from '@testing-library/react';

import { testUserApiKey } from '@/app/actions/user-api-keys';
import { API_KEY_VALIDATION } from '@/lib/constants/validation';

import { useApiKeyValidation } from './useApiKeyValidation';

// Mock the server action
jest.mock('@/app/actions/user-api-keys', () => ({
  testUserApiKey: jest.fn(),
}));

const mockTestUserApiKey = testUserApiKey as jest.MockedFunction<
  typeof testUserApiKey
>;

describe('useApiKeyValidation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('should show validation errors for invalid input', () => {
    const { result } = renderHook(() =>
      useApiKeyValidation({ service: 'openai', title: 'OpenAI' }),
    );

    // Empty key
    act(() => result.current.validateKey(''));
    expect(result.current.validationError).toBeTruthy();

    // Whitespace
    act(() => result.current.validateKey('  key  '));
    expect(result.current.validationError).toBeTruthy();

    // Too short
    act(() => result.current.validateKey('short'));
    expect(result.current.validationError).toBeTruthy();

    // Valid key
    act(() => result.current.validateKey('valid-key-12345'));
    expect(result.current.validationError).toBeNull();
  });

  test('should delay validation when typing', async () => {
    mockTestUserApiKey.mockResolvedValue({ success: true, message: 'Valid' });

    const { result } = renderHook(() =>
      useApiKeyValidation({ service: 'openai', title: 'OpenAI' }),
    );

    act(() => result.current.validateKey('valid-key-12345'));
    expect(mockTestUserApiKey).not.toHaveBeenCalled();

    act(() =>
      jest.advanceTimersByTime(API_KEY_VALIDATION.AUTO_VALIDATION_TIMEOUT),
    );

    await waitFor(() => {
      expect(mockTestUserApiKey).toHaveBeenCalled();
    });
  });

  test('should validate immediately on paste', async () => {
    mockTestUserApiKey.mockResolvedValue({ success: true, message: 'Valid' });

    const { result } = renderHook(() =>
      useApiKeyValidation({ service: 'openai', title: 'OpenAI' }),
    );

    const mockEvent = {
      target: { value: 'valid-key-12345' },
      clipboardData: { getData: () => '' },
    } as unknown as React.ClipboardEvent<HTMLInputElement>;

    act(() => {
      result.current.handlePaste(mockEvent);
      jest.advanceTimersByTime(0);
    });

    await waitFor(() => {
      expect(mockTestUserApiKey).toHaveBeenCalled();
    });
  });
});
