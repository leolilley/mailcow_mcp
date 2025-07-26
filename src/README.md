# Mailcow MCP Server - Source Code

This directory contains the TypeScript implementation of the Mailcow Model Context Protocol (MCP) server.

## Directory Structure

```
src/
├── types/           # TypeScript type definitions and interfaces
├── config/          # Configuration management and validation  
├── auth/            # Authentication and authorization
├── api/             # Mailcow API client and HTTP utilities
├── utils/           # Utility functions and helpers
├── tools/           # MCP tool implementations (planned)
├── resources/       # MCP resource implementations (planned)
└── index.ts         # Main server entry point (planned)
```

## Implementation Status

### ✅ **Completed Modules**

#### 1. **Types** (`types/`)
- Complete TypeScript type definitions for all modules
- MCP protocol types and Mailcow API types
- Configuration, authentication, and utility types
- Centralized type system with no duplication

#### 2. **Configuration** (`config/`)
- ConfigManager class for configuration loading
- Environment variable support
- Zod schema validation
- Default configurations for different environments

#### 3. **Authentication** (`auth/`)
- AuthManager for API key validation and session management
- Permission-based access control system
- Security utilities and input sanitization
- Mock implementations for testing

#### 4. **API Client** (`api/`)
- HTTP client for Mailcow API integration
- Proper endpoint structure matching Mailcow's patterns
- Error handling with specific error classes
- Request/response interceptors for authentication

#### 5. **Utilities** (`utils/`)
- Logging system with multiple destinations
- Input validation and security utilities
- String manipulation and formatting
- HTTP client helpers and error handling

### 🚧 **Planned Modules**

#### 6. **Tools** (`tools/`)
- MCP tool implementations for domain, mailbox, and system operations
- Tool registry and validation system
- Currently placeholder directories with comprehensive planning

#### 7. **Resources** (`resources/`)
- MCP resource implementations for data access
- Resource registry with URI routing
- Currently placeholder directories with detailed specifications

#### 8. **Main Server** (`index.ts`)
- MCP server entry point and initialization
- Protocol handler and request routing
- Not yet implemented

## Key Features Implemented

### 🔐 **Authentication & Security**
- API key validation with multiple security checks
- Session-based authentication with secure tokens
- Permission system with read-only/read-write access levels
- Input sanitization and XSS protection
- Audit logging for security events

### ⚙️ **Configuration Management**
- Environment-based configuration loading
- Schema validation with detailed error reporting
- Support for development, production, and test environments
- Secure handling of sensitive configuration data

### 🌐 **API Integration** 
- Complete Mailcow API client implementation
- Support for all major Mailcow endpoints (domains, mailboxes, aliases, system)
- Proper error handling with custom error classes
- Request retry and timeout handling

### 🛠️ **Developer Experience**
- Comprehensive TypeScript typing throughout
- Extensive unit test coverage with split test files
- Detailed documentation for all modules
- Mock implementations for testing

## Architecture Patterns

### 1. **Type-First Development**
- All interfaces defined in `src/types/` before implementation
- Strict TypeScript configuration with no `any` types
- Comprehensive type guards and validation

### 2. **Modular Design**
- Clear separation of concerns between modules
- Single responsibility principle for each directory
- Clean import/export patterns

### 3. **Configuration-Driven**
- Environment-based configuration management
- Validation at startup with clear error messages
- Support for different deployment environments

### 4. **Security-Conscious**
- Permission checking throughout the application
- Input validation and sanitization
- Secure credential handling

## Integration Examples

### Basic Usage
```typescript
import { ConfigManager } from './config';
import { AuthManager } from './auth';
import { APIClient } from './api';

// Load configuration
const configManager = new ConfigManager();
await configManager.loadConfig();
const config = configManager.getConfig();

// Initialize authentication
const authManager = new AuthManager();
const authResult = await authManager.validateAPIKey(config.api.key);

// Create API client
const apiClient = new APIClient(config.api);

// Use the client
const domains = await apiClient.get('/api/v1/get/domain');
```

### Testing
```typescript
import { MockAuthManager } from './auth/mocks';
import { MockLogger } from './utils/mocks';

// Use mocks in tests
const mockAuth = new MockAuthManager();
const mockLogger = new MockLogger();
```

## Development Guidelines

### 1. **Code Organization**
- Place types in `src/types/` before implementation
- Follow established module patterns
- Use clear, descriptive naming

### 2. **Testing Strategy**
- Unit tests split by module and functionality
- Comprehensive test coverage for all features
- Mock implementations for external dependencies

### 3. **Documentation**
- Detailed README files for each module
- JSDoc comments for complex functions and classes
- Implementation examples and usage patterns

### 4. **Type Safety**
- Define interfaces before implementation
- Use strict TypeScript configuration
- Implement proper type guards where needed

## Next Steps

### Short Term
1. **Complete MCP Server Implementation** (`index.ts`)
   - Protocol handler and message routing
   - Integration with existing modules
   - Error handling and logging

2. **Implement Core Tools**
   - Domain management tools (create, list, update, delete)
   - Basic system status tools
   - Tool registry and validation system

### Medium Term
1. **Expand Tool Coverage**
   - Mailbox management tools
   - Alias management tools
   - Log access tools

2. **Resource Implementation**
   - Core resource handlers
   - URI routing and parameter extraction
   - Resource caching system

### Long Term
1. **Advanced Features**
   - Real-time updates and subscriptions
   - Bulk operations and batch processing
   - Advanced reporting and analytics

2. **Performance Optimization**
   - Request caching and optimization
   - Connection pooling and management
   - Monitoring and metrics collection

## Contributing

When adding new features:

1. **Types First**: Define types in `src/types/` before implementation
2. **Test Coverage**: Write comprehensive unit tests
3. **Documentation**: Update relevant README files
4. **Security**: Consider security implications and add appropriate checks
5. **Patterns**: Follow established patterns and conventions 