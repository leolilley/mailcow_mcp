import { formatError, getErrorStack, categorizeError, withErrorHandling } from '../../../src/utils/error';

describe('Error Utils', () => {
  describe('formatError', () => {
    it('should format error with name and message', () => {
      const error = new Error('Something went wrong');
      error.name = 'CustomError';
      
      const formatted = formatError(error);
      expect(formatted).toBe('CustomError: Something went wrong');
    });

    it('should handle errors with default name', () => {
      const error = new Error('Test error');
      const formatted = formatError(error);
      expect(formatted).toBe('Error: Test error');
    });

    it('should handle empty error messages', () => {
      const error = new Error('');
      const formatted = formatError(error);
      expect(formatted).toBe('Error: ');
    });
  });

  describe('getErrorStack', () => {
    it('should return error stack trace when available', () => {
      const error = new Error('Test error');
      const stack = getErrorStack(error);
      
      expect(stack).toBeDefined();
      expect(stack).toContain('Error: Test error');
    });

    it('should return fallback message when stack is not available', () => {
      const error = new Error('Test error');
      error.stack = undefined;
      
      const stack = getErrorStack(error);
      expect(stack).toBe('No stack trace available');
    });
  });

  describe('categorizeError', () => {
    it('should categorize network errors', () => {
      const error = new Error('Connection failed');
      error.name = 'NetworkError';
      
      expect(categorizeError(error)).toBe('NETWORK');
    });

    it('should categorize validation errors', () => {
      const error = new Error('Invalid input');
      error.name = 'ValidationError';
      
      expect(categorizeError(error)).toBe('VALIDATION');
    });

    it('should categorize authentication errors', () => {
      const error = new Error('Access denied');
      error.name = 'AuthenticationError';
      
      expect(categorizeError(error)).toBe('AUTHENTICATION');
    });

    it('should categorize unknown errors', () => {
      const error = new Error('Generic error');
      error.name = 'SomeOtherError';
      
      expect(categorizeError(error)).toBe('UNKNOWN');
    });

    it('should handle default error type', () => {
      const error = new Error('Standard error');
      expect(categorizeError(error)).toBe('UNKNOWN');
    });
  });

  describe('withErrorHandling', () => {
    it('should return result when operation succeeds', async () => {
      const operation = jest.fn().mockResolvedValue('success');
      const errorHandler = jest.fn();
      
      const result = await withErrorHandling(operation, errorHandler);
      
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalled();
      expect(errorHandler).not.toHaveBeenCalled();
    });

    it('should handle errors and return null', async () => {
      const error = new Error('Operation failed');
      const operation = jest.fn().mockRejectedValue(error);
      const errorHandler = jest.fn();
      
      const result = await withErrorHandling(operation, errorHandler);
      
      expect(result).toBeNull();
      expect(operation).toHaveBeenCalled();
      expect(errorHandler).toHaveBeenCalledWith(error);
    });

    it('should call error handler with thrown error', async () => {
      const error = new Error('Custom error');
      const operation = jest.fn().mockRejectedValue(error);
      const errorHandler = jest.fn();
      
      await withErrorHandling(operation, errorHandler);
      
      expect(errorHandler).toHaveBeenCalledTimes(1);
      expect(errorHandler).toHaveBeenCalledWith(error);
    });

    it('should handle synchronous errors in async operations', async () => {
      const operation = jest.fn().mockImplementation(() => {
        throw new Error('Sync error in async function');
      });
      const errorHandler = jest.fn();
      
      const result = await withErrorHandling(operation, errorHandler);
      
      expect(result).toBeNull();
      expect(errorHandler).toHaveBeenCalled();
    });
  });
}); 