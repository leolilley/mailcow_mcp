/**
 * Base Tool Classes
 * Abstract base classes and interfaces for tool implementations
 */

import { 
  Tool, 
  ToolInput, 
  ToolResult, 
  ToolError,
  ToolContext,
  ToolHandler,
  ToolHandlerResult,
  ToolValidationResult,
  ToolValidationError,
  ToolCategory,
  ToolMetadata,
  isToolContext,
  TextContent
} from '../types';
import { MCPErrorCode } from '../types';
import { Logger } from '../utils';
// Error classes are used in error handling methods
import { validateToolInput, validateToolSchema } from './validation';

/**
 * Abstract base class for all tool implementations
 */
export abstract class BaseTool implements Tool {
  abstract readonly name: string;
  abstract readonly description: string;
  abstract readonly inputSchema: Tool['inputSchema'];
  
  protected logger: Logger;
  protected metadata: ToolMetadata;

  constructor(logger: Logger, metadata?: Partial<ToolMetadata>) {
    this.logger = logger;
    this.metadata = {
      category: ToolCategory.UTILITY,
      version: '1.0.0',
      requiresAuth: true,
      rateLimited: false,
      ...metadata,
    };
  }

  /**
   * Execute the tool with input and context
   */
  abstract execute(
    input: ToolInput, 
    context: ToolContext
  ): Promise<ToolHandlerResult>;

  /**
   * Validate tool input against schema
   */
  validateInput(input: unknown): ToolValidationResult {
    try {
      const validation = validateToolInput(input, this.inputSchema);
      return validation;
    } catch (error) {
      return {
        valid: false,
        errors: [{
          field: '',
          message: error instanceof Error ? error.message : 'Validation failed',
          code: 'VALIDATION_ERROR',
        }],
        warnings: [],
      };
    }
  }

  /**
   * Validate tool schema
   */
  validateSchema(): ToolValidationResult {
    try {
      const validation = validateToolSchema(this.inputSchema);
      return validation;
    } catch (error) {
      return {
        valid: false,
        errors: [{
          field: '',
          message: error instanceof Error ? error.message : 'Schema validation failed',
          code: 'SCHEMA_ERROR',
        }],
        warnings: [],
      };
    }
  }

  /**
   * Check if context has required permissions
   */
  protected validatePermissions(
    context: ToolContext, 
    requiredPermissions: string[]
  ): boolean {
    if (!isToolContext(context)) {
      return false;
    }

    return requiredPermissions.every(permission => 
      context.permissions.includes(permission) ||
      context.permissions.includes('admin')
    );
  }

  /**
   * Create a successful tool result
   */
  protected createSuccessResult(data: unknown): ToolResult {
    const textContent: TextContent = {
      type: 'text',
      text: typeof data === 'string' ? data : JSON.stringify(data, null, 2),
    };

    return {
      content: [textContent],
    };
  }

  /**
   * Create an error tool result
   */
  protected createErrorResult(error: ToolError): ToolResult {
    const textContent: TextContent = {
      type: 'text',
      text: error.message,
    };

    return {
      content: [textContent],
      isError: true,
    };
  }

  /**
   * Handle errors during tool execution
   */
  protected async handleError(error: Error, context: ToolContext): Promise<ToolHandlerResult> {
    this.logger.error(`Tool execution error: ${error.message}`, error, {
      userId: context.userId,
      requestId: context.requestId,
    });

    return {
      success: false,
      error: {
        code: MCPErrorCode.TOOL_EXECUTION_ERROR,
        message: error.message,
        details: error.stack,
      },
    };
  }

  /**
   * Log tool execution
   */
  protected logExecution(input: ToolInput, context: ToolContext, success: boolean): void {
    this.logger.info(`Tool executed: ${this.name}`, {
      tool: this.name,
      success,
      userId: context.userId,
      requestId: context.requestId,
      input: this.sanitizeInputForLogging(input),
    });
  }

  /**
   * Sanitize input for logging (remove sensitive data)
   */
  private sanitizeInputForLogging(input: ToolInput): unknown {
    const sanitized = { ...input };
    const sensitiveFields = ['password', 'token', 'key', 'secret', 'auth'];
    
    for (const field of sensitiveFields) {
      if (field in sanitized) {
        sanitized[field] = '[REDACTED]';
      }
    }
    
    return sanitized;
  }

  /**
   * Get tool metadata
   */
  getMetadata(): ToolMetadata {
    return this.metadata;
  }

  /**
   * Set tool metadata
   */
  setMetadata(metadata: Partial<ToolMetadata>): void {
    this.metadata = { ...this.metadata, ...metadata };
  }
}

/**
 * Tool handler interface for function-based tools
 */
export interface ToolHandlerInterface {
  name: string;
  description: string;
  inputSchema: Tool['inputSchema'];
  metadata?: Partial<ToolMetadata>;
  handler: ToolHandler;
}

