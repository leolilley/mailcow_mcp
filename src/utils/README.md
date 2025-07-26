# Utils Directory

This directory contains utility functions and helpers used throughout the Mailcow MCP server.

## File Structure

```
utils/
├── index.ts              # Main utility exports
├── logger.ts             # Logging utilities and MockLogger
├── http.ts               # HTTP client utilities  
├── validation.ts         # Input validation utilities
├── security.ts           # Security and sanitization utilities
├── crypto.ts             # Cryptographic utilities
├── string.ts             # String manipulation utilities
├── error.ts              # Error handling utilities
└── mocks.ts              # Mock implementations for testing
```

## Implementation Overview

### 1. `index.ts` - Main Exports
- Exports all utility functions from submodules
- Provides single entry point for utilities
- Clean module organization

### 2. `logger.ts` - Logging System
- Structured logging with multiple destinations
- Console and file log destinations  
- Log entry formatting and management
- MockLogger for testing scenarios

**Key Features:**
- Multiple log destinations (console, file)
- Structured LogEntry format with timestamps
- MockLogger for unit testing
- Type-safe logging interfaces

### 3. `http.ts` - HTTP Utilities
- HTTP client creation and configuration
- URL building with parameter handling
- Response validation utilities
- Axios integration helpers

**Key Features:**
```typescript
// HTTP client creation
createHTTPClient(config): AxiosInstance

// URL building with params
buildURL(baseURL, path, params?): string

// Response validation
validateResponse(response): void
```

### 4. `validation.ts` - Input Validation
- Email address validation using validator library
- Domain name validation (FQDN)
- API key format validation
- Schema-based validation with Zod

**Key Features:**
```typescript
// Email validation
validateEmail(email: string): boolean

// Domain validation  
validateDomain(domain: string): boolean

// API key validation
validateAPIKey(apiKey: string): boolean

// Schema validation
validateWithSchema<T>(data: unknown, schema: ZodSchema<T>)
```

### 5. `security.ts` - Security Utilities
- Input sanitization using XSS library
- Secure token generation
- API key generation
- String sanitization for security

**Key Features:**
```typescript
// XSS protection
sanitizeString(input: string): string

// Secure token generation
generateSecureToken(length?: number): string

// API key generation
generateAPIKey(): string
```

### 6. `crypto.ts` - Cryptographic Functions
- Hashing functions (SHA-256, SHA-1, MD5)
- Password hashing utilities
- Certificate validation
- Secure random token generation

**Key Features:**
```typescript
// Hashing with multiple algorithms
hash(data: string, algorithm?: string): Promise<string>

// Password hashing
passwordHash(password: string): Promise<string>

// Certificate validation
validateCertificate(cert: string): boolean

// Cryptographically secure tokens
generateToken(length?: number): string
```

### 7. `string.ts` - String Utilities
- String validation and type checking
- Length validation
- Byte formatting (custom implementation)
- String truncation with ellipsis

**Key Features:**
```typescript
// Type-safe string checking
isNonEmptyString(value: unknown): value is string

// Length validation
isValidLength(value: string, min: number, max: number): boolean

// Byte formatting
formatBytes(bytes: number): string

// String truncation
truncateString(str: string, maxLength: number): string
```

### 8. `error.ts` - Error Handling
- Error formatting and display
- Error categorization by type
- Error stack trace handling
- Async error handling wrapper

**Key Features:**
```typescript
// Error formatting
formatError(error: Error): string

// Error categorization
categorizeError(error: Error): string

// Error wrapper for async operations
withErrorHandling<T>(operation: () => Promise<T>, errorHandler: (error: Error) => void): Promise<T | null>
```

### 9. `mocks.ts` - Testing Utilities
- MockLogger for unit testing
- Structured log entry simulation
- Test-friendly implementations
- Debugging utilities

**Key Features:**
```typescript
// Mock logger for tests
class MockLogger {
  log(level: LogLevel, message: string, context?: Record<string, unknown>): void
  getLogs(): LogEntry[]
  clear(): void
}
```

## Integration with Other Modules

### API Integration
```typescript
// HTTP utilities used in API client
import { createHTTPClient, buildURL, validateResponse } from '../utils/http';

// Security used for API key validation
import { validateAPIKey } from '../utils/validation';
```

### Authentication Integration
```typescript
// Security utilities for auth
import { generateSecureToken, sanitizeString } from '../utils/security';

// Crypto for secure operations
import { hash, passwordHash } from '../utils/crypto';
```

### Configuration Integration
```typescript
// Validation for config
import { validateEmail, validateDomain, validateWithSchema } from '../utils/validation';

// Error handling for config loading
import { withErrorHandling, formatError } from '../utils/error';
```

## Testing Support

All utilities are thoroughly tested with individual test files:
- `tests/unit/utils/logger.test.ts`
- `tests/unit/utils/validation.test.ts`
- `tests/unit/utils/string.test.ts`
- `tests/unit/utils/error.test.ts`
- `tests/unit/utils/http.test.ts`
- `tests/unit/utils/security.test.ts`
- `tests/unit/utils/crypto.test.ts`
- `tests/unit/utils/mocks.test.ts`

## Design Principles

1. **Single Responsibility**: Each utility module has a focused purpose
2. **Type Safety**: Full TypeScript support with proper type definitions
3. **Testing**: Comprehensive test coverage with mocks where needed
4. **Security**: Safe defaults and input validation throughout
5. **Performance**: Efficient implementations with minimal dependencies
6. **Consistency**: Uniform error handling and return patterns 