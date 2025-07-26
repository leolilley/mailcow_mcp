# Tools Directory

This directory contains the complete MCP tool implementation for the Mailcow MCP server, including the tool registry, base classes, validation, error handling, and mock implementations.

## Implementation Status

✅ **COMPLETED** - All core tool infrastructure is implemented and ready for use by Teams I-N.

## Current Structure

```
tools/
├── README.md             # This documentation
├── index.ts              # Main exports
├── registry.ts           # Tool registry and management
├── base.ts               # Base tool classes and interfaces
├── validation.ts         # Tool input validation
├── errors.ts             # Tool error handling
├── mocks.ts              # Mock implementations for testing
├── aliases/             # Placeholder: Alias management tools (Team K)
├── domains/             # Placeholder: Domain management tools (Team I)
├── logs/                # Placeholder: Log management tools (Team N)
├── mailboxes/           # Placeholder: Mailbox management tools (Team J)
├── resources/           # Placeholder: Resource management tools (Team F)
├── spam/                # Placeholder: Spam management tools (Team M)
└── system/              # Placeholder: System management tools (Team L)
```

## Core Components

### 1. Tool Registry (`registry.ts`)
The central tool management system that handles:
- Tool registration and unregistration
- Tool discovery and listing
- Tool execution with validation and error handling
- Rate limiting and caching
- Metrics collection and monitoring

**Key Features:**
- Automatic input validation against schemas
- Permission checking before execution
- Rate limiting with configurable limits
- Result caching for performance
- Comprehensive metrics tracking
- Error handling and logging

### 2. Base Tool Classes (`base.ts`)
Abstract base classes and utilities for tool development:
- `BaseTool` - Abstract base class for all tools
- `FunctionTool` - Implementation for function-based tools
- `ToolFactory` - Factory for creating tools from different sources
- `ToolBuilder` - Fluent builder for tool creation
- `ToolUtils` - Utility functions for common operations

**Key Features:**
- Standardized tool interface implementation
- Built-in input validation
- Permission checking utilities
- Error handling and logging
- Result formatting helpers

### 3. Tool Validation (`validation.ts`)
Comprehensive validation system for tool inputs and schemas:
- Schema-based input validation
- Type checking and format validation
- Required field validation
- Enum and pattern validation
- Input sanitization

**Key Features:**
- JSON Schema validation
- Email, URI, date, and date-time format validation
- Custom pattern validation
- Nested object and array validation
- Sanitization for security

### 4. Tool Error Handling (`errors.ts`)
Specialized error classes and utilities for tool-related errors:
- `ToolValidationError` - Input validation errors
- `ToolExecutionError` - Tool execution errors
- `ToolPermissionError` - Permission-related errors
- `ToolNotFoundError` - Tool not found errors
- `ToolRateLimitError` - Rate limiting errors
- `ToolTimeoutError` - Timeout errors

**Key Features:**
- MCP-compliant error codes
- Detailed error messages and context
- Error categorization and handling
- Retry logic for transient errors

### 5. Mock Implementations (`mocks.ts`)
Complete mock implementations for testing:
- `MockTool` - Basic mock tool implementation
- `MockValidationErrorTool` - Tool that throws validation errors
- `MockPermissionErrorTool` - Tool that requires specific permissions
- `MockExecutionErrorTool` - Tool that throws execution errors
- `MockToolFactory` - Factory for creating mock tools

## Usage Examples

### Creating a Simple Tool

```typescript
import { BaseTool, ToolInput, ToolContext, ToolHandlerResult } from '../tools';
import { Logger } from '../utils';

class MyDomainTool extends BaseTool {
  readonly name = 'list_domains';
  readonly description = 'List all domains in Mailcow';
  readonly inputSchema = {
    type: 'object',
    properties: {
      filter: { 
        type: 'string',
        description: 'Optional filter for domain names'
      }
    }
  };

  async execute(input: ToolInput, context: ToolContext): Promise<ToolHandlerResult> {
    try {
      // Check permissions
      if (!this.validatePermissions(context, ['domains:read'])) {
        return {
          success: false,
          error: {
            code: -32006,
            message: 'Insufficient permissions',
            details: 'Requires domains:read permission'
          }
        };
      }

      // Execute tool logic
      const filter = input.filter as string;
      const domains = await this.getDomains(filter);
      
      this.logExecution(input, context, true);
      
      return {
        success: true,
        result: {
          content: [
            {
              type: 'text',
              text: JSON.stringify(domains, null, 2)
            }
          ]
        }
      };
    } catch (error) {
      return await this.handleError(error instanceof Error ? error : new Error(String(error)), context);
    }
  }

  private async getDomains(filter?: string): Promise<unknown[]> {
    // Implementation here
    return [];
  }
}
```

### Using the Tool Registry

