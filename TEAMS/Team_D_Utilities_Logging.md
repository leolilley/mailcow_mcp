# Team D: Utilities and Logging

## 🎯 Mission
You are Team D, responsible for implementing the utility functions and logging system for the Mailcow MCP server. Your work provides essential helper functions and structured logging that all other teams depend on.

## 📋 Your Responsibilities

### Core Files to Implement:
- `src/utils/index.ts` - Main utility exports
- `src/utils/logger.ts` - Logging utilities
- `src/utils/http.ts` - HTTP client utilities
- `src/utils/validation.ts` - Validation utilities
- `src/utils/security.ts` - Security utilities
- `src/utils/crypto.ts` - Cryptographic utilities
- `src/utils/string.ts` - String manipulation utilities
- `src/utils/date.ts` - Date/time utilities
- `src/utils/error.ts` - Error handling utilities
> **IMPORTANT:** All type definitions must be imported from `src/types/index.ts`. Do **not** create new type files in the `src/utils/` folder. If you need a new type, add it to the appropriate file in `src/types/` and export it via `src/types/index.ts`.

## 📚 Required Reading
1. **Read `src/utils/README.md`** - Complete implementation guidelines for utilities
2. **Read `src/types/README.md`** - Type definitions you'll use
3. **Read `PLAN.md`** - Overall project plan and utility requirements
4. **Read `IMPLEMENTATION_GUIDE.md`** - Your team assignment details

## 🎯 Key Deliverables

### 1. Logging System
- Structured JSON logging
- Multiple log levels (DEBUG, INFO, WARN, ERROR)
- Multiple log destinations (console, file)
- Performance logging
- Error logging with stack traces

### 2. HTTP Utilities
- HTTP client configuration helpers
- Request/response helpers
- URL building utilities
- HTTP error handling

### 3. Validation Utilities
- Input validation functions
- Schema validation helpers
- Type checking utilities
- Validation error formatting

### 4. Security Utilities
- Input sanitization
- Security validation
- Secure random generation
- Security audit logging

### 5. Cryptographic Utilities
- Hash functions
- Token generation
- Password hashing
- Certificate validation

### 6. String and Date Utilities
- String manipulation and validation
- Date formatting and validation
- Timezone handling
- Duration calculations

## 🔗 Dependencies
- **Team A** - You depend on their types and configuration
- **Dependents:** All other teams (B-P) depend on your utilities

## 🚀 Implementation Guidelines

> **Type Usage:** All types must be imported from `src/types/index.ts`. Do not define or use types from `src/utils/types.ts` or any other local type file.

### 1. Logging System
Implement structured logging:

```typescript
// src/utils/logger.ts
export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
  error?: Error;
  requestId?: string;
}

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

export class Logger {
  constructor(
    private config: LoggerConfig,
    private destination: LogDestination
  ) {}

  log(level: LogLevel, message: string, context?: Record<string, unknown>): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
    };

    if (this.shouldLog(level)) {
      this.destination.write(entry);
    }
  }

  debug(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.DEBUG, message, context);
  }

  info(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.INFO, message, context);
  }

  warn(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.WARN, message, context);
  }

  error(message: string, error?: Error, context?: Record<string, unknown>): void {
    this.log(LogLevel.ERROR, message, { ...context, error });
  }
}
```

### 2. Validation Utilities
Implement comprehensive validation:

```typescript
// src/utils/validation.ts
export function validateEmail(email: string): boolean {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email);
}

export function validateDomain(domain: string): boolean {
  const domainRegex = /^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return domainRegex.test(domain);
}

export function validateAPIKey(apiKey: string): boolean {
  return apiKey.length >= 32 && /^[a-zA-Z0-9]+$/.test(apiKey);
}

export function validateWithSchema<T>(
  data: unknown,
  schema: z.ZodSchema<T>
): ValidationResult<T> {
  try {
    const validated = schema.parse(data);
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        errors: error.errors.map(err => ({
          path: err.path.join('.'),
          message: err.message,
        })),
      };
    }
    return {
      success: false,
      errors: [{ path: '', message: 'Validation failed' }],
    };
  }
}
```

### 3. Security Utilities
Implement security helper functions:

```typescript
// src/utils/security.ts
export function sanitizeString(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/[&]/g, '&amp;') // Escape ampersands
    .replace(/["]/g, '&quot;') // Escape quotes
    .replace(/[']/g, '&#x27;') // Escape apostrophes
    .replace(/[/]/g, '&#x2F;'); // Escape forward slashes
}

export function generateSecureToken(length: number = 32): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  const randomValues = new Uint8Array(length);
  crypto.getRandomValues(randomValues);
  
  for (let i = 0; i < length; i++) {
    result += chars[randomValues[i] % chars.length];
  }
  
  return result;
}

export function generateAPIKey(): string {
  return generateSecureToken(64);
}
```