/**
 * Function-based tool implementation
 */
export class FunctionTool extends BaseTool {
  private handler: ToolHandler;
  readonly name: string;
  readonly description: string;
  readonly inputSchema: Tool['inputSchema'];

  constructor(
    name: string,
    description: string,
    inputSchema: Tool['inputSchema'],
    handler: ToolHandler,
    logger: Logger,
    metadata?: Partial<ToolMetadata>
  ) {
    super(logger, metadata);
    this.name = name;
    this.description = description;
    this.inputSchema = inputSchema;
    this.handler = handler;
  }

  async execute(input: ToolInput, context: ToolContext): Promise<ToolHandlerResult> {
    return this.handler(input, context);
  }
}

/**
 * Factory for creating tools
 */
export class ToolFactory {
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  createFromClass(toolClass: new (logger: Logger, ...args: unknown[]) => BaseTool, ...args: unknown[]): BaseTool {
    return new toolClass(this.logger, ...args);
  }

  createFromFunction(
    name: string,
    description: string,
    inputSchema: Tool['inputSchema'],
    handler: ToolHandler,
    metadata?: Partial<ToolMetadata>
  ): FunctionTool {
    return new FunctionTool(name, description, inputSchema, handler, this.logger, metadata);
  }

  createFromInterface(toolInterface: ToolHandlerInterface, logger: Logger): FunctionTool {
    return new FunctionTool(
      toolInterface.name,
      toolInterface.description,
      toolInterface.inputSchema,
      toolInterface.handler,
      logger,
      toolInterface.metadata
    );
  }
}

/**
 * Builder pattern for creating tools
 */
export class ToolBuilder {
  private name: string = '';
  private description: string = '';
  private inputSchema: Tool['inputSchema'] = { type: 'object', properties: {} };
  private handler?: ToolHandler;
  private metadata: Partial<ToolMetadata> = {};

  constructor(private logger: Logger) {}

  withName(name: string): ToolBuilder {
    this.name = name;
    return this;
  }

  withDescription(description: string): ToolBuilder {
    this.description = description;
    return this;
  }

  withInputSchema(schema: Tool['inputSchema']): ToolBuilder {
    this.inputSchema = schema;
    return this;
  }

  withHandler(handler: ToolHandler): ToolBuilder {
    this.handler = handler;
    return this;
  }

  withMetadata(metadata: Partial<ToolMetadata>): ToolBuilder {
    this.metadata = { ...this.metadata, ...metadata };
    return this;
  }

  build(): FunctionTool {
    if (!this.handler) {
      throw new Error('Handler is required to build a tool');
    }

    return new FunctionTool(
      this.name,
      this.description,
      this.inputSchema,
      this.handler,
      this.logger,
      this.metadata
    );
  }
}

/**
 * Utility class for common tool operations
 */
export class ToolUtils {
  /**
   * Create a simple text result
   */
  static createTextResult(text: string): ToolResult {
    const textContent: TextContent = {
      type: 'text',
      text,
    };

    return {
      content: [textContent],
    };
  }

  /**
   * Create a JSON result
   */
  static createJsonResult(data: unknown): ToolResult {
    const textContent: TextContent = {
      type: 'text',
      text: JSON.stringify(data, null, 2),
    };

    return {
      content: [textContent],
    };
  }

  /**
   * Create an error result
   */
  static createErrorResult(message: string, _code: number = MCPErrorCode.TOOL_EXECUTION_ERROR): ToolResult {
    const textContent: TextContent = {
      type: 'text',
      text: message,
    };

    return {
      content: [textContent],
      isError: true,
    };
  }

  /**
   * Validate required fields in input
   */
  static validateRequiredFields(input: ToolInput, requiredFields: string[]): ToolValidationResult {
    const errors: ToolValidationError[] = [];
    
    for (const field of requiredFields) {
      if (!(field in input) || input[field] === undefined || input[field] === null) {
        errors.push({
          field,
          message: `Required field '${field}' is missing`,
          code: 'MISSING_REQUIRED_FIELD',
        });
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings: [],
    };
  }

  /**
   * Check if user has required permissions
   */
  static hasPermission(context: ToolContext, permission: string): boolean {
    return context.permissions.includes(permission) || 
           context.permissions.includes('admin');
  }

  /**
   * Check if user has any of the required permissions
   */
  static hasAnyPermission(context: ToolContext, permissions: string[]): boolean {
    return permissions.some(permission => 
      context.permissions.includes(permission) || 
      context.permissions.includes('admin')
    );
  }

  /**
   * Check if user has all required permissions
   */
  static hasAllPermissions(context: ToolContext, permissions: string[]): boolean {
    return permissions.every(permission => 
      context.permissions.includes(permission) || 
      context.permissions.includes('admin')
    );
  }
} 