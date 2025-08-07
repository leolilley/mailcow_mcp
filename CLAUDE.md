# Mailcow MCP Server Development Guide

This document provides comprehensive guidance for Claude Code on developing the Mailcow Model Context Protocol (MCP) server implementation.

## 📁 Project Overview

This is a TypeScript implementation of an MCP server that provides full control over a Mailcow email server through its REST API. The project is approximately **60% complete** with core infrastructure implemented and domain-specific features in various stages of development.

### Current Status
- **Lines of Code**: ~9,524 TypeScript lines
- **Test Coverage**: 19.74% overall (Auth: 70%, Utils: 76%, API: 0%)
- **Architecture**: Modular TypeScript with comprehensive type safety
- **MCP SDK**: Using `@modelcontextprotocol/sdk` v0.4.0

## 🏗️ Architecture & Structure

```
mailcow_mcp/
├── src/                          # Main source directory
│   ├── api/                      # Mailcow API client implementations
│   │   ├── client.ts             # HTTP client with auth interceptors ✅
│   │   ├── endpoints.ts          # API endpoint definitions ✅
│   │   ├── domains/              # Domain management API ✅
│   │   ├── mailboxes/            # Mailbox management API ✅
│   │   ├── aliases/              # Alias management API ✅
│   │   ├── users/                # User management API ✅
│   │   ├── dkim/                 # DKIM management API ✅
│   │   ├── quarantine/           # Quarantine management API ✅
│   │   ├── syncjobs/             # Sync jobs API ✅
│   │   ├── oauth2/               # OAuth2 management API ✅
│   │   ├── app-passwords/        # App passwords API ✅
│   │   ├── tls-policy/           # TLS policy API ✅
│   │   ├── rspamd/               # Rspamd configuration API ✅
│   │   ├── queues/               # Mail queue API ✅
│   │   ├── logs/                 # Logging API ✅
│   │   ├── spam/                 # Spam management API ✅
│   │   ├── resources/            # Resource management API ✅
│   │   └── system/               # System management API ✅
│   ├── auth/                     # Authentication & security ✅
│   │   ├── auth.ts               # Main auth manager (162 tests)
│   │   ├── api-key.ts            # API key management
│   │   ├── session.ts            # Session management
│   │   └── security.ts           # Security utilities
│   ├── config/                   # Configuration management ✅
│   │   ├── config.ts             # Main configuration
│   │   ├── defaults.ts           # Default settings
│   │   ├── environment.ts        # Environment variables
│   │   └── validation.ts         # Config validation
│   ├── tools/                    # MCP tool implementations ⚠️
│   │   ├── base.ts               # Base tool class
│   │   ├── registry.ts           # Tool registry
│   │   ├── validation.ts         # Tool validation
│   │   ├── users/                # User management tools (partial)
│   │   └── dkim/                 # DKIM tools (partial)
│   ├── types/                    # TypeScript type definitions ✅
│   │   ├── index.ts              # Main type exports
│   │   ├── api.ts                # API types
│   │   ├── auth.ts               # Authentication types
│   │   ├── config.ts             # Configuration types
│   │   ├── mailcow.ts            # Mailcow entity types (700+ lines)
│   │   ├── mcp.ts                # MCP protocol types
│   │   ├── resources.ts          # Resource types
│   │   ├── tools.ts              # Tool types
│   │   └── utils.ts              # Utility types
│   ├── utils/                    # Utility functions ✅
│   │   ├── logger.ts             # Logging utilities
│   │   ├── http.ts               # HTTP utilities
│   │   ├── validation.ts         # Validation helpers
│   │   ├── security.ts           # Security utilities
│   │   ├── crypto.ts             # Cryptographic functions
│   │   ├── string.ts             # String utilities
│   │   ├── error.ts              # Error handling
│   │   └── mocks.ts              # Mock implementations for testing
│   └── resources/                # MCP resource implementations ❌
│       ├── domains/              # Domain resources (not implemented)
│       ├── mailboxes/            # Mailbox resources (not implemented)
│       ├── aliases/              # Alias resources (not implemented)
│       └── system/               # System resources (not implemented)
├── tests/                        # Test suite
│   ├── unit/                     # Unit tests ✅
│   │   ├── auth/                 # Auth tests (4 files, good coverage)
│   │   └── utils/                # Utils tests (8 files, good coverage)
│   └── integration/              # Integration tests (empty) ❌
├── docs/                         # Documentation
├── examples/                     # Usage examples
├── TEAMS/                        # Team-based development docs ✅
├── IMPLEMENTATION_GUIDE.md       # Parallel development guide ✅
├── PLAN.md                       # Implementation plan ✅
├── mailcow_docs/                 # Mailcow documentation ✅
└── mcp_docs/                     # MCP protocol documentation ✅
```

