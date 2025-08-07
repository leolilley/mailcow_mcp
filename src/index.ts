#!/usr/bin/env node

/**
 * Mailcow MCP Server Entry Point
 * Main server implementation that connects MCP protocol with Mailcow API
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';

// Import existing components
import { configManager } from './config/index.js';
import { AuthManager } from './auth/index.js';
import { APIClient } from './api/client.js';
import { ToolRegistry } from './tools/registry.js';
import { Logger, ConsoleLogDestination } from './utils/logger.js';

// Import tool implementations (when they exist)
import { DomainTools } from './tools/domains/index.js';
import { DomainAPI } from './api/domains/index.js';
import { MailboxTools } from './tools/mailboxes/index.js';
import { MailboxAPI } from './api/mailboxes/index.js';
import { UserTools } from './tools/users/index.js';
import { UsersAPI } from './api/users/index.js';
import { DKIMTools } from './tools/dkim/index.js';
import { DKIMAPI } from './api/dkim/index.js';
// import { AliasTools } from './tools/aliases/index.js';

/**
 * Main MCP Server class
 */
class MailcowMCPServer {
  private server: Server;
  private authManager: AuthManager;
  private apiClient: APIClient | null = null;
  private toolRegistry: ToolRegistry;
  private logger: Logger;
  private isInitialized = false;

  constructor() {
    // Initialize MCP Server
    this.server = new Server(
      {
        name: 'mailcow-mcp',
        version: '0.1.0',
      }
    );

    // Initialize logger
    this.logger = new Logger(
      { level: 'info' },
      new ConsoleLogDestination()
    );

    // Initialize components
    this.authManager = new AuthManager();
    this.toolRegistry = new ToolRegistry(this.logger);

    // Set up MCP protocol handlers
    this.setupProtocolHandlers();
  }

