import { MailcowConfig, DefaultConfig } from '../types';

/**
 * Default configuration values for different environments
 */
export const defaultConfig: DefaultConfig = {
  development: {
    api: {
      url: 'http://localhost:8080',
      key: 'development-api-key',
      accessType: 'read-write',
      timeout: 5000,
      verifySSL: false,
      retryAttempts: 3,
      rateLimit: {
        requestsPerMinute: 60,
        burstSize: 10,
        retryAfterSeconds: 60,
      },
    },
    auth: {
      enabled: true,
      sessionTimeout: 3600,
      tokenRefreshThreshold: 300,
      maxSessions: 10,
      security: {
        requireHTTPS: false,
        allowedOrigins: ['http://localhost:3000'],
        maxRequestSize: 1048576, // 1MB
        rateLimitEnabled: true,
        auditLogging: true,
      },
    },
    server: {
      host: 'localhost',
      port: 3000,
      capabilities: {
        tools: true,
        resources: true,
        prompts: false,
      },
      maxConnections: 100,
      keepAliveTimeout: 30000,
      requestTimeout: 30000,
    },
    logging: {
      level: 'debug',
      format: 'text',
      destination: 'console',
      maxFileSize: 10485760, // 10MB
      maxFiles: 5,
      includeTimestamp: true,
      includeRequestId: true,
    },
  },
  production: {
    api: {
      url: 'https://mailcow.example.com',
      key: '', // Must be set via environment
      accessType: 'read-only',
      timeout: 10000,
      verifySSL: true,
      retryAttempts: 5,
      rateLimit: {
        requestsPerMinute: 30,
        burstSize: 5,
        retryAfterSeconds: 120,
      },
    },
    auth: {
      enabled: true,
      sessionTimeout: 1800,
      tokenRefreshThreshold: 300,
      maxSessions: 50,
      security: {
        requireHTTPS: true,
        allowedOrigins: [],
        maxRequestSize: 5242880, // 5MB
        rateLimitEnabled: true,
        auditLogging: true,
      },
    },
    server: {
      host: '0.0.0.0',
      port: 3000,
      capabilities: {
        tools: true,
        resources: true,
        prompts: false,
      },
      maxConnections: 500,
      keepAliveTimeout: 60000,
      requestTimeout: 60000,
    },
    logging: {
      level: 'info',
      format: 'json',
      destination: 'file',
      filePath: '/var/log/mailcow-mcp.log',
      maxFileSize: 52428800, // 50MB
      maxFiles: 10,
      includeTimestamp: true,
      includeRequestId: true,
    },
  },
  test: {
    api: {
      url: 'http://localhost:8080',
      key: 'test-api-key',
      accessType: 'read-write',
      timeout: 1000,
      verifySSL: false,
      retryAttempts: 1,
      rateLimit: {
        requestsPerMinute: 1000,
        burstSize: 100,
        retryAfterSeconds: 1,
      },
    },
    auth: {
      enabled: false,
      sessionTimeout: 300,
      tokenRefreshThreshold: 60,
      maxSessions: 1,
      security: {
        requireHTTPS: false,
        allowedOrigins: ['http://localhost:3000'],
        maxRequestSize: 102400, // 100KB
        rateLimitEnabled: false,
        auditLogging: false,
      },
    },
    server: {
      host: 'localhost',
      port: 0, // Random port
      capabilities: {
        tools: true,
        resources: true,
        prompts: false,
      },
      maxConnections: 10,
      keepAliveTimeout: 5000,
      requestTimeout: 5000,
    },
    logging: {
      level: 'error',
      format: 'text',
      destination: 'console',
      maxFileSize: 1048576, // 1MB
      maxFiles: 1,
      includeTimestamp: false,
      includeRequestId: false,
    },
  },
};

/**
 * Get default configuration for a specific environment
 */
export function getDefaultConfig(environment: 'development' | 'production' | 'test' = 'development'): MailcowConfig {
  const envConfig = defaultConfig[environment];
  
  // Merge with development defaults for missing values
  const mergedConfig = {
    ...defaultConfig.development,
    ...envConfig,
    api: {
      ...((defaultConfig.development.api ?? {})),
      ...((envConfig.api ?? {})),
    },
    auth: {
      ...((defaultConfig.development.auth ?? {})),
      ...((envConfig.auth ?? {})),
      security: {
        ...((defaultConfig.development.auth?.security ?? {})),
        ...((envConfig.auth?.security ?? {})),
      },
    },
    server: {
      ...((defaultConfig.development.server ?? {})),
      ...((envConfig.server ?? {})),
      capabilities: {
        ...((defaultConfig.development.server?.capabilities ?? {})),
        ...((envConfig.server?.capabilities ?? {})),
      },
    },
    logging: {
      ...((defaultConfig.development.logging ?? {})),
      ...((envConfig.logging ?? {})),
    },
  };

  return mergedConfig as MailcowConfig;
}

/**
 * Get minimal configuration template
 */
export function getMinimalConfig(): Partial<MailcowConfig> {
  return {
    api: {
      url: 'https://mailcow.example.com',
      key: 'your-api-key-here',
      accessType: 'read-only',
      timeout: 5000,
      verifySSL: true,
      retryAttempts: 3,
      rateLimit: {
        requestsPerMinute: 30,
        burstSize: 5,
        retryAfterSeconds: 60,
      },
    },
    server: {
      host: 'localhost',
      port: 3000,
      capabilities: {
        tools: true,
        resources: true,
        prompts: false,
      },
      maxConnections: 100,
      keepAliveTimeout: 30000,
      requestTimeout: 30000,
    },
  };
} 