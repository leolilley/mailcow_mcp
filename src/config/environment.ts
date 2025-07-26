import { MailcowConfig, EnvironmentVariableMapping } from '../types';

/**
 * Load configuration from environment variables
 */
export function loadEnvironmentConfig(): Partial<MailcowConfig> {
  const config: Partial<MailcowConfig> = {};

  // API Configuration
  const api: Partial<MailcowConfig['api']> = {};
  if (process.env.MAILCOW_API_URL) api.url = process.env.MAILCOW_API_URL;
  if (process.env.MAILCOW_API_KEY) api.key = process.env.MAILCOW_API_KEY;
  if (process.env.MAILCOW_API_ACCESS_TYPE) {
    const accessType = process.env.MAILCOW_API_ACCESS_TYPE as 'read-only' | 'read-write';
    if (accessType === 'read-only' || accessType === 'read-write') api.accessType = accessType;
  }
  if (process.env.MAILCOW_TIMEOUT) {
    const timeout = parseInt(process.env.MAILCOW_TIMEOUT, 10);
    if (!isNaN(timeout)) api.timeout = timeout;
  }
  if (process.env.MAILCOW_VERIFY_SSL) api.verifySSL = process.env.MAILCOW_VERIFY_SSL.toLowerCase() === 'true';
  if (Object.keys(api).length > 0) config.api = api as MailcowConfig['api'];

  // Server Configuration
  const server: Partial<MailcowConfig['server']> = {};
  if (process.env.MCP_SERVER_HOST) server.host = process.env.MCP_SERVER_HOST;
  if (process.env.MCP_SERVER_PORT) {
    const port = parseInt(process.env.MCP_SERVER_PORT, 10);
    if (!isNaN(port)) server.port = port;
  }
  if (Object.keys(server).length > 0) config.server = server as MailcowConfig['server'];

  // Logging Configuration
  const logging: Partial<MailcowConfig['logging']> = {};
  if (process.env.LOG_LEVEL) {
    const level = process.env.LOG_LEVEL as 'debug' | 'info' | 'warn' | 'error';
    if (['debug', 'info', 'warn', 'error'].includes(level)) logging.level = level;
  }
  if (process.env.LOG_FORMAT) {
    const format = process.env.LOG_FORMAT as 'json' | 'text';
    if (format === 'json' || format === 'text') logging.format = format;
  }
  if (process.env.LOG_DESTINATION) {
    const destination = process.env.LOG_DESTINATION as 'console' | 'file' | 'both';
    if (['console', 'file', 'both'].includes(destination)) logging.destination = destination;
  }
  if (process.env.LOG_FILE_PATH) logging.filePath = process.env.LOG_FILE_PATH;
  if (Object.keys(logging).length > 0) config.logging = logging as MailcowConfig['logging'];

  return config;
}

/**
 * Get environment variable mapping for documentation
 */
export function getEnvironmentVariableMapping(): EnvironmentVariableMapping {
  return {
    MAILCOW_API_URL: 'https://mailcow.example.com',
    MAILCOW_API_KEY: 'your-api-key-here',
    MAILCOW_API_ACCESS_TYPE: 'read-only',
    MAILCOW_VERIFY_SSL: 'true',
    MAILCOW_TIMEOUT: '5000',
    MCP_SERVER_PORT: '3000',
    MCP_SERVER_HOST: 'localhost',
    LOG_LEVEL: 'info',
    NODE_ENV: 'production',
  };
}

/**
 * Validate environment variables
 */
export function validateEnvironmentVariables(): string[] {
  const errors: string[] = [];
  const required = ['MAILCOW_API_URL', 'MAILCOW_API_KEY'];

  for (const varName of required) {
    if (!process.env[varName]) {
      errors.push(`Missing required environment variable: ${varName}`);
    }
  }

  // Validate API URL format
  if (process.env.MAILCOW_API_URL) {
    try {
      new URL(process.env.MAILCOW_API_URL);
    } catch {
      errors.push('MAILCOW_API_URL must be a valid URL');
    }
  }

  // Validate port number
  if (process.env.MCP_SERVER_PORT) {
    const port = parseInt(process.env.MCP_SERVER_PORT, 10);
    if (isNaN(port) || port < 1 || port > 65535) {
      errors.push('MCP_SERVER_PORT must be a valid port number (1-65535)');
    }
  }

  // Validate timeout
  if (process.env.MAILCOW_TIMEOUT) {
    const timeout = parseInt(process.env.MAILCOW_TIMEOUT, 10);
    if (isNaN(timeout) || timeout < 1000 || timeout > 60000) {
      errors.push('MAILCOW_TIMEOUT must be between 1000 and 60000 milliseconds');
    }
  }

  return errors;
}

/**
 * Get current environment
 */
export function getCurrentEnvironment(): 'development' | 'production' | 'test' {
  const env = process.env.NODE_ENV?.toLowerCase();
  
  switch (env) {
    case 'production':
      return 'production';
    case 'test':
      return 'test';
    default:
      return 'development';
  }
} 