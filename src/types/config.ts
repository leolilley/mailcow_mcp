/**
 * Configuration Types
 * Defines the structure for Mailcow MCP server configuration
 */

// Main Configuration Interface
export interface MailcowConfig {
  api: APIConfig;
  auth: AuthConfig;
  server: ServerConfig;
  logging: LoggingConfig;
}

// API Configuration
export interface APIConfig {
  url: string;
  key: string;
  accessType: 'read-only' | 'read-write';
  timeout: number;
  verifySSL: boolean;
  retryAttempts: number;
  rateLimit: ConfigRateLimitConfig;
}

export interface ConfigRateLimitConfig {
  requestsPerMinute: number;
  burstSize: number;
  retryAfterSeconds: number;
}

// Authentication Configuration
export interface AuthConfig {
  enabled: boolean;
  sessionTimeout: number;
  tokenRefreshThreshold: number;
  maxSessions: number;
  security: ConfigSecurityConfig;
}

export interface ConfigSecurityConfig {
  requireHTTPS: boolean;
  allowedOrigins: string[];
  maxRequestSize: number;
  rateLimitEnabled: boolean;
  auditLogging: boolean;
}

// Server Configuration
export interface ServerConfig {
  host: string;
  port: number;
  capabilities: ServerCapabilities;
  maxConnections: number;
  keepAliveTimeout: number;
  requestTimeout: number;
}

export interface ServerCapabilities {
  tools: boolean;
  resources: boolean;
  prompts: boolean;
  customCapabilities?: Record<string, unknown>;
}

// Logging Configuration
export interface LoggingConfig {
  level: ConfigLogLevel;
  format: LogFormat;
  destination: LogDestination;
  filePath?: string;
  maxFileSize: number;
  maxFiles: number;
  includeTimestamp: boolean;
  includeRequestId: boolean;
}

export type ConfigLogLevel = 'debug' | 'info' | 'warn' | 'error';
export type LogFormat = 'json' | 'text';
export type LogDestination = 'console' | 'file' | 'both';

// Environment Configuration
export interface EnvironmentConfig {
  nodeEnv: 'development' | 'production' | 'test';
  configPath?: string;
  secretsPath?: string;
  tempPath?: string;
}

// Configuration Validation
export interface ConfigValidationResult {
  success: boolean;
  errors: ConfigValidationError[];
  warnings: ConfigValidationWarning[];
}

export interface ConfigValidationError {
  path: string;
  message: string;
  code: string;
  value?: unknown;
}

export interface ConfigValidationWarning {
  path: string;
  message: string;
  suggestion?: string;
}

// Configuration Loading
export interface ConfigLoadOptions {
  configFile?: string;
  validate?: boolean;
  environment?: string;
  secretsFile?: string;
}

export interface ConfigLoadResult {
  config: MailcowConfig;
  validation: ConfigValidationResult;
  sources: string[];
}

// Default Configuration
export interface DefaultConfig {
  development: Partial<MailcowConfig>;
  production: Partial<MailcowConfig>;
  test: Partial<MailcowConfig>;
}

// Environment Variable Mapping
export interface EnvironmentVariableMapping {
  MAILCOW_API_URL: string;
  MAILCOW_API_KEY: string;
  MAILCOW_API_ACCESS_TYPE: 'read-only' | 'read-write';
  MAILCOW_VERIFY_SSL: string;
  MAILCOW_TIMEOUT: string;
  MCP_SERVER_PORT: string;
  MCP_SERVER_HOST: string;
  LOG_LEVEL: string;
  NODE_ENV: string;
}

// Type Guards
export function isMailcowConfig(obj: unknown): obj is MailcowConfig {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'api' in obj &&
    'auth' in obj &&
    'server' in obj &&
    'logging' in obj
  );
}

export function isAPIConfig(obj: unknown): obj is APIConfig {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'url' in obj &&
    'key' in obj &&
    'accessType' in obj &&
    'timeout' in obj &&
    typeof obj.url === 'string' &&
    typeof obj.key === 'string' &&
    (obj.accessType === 'read-only' || obj.accessType === 'read-write') &&
    typeof obj.timeout === 'number'
  );
}

export function isAuthConfig(obj: unknown): obj is AuthConfig {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'enabled' in obj &&
    'sessionTimeout' in obj &&
    'tokenRefreshThreshold' in obj &&
    typeof obj.enabled === 'boolean' &&
    typeof obj.sessionTimeout === 'number' &&
    typeof obj.tokenRefreshThreshold === 'number'
  );
}

export function isServerConfig(obj: unknown): obj is ServerConfig {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'host' in obj &&
    'port' in obj &&
    'capabilities' in obj &&
    typeof obj.host === 'string' &&
    typeof obj.port === 'number'
  );
}

export function isLoggingConfig(obj: unknown): obj is LoggingConfig {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'level' in obj &&
    'format' in obj &&
    'destination' in obj &&
    typeof obj.level === 'string' &&
    typeof obj.format === 'string' &&
    typeof obj.destination === 'string'
  );
}

export function isValidLogLevel(level: string): level is ConfigLogLevel {
  return ['debug', 'info', 'warn', 'error'].includes(level);
}

export function isValidLogFormat(format: string): format is LogFormat {
  return ['json', 'text'].includes(format);
}

export function isValidLogDestination(destination: string): destination is LogDestination {
  return ['console', 'file', 'both'].includes(destination);
}

export function isValidAccessType(accessType: string): accessType is 'read-only' | 'read-write' {
  return accessType === 'read-only' || accessType === 'read-write';
}

// Configuration source and loading types (consolidated from src/config/types.ts)
export interface ConfigSource {
  type: 'environment' | 'file' | 'command-line' | 'default';
  config: Partial<MailcowConfig>;
  timestamp?: Date;
  priority: number;
}

export interface ConfigReloadOptions {
  validate?: boolean;
  clearCache?: boolean;
  notifyListeners?: boolean;
}

export interface ConfigChangeListener {
  (oldConfig: MailcowConfig, newConfig: MailcowConfig): void;
}

export interface ConfigWatcherOptions {
  watchFiles?: boolean;
  watchEnvironment?: boolean;
  debounceMs?: number;
  maxRetries?: number;
}

export interface ConfigError {
  path: string;
  message: string;
  code: string;
  source?: string;
  value?: unknown;
  suggestion?: string;
}

export interface ConfigWarning {
  path: string;
  message: string;
  suggestion?: string;
  severity: 'low' | 'medium' | 'high';
}

export interface ConfigValidationContext {
  environment: string;
  strict: boolean;
  allowMissing?: boolean;
}

export type ConfigMergeStrategy = 'replace' | 'merge' | 'deep-merge';
export type ConfigValidationMode = 'strict' | 'lenient' | 'warn-only';

export const CONFIG_SOURCE_PRIORITY = {
  COMMAND_LINE: 100,
  ENVIRONMENT: 80,
  CONFIG_FILE: 60,
  SECRETS_FILE: 50,
  DEFAULT: 0,
} as const; 