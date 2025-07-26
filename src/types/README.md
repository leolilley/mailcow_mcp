# Types Directory

This directory contains all TypeScript type definitions and interfaces for the Mailcow MCP server.

## File Structure

```
types/
├── index.ts              # Main type exports
├── mcp.ts               # MCP protocol types
├── mailcow.ts           # Mailcow API types
├── config.ts            # Configuration types (consolidated)
├── auth.ts              # Authentication types
├── api.ts               # API client types
├── tools.ts             # Tool types
├── resources.ts         # Resource types
└── utils.ts             # Utility types
```

## Implementation Overview

### 1. `index.ts` - Central Type Exports
- Exports all types from submodules
- Single entry point for all type definitions
- Clean module organization

### 2. `mcp.ts` - MCP Protocol Types
- Complete MCP protocol implementation
- JSON-RPC 2.0 message types
- Tool and resource schema definitions
- Capability negotiation types

**Key Types Implemented:**
- `MCPRequest`, `MCPResponse`, `MCPError`
- `Tool`, `ToolResult`, `ToolSchema`
- `Resource`, `ResourceTemplate`, `ResourceContent`
- `ServerCapabilities`, `ClientCapabilities`

### 3. `mailcow.ts` - Mailcow API Types
- Comprehensive Mailcow API response types
- Domain, mailbox, alias, and system entities
- Request/response interfaces for all endpoints
- API error and pagination types

**Key Types Implemented:**
```typescript
// Core Mailcow entities
MailcowDomain, MailcowMailbox, MailcowAlias

// System and management
MailcowSystemStatus, MailcowServiceStatus, MailcowSpamSettings

// Request/response patterns
CreateDomainRequest, UpdateDomainRequest, ListDomainsParams
MailcowAPIResponse<T>, MailcowAPIError

// Filtering and pagination
LogFilter, ListResourcesParams
```

### 4. `config.ts` - Configuration Types (Consolidated)
- Complete configuration structure for all modules
- Environment variable mappings
- Validation and error types
- Configuration source tracking

**Key Types Implemented:**
```typescript
// Main configuration
MailcowConfig, APIConfig, AuthConfig, ServerConfig, LoggingConfig

// Configuration management
ConfigSource, ConfigValidationResult, ConfigError
ConfigLoadOptions, ConfigReloadOptions

// Validation and security
ConfigValidationContext, ConfigWarning
```

### 5. `auth.ts` - Authentication Types
- Authentication result and session types
- API key and permission structures
- Security and session management types

**Key Types Implemented:**
```typescript
// Authentication core
AuthResult, AccessLevel, SessionToken

// Permissions and security
Permission, PermissionCondition, SecurityConfig

// API key management
APIKeyInfo, TokenInfo
```

### 6. `api.ts` - API Client Types
- HTTP client interfaces and configuration
- Request/response type definitions
- Error handling and retry types

**Key Types Implemented:**
```typescript
// HTTP client
HTTPRequest, HTTPResponse, HTTPMethod
APIClient, RequestOptions, AuthOptions

// Error handling
APIError, NetworkError, RetryConfig

// Response handling
ApiClientResponse<T>, ResponseHandler
```

### 7. `tools.ts` - Tool Implementation Types
- MCP tool handler interfaces
- Tool validation and execution types
- Tool registry and capability types

**Key Types Implemented:**
```typescript
// Tool handling
ToolHandler, ToolResult, ToolError
ToolValidation, ToolContext

// Tool registry
ToolRegistry, ToolCapabilities, ToolConfig
```

### 8. `resources.ts` - Resource Types
- MCP resource implementation interfaces
- Resource handler and URI types
- Resource metadata and template types

**Key Types Implemented:**
```typescript
// Resource handling
ResourceHandler, ResourceContent, ResourceMetadata
ResourceURI, ResourceTemplate

// Resource management
ResourceRegistry, ResourceCapabilities
```

### 9. `utils.ts` - Utility Types
- Logging and utility interface types
- Common utility patterns and helpers
- Type guards and validation types

**Key Types Implemented:**
```typescript
// Logging
LogEntry, LogLevel, LogDestination
LoggerConfig, MockLogger

// Validation and utilities
ValidationResult<T>, ErrorCategory
TimestampFormat, FileSystemPath
```

## Type Safety Features

### 1. Strict Type Checking
- All modules use strict TypeScript configuration
- No `any` types - everything properly typed
- Comprehensive type guards for runtime validation

### 2. Generic Type Patterns
```typescript
// API responses with generic data
MailcowAPIResponse<T>
ApiClientResponse<T>

// Validation results
ValidationResult<T>
ConfigValidationResult

// Tool and resource generics
ToolResult<T>
ResourceContent<T>
```

### 3. Union Types for Safety
```typescript
// Access levels
type AccessLevel = 'read-only' | 'read-write';

// Log levels
type LogLevel = 'debug' | 'info' | 'warn' | 'error';

// HTTP methods
type HTTPMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
```

### 4. Type Guards and Validation
```typescript
// Configuration validation
function isMailcowConfig(obj: unknown): obj is MailcowConfig
function isAPIConfig(obj: unknown): obj is APIConfig

// Utility type guards
function isNonEmptyString(value: unknown): value is string
function isValidLogLevel(level: string): level is LogLevel
```

## Integration Patterns

### 1. Cross-Module Type Sharing
- Clean imports between modules
- No circular dependencies
- Centralized type definitions

### 2. API Integration
```typescript
// API client uses config types
constructor(config: APIConfig)

// API responses use Mailcow types
async listDomains(): Promise<MailcowDomain[]>
```

### 3. Configuration Integration
```typescript
// All modules use centralized config types
import { MailcowConfig, APIConfig } from '../types';
```

## Design Principles

1. **Single Source of Truth**: All types defined once, imported everywhere
2. **Type Safety**: Strict typing with no `any` usage
3. **Modularity**: Logical grouping of related types
4. **Consistency**: Uniform naming and structure patterns
5. **Documentation**: Comprehensive JSDoc comments on complex types
6. **Validation**: Runtime type validation where needed 