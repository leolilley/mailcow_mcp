# Team B: Authentication and Security

## 🎯 Mission
You are Team B, responsible for implementing the authentication and security system for the Mailcow MCP server. Your work ensures secure access to the Mailcow API and protects sensitive operations.

## 📋 Your Responsibilities

### Core Files to Implement:
- `src/auth/index.ts` - Main authentication exports
- `src/auth/auth.ts` - Core authentication logic
- `src/auth/api-key.ts` - API key management
- `src/auth/session.ts` - Session management
- `src/auth/security.ts` - Security utilities
> **IMPORTANT:** All type definitions must be imported from `src/types/index.ts`. Do **not** create new type files in the `src/auth/` folder. If you need a new type, add it to the appropriate file in `src/types/` and export it via `src/types/index.ts`.

## 📚 Required Reading
1. **Read `src/auth/README.md`** - Complete implementation guidelines for authentication
2. **Read `src/types/README.md`** - Type definitions you'll use
3. **Read `PLAN.md`** - Overall project plan and security requirements
4. **Read `IMPLEMENTATION_GUIDE.md`** - Your team assignment details

## 🎯 Key Deliverables

### 1. API Key Management
- Secure API key loading from environment variables
- API key validation and format checking
- Support for read-only and read-write access levels
- API key rotation and expiration handling
- IP whitelist validation

### 2. Session Management
- Secure session token generation
- Session timeout and refresh handling
- Session storage and cleanup
- Session security validation
- Cross-request session persistence

### 3. Security Utilities
- Input sanitization and validation
- Secure credential storage
- Encryption/decryption utilities
- Security audit logging
- Rate limiting for authentication attempts

### 4. Access Control
- Permission checking based on access levels
- Operation authorization
- Role-based access control
- Security event logging

## 🔗 Dependencies
- **Team A** - You depend on their types and configuration
- **Dependents:** Team C (API Client), Team G (Main Server)

## 🚀 Implementation Guidelines

> **Type Usage:** All types must be imported from `src/types/index.ts`. Do not define or use types from `src/auth/types.ts` or any other local type file.

### 1. Authentication Manager
Implement the main authentication class:

```typescript
// src/auth/auth.ts
export class AuthManager {
  constructor(private config: AuthConfig) {}
  
  async validateAPIKey(apiKey: string): Promise<AuthResult> {
    // Implement API key validation
  }
  
  async createSession(apiKey: string, accessLevel: AccessLevel): Promise<Session> {
    // Implement session creation
  }
  
  async validateSession(sessionToken: string): Promise<boolean> {
    // Implement session validation
  }
}
```

### 2. API Key Management
Implement secure API key handling:

```typescript
// src/auth/api-key.ts
export class APIKeyManager {
  async loadAPIKey(): Promise<string> {
    // Load from environment variables
  }
  
  async validateAPIKey(key: string): Promise<ValidationResult> {
    // Validate format and permissions
  }
  
  async testAPIKeyWithMailcow(key: string): Promise<TestResult> {
    // Test with actual Mailcow API
  }
}
```

### 3. Security Utilities
Implement security helper functions:

```typescript
// src/auth/security.ts
export function sanitizeInput(input: string): string {
  // Remove potentially dangerous characters
}

export function generateSecureToken(length: number = 32): string {
  // Generate cryptographically secure tokens
}

export function encryptAPIKey(key: string): string {
  // Encrypt API keys for storage
}
```

## 🧪 Testing Requirements
- Unit tests for all authentication functions
- Unit tests for session management
- Unit tests for security utilities
- Integration tests with mock Mailcow API
- Security penetration tests

## 📝 Documentation Requirements
- JSDoc comments for all public methods
- Security documentation and best practices
- API key management guide
- Session handling documentation

## 🔄 Communication with Other Teams
- Provide clear authentication interfaces for Team C
- Document session management for Team G
- Share security utilities with other teams
- Communicate any security-related changes

## ✅ Success Criteria
- [ ] API key validation works correctly
- [ ] Session management is secure and reliable
- [ ] Security utilities prevent common attacks
- [ ] Access control is properly implemented
- [ ] All tests pass
- [ ] Security audit passes
- [ ] Documentation is complete

## 🚨 Security Considerations

### 1. API Key Security
- Never log API keys
- Store keys securely (environment variables preferred)
- Implement key rotation
- Monitor key usage

### 2. Session Security
- Use secure session tokens
- Implement proper timeouts
- Validate session integrity
- Monitor session activities

### 3. Input Security
- Sanitize all user inputs
- Validate all parameters
- Prevent injection attacks
- Log security events

### 4. Error Handling
- Don't expose sensitive information in errors
- Log security events appropriately
- Provide helpful error messages
- Handle authentication failures gracefully

## 🔧 Mock Implementations for Testing
Create mock implementations for Team C to use:

```typescript
// src/auth/mocks.ts
export class MockAuthManager {
  async validateAPIKey(key: string): Promise<AuthResult> {
    return { valid: true, accessLevel: 'read-write' };
  }
  
  async createSession(apiKey: string): Promise<Session> {
    return {
      token: 'mock-session-token',
      apiKey: 'encrypted-key',
      accessLevel: 'read-write',
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 3600000),
    };
  }
}
```

## 📞 Team Communication
- Provide clear interfaces for Team C (API Client)
- Document session management for Team G (Main Server)
- Share security utilities with other teams
- Communicate security requirements clearly

## 🎯 Next Steps
1. Read the README files thoroughly
2. Implement the authentication manager
3. Implement API key management
4. Implement session management
5. Implement security utilities
6. Write comprehensive tests
7. Update documentation
8. Share interfaces with dependent teams

**Remember:** Security is critical. Your work protects the entire system. Focus on security best practices, comprehensive testing, and clear documentation. 