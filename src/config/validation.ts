import { z } from 'zod';
import { ConfigValidationResult } from '../types';

// Zod schemas for configuration validation
export const APIConfigSchema = z.object({
  url: z.string().url('Invalid API URL'),
  key: z.string().min(1, 'API key is required'),
  accessType: z.enum(['read-only', 'read-write'], {
    errorMap: () => ({ message: 'Access type must be read-only or read-write' })
  }),
  timeout: z.number().min(1000, 'Timeout must be at least 1000ms').max(60000, 'Timeout must be at most 60000ms'),
  verifySSL: z.boolean(),
  retryAttempts: z.number().min(0, 'Retry attempts must be non-negative').max(10, 'Retry attempts must be at most 10'),
  retryDelay: z.number().min(100, 'Retry delay must be at least 100ms').max(10000, 'Retry delay must be at most 10000ms'),
});

export const AuthConfigSchema = z.object({
  enabled: z.boolean(),
  sessionTimeout: z.number().min(300, 'Session timeout must be at least 300 seconds').max(86400, 'Session timeout must be at most 86400 seconds'),
  tokenRefreshThreshold: z.number().min(60, 'Token refresh threshold must be at least 60 seconds').max(3600, 'Token refresh threshold must be at most 3600 seconds'),
  maxFailedAttempts: z.number().min(1, 'Max failed attempts must be at least 1').max(10, 'Max failed attempts must be at most 10'),
  lockoutDuration: z.number().min(300, 'Lockout duration must be at least 300 seconds').max(3600, 'Lockout duration must be at most 3600 seconds'),
});

export const ServerConfigSchema = z.object({
  port: z.number().min(1, 'Port must be at least 1').max(65535, 'Port must be at most 65535'),
  host: z.string().min(1, 'Host must not be empty'),
  maxConnections: z.number().min(1, 'Max connections must be at least 1').max(1000, 'Max connections must be at most 1000'),
  requestTimeout: z.number().min(1000, 'Request timeout must be at least 1000ms').max(60000, 'Request timeout must be at most 60000ms'),
  cors: z.object({
    enabled: z.boolean(),
    origins: z.array(z.string()).optional(),
    methods: z.array(z.string()).optional(),
    headers: z.array(z.string()).optional(),
  }),
});

export const LoggingConfigSchema = z.object({
  level: z.enum(['debug', 'info', 'warn', 'error'], {
    errorMap: () => ({ message: 'Log level must be debug, info, warn, or error' })
  }),
  destination: z.enum(['console', 'file', 'syslog'], {
    errorMap: () => ({ message: 'Log destination must be console, file, or syslog' })
  }),
  filePath: z.string().optional(),
  maxFileSize: z.number().min(1024, 'Max file size must be at least 1024 bytes').max(104857600, 'Max file size must be at most 100MB').optional(),
  maxFiles: z.number().min(1, 'Max files must be at least 1').max(100, 'Max files must be at most 100').optional(),
  format: z.enum(['json', 'text'], {
    errorMap: () => ({ message: 'Log format must be json or text' })
  }),
});

export const MailcowConfigSchema = z.object({
  api: APIConfigSchema,
  auth: AuthConfigSchema,
  server: ServerConfigSchema,
  logging: LoggingConfigSchema,
});

/**
 * Validate configuration using Zod schemas
 */
export function validateConfig(config: unknown): ConfigValidationResult {
  try {
    MailcowConfigSchema.parse(config);
    return {
      success: true,
      errors: [],
      warnings: [],
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        errors: error.errors.map(err => ({
          path: err.path.join('.'),
          message: err.message,
          code: err.code,
        })),
        warnings: [],
      };
    }
    
    return {
      success: false,
      errors: [{
        path: 'unknown',
        message: 'Unknown validation error',
        code: 'unknown',
      }],
      warnings: [],
    };
  }
}

/**
 * Validate specific configuration section
 */
export function validateAPIConfig(config: unknown): ConfigValidationResult {
  try {
    APIConfigSchema.parse(config);
    return {
      success: true,
      errors: [],
      warnings: [],
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        errors: error.errors.map(err => ({
          path: err.path.join('.'),
          message: err.message,
          code: err.code,
        })),
        warnings: [],
      };
    }
    
    return {
      success: false,
      errors: [{
        path: 'unknown',
        message: 'Unknown validation error',
        code: 'unknown',
      }],
      warnings: [],
    };
  }
} 