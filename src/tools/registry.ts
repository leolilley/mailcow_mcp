/**
 * Tool Registry
 * Manages tool registration, discovery, and execution
 */

import { 
  Tool, 
  ToolHandler, 
  ToolContext, 
  ToolResult, 
  ToolRegistry as IToolRegistry,
  ToolCapabilities,
  ToolCategory,
  ToolMetadata,
  ToolExecution,
  ToolExecutionResult,
  ToolRateLimit,
  ToolCache,
  ToolMonitoring,
  ToolMetrics,
  isTool,
  isToolHandler,
  isToolContext
} from '../types';
import { MCPErrorCode } from '../types';
import { Logger } from '../utils';
import { ToolValidationError, ToolExecutionError, ToolPermissionError } from './errors';
import { validateToolInput, validateToolSchema } from './validation';

/**
 * Tool Registry Implementation
 * Provides tool registration, discovery, and execution capabilities
 */
export class ToolRegistry implements IToolRegistry {
  private tools = new Map<string, Tool>();
  private handlers = new Map<string, ToolHandler>();
  private metadata = new Map<string, ToolMetadata>();
  private rateLimits = new Map<string, ToolRateLimit>();
  private cache: ToolCache;
  private monitoring: ToolMonitoring;
  private logger: Logger;

  constructor(logger: Logger, cache?: ToolCache, monitoring?: ToolMonitoring) {
    this.logger = logger;
    this.cache = cache || new MapToolCache();
    this.monitoring = monitoring || new MapToolMonitoring();
  }

  /**
   * Register a tool with the registry
   */
  register(tool: Tool): void {
    if (!isTool(tool)) {
      throw new ToolValidationError('registry', [{ field: '', message: 'Invalid tool object provided', code: 'INVALID_TOOL' }]);
    }

    if (this.tools.has(tool.name)) {
      throw new ToolValidationError('registry', [{ field: '', message: `Tool ${tool.name} is already registered`, code: 'TOOL_ALREADY_REGISTERED' }]);
    }

    // Validate tool schema
    const schemaValidation = validateToolSchema(tool.inputSchema);
    if (!schemaValidation.valid) {
      throw new ToolValidationError('registry', schemaValidation.errors);
    }

    this.tools.set(tool.name, tool);
    this.logger.info(`Tool registered: ${tool.name}`, { tool: tool.name });
  }

  /**
   * Register a tool handler
   */
  registerHandler(toolName: string, handler: ToolHandler, metadata?: Partial<ToolMetadata>): void {
    if (!this.tools.has(toolName)) {
      throw new ToolValidationError('registry', [{ field: '', message: `Tool ${toolName} not found in registry`, code: 'TOOL_NOT_FOUND' }]);
    }

    if (!isToolHandler(handler)) {
      throw new ToolValidationError('registry', [{ field: '', message: 'Invalid tool handler provided', code: 'INVALID_HANDLER' }]);
    }

    this.handlers.set(toolName, handler);
    
    if (metadata) {
      this.metadata.set(toolName, {
        category: ToolCategory.UTILITY,
        version: '1.0.0',
        requiresAuth: true,
        rateLimited: false,
        ...metadata,
      });
    }

    this.logger.info(`Tool handler registered: ${toolName}`, { tool: toolName });
  }

  /**
   * Unregister a tool from the registry
   */
  unregister(toolName: string): boolean {
    const removed = this.tools.delete(toolName);
    this.handlers.delete(toolName);
    this.metadata.delete(toolName);
    this.rateLimits.delete(toolName);
    
    if (removed) {
      this.logger.info(`Tool unregistered: ${toolName}`, { tool: toolName });
    }
    
    return removed;
  }

  /**
   * Get a tool by name
   */
  get(toolName: string): Tool | undefined {
    return this.tools.get(toolName);
  }

  /**
   * Get a tool handler by name
   */
  getHandler(toolName: string): ToolHandler | undefined {
    return this.handlers.get(toolName);
  }

  /**
   * List all registered tools
   */
  list(): Tool[] {
    return Array.from(this.tools.values());
  }

  /**
   * Check if a tool is registered
   */
  has(toolName: string): boolean {
    return this.tools.has(toolName);
  }