**Legend**: ✅ Implemented | ⚠️ Partial | ❌ Not implemented

## 🔧 Development Environment

### Required Tools
```bash
# Check versions
node --version     # >= 18.0.0
npm --version      # Latest
typescript -v      # ^5.0.0
```

### Installation & Setup
```bash
# Install dependencies
npm install

# Build project
npm run build

# Run development server
npm run dev

# Run tests
npm test

# Lint code
npm run lint

# Format code
npm run format

# Clean build
npm run clean
```

## 🔑 Configuration

### Environment Variables
```bash
# Core Mailcow Configuration
MAILCOW_API_URL=https://mail.example.com    # Mailcow server URL
MAILCOW_API_KEY=your_api_key_here           # API key from mailcow admin
MAILCOW_API_ACCESS_TYPE=read-write          # read-only | read-write
MAILCOW_VERIFY_SSL=true                     # SSL verification
MAILCOW_TIMEOUT=30000                       # Request timeout (ms)

# MCP Configuration  
MCP_SERVER_PORT=3000                        # MCP server port
MCP_LOG_LEVEL=info                          # debug | info | warn | error

# Security
MCP_RATE_LIMIT=100                          # Requests per minute
MCP_SESSION_TIMEOUT=3600                    # Session timeout (seconds)
```

### API Key Generation
1. Access Mailcow admin interface: `https://your-mailcow-host/admin`
2. Navigate to **Configuration & Details** → **Access**
3. Create API key with appropriate permissions
4. Choose **read-write** for full functionality or **read-only** for monitoring

## 🛠️ Core Components

### 1. API Client (`src/api/client.ts`)
HTTP client with authentication and error handling:

```typescript
const client = new APIClient({
  url: 'https://mail.example.com',
  key: 'api_key_here',
  timeout: 30000
});

// Usage
const domains = await client.get<MailcowDomain[]>('/api/v1/get/domain');
```

**Features**: 
- Automatic API key header injection
- Request/response interceptors
- Comprehensive error handling
- TypeScript generics for type safety

### 2. Authentication System (`src/auth/`)
Comprehensive authentication with role-based permissions:

```typescript
const auth = new AuthManager();
const result = await auth.validateAPIKey(apiKey);
const canEdit = await auth.hasPermission('domains', 'write');
```

**Features** (162 test cases):
- API key validation and rotation
- Permission checking (read-only vs read-write)
- Resource-specific permissions
- Session management with refresh
- Security audit logging

### 3. Type System (`src/types/mailcow.ts`)
700+ lines of comprehensive Mailcow API types:

```typescript
interface MailcowDomain {
  domain: string;
  description?: string;
  active: boolean;
  quota: number;
  maxquota: number;
  relayhost?: string;
  relay_all_recipients?: boolean;
  created: Date;
  modified: Date;
  attributes?: Record<string, unknown>;
}
```

**Coverage**: Domains, Mailboxes, Aliases, Users, DKIM, Quarantine, TLS Policy, OAuth2, App Passwords, Rspamd, System Status, Logs, Backups, Sync Jobs, Queue Management

### 4. Mailcow API Endpoints (`src/api/endpoints.ts`)
Action-based endpoint patterns (not RESTful):

```typescript
export const API_ENDPOINTS = {
  DOMAINS: {
    LIST: '/api/v1/get/domain',
    CREATE: '/api/v1/add/domain',
    UPDATE: '/api/v1/edit/domain',
    DELETE: '/api/v1/delete/domain',
  },
  // ... 15+ other endpoint categories
};
```

## 🧪 Testing Framework

### Current Coverage
- **Overall**: 19.74% statements (needs significant improvement)
- **Auth module**: 70.16% (excellent)
- **Utils module**: 76.56% (excellent) 
- **API modules**: 0% (critical gap)

### Test Structure
```bash
tests/
├── unit/                        # Unit tests
│   ├── auth/                    # 4 test files, 162 test cases
│   │   ├── auth.test.ts         # Main auth manager tests
│   │   ├── api-key.test.ts      # API key management
│   │   ├── security.test.ts     # Security utilities
│   │   └── session.test.ts      # Session management
│   └── utils/                   # 8 test files, comprehensive
│       ├── validation.test.ts   # Input validation
│       ├── http.test.ts         # HTTP utilities
│       ├── crypto.test.ts       # Cryptographic functions
│       ├── logger.test.ts       # Logging (uses MockLogger)
│       └── ... (4 more)
└── integration/                 # Empty - needs implementation
```

