# Authentication Directory

This directory handles all authentication and authorization for the Mailcow MCP server.

## File Structure

```
auth/
├── index.ts              # Main authentication exports
├── auth.ts               # Core authentication manager
├── api-key.ts            # API key management
├── session.ts            # Session management
├── security.ts           # Security utilities
└── mocks.ts              # Mock implementations for testing
```

**Note:** Authentication types are defined in `src/types/auth.ts` for better organization.

## Implementation Overview

### 1. `index.ts` - Main Exports
- Exports AuthManager and all auth utilities
- Provides clean module interface
- Single entry point for authentication features

### 2. `auth.ts` - AuthManager Class
- Core authentication manager implementation
- API key validation and management
- Permission checking and access control
- Session integration and management

**Key Features:**
- API key validation with multiple checks
- Permission-based access control
- Session token management
- Audit logging for security events
- Support for read-only and read-write access levels

### 3. `api-key.ts` - APIKeyManager Class
- API key loading from environment variables
- Key format validation and security checks
- IP whitelist validation
- Integration with Mailcow API for testing
- Secure key storage and rotation

**Key Features:**
```typescript
// API key management
async loadAPIKey(): Promise<string>
async validateAPIKey(key: string, clientIp?: string): Promise<AuthResult>
async testAPIKeyWithMailcow(key: string): Promise<{success: boolean; accessLevel?: AccessLevel}>

// Security features
async rotateAPIKey(oldKey: string, newKey: string): Promise<boolean>
async storeAPIKeySecurely(key: string): Promise<void>
```

### 4. `session.ts` - Session Management
- Session creation and validation
- Token-based session management
- Session timeout and refresh handling
- Session cleanup and expiration

**Key Features:**
```typescript
// Session lifecycle
async createSession(apiKey: string, accessLevel: AccessLevel): Promise<SessionToken>
async validateSessionToken(sessionToken: string): Promise<boolean>
async refreshSession(sessionToken: string): Promise<SessionToken | null>

// Session maintenance
async cleanupExpiredSessions(): Promise<void>
```

### 5. `security.ts` - Security Utilities
- Input sanitization and validation
- Secure token generation
- API key encryption and hashing
- Audit logging and rate limiting

**Key Features:**
```typescript
// Security utilities
sanitizeInput(input: string): string
generateSecureToken(length?: number): string
encryptAPIKey(key: string): string
validateInput(input: string, pattern: RegExp): boolean

// Audit and monitoring
auditLog(event: string, details: Record<string, unknown>): void
rateLimitCheck(identifier: string): boolean
```

### 6. `mocks.ts` - Testing Support
- MockAuthManager for unit testing
- Test-friendly authentication implementations
- Debugging and development utilities

**Key Features:**
```typescript
// Mock authentication for testing
class MockAuthManager {
  async validateAPIKey(key: string): Promise<AuthResult>
  async createSession(apiKey: string, accessLevel: AccessLevel): Promise<SessionToken>
}
```

## Authentication Flow

### 1. API Key Validation
```typescript
const authManager = new AuthManager();
const result = await authManager.validateAPIKey(apiKey, clientIp);

if (result.success) {
  // Proceed with authenticated request
  const session = await authManager.createSession(apiKey, accessLevel);
} else {
  // Handle authentication failure
  throw new AuthenticationError(result.error.message);
}
```

### 2. Permission Checking
```typescript
// Check basic permissions
const hasPermission = authManager.checkPermission('read-write', 'create.domain');

// Check with specific permission rules
const permissions: Permission[] = [
  {
    resource: 'domain',
    actions: ['get', 'list'],
    conditions: [{ type: 'domain', value: 'example.com', operator: 'equals' }]
  }
];

const hasSpecificPermission = authManager.checkPermission('read-write', 'get.domain', permissions);
```

### 3. Session Management
```typescript
// Create session after successful authentication
const session = await authManager.createSession(apiKey, 'read-write');

// Validate session for subsequent requests
const isValid = await authManager.validateSession(session.token);

// Refresh session when needed
const refreshedSession = await authManager.refreshSession(session.token);
```

## Security Features

### 1. API Key Security
- Environment variable loading only (never hardcoded)
- Format validation (minimum 32 characters, alphanumeric)
- IP whitelist support for additional security
- Secure hashing and encryption for storage

### 2. Session Security
- Cryptographically secure token generation
- Configurable session timeouts
- Automatic cleanup of expired sessions
- Last activity tracking

### 3. Permission System
- Fine-grained permission checking
- Resource and action-based permissions
- Conditional permissions with operators (equals, contains, regex, etc.)
- Access level enforcement (read-only vs read-write)

### 4. Audit Logging
- All authentication events logged
- Failed authentication attempts tracked
- Permission denials recorded
- Security events with context

## Permission System Details

### Access Levels
- **read-only**: Can only perform GET/list operations
- **read-write**: Can perform all operations including create/update/delete

### Permission Structure
```typescript
interface Permission {
  resource: string;           // 'domain', 'mailbox', 'alias', '*'
  actions: string[];          // ['get', 'list', 'create', 'update', 'delete']
  conditions?: PermissionCondition[];
}

interface PermissionCondition {
  type: 'domain' | 'mailbox' | 'alias' | 'system';
  value: string;
  operator: 'equals' | 'starts_with' | 'ends_with' | 'contains' | 'regex';
}
```

### Operation Categories
- **Read Operations**: get, list, read, view, status
- **Write Operations**: create, add, update, edit, delete, remove, post, put
- **Admin Operations**: restart, backup, restore, config, system

## Integration with Other Modules

### API Client Integration
```typescript
// API client automatically adds authentication headers
const apiClient = new APIClient(config.api);
// Headers: { 'X-API-Key': config.api.key }
```

### MCP Server Integration
```typescript
// Tools can check permissions before execution
if (!authManager.checkPermission(accessLevel, operation)) {
  throw new AuthorizationError('Insufficient permissions');
}
```

## Error Handling

### Authentication Errors
- `AuthenticationError`: Invalid API key or credentials
- `AuthorizationError`: Insufficient permissions for operation
- `SessionExpiredError`: Session token has expired

### Security Validation
- Input sanitization for all user inputs
- Rate limiting to prevent abuse
- Audit logging for security monitoring

## Testing Support

Comprehensive test coverage with individual test files:
- `tests/unit/auth/auth.test.ts` - AuthManager functionality
- `tests/unit/auth/api-key.test.ts` - API key management
- `tests/unit/auth/session.test.ts` - Session management
- `tests/unit/auth/security.test.ts` - Security utilities
- `tests/unit/auth/mocks.test.ts` - Mock implementations

## Configuration

### Environment Variables
- `MAILCOW_API_KEY`: Primary API key for Mailcow access
- `MAILCOW_API_IP_WHITELIST`: Comma-separated list of allowed IPs
- Authentication settings configured via `MailcowConfig.auth`

### Security Configuration
```typescript
auth: {
  enabled: boolean;
  sessionTimeout: number;
  tokenRefreshThreshold: number;
  maxSessions: number;
  security: {
    requireHTTPS: boolean;
    allowedOrigins: string[];
    maxRequestSize: number;
    rateLimitEnabled: boolean;
    auditLogging: boolean;
  };
}
``` 