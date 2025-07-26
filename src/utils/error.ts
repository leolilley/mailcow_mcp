export function formatError(error: Error): string {
  return `${error.name}: ${error.message}`;
}

export function getErrorStack(error: Error): string {
  return error.stack || 'No stack trace available';
}

export function categorizeError(error: Error): string {
  if (error.name === 'NetworkError') {
    return 'NETWORK';
  }
  if (error.name === 'ValidationError') {
    return 'VALIDATION';
  }
  if (error.name === 'AuthenticationError') {
    return 'AUTHENTICATION';
  }
  return 'UNKNOWN';
}

export async function withErrorHandling<T>(
  operation: () => Promise<T>,
  errorHandler: (error: Error) => void
): Promise<T | null> {
  try {
    return await operation();
  } catch (error) {
    errorHandler(error as Error);
    return null;
  }
} 