/**
 * Simple error factory for common error types
 */
export class ErrorFactory {
  static validation(message: string): Error {
    const error = new Error(message);
    error.name = 'ValidationError';
    return error;
  }

  static security(message: string): Error {
    const error = new Error(message);
    error.name = 'SecurityError';
    return error;
  }
}
