# Tools Directory

This directory contains MCP tool implementations for the Mailcow MCP server.

## Current Structure

```
tools/
├── README.md             # This documentation
├── aliases/             # Placeholder: Alias management tools
├── domains/             # Placeholder: Domain management tools  
├── logs/                # Placeholder: Log management tools
├── mailboxes/           # Placeholder: Mailbox management tools
├── resources/           # Placeholder: Resource management tools
├── spam/                # Placeholder: Spam management tools
└── system/              # Placeholder: System management tools
```

**Note:** This directory is currently a placeholder structure. Tool types are defined in `src/types/tools.ts`.

## Planned Implementation Structure

When implemented, the structure will be:

```
tools/
├── index.ts              # Main tools exports
├── registry.ts           # Tool registry and management
├── base.ts               # Base tool classes and interfaces
├── domains/             # Domain management tools
│   ├── create-domain.ts
│   ├── list-domains.ts
│   ├── update-domain.ts
│   └── delete-domain.ts
├── mailboxes/           # Mailbox management tools
│   ├── create-mailbox.ts
│   ├── list-mailboxes.ts
│   ├── update-mailbox.ts
│   └── delete-mailbox.ts
├── aliases/             # Alias management tools
│   ├── create-alias.ts
│   ├── list-aliases.ts
│   ├── update-alias.ts
│   └── delete-alias.ts
├── system/              # System management tools
│   ├── system-status.ts
│   ├── service-status.ts
│   └── system-info.ts
├── logs/                # Log management tools
│   ├── get-logs.ts
│   └── search-logs.ts
├── spam/                # Spam management tools
│   ├── get-spam-settings.ts
│   └── update-spam-settings.ts
├── validation.ts        # Tool input validation
└── errors.ts            # Tool error handling
```

## Planned Tool Categories

### 1. Domain Management Tools
- **create-domain**: Create new domains in Mailcow
- **list-domains**: List existing domains with filtering
- **update-domain**: Modify domain settings
- **delete-domain**: Remove domains from Mailcow
- **domain-info**: Get detailed domain information

### 2. Mailbox Management Tools
- **create-mailbox**: Create new mailboxes
- **list-mailboxes**: List mailboxes with filtering
- **update-mailbox**: Modify mailbox settings
- **delete-mailbox**: Remove mailboxes
- **mailbox-quota**: Manage mailbox quotas

### 3. Alias Management Tools
- **create-alias**: Create email aliases
- **list-aliases**: List existing aliases
- **update-alias**: Modify alias settings
- **delete-alias**: Remove aliases

### 4. System Management Tools
- **system-status**: Get overall system status
- **service-status**: Check individual service status
- **system-info**: Get system information
- **restart-services**: Restart Mailcow services

### 5. Log Management Tools
- **get-logs**: Retrieve log entries
- **search-logs**: Search logs with filters
- **export-logs**: Export logs for analysis

### 6. Spam Management Tools
- **get-spam-settings**: Retrieve spam filter settings
- **update-spam-settings**: Modify spam filter settings
- **spam-statistics**: Get spam filtering statistics

## Planned Tool Interface

Each tool will implement the standard MCP tool interface:

```typescript
interface MailcowTool {
  name: string;
  description: string;
  inputSchema: ToolSchema;
  handler: ToolHandler;
}

interface ToolHandler {
  (input: unknown, context: ToolContext): Promise<ToolResult>;
}

interface ToolContext {
  apiClient: APIClient;
  authManager: AuthManager;
  logger: Logger;
  config: MailcowConfig;
}
```

## Planned Implementation Features

### 1. Tool Registry
- Automatic tool discovery and registration
- Schema validation for tool inputs
- Permission checking before execution
- Error handling and logging

### 2. Base Tool Class
```typescript
abstract class BaseTool implements MailcowTool {
  abstract name: string;
  abstract description: string;
  abstract inputSchema: ToolSchema;
  
  abstract execute(input: unknown, context: ToolContext): Promise<ToolResult>;
  
  protected validateInput(input: unknown): void {
    // Schema validation logic
  }
  
  protected checkPermissions(context: ToolContext): void {
    // Permission checking logic
  }
}
```

### 3. Tool Validation
- Input schema validation using Zod
- Permission-based access control
- Rate limiting and security checks
- Audit logging for all tool executions

### 4. Error Handling
- Standardized error responses
- Error categorization and logging
- User-friendly error messages
- Debug information for development

## Integration with MCP Protocol

### Tool Schema Definition
```json
{
  "name": "create-domain",
  "description": "Create a new domain in Mailcow",
  "inputSchema": {
    "type": "object",
    "properties": {
      "domain": {
        "type": "string",
        "description": "Domain name to create"
      },
      "description": {
        "type": "string", 
        "description": "Optional domain description"
      }
    },
    "required": ["domain"]
  }
}
```

### Tool Execution Flow
1. **Input Validation**: Validate against schema
2. **Permission Check**: Verify user has required permissions  
3. **API Call**: Execute operation via Mailcow API
4. **Response Processing**: Format response for MCP client
5. **Logging**: Record execution and results

## Security Considerations

### 1. Permission System
- Tools check user permissions before execution
- Read-only vs read-write access enforcement
- Resource-specific permissions (domain, mailbox, etc.)

### 2. Input Validation  
- All inputs validated against schemas
- Sanitization of user inputs
- Protection against injection attacks

### 3. Audit Logging
- All tool executions logged
- Failed attempts and permission denials recorded
- Context information for security analysis

## Future Implementation Plan

### Phase 1: Core Infrastructure
1. Implement tool registry and base classes
2. Create validation and error handling systems
3. Set up permission checking framework

### Phase 2: Domain Tools
1. Implement domain CRUD operations
2. Add domain listing and filtering
3. Create domain validation tools

### Phase 3: Mailbox Tools  
1. Implement mailbox CRUD operations
2. Add quota management tools
3. Create mailbox search functionality

### Phase 4: System Tools
1. Implement system status tools
2. Add service management tools
3. Create log management tools

### Phase 5: Advanced Features
1. Add spam management tools
2. Implement bulk operations
3. Create reporting and analytics tools

## Development Guidelines

When implementing tools:

1. **Follow Interface**: Implement the standard tool interface
2. **Schema First**: Define input schema before implementation
3. **Permission Aware**: Always check permissions
4. **Error Handling**: Provide meaningful error messages
5. **Testing**: Write comprehensive unit tests
6. **Documentation**: Document all tools and schemas 