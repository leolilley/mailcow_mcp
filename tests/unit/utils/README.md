# Utils Module Tests

This directory contains unit tests for the utilities module, split into individual test files for better organization and maintainability.

## Test Files

- **`logger.test.ts`** - Tests for logger functionality including MockLogger
- **`validation.test.ts`** - Tests for validation functions (email, domain, API key, schema validation)
- **`string.test.ts`** - Tests for string utility functions (validation, formatting, truncation)
- **`error.test.ts`** - Tests for error handling functions (formatting, categorization, error handling wrapper)
- **`http.test.ts`** - Tests for HTTP utility functions (client creation, URL building, response validation)
- **`security.test.ts`** - Tests for security utility functions (sanitization, token generation)
- **`crypto.test.ts`** - Tests for cryptographic functions (hashing, password hashing, certificate validation)
- **`mocks.test.ts`** - Tests for mock implementations used in testing scenarios

## Running Tests

Run all utils tests:
```bash
npm test -- --testPathPattern=tests/unit/utils
```

Run a specific test file:
```bash
npm test -- tests/unit/utils/logger.test.ts
npm test -- tests/unit/utils/validation.test.ts
npm test -- tests/unit/utils/string.test.ts
npm test -- tests/unit/utils/error.test.ts
npm test -- tests/unit/utils/http.test.ts
npm test -- tests/unit/utils/security.test.ts
npm test -- tests/unit/utils/crypto.test.ts
npm test -- tests/unit/utils/mocks.test.ts
```

## Test Coverage

Each test file focuses on its specific module:
- Input validation and sanitization
- String manipulation and formatting
- HTTP client utilities and URL handling
- Error handling and categorization
- Cryptographic operations (hashing, tokens)
- Security utilities (XSS protection, secure token generation)
- Logging functionality and mock implementations

## Dependencies

The utils tests depend on external libraries:
- `validator` - for email and domain validation
- `zod` - for schema validation
- `axios` - for HTTP client functionality
- `xss` - for string sanitization
- `pretty-bytes` - for byte formatting 