### Running Tests
```bash
# Run all tests
npm test

# Run with coverage
npm test -- --coverage

# Run specific test file
npm test -- auth.test.ts

# Watch mode
npm test -- --watch

# Verbose output
npm test -- --verbose
```

### Mock Implementations
Comprehensive MockLogger for isolated testing:

```typescript
import { MockLogger } from '../utils/mocks';

const logger = new MockLogger();
// ... run code that logs
const logs = logger.getLogs();
expect(logs).toHaveLength(2);
expect(logs[0].level).toBe('info');
```

## 🚧 Priority Implementation Areas

### 1. CRITICAL: MCP Server Entry Point (`src/index.ts`)
**Status**: Missing - core MCP server not implemented
**Priority**: Highest

```typescript
// Expected structure:
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

const server = new Server(
  { name: 'mailcow-mcp', version: '0.1.0' },
  { capabilities: { tools: {}, resources: {} } }
);

// Register tools and resources
// Start server with transport
```

**Dependencies**: Tool registry, Resource registry, Error handling

### 2. CRITICAL: MCP Tools Implementation (`src/tools/`)
**Status**: Base classes exist, specific tools missing
**Priority**: Highest

**Required Tools**:
- Domain management: `list-domains`, `create-domain`, `update-domain`, `delete-domain`
- Mailbox management: `list-mailboxes`, `create-mailbox`, `update-mailbox`, `delete-mailbox` 
- Alias management: `list-aliases`, `create-alias`, `update-alias`, `delete-alias`
- System management: `get-system-status`, `restart-service`, `create-backup`
- Spam management: `update-spam-settings`, `add-whitelist`, `add-blacklist`

**Pattern Example**:
```typescript
import { BaseTool } from '../base';

export class ListDomainsError extends BaseTool {
  name = 'list_domains';
  description = 'List all domains in the mailcow server';
  
  async execute(args: Record<string, unknown>) {
    const client = this.getAPIClient();
    return await client.get<MailcowDomain[]>('/api/v1/get/domain');
  }
}
```

### 3. HIGH: MCP Resources Implementation (`src/resources/`)
**Status**: Not implemented
**Priority**: High

**Required Resources**:
- `domains` - List of all domains with URI pattern `domains://`
- `mailboxes` - List of all mailboxes with URI pattern `mailboxes://`
- `aliases` - List of all aliases with URI pattern `aliases://`
- `system-status` - Current system status with URI pattern `system://status`

### 4. HIGH: API Client Testing (`tests/unit/api/`)
**Status**: 0% coverage
**Priority**: High

Mock HTTP responses for comprehensive API testing:

```typescript
import { APIClient } from '../../../src/api/client';
import nock from 'nock';

describe('APIClient', () => {
  it('should fetch domains successfully', async () => {
    nock('https://mail.example.com')
      .get('/api/v1/get/domain')
      .reply(200, { success: true, data: [/* mock domains */] });
    
    const client = new APIClient(config);
    const domains = await client.get('/api/v1/get/domain');
    expect(domains).toBeDefined();
  });
});
```

### 5. MEDIUM: Integration Tests
**Status**: Not implemented  
**Priority**: Medium

End-to-end testing with test Mailcow instance:

```typescript
// tests/integration/mcp-server.test.ts
describe('MCP Server Integration', () => {
  it('should handle tool execution end-to-end', async () => {
    // Test full MCP tool execution flow
  });
});
```

## 📖 Key Patterns & Conventions

### 1. Error Handling
All API operations use standardized error patterns:

```typescript
try {
  const result = await client.post('/api/v1/add/domain', domainData);
  return { success: true, data: result };
} catch (error) {
  throw new Error(`Domain creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
}
```

### 2. Type Guards
Extensive use of type guards for runtime safety:

```typescript
export function isMailcowDomain(obj: unknown): obj is MailcowDomain {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'domain' in obj &&
    'active' in obj &&
    typeof obj.domain === 'string' &&
    typeof obj.active === 'boolean'
  );
}
```

### 3. Configuration Management
Environment-based configuration with validation:

```typescript
import { getConfig } from './config';

const config = getConfig();  // Validates and returns typed config
const apiUrl = config.mailcow.apiUrl;
```

### 4. Logging Standards
Structured logging throughout:

```typescript
import { logger } from '../utils/logger';