  /**
   * Clear all tools from the registry
   */
  clear(): void {
    this.tools.clear();
    this.handlers.clear();
    this.metadata.clear();
    this.rateLimits.clear();
    this.logger.info('Tool registry cleared');
  }

  /**
   * Execute a tool with input and context
   */
  async execute(
    toolName: string, 
    input: unknown, 
    context: ToolContext
  ): Promise<ToolExecutionResult> {
    const tool = this.get(toolName);
    if (!tool) {
      throw new ToolExecutionError(toolName, new Error(`Tool ${toolName} not found`));
    }

    const handler = this.getHandler(toolName);
    if (!handler) {
      throw new ToolExecutionError(toolName, new Error(`Handler for tool ${toolName} not found`));
    }

    if (!isToolContext(context)) {
      throw new ToolExecutionError(toolName, new Error('Invalid tool context'));
    }

    // Create execution record
    const execution: ToolExecution = {
      id: this.generateExecutionId(),
      toolName,
      input: input as any,
      context,
      startTime: new Date(),
      status: 'running',
    };

    try {
      // Check rate limiting
      if (!this.checkRateLimit(toolName, context)) {
        throw new ToolExecutionError(toolName, new Error('Rate limit exceeded'));
      }

      // Check permissions
      const metadata = this.metadata.get(toolName);
      if (metadata?.requiresAuth && !this.checkPermissions(context, toolName)) {
        throw new ToolPermissionError(toolName, ['execute']);
      }

      // Validate input
      const validation = validateToolInput(input, tool.inputSchema);
      if (!validation.valid) {
        throw new ToolValidationError(toolName, validation.errors);
      }

      // Check cache
      const cacheKey = this.generateCacheKey(toolName, input, context);
      const cachedResult = this.cache.get(cacheKey);
      if (cachedResult) {
        execution.status = 'completed';
        execution.endTime = new Date();
        execution.duration = execution.endTime.getTime() - execution.startTime.getTime();
        execution.result = cachedResult;
        
        this.monitoring.recordExecution(execution);
        return {
          execution,
          success: true,
          result: cachedResult,
        };
      }

      // Execute tool
      const result = await handler(input as any, context);
      
      execution.status = 'completed';
      execution.endTime = new Date();
      execution.duration = execution.endTime.getTime() - execution.startTime.getTime();
      execution.result = result.result;

      // Cache result if successful
      if (result.success && result.result) {
        this.cache.set(cacheKey, result.result);
      }

      this.monitoring.recordExecution(execution);
      
      return {
        execution,
        success: result.success,
        result: result.result,
        error: result.error,
      };

    } catch (error) {
      execution.status = 'failed';
      execution.endTime = new Date();
      execution.duration = execution.endTime.getTime() - execution.startTime.getTime();
                execution.error = {
        code: MCPErrorCode.TOOL_EXECUTION_ERROR,
        message: error instanceof Error ? error.message : 'Unknown error',
        details: error instanceof Error ? error.stack : undefined,
      };

      this.monitoring.recordExecution(execution);
      
      return {
        execution,
        success: false,
        error: execution.error,
      };
    }
  }

  /**
   * Get tool capabilities
   */
  getCapabilities(): ToolCapabilities {
    const tools = this.list();
    const categories = new Set<string>();
    const permissions = new Set<string>();

    for (const tool of tools) {
      const metadata = this.metadata.get(tool.name);
      if (metadata) {
        categories.add(metadata.category);
        if (metadata.requiresAuth) {
          permissions.add('authenticated');
        }
      }
    }

    return {
      tools,
      count: tools.length,
      categories: Array.from(categories),
      permissions: Array.from(permissions),
    };
  }

  /**
   * Get tool schemas for MCP protocol
   */
  getToolSchemas(): Tool[] {
    return this.list();
  }

  /**
   * Set rate limit for a tool
   */
  setRateLimit(toolName: string, maxRequests: number, windowMs: number): void {
    this.rateLimits.set(toolName, {
      toolName,
      maxRequests,
      windowMs,
      currentRequests: 0,
      resetTime: new Date(Date.now() + windowMs),
    });
  }

  /**
   * Get metrics for a tool
   */
  getMetrics(toolName: string): ToolMetrics | undefined {
    return this.monitoring.getMetrics(toolName);
  }

