/**
 * Tool Error Handling
 * Provides comprehensive error classes and utilities for tool-related errors
 */

import { 
  ToolError, 
  ToolValidationError as ToolValidationErrorType,
  ToolContext
} from '../types';

/**
 * Base class for all tool-related errors
 */
export abstract class ToolErrorBase extends Error {
  constructor(
    message: string,
    public toolName: string,
    public errorCode: string,
    public details?: unknown
  ) {
    super(message);
    this.name = this.constructor.name;
  }

  /**
   * Convert to MCP ToolError format
   */
  toToolError(): ToolError {
    return {
      code: this.getErrorCode(),
      message: this.message,
      details: this.details,
    };
  }

  /**
   * Get numeric error code for MCP protocol
   */
  protected getErrorCode(): number {
    switch (this.errorCode) {
      case 'VALIDATION_ERROR':
        return -32602; // Invalid params
      case 'PERMISSION_ERROR':
        return -32006; // Authorization error
      case 'EXECUTION_ERROR':
        return -32002; // Tool execution eerror
      case 'NOT_FOUND':
        return -32001; // Tool not found
      case 'RATE_LIMIT_ERROR':
        return -32007; // Rate limit error
      case 'TIMEOUT_ERROR':
        return -32008; // Timeout error
      default:
        return -32603; // Internal error
    }
  }
}

/**
 * Tool validation error
 */
export class ToolValidationError extends ToolErrorBase {
  constructor(
    toolName: string,
    public validationErrors: ToolValidationErrorType[]
  ) {
    const messages = validationErrors.map(e => e.message).join(', ');
    super(`Input validation failed: ${messages}`, toolName, 'VALIDATION_ERROR', validationErrors);
    this.name = 'ToolValidationError';
  }

  /**
   * Get validation error details
   */
  getValidationErrors(): ToolValidationErrorType[] {
    return this.validationErrors;
  }

  /**
   * Check if error is for a specific field
   */
  hasFieldError(fieldName: string): boolean {
    return this.validationErrors.some(error => error.field === fieldName);
  }

  /**
   * Get errors for a specific field
   */
  getFieldErrors(fieldName: string): ToolValidationErrorType[] {
    return this.validationErrors.filter(error => error.field === fieldName);
  }
}

/**
 * Tool execution error
 */
export class ToolExecutionError extends ToolErrorBase {
  constructor(
    toolName: string,
    public originalError: Error
  ) {
    super(`Tool execution failed: ${originalError.message}`, toolName, 'EXECUTION_ERROR', {
      originalError: originalError.message,
      stack: originalError.stack,
    });
    this.name = 'ToolExecutionError';
  }

  /**
   * Get the original error that caused this execution error
   */
  getOriginalError(): Error {
    return this.originalError;
  }
}

/**
 * Tool permission error
 */
export class ToolPermissionError extends ToolErrorBase {
  constructor(
    toolName: string,
    public requiredPermissions: string[]
  ) {
    super(
      `Insufficient permissions. Required: ${requiredPermissions.join(', ')}`,
      toolName,
      'PERMISSION_ERROR',
      { requiredPermissions }
    );
    this.name = 'ToolPermissionError';
  }

  /**
   * Get required permissions
   */
  getRequiredPermissions(): string[] {
    return this.requiredPermissions;
  }

  /**
   * Check if user has any of the required permissions
   */
  hasAnyPermission(context: ToolContext): boolean {
    return this.requiredPermissions.some(permission => 
      context.permissions.includes(permission) ||
      context.permissions.includes('admin')
    );
  }
}

/**
 * Tool not found error
 */
export class ToolNotFoundError extends ToolErrorBase {
  constructor(toolName: string) {
    super(`Tool '${toolName}' not found`, toolName, 'NOT_FOUND');
    this.name = 'ToolNotFoundError';
  }
}

/**
 * Tool rate limit error
 */
export class ToolRateLimitError extends ToolErrorBase {
  constructor(
    toolName: string,
    public retryAfter?: number
  ) {
    super(
      `Rate limit exceeded for tool '${toolName}'`,
      toolName,
      'RATE_LIMIT_ERROR',
      { retryAfter }
    );
    this.name = 'ToolRateLimitError';
  }

  /**
   * Get retry after time in seconds
   */
  getRetryAfter(): number | undefined {
    return this.retryAfter;
  }
}

/**
 * Tool timeout error
 */
export class ToolTimeoutError extends ToolErrorBase {
  constructor(
    toolName: string,
    public timeoutMs: number
  ) {
    super(
      `Tool '${toolName}' execution timed out after ${timeoutMs}ms`,
      toolName,
      'TIMEOUT_ERROR',
      { timeoutMs }
    );
    this.name = 'ToolTimeoutError';
  }

  /**
   * Get timeout duration in milliseconds
   */
  getTimeoutMs(): number {
    return this.timeoutMs;
  }
}