logger.info('Domain created successfully', { 
  domain: 'example.com',
  user: 'admin' 
});
```

## 🔐 Security Considerations

### API Key Management
- Store API keys in environment variables only
- Never log API keys or sensitive data
- Implement key rotation mechanisms
- Use read-only keys when possible

### Input Validation
- All user inputs validated using Zod schemas
- XSS protection for string inputs
- Email and domain validation
- SQL injection prevention (though Mailcow handles this)

### Network Security  
- HTTPS enforcement
- Certificate validation
- Rate limiting (100 requests/minute default)
- Request timeout handling

## 🚀 Development Workflow

### 1. Before Making Changes
```bash
# Always pull latest and check status
git pull origin master
git status

# Install/update dependencies if needed
npm install

# Run tests to ensure everything works
npm test
```

### 2. Development Process
```bash
# Create feature branch
git checkout -b feature/implement-domain-tools

# Make changes following patterns
# Write tests as you go
npm test -- --watch

# Build and lint
npm run build
npm run lint
```

### 3. Testing Requirements
- **Write tests first** for new functionality
- **Maintain >80% coverage** for new modules
- **Test both success and failure paths**
- **Use MockLogger** for testing logging
- **Mock HTTP requests** for API testing

### 4. Before Committing
```bash
# Ensure all tests pass
npm test

# Ensure build works
npm run build

# Lint and format
npm run lint
npm run format

# Commit with descriptive messages
git commit -m "feat: implement domain management tools with comprehensive tests"
```

## 🎯 Implementation Priority Queue

### Immediate (Week 1)
1. **Complete MCP server entry point** (`src/index.ts`)
2. **Implement domain management tools** (5 tools)
3. **Add API client tests** (critical for reliability)
4. **Fix tool registry** (register tools with MCP server)

### Short-term (Week 2-3)  
5. **Implement mailbox management tools** (6 tools)
6. **Implement alias management tools** (5 tools)
7. **Add MCP resource implementations** (4 resources)
8. **Add integration testing framework**

### Medium-term (Week 4-6)
9. **Implement system management tools** (6 tools)
10. **Implement spam management tools** (6 tools) 
11. **Add remaining API endpoint tests**
12. **Performance optimization and caching**

### Long-term (Month 2+)
13. **Advanced features** (DKIM, OAuth2, quarantine management)
14. **Monitoring and logging improvements**
15. **Documentation and examples**
16. **Production deployment guides**

## 🚨 Common Pitfalls

### 1. Mailcow API Patterns
❌ **Wrong**: Using RESTful patterns
```typescript
// DON'T do this
const domains = await client.get('/api/v1/domains');
```

✅ **Correct**: Using Mailcow's action-based patterns  
```typescript
// DO this
const domains = await client.get('/api/v1/get/domain');
```

### 2. Authentication Headers
❌ **Wrong**: Manual header management
```typescript
// DON'T do this
const response = await axios.get(url, {
  headers: { 'Authorization': `Bearer ${apiKey}` }
});
```

✅ **Correct**: Using interceptor-managed headers
```typescript
// DO this - APIClient handles headers automatically
const response = await client.get<DomainData>(url);
```

### 3. Error Handling
❌ **Wrong**: Generic error handling
```typescript
// DON'T do this
try {
  const result = await apiCall();
} catch (error) {
  console.log('Error occurred');
}
```

✅ **Correct**: Specific error handling with context
```typescript
// DO this
try {
  const result = await client.get('/api/v1/get/domain');
} catch (error) {
  logger.error('Failed to fetch domains', { 
    error: error instanceof Error ? error.message : 'Unknown error',
    endpoint: '/api/v1/get/domain'
  });
  throw new Error(`Domain fetch failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
}
```

### 4. Type Safety
❌ **Wrong**: Using `any` or loose typing
```typescript
// DON'T do this
const domains: any[] = await client.get('/api/v1/get/domain');
```

✅ **Correct**: Using proper type definitions
```typescript
// DO this
const domains = await client.get<MailcowDomain[]>('/api/v1/get/domain');
```

## 💡 Tips for Efficient Development

### 1. Use Existing Patterns
- Follow the authentication module patterns (well-tested)
- Use the utility functions extensively
- Leverage the comprehensive type definitions

### 2. Test-Driven Development
- Write tests before implementation
- Use the MockLogger for testing logging
- Create focused unit tests for each function

### 3. Parallel Development 
- Use the team structure in `TEAMS/` directory for guidance
- Work on independent modules simultaneously
- Mock dependencies that aren't ready yet

### 4. Documentation
- Update this CLAUDE.md file when making significant changes
- Add JSDoc comments for public APIs
- Keep README files updated in each module

---

This codebase represents a well-architected, partially-implemented Mailcow MCP server with excellent foundations in authentication, utilities, and type safety. Focus on completing the core MCP server implementation and tool development to achieve a functional MVP.