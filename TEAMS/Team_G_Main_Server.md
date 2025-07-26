# Team G: Main Server Entry Point

## 🎯 Mission
You are Team G, responsible for implementing the main server entry point for the Mailcow MCP server. Your work integrates all components from other teams and provides the complete MCP server implementation.

## 📋 Your Responsibilities

### Core Files to Implement:
- `src/index.ts` - Main server entry point
> **IMPORTANT:** All type definitions must be imported from `src/types/index.ts`. Do **not** create new type files in the main server or any other folder. If you need a new type, add it to the appropriate file in `src/types/` and export it via `src/types/index.ts`.

## 📚 Required Reading
1. **Read `src/README.md`** - Overall source code structure
2. **Read `src/types/README.md`** - Type definitions you'll use
3. **Read `src/config/README.md`** - Configuration patterns
4. **Read `src/auth/README.md`** - Authentication integration
5. **Read `src/api/README.md`** - API client integration
6. **Read `src/tools/README.md`** - Tool registry integration
7. **Read `src/resources/README.md`** - Resource registry integration
8. **Read `src/utils/README.md`** - Utility integration
9. **Read `PLAN.md`** - Overall project plan and server requirements
10. **Read `IMPLEMENTATION_GUIDE.md`** - Your team assignment details

## 🎯 Key Deliverables

### 1. Main Server Implementation
- MCP server initialization
- Tool and resource registration
- Request/response handling
- Error handling and logging
- Server lifecycle management

### 2. MCP Protocol Compliance
- JSON-RPC 2.0 compliance
- Proper message handling
- Error code mapping
- Capability negotiation

### 3. Component Integration
- Integration with all other teams' components
- Proper dependency injection
- Configuration management
- Authentication integration

## 🔗 Dependencies
- **All previous teams (A-F)** - You depend on all their implementations
- **Teams I-P** - You integrate their domain-specific components
- **Dependents:** None

## 🚀 Implementation Guidelines

> **Type Usage:** All types must be imported from `src/types/index.ts`. Do not define or use types from any local type file.

### 1. Main Server Class
Implement the main server class:

```typescript
// src/index.ts
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { 
  InitializeRequest,
  InitializeResult,
  ListToolsRequest,
  ListToolsResult,
  CallToolRequest,
  CallToolResult,
  ListResourcesRequest,
  ListResourcesResult,
  ReadResourceRequest,
  ReadResourceResult,
  ErrorCode,
} from '@modelcontextprotocol/sdk/types.js';

import { loadConfig } from './config/index.js';
import { AuthManager } from './auth/index.js';
import { APIClient } from './api/index.js';
import { ToolRegistry } from './tools/index.js';
import { ResourceRegistry } from './resources/index.js';
import { Logger } from './utils/logger.js';

export class MailcowMCPServer {
  private server: Server;
  private config: MailcowConfig;
  private auth: AuthManager;
  private apiClient: APIClient;
  private toolRegistry: ToolRegistry;
  private resourceRegistry: ResourceRegistry;
  private logger: Logger;

  constructor() {
    this.server = new Server(
      {
        name: 'mailcow-mcp',
        version: '0.1.0',
      },
      {
        capabilities: {
          tools: {},
          resources: {},
          prompts: {},
        },
      }
    );

    this.setupServer();
  }

  private setupServer(): void {
    // Initialize server request handler
    this.server.onRequest('initialize', this.handleInitialize.bind(this));
    this.server.onRequest('list_tools', this.handleListTools.bind(this));
    this.server.onRequest('call_tool', this.handleCallTool.bind(this));
    this.server.onRequest('list_resources', this.handleListResources.bind(this));
    this.server.onRequest('read_resource', this.handleReadResource.bind(this));

    // Notifications
    this.server.onNotify('initialized', this.handleInitialized.bind(this));
    this.server.onNotify('exit', this.handleExit.bind(this));
    this.server.onNotify('error', this.handleError.bind(this));
  }

  private async handleInitialize(request: InitializeRequest): Promise<InitializeResult> {
    try {
      // Load configuration
      this.config = await loadConfig();
      
      // Initialize authentication
      this.auth = new AuthManager(this.config.auth);
      
      // Initialize API client
      this.apiClient = new APIClient(this.config.api, this.auth);
      
      // Initialize tool registry
      this.toolRegistry = new ToolRegistry();
      await this.registerTools();
      
      // Initialize resource registry
      this.resourceRegistry = new ResourceRegistry();
      await this.registerResources();
      
      // Initialize logger
      this.logger = new Logger(this.config.logging);

      this.logger.info('Mailcow MCP server initialized successfully');

      return {
        protocolVersion: '2024-11-05',
        capabilities: {
          tools: {},
          resources: {},
          prompts: {},
        },
        serverInfo: {
          name: 'mailcow-mcp',
          version: '0.1.0',
        },
      };
    } catch (error) {
      this.logger?.error('Failed to initialize server', error as Error);
      throw new InitializeError('Failed to initialize server', {
        code: ErrorCode.InternalError,
        message: (error as Error).message,
      });
    }
  }

  private async handleListTools(request: ListToolsRequest): Promise<ListToolsResult> {
    try {
      const tools = this.toolRegistry.getToolSchemas();
      return { tools };
    } catch (error) {
      this.logger?.error('Failed to list tools', error as Error);
      throw new ListToolsError('Failed to list tools', {
        code: ErrorCode.InternalError,
        message: (error as Error).message,
      });
    }
  }

  private async handleCallTool(request: CallToolRequest): Promise<CallToolResult> {
    try {
      const { name, arguments: args } = request.params;
      
      this.logger?.info(`Calling tool: ${name}`, { arguments: args });
      
      const tool = this.toolRegistry.getTool(name);
      if (!tool) {
        throw new CallToolError(`Tool not found: ${name}`, {
          code: ErrorCode.InvalidRequest,
          message: `Tool '${name}' is not available`,
        });
      }

      // Create tool context
      const context = {
        apiClient: this.apiClient,
        auth: this.auth,
        config: this.config,
        logger: this.logger,
        session: await this.auth.getCurrentSession(),
      };

      // Execute tool
      const result = await tool.execute(args, context);
      
      this.logger?.info(`Tool ${name} executed successfully`);
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result.data, null, 2),
          },
        ],
        isError: !result.success,
      };
    } catch (error) {
      this.logger?.error(`Failed to execute tool: ${request.params.name}`, error as Error);
      throw new CallToolError(`Failed to execute tool: ${request.params.name}`, {
        code: ErrorCode.InternalError,
        message: (error as Error).message,
      });
    }
  }

  private async handleListResources(request: ListResourcesRequest): Promise<ListResourcesResult> {
    try {
      const resources = this.resourceRegistry.getResourceSchemas();
      return { resources };
    } catch (error) {
      this.logger?.error('Failed to list resources', error as Error);
      throw new ListResourcesError('Failed to list resources', {
        code: ErrorCode.InternalError,
        message: (error as Error).message,
      });
    }
  }

  private async handleReadResource(request: ReadResourceRequest): Promise<ReadResourceResult> {
    try {
      const { uri } = request.params;
      
      this.logger?.info(`Reading resource: ${uri}`);
      
      const resource = this.resourceRegistry.matchResource(uri);
      if (!resource) {
        throw new ReadResourceError(`Resource not found: ${uri}`, {
          code: ErrorCode.InvalidRequest,
          message: `Resource '${uri}' is not available`,
        });
      }

      // Create resource context
      const context = {
        apiClient: this.apiClient,
        auth: this.auth,
        config: this.config,
        logger: this.logger,
        session: await this.auth.getCurrentSession(),
        requestParams: this.extractResourceParams(uri, resource.uri),
      };

      // Get resource content
      const content = await resource.getContent(context);
      
      this.logger?.info(`Resource ${uri} read successfully`);
      
      return {
        contents: [
          {
            uri,
            mimeType: content.mimeType,
            text: content.content,
          },
        ],
      };
    } catch (error) {
      this.logger?.error(`Failed to read resource: ${request.params.uri}`, error as Error);
      throw new ReadResourceError(`Failed to read resource: ${request.params.uri}`, {
        code: ErrorCode.InternalError,
        message: (error as Error).message,
      });
    }
  }

  private async handleInitialized(request: NotifyInitializedRequest): Promise<void> {
    this.logger?.info('Client initialized');
  }

  private async handleExit(request: NotifyExitRequest): Promise<void> {
    this.logger?.info('Client requested exit');
    process.exit(0);
  }

  private async handleError(request: NotifyErrorRequest): Promise<void> {
    this.logger?.error('Client reported error', { error: request.params });
  }

  private async registerTools(): Promise<void> {
    // Import and register domain tools
    const { ListDomainsTool, CreateDomainTool, UpdateDomainTool, DeleteDomainTool } = await import('./tools/domains/index.js');
    this.toolRegistry.registerTool(new ListDomainsTool());
    this.toolRegistry.registerTool(new CreateDomainTool());
    this.toolRegistry.registerTool(new UpdateDomainTool());
    this.toolRegistry.registerTool(new DeleteDomainTool());

    // Import and register mailbox tools
    const { ListMailboxesTool, CreateMailboxTool, UpdateMailboxTool, DeleteMailboxTool } = await import('./tools/mailboxes/index.js');
    this.toolRegistry.registerTool(new ListMailboxesTool());
    this.toolRegistry.registerTool(new CreateMailboxTool());
    this.toolRegistry.registerTool(new UpdateMailboxTool());
    this.toolRegistry.registerTool(new DeleteMailboxTool());

    // Import and register alias tools
    const { ListAliasesTool, CreateAliasTool, UpdateAliasTool, DeleteAliasTool } = await import('./tools/aliases/index.js');
    this.toolRegistry.registerTool(new ListAliasesTool());
    this.toolRegistry.registerTool(new CreateAliasTool());
    this.toolRegistry.registerTool(new UpdateAliasTool());
    this.toolRegistry.registerTool(new DeleteAliasTool());

    // Import and register system tools
    const { GetSystemStatusTool, GetServiceStatusTool, RestartServiceTool } = await import('./tools/system/index.js');
    this.toolRegistry.registerTool(new GetSystemStatusTool());
    this.toolRegistry.registerTool(new GetServiceStatusTool());
    this.toolRegistry.registerTool(new RestartServiceTool());

    // Import and register spam tools
    const { GetSpamSettingsTool, UpdateSpamSettingsTool, AddWhitelistTool, AddBlacklistTool } = await import('./tools/spam/index.js');
    this.toolRegistry.registerTool(new GetSpamSettingsTool());
    this.toolRegistry.registerTool(new UpdateSpamSettingsTool());
    this.toolRegistry.registerTool(new AddWhitelistTool());
    this.toolRegistry.registerTool(new AddBlacklistTool());

    // Import and register log tools
    const { GetLogsTool, GetAccessLogsTool, GetErrorLogsTool } = await import('./tools/logs/index.js');
    this.toolRegistry.registerTool(new GetLogsTool());
    this.toolRegistry.registerTool(new GetAccessLogsTool());
    this.toolRegistry.registerTool(new GetErrorLogsTool());

    this.logger?.info(`Registered ${this.toolRegistry.listTools().length} tools`);
  }

  private async registerResources(): Promise<void> {
    // Import and register domain resources
    const { DomainsResource, DomainDetailsResource } = await import('./resources/domains/index.js');
    this.resourceRegistry.registerResource(new DomainsResource());
    this.resourceRegistry.registerResource(new DomainDetailsResource());

    // Import and register mailbox resources
    const { MailboxesResource, MailboxDetailsResource } = await import('./resources/mailboxes/index.js');
    this.resourceRegistry.registerResource(new MailboxesResource());
    this.resourceRegistry.registerResource(new MailboxDetailsResource());

    // Import and register alias resources
    const { AliasesResource, AliasDetailsResource } = await import('./resources/aliases/index.js');
    this.resourceRegistry.registerResource(new AliasesResource());
    this.resourceRegistry.registerResource(new AliasDetailsResource());

    // Import and register system resources
    const { SystemStatusResource, SystemLogsResource } = await import('./resources/system/index.js');
    this.resourceRegistry.registerResource(new SystemStatusResource());
    this.resourceRegistry.registerResource(new SystemLogsResource());

    this.logger?.info(`Registered ${this.resourceRegistry.listResources().length} resources`);
  }

  private extractResourceParams(uri: string, pattern: string): Record<string, string> {
    const params: Record<string, string> = {};
    const uriParts = uri.split('/');
    const patternParts = pattern.split('/');
    
    for (let i = 0; i < patternParts.length; i++) {
      const patternPart = patternParts[i];
      if (patternPart.startsWith('{') && patternPart.endsWith('}')) {
        const paramName = patternPart.slice(1, -1);
        params[paramName] = uriParts[i] || '';
      }
    }
    
    return params;
  }

  async start(): Promise<void> {
    try {
      const transport = new StdioServerTransport();
      await this.server.connect(transport);
      console.error('Mailcow MCP server started');
    } catch (error) {
      console.error('Failed to start Mailcow MCP server:', error);
      process.exit(1);
    }
  }
}

async function main(): Promise<void> {
  const server = new MailcowMCPServer();
  await server.start();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('Failed to start server:', error);
    process.exit(1);
  });
}

export { MailcowMCPServer };
```