```typescript
import { ToolRegistry, Logger } from '../tools';
import { ConsoleLogDestination } from '../utils';

// Create logger
const logger = new Logger(
  { level: 'info' },
  new ConsoleLogDestination()
);

// Create registry
const registry = new ToolRegistry(logger);

// Register a tool
const myTool = new MyDomainTool(logger);
registry.register(myTool);
registry.registerHandler('list_domains', myTool.execute.bind(myTool), {
  category: 'domain',
  requiresAuth: true,
  rateLimited: true
});

// Execute a tool
const context = {
  requestId: 'req-123',
  userId: 'user-456',
  timestamp: new Date(),
  permissions: ['domains:read'],
  accessLevel: 'read-write'
};

const result = await registry.execute('list_domains', { filter: 'example.com' }, context);
```

### Using the Tool Builder

```typescript
import { ToolBuilder, Logger } from '../tools';

const logger = new Logger({ level: 'info' }, new ConsoleLogDestination());
const builder = new ToolBuilder(logger);

const tool = builder
  .withName('create_domain')
  .withDescription('Create a new domain in Mailcow')
  .withInputSchema({
    type: 'object',
    properties: {
      domain: { type: 'string', description: 'Domain name' },
      description: { type: 'string', description: 'Domain description' }
    },
    required: ['domain']
  })
  .withHandler(async (input, context) => {
    // Tool implementation
    return { success: true, result: { content: [{ type: 'text', text: 'Domain created' }] } };
  })
  .withMetadata({
    category: 'domain',
    requiresAuth: true,
    rateLimited: false
  })
  .build();
```

## Validation Examples

### Schema Validation

```typescript
import { validateToolInput, validateToolSchema } from '../tools';

// Validate input
const schema = {
  type: 'object',
  properties: {
    email: { 
      type: 'string',
      format: 'email'
    },
    age: { 
      type: 'number',
      minimum: 18,
      maximum: 120
    }
  },
  required: ['email']
};

const input = { email: 'user@example.com', age: 25 };
const validation = validateToolInput(input, schema);

if (!validation.valid) {
  console.log('Validation errors:', validation.errors);
}
```

### Error Handling

```typescript
import { ToolErrorUtils, ToolValidationError } from '../tools';

try {
  // Tool execution
} catch (error) {
  if (ToolErrorUtils.isValidationError(error)) {
    console.log('Validation errors:', error.getValidationErrors());
  } else if (ToolErrorUtils.isPermissionError(error)) {
    console.log('Required permissions:', error.getRequiredPermissions());
  } else {
    const toolError = ToolErrorUtils.toToolError(error, 'my_tool');
    console.log('Tool error:', toolError.message);
  }
}
```

## Testing with Mocks

```typescript
import { MockTool, MockToolFactory, mockToolContext, mockToolInput } from '../tools';
import { Logger } from '../utils';

const logger = new Logger({ level: 'debug' }, new ConsoleLogDestination());

// Test with mock tool
const mockTool = MockToolFactory.createMockTool(logger);
const result = await mockTool.execute(mockToolInput, mockToolContext);

console.log('Mock tool result:', result);
```

## Integration with MCP Protocol

The tool implementation is fully compliant with the MCP protocol:

### Tool Schema Format
```json
{
  "name": "list_domains",
  "description": "List all domains in Mailcow",
  "inputSchema": {
    "type": "object",
    "properties": {
      "filter": {
        "type": "string",
        "description": "Optional filter for domain names"
      }
    }
  }
}
```

### Tool Result Format
```json
{
  "content": [
    {
      "type": "text",
      "text": "Domain list: example.com, test.com"
    }
  ]
}
```

### Error Format
```json
{
  "code": -32602,
  "message": "Invalid parameters",
  "details": "Required field 'domain' is missing"
}
```

## Security Features

### Input Validation
- All inputs validated against schemas
- Type checking and format validation
- Required field validation
- Sanitization for security

### Permission System
- Role-based access control
- Tool-specific permissions
- Permission checking before execution
- Audit logging

### Rate Limiting
- Configurable rate limits per tool
- Automatic rate limit enforcement
- Retry-after headers
- Rate limit monitoring

## Performance Features

### Caching
- Result caching with TTL
- Cache key generation based on input and context
- Cache invalidation strategies
- Cache hit monitoring

### Monitoring
- Execution metrics collection
- Performance monitoring
- Error rate tracking
- Response time analysis

## For Teams I-N

This tool infrastructure provides everything needed to implement domain-specific tools:

1. **Extend BaseTool** for your tool implementations
2. **Use ToolRegistry** to register and manage tools
3. **Implement validation** using the provided validation system
4. **Handle errors** using the specialized error classes
5. **Test with mocks** using the provided mock implementations

The infrastructure handles all the complex parts (validation, error handling, permissions, rate limiting, caching, monitoring) so you can focus on your domain-specific logic.

## Next Steps

Teams I-N should now implement their domain-specific tools using this infrastructure:

- **Team I**: Domain management tools
- **Team J**: Mailbox management tools  
- **Team K**: Alias management tools
- **Team L**: System management tools
- **Team M**: Spam management tools
- **Team N**: Log management tools

Each team should create their tools in the appropriate subdirectory and follow the patterns established in this implementation. 