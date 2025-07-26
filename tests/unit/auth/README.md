# Auth Module Tests

This directory contains unit tests for the authentication module, split into individual test files for better organization and maintainability.

## Test Files

- **`auth.test.ts`** - Tests for the main `AuthManager` class, including permission checking logic
- **`api-key.test.ts`** - Tests for the `APIKeyManager` class (API key validation, rotation, etc.)
- **`session.test.ts`** - Tests for session management functions (create, validate, refresh, cleanup)
- **`security.test.ts`** - Tests for security utility functions (sanitization, token generation, encryption)

## Running Tests

Run all auth tests:
```bash
npm test -- --testPathPattern=tests/unit/auth
```

Run a specific test file:
```bash
npm test -- tests/unit/auth/auth.test.ts
npm test -- tests/unit/auth/api-key.test.ts
npm test -- tests/unit/auth/session.test.ts
npm test -- tests/unit/auth/security.test.ts
```

## Test Coverage

Each test file focuses on its specific module:
- Input validation and sanitization
- API key management and validation
- Session lifecycle management
- Permission checking and access control
- Security utilities and token generation