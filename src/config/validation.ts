import { z } from 'zod';
import { ConfigValidationResult } from '../types';

// Zod schemas for configuration validation
export const RateLimitConfigSchema = z.object({
  requestsPerMinute: z.number().min(1, 'Requests per minute must be at least 1'),
  burstSize: z.number().min(1, 'Burst size must be at least 1'),
  retryAfterSeconds: z.number().min(1, 'Retry after seconds must be at least 1'),
});

export const APIConfigSchema = z.object({
  url: z.string().url('Invalid API URL'),
  key: z.string().min(1, 'API key is required'),
  accessType: z.enum(['read-only', 'read-write'], {
    errorMap: () => ({ message: 'Access type must be read-only or read-write' })
  }),
  timeout: z.number().min(1000, 'Timeout must be at least 1000ms').max(60000, 'Timeout must be at most 60000ms'),
  verifySSL: z.boolean(),
  retryAttempts: z.number().min(0, 'Retry attempts must be non-negative').max(10, 'Retry attempts must be at most 10'),
  rateLimit: RateLimitConfigSchema,
});

export const SecurityConfigSchema = z.object({
  requireHTTPS: z.boolean(),
  allowedOrigins: z.array(z.string()),
  maxRequestSize: z.number().min(1024, 'Max request size must be at least 1024 bytes'),
  rateLimitEnabled: z.boolean(),
  auditLogging: z.boolean(),
});

export const AuthConfigSchema = z.object({
  enabled: z.boolean(),
  sessionTimeout: z.number().min(300, 'Session timeout must be at least 300 seconds').max(86400, 'Session timeout must be at most 86400 seconds'),
  tokenRefreshThreshold: z.number().min(60, 'Token refresh threshold must be at least 60 seconds').max(3600, 'Token refresh threshold must be at most 3600 seconds'),
  maxSessions: z.number().min(1, 'Max sessions must be at least 1').max(1000, 'Max sessions must be at most 1000'),
  security: SecurityConfigSchema,
});

export const CapabilitiesConfigSchema = z.object({
  tools: z.boolean(),
  resources: z.boolean(),
  prompts: z.boolean(),
});

export const ServerConfigSchema = z.object({
  host: z.string().min(1, 'Host must not be empty'),
  port: z.number().min(0, 'Port must be at least 0').max(65535, 'Port must be at most 65535'),
  capabilities: CapabilitiesConfigSchema,
  maxConnections: z.number().min(1, 'Max connections must be at least 1').max(1000, 'Max connections must be at most 1000'),
  keepAliveTimeout: z.number().min(1000, 'Keep alive timeout must be at least 1000ms'),
  requestTimeout: z.number().min(1000, 'Request timeout must be at least 1000ms').max(60000, 'Request timeout must be at most 60000ms'),
});

export const LoggingConfigSchema = z.object({
  level: z.enum(['debug', 'info', 'warn', 'error'], {
    errorMap: () => ({ message: 'Log level must be debug, info, warn, or error' })
  }),
  format: z.enum(['json', 'text'], {
    errorMap: () => ({ message: 'Log format must be json or text' })
  }),
  destination: z.enum(['console', 'file', 'syslog'], {
    errorMap: () => ({ message: 'Log destination must be console, file, or syslog' })
  }),
  filePath: z.string().optional(),
  maxFileSize: z.number().min(1024, 'Max file size must be at least 1024 bytes').max(104857600, 'Max file size must be at most 100MB'),
  maxFiles: z.number().min(1, 'Max files must be at least 1').max(100, 'Max files must be at most 100'),
  includeTimestamp: z.boolean(),
  includeRequestId: z.boolean(),
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