### 4. String Utilities
Implement string manipulation functions:

```typescript
// src/utils/string.ts
export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

export function isValidLength(value: string, min: number, max: number): boolean {
  return value.length >= min && value.length <= max;
}

export function formatBytes(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = bytes;
  let unitIndex = 0;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  return `${size.toFixed(2)} ${units[unitIndex]}`;
}

export function truncateString(str: string, maxLength: number): string {
  if (str.length <= maxLength) {
    return str;
  }
  return str.substring(0, maxLength - 3) + '...';
}
```

### 5. Date Utilities
Implement date/time helper functions:

```typescript
// src/utils/date.ts
export function formatDate(date: Date, format: string = 'ISO'): string {
  switch (format) {
    case 'ISO':
      return date.toISOString();
    case 'RFC2822':
      return date.toUTCString();
    case 'YYYY-MM-DD':
      return date.toISOString().split('T')[0];
    default:
      return date.toISOString();
  }
}

export function parseDate(dateString: string): Date | null {
  const date = new Date(dateString);
  return isNaN(date.getTime()) ? null : date;
}

export function isValidDate(date: unknown): date is Date {
  return date instanceof Date && !isNaN(date.getTime());
}

export function isDateInRange(date: Date, start: Date, end: Date): boolean {
  return date >= start && date <= end;
}
```

### 6. Error Utilities
Implement error handling helpers:

```typescript
// src/utils/error.ts
export function formatError(error: Error): string {
  return `${error.name}: ${error.message}`;
}

export function getErrorStack(error: Error): string {
  return error.stack || 'No stack trace available';
}

export function categorizeError(error: Error): ErrorCategory {
  if (error instanceof NetworkError) {
    return ErrorCategory.NETWORK;
  }
  if (error instanceof ValidationError) {
    return ErrorCategory.VALIDATION;
  }
  if (error instanceof AuthenticationError) {
    return ErrorCategory.AUTHENTICATION;
  }
  return ErrorCategory.UNKNOWN;
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
```

## 🧪 Testing Requirements
- Unit tests for all utility functions
- Unit tests for logging system
- Unit tests for validation functions
- Unit tests for security utilities
- Unit tests for string and date utilities
- Unit tests for error handling

## 📝 Documentation Requirements
- JSDoc comments for all public functions
- Usage examples for complex utilities
- Performance considerations documentation
- Security considerations documentation

## 🔄 Communication with Other Teams
- Provide clear utility interfaces for all teams
- Document logging patterns for other teams
- Share validation patterns with other teams
- Communicate utility changes clearly

## ✅ Success Criteria
- [ ] All utility functions work correctly
- [ ] Logging system is comprehensive and performant
- [ ] Validation functions catch all invalid inputs
- [ ] Security utilities prevent common attacks
- [ ] All tests pass
- [ ] Documentation is complete
- [ ] Other teams can use your utilities without issues

## 🚨 Important Considerations

### 1. Performance
- Optimize utility functions for performance
- Implement efficient logging
- Cache expensive operations
- Monitor utility performance

### 2. Security
- Sanitize all inputs
- Validate all parameters
- Use secure random generation
- Log security events

### 3. Error Handling
- Provide meaningful error messages
- Handle edge cases gracefully
- Log errors appropriately
- Don't expose sensitive information

### 4. Usability
- Provide clear function signatures
- Include comprehensive documentation
- Add usage examples
- Make utilities easy to use

## 🔧 Mock Implementations for Testing
Create mock implementations for other teams to use:

```typescript
// src/utils/mocks.ts
export class MockLogger {
  private logs: LogEntry[] = [];
  
  log(level: LogLevel, message: string, context?: Record<string, unknown>): void {
    this.logs.push({ timestamp: new Date().toISOString(), level, message, context });
  }
  
  getLogs(): LogEntry[] {
    return this.logs;
  }
  
  clear(): void {
    this.logs = [];
  }
}
```

## 📞 Team Communication
- Provide clear utility interfaces for all teams
- Document logging patterns for other teams
- Share validation patterns with other teams
- Communicate utility changes clearly

## 🎯 Next Steps
1. Read the README files thoroughly
2. Implement the logging system
3. Implement validation utilities
4. Implement security utilities
5. Implement string and date utilities
6. Implement error handling utilities
7. Write comprehensive tests
8. Update documentation
9. Share utilities with other teams

**Remember:** Your utilities are used by all other teams. Focus on reliability, performance, and clear interfaces that are easy to use. 