  /**
   * Get all metrics
   */
  getAllMetrics(): Record<string, ToolMetrics> {
    return this.monitoring.getAllMetrics();
  }

  /**
   * Reset metrics for a tool or all tools
   */
  resetMetrics(toolName?: string): void {
    this.monitoring.resetMetrics(toolName);
  }

  /**
   * Generate unique execution ID
   */
  private generateExecutionId(): string {
    return `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate cache key for tool execution
   */
  private generateCacheKey(toolName: string, input: unknown, context: ToolContext): string {
    const inputHash = JSON.stringify(input);
    const contextHash = JSON.stringify({
      userId: context.userId,
      permissions: context.permissions,
      accessLevel: context.accessLevel,
    });
    return `${toolName}_${this.hashString(inputHash + contextHash)}`;
  }

  /**
   * Simple string hashing
   */
  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Check rate limit for tool execution
   */
  private checkRateLimit(toolName: string, _context: ToolContext): boolean {
    const rateLimit = this.rateLimits.get(toolName);
    if (!rateLimit) {
      return true; // No rate limit set
    }

    const now = new Date();
    if (now > rateLimit.resetTime) {
      // Reset rate limit
      rateLimit.currentRequests = 0;
      rateLimit.resetTime = new Date(now.getTime() + rateLimit.windowMs);
    }

    if (rateLimit.currentRequests >= rateLimit.maxRequests) {
      return false;
    }

    rateLimit.currentRequests++;
    return true;
  }

  /**
   * Check permissions for tool execution
   */
  private checkPermissions(context: ToolContext, toolName: string): boolean {
    const metadata = this.metadata.get(toolName);
    if (!metadata?.requiresAuth) {
      return true;
    }

    if (!context.userId) {
      return false;
    }

    // Check for basic execute permission
    return context.permissions.includes('execute') || 
           context.permissions.includes(`${toolName}:execute`) ||
           context.permissions.includes('admin');
  }
}

/**
 * Simple Map-based Tool Cache Implementation
 */
export class MapToolCache implements ToolCache {
  private cache = new Map<string, ToolResult>();

  get(key: string): ToolResult | undefined {
    return this.cache.get(key);
  }

  set(key: string, result: ToolResult, ttl: number = 300000): void {
    this.cache.set(key, result);
    // Simple TTL implementation - in production, use a proper cache with TTL
    setTimeout(() => this.delete(key), ttl);
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  has(key: string): boolean {
    return this.cache.has(key);
  }
}

/**
 * Simple Map-based Tool Monitoring Implementation
 */
export class MapToolMonitoring implements ToolMonitoring {
  private metrics = new Map<string, ToolMetrics>();

  recordExecution(execution: ToolExecution): void {
    const existing = this.metrics.get(execution.toolName) || {
      toolName: execution.toolName,
      totalExecutions: 0,
      successfulExecutions: 0,
      failedExecutions: 0,
      averageExecutionTime: 0,
      errorRate: 0,
    };

    existing.totalExecutions++;
    existing.lastExecutionTime = execution.startTime;

    if (execution.status === 'completed' && execution.result) {
      existing.successfulExecutions++;
    } else if (execution.status === 'failed') {
      existing.failedExecutions++;
    }

    if (execution.duration) {
      const totalTime = existing.averageExecutionTime * (existing.totalExecutions - 1) + execution.duration;
      existing.averageExecutionTime = totalTime / existing.totalExecutions;
    }

    existing.errorRate = existing.failedExecutions / existing.totalExecutions;

    this.metrics.set(execution.toolName, existing);
  }

  getMetrics(toolName: string): ToolMetrics {
    return this.metrics.get(toolName) || {
      toolName,
      totalExecutions: 0,
      successfulExecutions: 0,
      failedExecutions: 0,
      averageExecutionTime: 0,
      errorRate: 0,
    };
  }

  getAllMetrics(): Record<string, ToolMetrics> {
    const result: Record<string, ToolMetrics> = {};
    for (const [name, metrics] of this.metrics.entries()) {
      result[name] = metrics;
    }
    return result;
  }

  resetMetrics(toolName?: string): void {
    if (toolName) {
      this.metrics.delete(toolName);
    } else {
      this.metrics.clear();
    }
  }
} 