  /**
   * Initialize the server with configuration
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      // Load configuration
      const configResult = await configManager.loadConfig();
      if (!configResult.success) {
        throw new Error(`Configuration validation failed: ${configResult.errors?.join(', ')}`);
      }

      const config = configManager.getConfig();
      this.logger.info('Configuration loaded successfully', { 
        apiUrl: config.api.url,
        serverPort: config.server.port 
      });

      // Validate API key if provided
      if (config.api.key) {
        const keyValidation = await this.authManager.validateAPIKey(config.api.key);
        if (!keyValidation.success) {
          throw new Error(`API key validation failed: ${keyValidation.error}`);
        }

        // Initialize API client
        this.apiClient = new APIClient({
          url: config.api.url,
          key: config.api.key,
          accessType: config.api.accessType,
          timeout: config.api.timeout,
          verifySSL: config.api.verifySSL,
          retryAttempts: config.api.retryAttempts,
          rateLimit: config.api.rateLimit,
        });

        this.logger.info('API client initialized', { 
          url: config.api.url,
          accessType: config.api.accessType
        });
      } else {
        this.logger.warn('No API key provided - server will run in limited mode');
      }

      // Register available tools
      await this.registerTools();

      this.isInitialized = true;
      this.logger.info('Mailcow MCP Server initialized successfully');

    } catch (error) {
      this.logger.error('Failed to initialize server', error as Error);
      throw error;
    }
  }

  /**
   * Set up MCP protocol request handlers
   */
  private setupProtocolHandlers(): void {
    // Handle tool listing
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      const tools = this.toolRegistry.getToolSchemas();
      this.logger.debug(`Listing ${tools.length} available tools`);
      
      return {
        tools: tools.map(tool => ({
          name: tool.name,
          description: tool.description,
          inputSchema: tool.inputSchema,
        })),
      };
    });

    // Handle tool execution
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name: toolName, arguments: toolArgs } = request.params;
      
      this.logger.info(`Executing tool: ${toolName}`, { 
        tool: toolName,
        hasArgs: !!toolArgs 
      });

      try {
        // Create execution context
        const context = await this.createToolContext(toolName);
        
        // Execute tool
        const result = await this.toolRegistry.execute(toolName, toolArgs || {}, context);
        
        if (result.success && result.result) {
          this.logger.info(`Tool executed successfully: ${toolName}`, { tool: toolName });
          return {
            content: result.result.content,
            isError: result.result.isError,
          };
        } else {
          this.logger.error(`Tool execution failed: ${toolName}`, undefined, { 
            tool: toolName, 
            error: result.error?.message 
          });
          return {
            content: [{
              type: 'text',
              text: result.error?.message || 'Tool execution failed',
            }],
            isError: true,
          };
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        this.logger.error(`Tool execution error: ${toolName}`, error as Error, { tool: toolName });
        
        return {
          content: [{
            type: 'text',
            text: `Error executing tool ${toolName}: ${errorMessage}`,
          }],
          isError: true,
        };
      }
    });

    // Handle server shutdown
    this.server.onerror = (error) => {
      this.logger.error('MCP Server error', error);
    };
  }

  /**
   * Create tool execution context
   */
  private async createToolContext(toolName: string) {
    // Basic context - can be enhanced with user authentication later
    return {
      userId: 'system',
      requestId: this.generateRequestId(),
      permissions: ['execute', 'read', 'write'], // Based on API key capabilities
      accessLevel: 'read-write' as const, // From API key validation
      apiClient: this.apiClient,
      toolName,
      timestamp: new Date(),
    };
  }

  /**
   * Register available tools with the registry
   */
  private async registerTools(): Promise<void> {
    this.logger.info('Registering tools...');

    // Register basic system tools that are always available
    this.registerSystemTools();

    // Register API-dependent tools only if we have a working API client
    if (this.apiClient) {
      await this.registerApiTools();
    }

    const toolCount = this.toolRegistry.list().length;
    this.logger.info(`Registered ${toolCount} tools`);
  }

  /**
   * Register system tools that don't require API access
   */
  private registerSystemTools(): void {
    // Health check tool
    this.toolRegistry.register({
      name: 'health_check',
      description: 'Check the health status of the MCP server',
      inputSchema: {
        type: 'object',
        properties: {},
        required: [],
      },
    });

    this.toolRegistry.registerHandler('health_check', async (_input, _context) => {
      const config = configManager.getConfig();
      const health = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        server: {
          name: 'mailcow-mcp',
          version: '0.1.0',
          uptime: process.uptime(),
        },
        api: {
          configured: !!this.apiClient,
          url: config.api.url,
        },
        tools: {
          count: this.toolRegistry.list().length,
        },
      };

      return {
        success: true,
        result: {
          content: [{
            type: 'text',
            text: JSON.stringify(health, null, 2),
          }],
        },
      };
    });

    // Configuration info tool
    this.toolRegistry.register({
      name: 'get_config',
      description: 'Get current server configuration (sanitized)',
      inputSchema: {
        type: 'object',
        properties: {},
        required: [],
      },
    });

    this.toolRegistry.registerHandler('get_config', async (_input, _context) => {
      const config = configManager.getConfig();
      
      // Sanitize sensitive information
      const sanitizedConfig = {
        api: {
          url: config.api.url,
          timeout: config.api.timeout,
          hasKey: !!config.api.key,
        },
        server: config.server,
        logging: config.logging,
      };

      return {
        success: true,
        result: {
          content: [{
            type: 'text',
            text: JSON.stringify(sanitizedConfig, null, 2),
          }],
        },
      };
    });
  }

  /**
   * Register API-dependent tools
   */
  private async registerApiTools(): Promise<void> {
    if (!this.apiClient) {
      this.logger.warn('API client not available - skipping API tool registration');
      return;
    }

    // Basic API connectivity test tool
    this.toolRegistry.register({
      name: 'test_api_connection',
      description: 'Test connectivity to the Mailcow API',
      inputSchema: {
        type: 'object',
        properties: {},
        required: [],
      },
    });

    this.toolRegistry.registerHandler('test_api_connection', async (_input, _context) => {
      try {
        const client = this.apiClient;
        if (!client) {
          throw new Error('API client not available');
        }

        // Try to make a basic API call
        const response = await client.get('/api/v1/get/domain/all');
        
        return {
          success: true,
          result: {
            content: [{
              type: 'text',
              text: JSON.stringify({
                status: 'connected',
                timestamp: new Date().toISOString(),
                response: Array.isArray(response) ? `${response.length} domains found` : 'API responded',
              }, null, 2),
            }],
          },
        };
      } catch (error) {
        return {
          success: false,
          error: {
            code: -32000,
            message: `API connection test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          },
        };
      }
    });

    // Register domain tools
    await this.registerDomainTools();
    
    // Register mailbox tools
    await this.registerMailboxTools();
    
    // Register user tools
    await this.registerUserTools();
    
    // Register DKIM tools
    await this.registerDKIMTools();
    
    // TODO: Register alias tools when implemented
    // await this.registerAliasTools();
  }

  /**
   * Register domain management tools
   */
  private async registerDomainTools(): Promise<void> {
    if (!this.apiClient) {
      this.logger.warn('API client not available - skipping domain tools registration');
      return;
    }

    try {
      // Create domain API instance
      const domainAPI = new DomainAPI(this.apiClient);

      // Create and register domain tools
      const listTool = new DomainTools.ListDomainsTool(this.logger, domainAPI);
      const getTool = new DomainTools.GetDomainTool(this.logger, domainAPI);
      const createTool = new DomainTools.CreateDomainTool(this.logger, domainAPI);
      const updateTool = new DomainTools.UpdateDomainTool(this.logger, domainAPI);
      const deleteTool = new DomainTools.DeleteDomainTool(this.logger, domainAPI);

      // Register tools with the registry
      this.toolRegistry.register({
        name: listTool.name,
        description: listTool.description,
        inputSchema: listTool.inputSchema,
      });

      this.toolRegistry.register({
        name: getTool.name,
        description: getTool.description,
        inputSchema: getTool.inputSchema,
      });

      this.toolRegistry.register({
        name: createTool.name,
        description: createTool.description,
        inputSchema: createTool.inputSchema,
      });

      this.toolRegistry.register({
        name: updateTool.name,
        description: updateTool.description,
        inputSchema: updateTool.inputSchema,
      });

      this.toolRegistry.register({
        name: deleteTool.name,
        description: deleteTool.description,
        inputSchema: deleteTool.inputSchema,
      });

      // Register tool handlers
      this.toolRegistry.registerHandler(listTool.name, async (input, context) => {
        return await listTool.execute(input, context);
      });

      this.toolRegistry.registerHandler(getTool.name, async (input, context) => {
        return await getTool.execute(input, context);
      });

      this.toolRegistry.registerHandler(createTool.name, async (input, context) => {
        return await createTool.execute(input, context);
      });

      this.toolRegistry.registerHandler(updateTool.name, async (input, context) => {
        return await updateTool.execute(input, context);
      });

      this.toolRegistry.registerHandler(deleteTool.name, async (input, context) => {
        return await deleteTool.execute(input, context);
      });

      this.logger.info('Domain tools registered successfully', {
        tools: [listTool.name, getTool.name, createTool.name, updateTool.name, deleteTool.name]
      });

    } catch (error) {
      this.logger.error('Failed to register domain tools', error);
      throw error;
    }
  }

  /**
   * Register mailbox management tools
   */
  private async registerMailboxTools(): Promise<void> {
    if (!this.apiClient) {
      this.logger.warn('API client not available - skipping mailbox tools registration');
      return;
    }

    try {
      // Create mailbox API instance
      const mailboxAPI = new MailboxAPI(this.apiClient);

      // Create and register mailbox tools
      const listTool = new MailboxTools.ListMailboxesTool(this.logger, mailboxAPI);
      const getTool = new MailboxTools.GetMailboxTool(this.logger, mailboxAPI);
      const createTool = new MailboxTools.CreateMailboxTool(this.logger, mailboxAPI);
      const updateTool = new MailboxTools.UpdateMailboxTool(this.logger, mailboxAPI);
      const deleteTool = new MailboxTools.DeleteMailboxTool(this.logger, mailboxAPI);

      // Register tools with the registry
      this.toolRegistry.register({
        name: listTool.name,
        description: listTool.description,
        inputSchema: listTool.inputSchema,
      });

      this.toolRegistry.register({
        name: getTool.name,
        description: getTool.description,
        inputSchema: getTool.inputSchema,
      });

      this.toolRegistry.register({
        name: createTool.name,
        description: createTool.description,
        inputSchema: createTool.inputSchema,
      });

      this.toolRegistry.register({
        name: updateTool.name,
        description: updateTool.description,
        inputSchema: updateTool.inputSchema,
      });

      this.toolRegistry.register({
        name: deleteTool.name,
        description: deleteTool.description,
        inputSchema: deleteTool.inputSchema,
      });

      // Register tool handlers
      this.toolRegistry.registerHandler(listTool.name, async (input, context) => {
        return await listTool.execute(input, context);
      });

      this.toolRegistry.registerHandler(getTool.name, async (input, context) => {
        return await getTool.execute(input, context);
      });

      this.toolRegistry.registerHandler(createTool.name, async (input, context) => {
        return await createTool.execute(input, context);
      });

      this.toolRegistry.registerHandler(updateTool.name, async (input, context) => {
        return await updateTool.execute(input, context);
      });

      this.toolRegistry.registerHandler(deleteTool.name, async (input, context) => {
        return await deleteTool.execute(input, context);
      });

      this.logger.info('Mailbox tools registered successfully', {
        tools: [listTool.name, getTool.name, createTool.name, updateTool.name, deleteTool.name]
      });

    } catch (error) {
      this.logger.error('Failed to register mailbox tools', error);
      throw error;
    }
  }

  /**
   * Register user management tools
   */
  private async registerUserTools(): Promise<void> {
    if (!this.apiClient) {
      this.logger.warn('API client not available - skipping user tools registration');
      return;
    }

    try {
      // Create users API instance
      const usersAPI = new UsersAPI(this.apiClient);

      // Create and register user tools
      const listTool = new UserTools.ListUsersTool(this.logger, usersAPI);
      const getTool = new UserTools.GetUserTool(this.logger, usersAPI);
      const createTool = new UserTools.CreateUserTool(this.logger, usersAPI);
      const updateTool = new UserTools.UpdateUserTool(this.logger, usersAPI);
      const deleteTool = new UserTools.DeleteUserTool(this.logger, usersAPI);

      // Register tools with the registry
      this.toolRegistry.register({
        name: listTool.name,
        description: listTool.description,
        inputSchema: listTool.inputSchema,
      });

      this.toolRegistry.register({
        name: getTool.name,
        description: getTool.description,
        inputSchema: getTool.inputSchema,
      });

      this.toolRegistry.register({
        name: createTool.name,
        description: createTool.description,
        inputSchema: createTool.inputSchema,
      });

      this.toolRegistry.register({
        name: updateTool.name,
        description: updateTool.description,
        inputSchema: updateTool.inputSchema,
      });

      this.toolRegistry.register({
        name: deleteTool.name,
        description: deleteTool.description,
        inputSchema: deleteTool.inputSchema,
      });

      // Register tool handlers
      this.toolRegistry.registerHandler(listTool.name, async (input, context) => {
        return await listTool.execute(input, context);
      });

      this.toolRegistry.registerHandler(getTool.name, async (input, context) => {
        return await getTool.execute(input, context);
      });

      this.toolRegistry.registerHandler(createTool.name, async (input, context) => {
        return await createTool.execute(input, context);
      });

      this.toolRegistry.registerHandler(updateTool.name, async (input, context) => {
        return await updateTool.execute(input, context);
      });

      this.toolRegistry.registerHandler(deleteTool.name, async (input, context) => {
        return await deleteTool.execute(input, context);
      });

      this.logger.info('User tools registered successfully', {
        tools: [listTool.name, getTool.name, createTool.name, updateTool.name, deleteTool.name]
      });

    } catch (error) {
      this.logger.error('Failed to register user tools', error);
      throw error;
    }
  }

  /**
   * Register DKIM management tools
   */
  private async registerDKIMTools(): Promise<void> {
    if (!this.apiClient) {
      this.logger.warn('API client not available - skipping DKIM tools registration');
      return;
    }

    try {
      // Create DKIM API instance
      const dkimAPI = new DKIMAPI(this.apiClient);

      // Create and register DKIM tools
      const listTool = new DKIMTools.ListDKIMKeysTool(this.logger, dkimAPI);
      const getTool = new DKIMTools.GetDKIMKeyTool(this.logger, dkimAPI);
      const createTool = new DKIMTools.CreateDKIMKeyTool(this.logger, dkimAPI);
      const updateTool = new DKIMTools.UpdateDKIMKeyTool(this.logger, dkimAPI);
      const deleteTool = new DKIMTools.DeleteDKIMKeyTool(this.logger, dkimAPI);

      // Register tools with the registry
      this.toolRegistry.register({
        name: listTool.name,
        description: listTool.description,
        inputSchema: listTool.inputSchema,
      });

      this.toolRegistry.register({
        name: getTool.name,
        description: getTool.description,
        inputSchema: getTool.inputSchema,
      });

      this.toolRegistry.register({
        name: createTool.name,
        description: createTool.description,
        inputSchema: createTool.inputSchema,
      });

      this.toolRegistry.register({
        name: updateTool.name,
        description: updateTool.description,
        inputSchema: updateTool.inputSchema,
      });

      this.toolRegistry.register({
        name: deleteTool.name,
        description: deleteTool.description,
        inputSchema: deleteTool.inputSchema,
      });

      // Register tool handlers
      this.toolRegistry.registerHandler(listTool.name, async (input, context) => {
        return await listTool.execute(input, context);
      });

      this.toolRegistry.registerHandler(getTool.name, async (input, context) => {
        return await getTool.execute(input, context);
      });

      this.toolRegistry.registerHandler(createTool.name, async (input, context) => {
        return await createTool.execute(input, context);
      });

      this.toolRegistry.registerHandler(updateTool.name, async (input, context) => {
        return await updateTool.execute(input, context);
      });

      this.toolRegistry.registerHandler(deleteTool.name, async (input, context) => {
        return await deleteTool.execute(input, context);
      });

      this.logger.info('DKIM tools registered successfully', {
        tools: [listTool.name, getTool.name, createTool.name, updateTool.name, deleteTool.name]
      });

    } catch (error) {
      this.logger.error('Failed to register DKIM tools', error);
      throw error;
    }
  }

  /**
   * Start the MCP server
   */
  async start(): Promise<void> {
    try {
      // Initialize server components
      await this.initialize();

      // Create transport and connect
      const transport = new StdioServerTransport();
      
      this.logger.info('Starting Mailcow MCP Server...');
      
      // Connect server to transport
      await this.server.connect(transport);
      
      this.logger.info('Mailcow MCP Server started successfully');
      
    } catch (error) {
      this.logger.error('Failed to start server', error as Error);
      process.exit(1);
    }
  }

  /**
   * Stop the server gracefully
   */
  async stop(): Promise<void> {
    try {
      this.logger.info('Stopping Mailcow MCP Server...');
      
      // Close server connection
      if (this.server) {
        await this.server.close();
      }
      
      this.logger.info('Mailcow MCP Server stopped');
      
    } catch (error) {
      this.logger.error('Error stopping server', error as Error);
    }
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * Main entry point
 */
async function main(): Promise<void> {
  const server = new MailcowMCPServer();

  // Handle process signals for graceful shutdown
  // Create logger for process events
  const processLogger = new Logger({ level: 'info' }, new ConsoleLogDestination());

  process.on('SIGINT', async () => {
    processLogger.info('Received SIGINT, shutting down gracefully...');
    await server.stop();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    processLogger.info('Received SIGTERM, shutting down gracefully...');
    await server.stop();
    process.exit(0);
  });

  // Handle uncaught errors
  process.on('uncaughtException', (error) => {
    processLogger.error('Uncaught exception', error);
    process.exit(1);
  });

  process.on('unhandledRejection', (reason, promise) => {
    processLogger.error('Unhandled promise rejection', new Error(String(reason)), { promise });
    process.exit(1);
  });

  // Start the server
  await server.start();
}

// Only run if this file is executed directly (not imported)
if (require.main === module) {
  main().catch((error) => {
    console.error('Failed to start server:', error);
    process.exit(1);
  });
}

export { MailcowMCPServer };
export default MailcowMCPServer;