## 🧪 Testing Requirements
- Unit tests for server initialization
- Unit tests for request handling
- Unit tests for error handling
- Integration tests with mock components
- End-to-end tests with real components
- Performance tests for server operations

## 📝 Documentation Requirements
- JSDoc comments for all public methods
- Server startup guide
- Configuration documentation
- Error handling documentation
- Integration documentation

## 🔄 Communication with Other Teams
- Integrate all components from other teams
- Handle component initialization errors
- Provide clear error messages for integration issues
- Document integration requirements

## ✅ Success Criteria
- [ ] Server starts correctly
- [ ] All tools are registered and working
- [ ] All resources are registered and working
- [ ] Error handling is comprehensive
- [ ] Logging is comprehensive
- [ ] All tests pass
- [ ] Documentation is complete

## 🚨 Important Considerations

### 1. Component Integration
- Handle missing or broken components gracefully
- Provide clear error messages for integration issues
- Implement proper dependency injection
- Handle component initialization errors

### 2. MCP Compliance
- Follow MCP specification exactly
- Implement proper JSON-RPC 2.0 compliance
- Handle all required MCP messages
- Implement proper error codes

### 3. Performance
- Optimize server startup time
- Implement efficient request handling
- Monitor server performance
- Handle concurrent requests properly

### 4. Error Handling
- Handle all types of errors gracefully
- Provide meaningful error messages
- Log errors appropriately
- Don't expose sensitive information

## 🔧 Mock Implementations for Testing
Create mock implementations for testing:

```typescript
// src/mocks.ts
export class MockMailcowMCPServer {
  private tools = new Map<string, ToolHandler>();
  private resources = new Map<string, ResourceHandler>();

  registerTool(tool: ToolHandler): void {
    this.tools.set(tool.name, tool);
  }

  registerResource(resource: ResourceHandler): void {
    this.resources.set(resource.uri, resource);
  }

  async start(): Promise<void> {
    console.log('Mock server started');
  }
}
```

## 📞 Team Communication
- Integrate all components from other teams
- Handle component initialization errors
- Provide clear error messages for integration issues
- Document integration requirements

## 🎯 Next Steps
1. Read all README files thoroughly
2. Implement the main server class
3. Integrate all components from other teams
4. Implement proper error handling
5. Write comprehensive tests
6. Update documentation
7. Test with real components

**Remember:** Your main server integrates all components from other teams. Focus on reliable integration, proper error handling, and comprehensive logging. 