/**
 * Tool configuration error
 */
export class ToolConfigurationError extends ToolErrorBase {
  constructor(
    toolName: string,
    public configError: string
  ) {
    super(`Configuration error for tool '${toolName}': ${configError}`, toolName, 'CONFIGURATION_ERROR', {
      configError,
    });
    this.name = 'ToolConfigurationError';
  }
}

/**
 * Tool input sanitization error
 */
export class ToolInputSanitizationError extends ToolErrorBase {
  constructor(
    toolName: string,
    public field: string,
    public originalValue: unknown
  ) {
    super(
      `Input sanitization failed for field '${field}' in tool '${toolName}'`,
      toolName,
      'SANITIZATION_ERROR',
      { field, originalValue }
    );
    this.name = 'ToolInputSanitizationError';
  }
}

/**
 * Error utilities for tool error handling
 */
export class ToolErrorUtils {
  /**
   * Check if an error is a tool error
   */
  static isToolError(error: unknown): error is ToolErrorBase {
    return error instanceof ToolErrorBase;
  }

  /**
   * Check if an error is a validation error
   */
  static isValidationError(error: unknown): error is ToolValidationError {
    return error instanceof ToolValidationError;
  }

  /**
   * Check if an error is a permission error
   */
  static isPermissionError(error: unknown): error is ToolPermissionError {
    return error instanceof ToolPermissionError;
  }

  /**
   * Check if an error is an execution error
   */
  static isExecutionError(error: unknown): error is ToolExecutionError {
    return error instanceof ToolExecutionError;
  }

  /**
   * Check if an error is a not found error
   */
  static isNotFoundError(error: unknown): error is ToolNotFoundError {
    return error instanceof ToolNotFoundError;
  }

  /**
   * Check if an error is a rate limit error
   */
  static isRateLimitError(error: unknown): error is ToolRateLimitError {
    return error instanceof ToolRateLimitError;
  }

  /**
   * Check if an error is a timeout error
   */
  static isTimeoutError(error: unknown): error is ToolTimeoutError {
    return error instanceof ToolTimeoutError;
  }

  /**
   * Convert any error to a tool error
   */
  static toToolError(error: unknown, toolName: string): ToolErrorBase {
    if (this.isToolError(error)) {
      return error;
    }

    if (error instanceof Error) {
      return new ToolExecutionError(toolName, error);
    }

    return new ToolExecutionError(toolName, new Error(String(error)));
  }

  /**
   * Create a validation error from validation result
   */
  static createValidationError(
    toolName: string,
    validationErrors: ToolValidationErrorType[]
  ): ToolValidationError {
    return new ToolValidationError(toolName, validationErrors);
  }

  /**
   * Create a permission error
   */
  static createPermissionError(
    toolName: string,
    requiredPermissions: string[]
  ): ToolPermissionError {
    return new ToolPermissionError(toolName, requiredPermissions);
  }

  /**
   * Create a not found error
   */
  static createNotFoundError(toolName: string): ToolNotFoundError {
    return new ToolNotFoundError(toolName);
  }

  /**
   * Create a rate limit error
   */
  static createRateLimitError(toolName: string, retryAfter?: number): ToolRateLimitError {
    return new ToolRateLimitError(toolName, retryAfter);
  }

  /**
   * Create a timeout error
   */
  static createTimeoutError(toolName: string, timeoutMs: number): ToolTimeoutError {
    return new ToolTimeoutError(toolName, timeoutMs);
  }

  /**
   * Get error message for user display
   */
  static getUserMessage(error: unknown): string {
    if (this.isToolError(error)) {
      return error.message;
    }

    if (error instanceof Error) {
      return error.message;
    }

    return String(error);
  }

  /**
   * Get error code for logging
   */
  static getErrorCode(error: unknown): string {
    if (this.isToolError(error)) {
      return error.errorCode;
    }

    return 'UNKNOWN_ERROR';
  }

  /**
   * Check if error should be retried
   */
  static shouldRetry(error: unknown): boolean {
    if (this.isRateLimitError(error)) {
      return true;
    }

    if (this.isTimeoutError(error)) {
      return true;
    }

    if (this.isExecutionError(error)) {
      const originalError = error.getOriginalError();
      // Retry on network errors, but not on validation or permission errors
      return originalError.name === 'NetworkError' || 
             originalError.message.includes('network') ||
             originalError.message.includes('timeout');
    }

    return false;
  }

  /**
   * Get retry delay in milliseconds
   */
  static getRetryDelay(error: unknown): number {
    if (this.isRateLimitError(error)) {
      return (error.getRetryAfter() || 60) * 1000;
    }

    if (this.isTimeoutError(error)) {
      return 1000; // 1 second for timeout errors
    }

    return 5000; // Default 5 seconds
  }
} 