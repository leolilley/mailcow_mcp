# Team E: Tool Registry and Base Classes

## 🎯 Mission
You are Team E, responsible for implementing the tool registry and base classes for the Mailcow MCP server. Your work provides the foundation for all domain-specific tool implementations and ensures proper MCP tool compliance.

## 📋 Your Responsibilities

### Core Files to Implement:
- `src/tools/index.ts` - Main tools exports
- `src/tools/registry.ts` - Tool registry and management
- `src/tools/base.ts` - Base tool classes and interfaces
- `src/tools/validation.ts` - Tool input validation
- `src/tools/errors.ts` - Tool error handling
> **IMPORTANT:** All type definitions must be imported from `src/types/index.ts`. Do **not** create new type files in the `src/tools/` folder. If you need a new type, add it to the appropriate file in `src/types/` and export it via `src/types/index.ts`.

## 📚 Required Reading
1. **Read `src/tools/README.md`** - Complete implementation guidelines for tools
2. **Read `src/types/README.md`** - Type definitions you'll use
3. **Read `src/utils/README.md`** - Utility functions you'll use
4. **Read `PLAN.md`** - Overall project plan and MCP requirements
5. **Read `IMPLEMENTATION_GUIDE.md`** - Your team assignment details

## 🎯 Key Deliverables

### 1. Tool Registry Implementation
- Tool registration and unregistration
- Tool discovery and listing
- Tool capability negotiation
- Tool schema management
- Tool validation and error handling

### 2. Base Tool Classes
- Abstract base class for all tools
- Tool handler interface
- Tool context interface
- Tool result interface
- Tool lifecycle management

### 3. Tool Validation
- Input validation schemas
- Validation functions
- Validation error handling
- Input sanitization

### 4. Tool Error Handling
- Tool error types
- Error handling logic
- Error mapping utilities
- Error logging

## 🔗 Dependencies
- **Team A** - You depend on their types and configuration
- **Team D** - You depend on their utilities
- **Dependents:** Teams I-N (domain tools)

## 🚀 Implementation Guidelines

> **Type Usage:** All types must be imported from `src/types/index.ts`. Do not define or use types from `src/tools/types.ts` or any other local type file.

### 1. Tool Registry
Implement the tool registry:

```typescript
// src/tools/registry.ts
export class ToolRegistry {
  private tools = new Map<string, ToolHandler>();

  registerTool(tool: ToolHandler): void {
    if (this.tools.has(tool.name)) {
      throw new Error(`Tool ${tool.name} is already registered`);
    }
    this.tools.set(tool.name, tool);
  }

  getTool(name: string): ToolHandler | undefined {
    return this.tools.get(name);
  }

  listTools(): ToolHandler[] {
    return Array.from(this.tools.values());
  }

  getToolSchemas(): ToolSchema[] {
    return this.listTools().map(tool => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema,
    }));
  }

  validateTool(tool: ToolHandler): ValidationResult {
    // Validate tool schema and implementation
    const validation = validateToolSchema(tool.inputSchema);
    if (!validation.success) {
      return { success: false, errors: validation.errors };
    }
    return { success: true };
  }
}
```

### 2. Base Tool Class
Implement the abstract base class:

```typescript
// src/tools/base.ts
export abstract class BaseTool {
  abstract readonly name: string;
  abstract readonly description: string;
  abstract readonly inputSchema: JSONSchema7;
  
  abstract execute(
    params: ToolInput,
    context: ToolContext
  ): Promise<ToolResult>;
  
  validateInput(params: unknown): ValidationResult {
    try {
      const validator = new Ajv();
      const validate = validator.compile(this.inputSchema);
      const isValid = validate(params);
      
      if (!isValid) {
        return {
          success: false,
          errors: validate.errors || [],
        };
      }
      
      return { success: true };
    } catch (error) {
      return {
        success: false,
        errors: [{ message: 'Validation failed', path: '' }],
      };
    }
  }
  
  protected async handleError(error: Error): Promise<ToolResult> {
    return {
      success: false,
      error: {
        code: 'TOOL_EXECUTION_ERROR',
        message: error.message,
        details: error.stack,
      },
    };
  }
  
  protected validatePermissions(
    context: ToolContext,
    requiredPermissions: string[]
  ): boolean {
    const session = context.session;
    if (!session) {
      return false;
    }
    
    return requiredPermissions.every(permission => 
      session.permissions.includes(permission)
    );
  }
}
```

### 3. Tool Handler Interface
Define the tool handler interface:

```typescript
// src/tools/types.ts
export interface ToolHandler {
  name: string;
  description: string;
  inputSchema: JSONSchema7;
  execute(params: ToolInput, context: ToolContext): Promise<ToolResult>;
}

export interface ToolContext {
  apiClient: APIClient;
  auth: AuthManager;
  config: MailcowConfig;
  logger: Logger;
  session: Session;
}

export interface ToolResult {
  success: boolean;
  data?: unknown;
  error?: ToolError;
}

export interface ToolError {
  code: string;
  message: string;
  details?: string;
}
```

### 4. Tool Validation
Implement comprehensive validation:

```typescript
// src/tools/validation.ts
export function validateToolInput(
  input: unknown,
  schema: JSONSchema7
): ValidationResult {
  try {
    const validator = new Ajv();
    const validate = validator.compile(schema);
    const isValid = validate(input);
    
    if (!isValid) {
      return {
        success: false,
        errors: validate.errors || [],
      };
    }
    
    return { success: true };
  } catch (error) {
    return {
      success: false,
      errors: [{ message: 'Validation failed', path: '' }],
    };
  }
}

export function validateToolSchema(schema: JSONSchema7): ValidationResult {
  try {
    // Validate that the schema is valid JSON Schema
    const validator = new Ajv();
    validator.compile(schema);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      errors: [{ message: 'Invalid schema', path: '' }],
    };
  }
}

export function sanitizeToolInput(input: unknown): unknown {
  if (typeof input === 'string') {
    return sanitizeString(input);
  }
  if (typeof input === 'object' && input !== null) {
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(input)) {
      sanitized[sanitizeString(key)] = sanitizeToolInput(value);
    }
    return sanitized;
  }
  return input;
}
```

### 5. Tool Error Handling
Implement error handling:

```typescript
// src/tools/errors.ts
export class ToolError extends Error {
  constructor(
    message: string,
    public toolName: string,
    public errorCode: string
  ) {
    super(message);
    this.name = 'ToolError';
  }
}

export class ToolValidationError extends ToolError {
  constructor(toolName: string, validationErrors: ValidationError[]) {
    super(`Input validation failed: ${validationErrors.map(e => e.message).join(', ')}`, toolName, 'VALIDATION_ERROR');
    this.name = 'ToolValidationError';
  }
}

export class ToolExecutionError extends ToolError {
  constructor(toolName: string, originalError: Error) {
    super(`Tool execution failed: ${originalError.message}`, toolName, 'EXECUTION_ERROR');
    this.name = 'ToolExecutionError';
  }
}

export class ToolPermissionError extends ToolError {
  constructor(toolName: string, requiredPermissions: string[]) {
    super(`Insufficient permissions: ${requiredPermissions.join(', ')}`, toolName, 'PERMISSION_ERROR');
    this.name = 'ToolPermissionError';
  }
}
```

## 🧪 Testing Requirements
- Unit tests for tool registry
- Unit tests for base tool class
- Unit tests for tool validation
- Unit tests for tool error handling
- Integration tests with mock tools
- Performance tests for tool registry

## 📝 Documentation Requirements
- JSDoc comments for all public methods
- Tool development guide
- Tool validation documentation
- Error handling documentation

## 🔄 Communication with Other Teams
- Provide clear tool interfaces for Teams I-N
- Document tool development patterns
- Share validation patterns with other teams
- Communicate tool registry changes clearly

## ✅ Success Criteria
- [ ] Tool registry works correctly
- [ ] Base tool class is comprehensive
- [ ] Tool validation is robust
- [ ] Error handling is comprehensive
- [ ] All tests pass
- [ ] Documentation is complete
- [ ] Teams I-N can implement tools easily

## 🚨 Important Considerations

### 1. MCP Compliance
- Follow MCP tool specification exactly
- Implement proper JSON-RPC 2.0 compliance
- Handle tool schemas correctly
- Support model-controlled tool invocation

### 2. Security
- Validate all tool inputs
- Check permissions before tool execution
- Sanitize tool outputs
- Log tool executions appropriately

### 3. Performance
- Optimize tool registry operations
- Implement efficient tool lookup
- Cache tool schemas when appropriate
- Monitor tool execution performance

### 4. Usability
- Make tool development easy for Teams I-N
- Provide clear examples and patterns
- Include comprehensive error messages
- Support tool debugging

## 🔧 Mock Implementations for Testing
Create mock implementations for Teams I-N to use:

```typescript
// src/tools/mocks.ts
export class MockTool extends BaseTool {
  readonly name = 'mock_tool';
  readonly description = 'A mock tool for testing';
  readonly inputSchema = {
    type: 'object',
    properties: {
      message: { type: 'string' },
    },
    required: ['message'],
  };

  async execute(params: ToolInput, context: ToolContext): Promise<ToolResult> {
    return {
      success: true,
      data: { response: `Mock response: ${params.message}` },
    };
  }
}

export class MockToolRegistry {
  private tools = new Map<string, ToolHandler>();

  registerTool(tool: ToolHandler): void {
    this.tools.set(tool.name, tool);
  }

  getTool(name: string): ToolHandler | undefined {
    return this.tools.get(name);
  }

  listTools(): ToolHandler[] {
    return Array.from(this.tools.values());
  }
}
```

## 📞 Team Communication
- Provide clear tool interfaces for Teams I-N
- Document tool development patterns
- Share validation patterns with other teams
- Communicate tool registry changes clearly

## 🎯 Next Steps
1. Read the README files thoroughly
2. Implement the tool registry
3. Implement the base tool class
4. Implement tool validation
5. Implement tool error handling
6. Write comprehensive tests
7. Update documentation
8. Share interfaces with Teams I-N

**Remember:** Your tool registry and base classes enable Teams I-N to implement domain-specific tools. Focus on clarity, security, and ease of use for tool developers. 