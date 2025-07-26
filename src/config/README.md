# Configuration Directory

This directory handles all configuration management for the Mailcow MCP server.

## File Structure

```
config/
├── index.ts              # Main configuration exports
├── config.ts             # Core configuration management class
├── validation.ts         # Configuration validation schemas (Zod)
├── defaults.ts           # Default configuration values
└── environment.ts        # Environment variable handling
```

**Note:** Configuration types are defined in `src/types/config.ts` for better organization.

## Implementation Overview

### 1. `index.ts`
- Exports the main ConfigManager class
- Exports configuration validation functions
- Exports default configuration values
- Exports environment loading utilities

### 2. `config.ts` - ConfigManager Class
- Main configuration management class
- Loads configuration from multiple sources
- Merges configurations with proper precedence
- Validates configuration on load
- Provides configuration access methods

**Key Features:**
- Environment variable loading
- Configuration validation using Zod schemas
- Source tracking and priority handling
- Type-safe configuration access

### 3. `validation.ts` - Zod Schemas
- Comprehensive Zod schemas for all configuration sections
- Type-safe validation with detailed error messages
- Schema composition for complex validation
- Environment-specific validation rules

**Validation Schemas:**
- `MailcowConfigSchema` - Complete configuration validation
- `APIConfigSchema` - API connection and authentication
- `AuthConfigSchema` - Authentication and session settings  
- `ServerConfigSchema` - MCP server configuration
- `LoggingConfigSchema` - Logging configuration

### 4. `defaults.ts` - Default Values
- Environment-specific default configurations
- Secure defaults for all configuration options
- Development, production, and test configurations
- Minimal configuration templates

**Default Configurations:**
```typescript
export const DEVELOPMENT_DEFAULTS: Partial<MailcowConfig>;
export const PRODUCTION_DEFAULTS: Partial<MailcowConfig>;
export const TEST_DEFAULTS: Partial<MailcowConfig>;
```

### 5. `environment.ts` - Environment Variables
- Environment variable loading and parsing
- Type conversion and validation
- Environment-specific configuration mapping
- Secure handling of sensitive values

**Supported Environment Variables:**
- `MAILCOW_API_URL` - Mailcow server URL
- `MAILCOW_API_KEY` - API key for authentication  
- `MAILCOW_ACCESS_TYPE` - read-only or read-write
- `MAILCOW_VERIFY_SSL` - SSL certificate verification
- `MAILCOW_TIMEOUT` - Request timeout in milliseconds
- `MCP_SERVER_PORT` - MCP server port
- `MCP_SERVER_HOST` - MCP server host
- `LOG_LEVEL` - Logging level (debug, info, warn, error)

## Configuration Loading Process

### Source Priority (highest to lowest)
1. **Environment Variables** - Runtime configuration
2. **Default Values** - Fallback configuration

### Loading Workflow
```typescript
const configManager = new ConfigManager();
const result = await configManager.loadConfig();

if (result.success) {
  const config = configManager.getConfig();
  // Use validated configuration
} else {
  console.error('Configuration validation failed:', result.errors);
}
```

## Configuration Structure

```typescript
interface MailcowConfig {
  api: {
    url: string;                    // Mailcow API base URL
    key: string;                    // API authentication key
    accessType: 'read-only' | 'read-write';
    timeout: number;                // Request timeout (ms)
    verifySSL: boolean;            // SSL verification
    retryAttempts: number;         // Request retry attempts
    rateLimit: {
      requestsPerMinute: number;   // Rate limiting
      burstSize: number;           // Burst capacity
      retryAfterSeconds: number;   // Retry delay
    };
  };
  auth: {
    enabled: boolean;              // Enable authentication
    sessionTimeout: number;        // Session duration (ms)
    tokenRefreshThreshold: number; // Token refresh timing
    maxSessions: number;           // Max concurrent sessions
    security: {
      requireHTTPS: boolean;       // HTTPS requirement
      allowedOrigins: string[];    // CORS origins
      maxRequestSize: number;      // Request size limit
      rateLimitEnabled: boolean;   // Rate limiting
      auditLogging: boolean;       // Audit logging
    };
  };
  server: {
    host: string;                  // Server bind address
    port: number;                  // Server port
    capabilities: {
      tools: boolean;              // Enable tools capability
      resources: boolean;          // Enable resources capability
      prompts: boolean;            // Enable prompts capability
    };
  };
  logging: {
    level: 'debug' | 'info' | 'warn' | 'error';
    format: 'json' | 'text';
    destination: 'console' | 'file' | 'both';
    filePath?: string;             // Log file path
  };
}
```

## Usage Examples

### Basic Configuration Loading
```typescript
import { ConfigManager } from './config';

const configManager = new ConfigManager();
const result = await configManager.loadConfig();

if (result.success) {
  const config = configManager.getConfig();
  console.log('API URL:', config.api.url);
} else {
  console.error('Config errors:', result.errors);
}
```

### Environment Variable Usage
```bash
# Development environment
export MAILCOW_API_URL="https://mail.example.com"
export MAILCOW_API_KEY="your-api-key-here" 
export MAILCOW_ACCESS_TYPE="read-write"
export LOG_LEVEL="debug"

# Start the server
npm start
```

### Configuration Validation
```typescript
import { validateConfig } from './config';

const validationResult = validateConfig(rawConfig);
if (!validationResult.success) {
  validationResult.errors.forEach(error => {
    console.error(`${error.path}: ${error.message}`);
  });
}
```

## Security Considerations

1. **Sensitive Data**: API keys loaded from environment variables only
2. **Validation**: All configuration validated before use
3. **Defaults**: Secure defaults for all options
4. **Logging**: No sensitive data logged
5. **Type Safety**: TypeScript ensures configuration structure

## Error Handling

- Detailed validation error messages with suggestions
- Missing required configuration detection
- Type mismatch identification
- Security validation (HTTPS requirements, etc.)
- Helpful error context and resolution hints 