/**
 * Tool Types
 * Defines types for MCP tool implementation, handlers, validation, and results
 */

import { Tool, ToolInput, ToolResult, ToolError } from './mcp';

// Tool Handler Types
export interface ToolHandler<TInput = ToolInput, TResult = ToolResult> {
  (input: TInput, context: ToolContext): Promise<ToolHandlerResult<TResult>>;
}

export interface ToolHandlerResult<T = ToolResult> {
  success: boolean;
  result?: T;
  error?: ToolError;
  metadata?: ToolMetadata;
}

export interface ToolContext {
  requestId: string;
  userId?: string;
  sessionId?: string;
  timestamp: Date;
  permissions: string[];
  accessLevel: 'read-only' | 'read-write';
  metadata?: Record<string, unknown>;
}

// Tool Validation Types
export interface ToolValidation {
  validateInput(input: ToolInput): ToolValidationResult;
  validatePermissions(context: ToolContext, tool: Tool): boolean;
  validateRateLimit(context: ToolContext): boolean;
}

export interface ToolValidationResult {
  valid: boolean;
  errors: ToolValidationError[];
  warnings: ToolValidationWarning[];
}

export interface ToolValidationError {
  field: string;
  message: string;
  code: string;
  value?: unknown;
}

export interface ToolValidationWarning {
  field: string;
  message: string;
  suggestion?: string;
}

// Tool Registry Types
export interface ToolRegistry {
  register(tool: Tool): void;
  unregister(toolName: string): boolean;
  get(toolName: string): Tool | undefined;
  list(): Tool[];
  has(toolName: string): boolean;
  clear(): void;
}

export interface ToolCapabilities {
  tools: Tool[];
  count: number;
  categories: string[];
  permissions: string[];
}

// Tool Categories
export enum ToolCategory {
  DOMAIN = 'domain',
  MAILBOX = 'mailbox',
  ALIAS = 'alias',
  SYSTEM = 'system',
  SPAM = 'spam',
  LOGS = 'logs',
  BACKUP = 'backup',
  UTILITY = 'utility',
}

// Tool Metadata
export interface ToolMetadata {
  category: ToolCategory;
  version: string;
  author?: string;
  description?: string;
  tags?: string[];
  requiresAuth: boolean;
  rateLimited: boolean;
  timeout?: number;
  retries?: number;
}

// Tool Execution Types
export interface ToolExecution {
  id: string;
  toolName: string;
  input: ToolInput;
  context: ToolContext;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  result?: ToolResult;
  error?: ToolError;
  metadata?: Record<string, unknown>;
}

export interface ToolExecutionResult {
  execution: ToolExecution;
  success: boolean;
  result?: ToolResult;
  error?: ToolError;
}

// Tool Error Types
export interface ToolExecutionError extends ToolError {
  executionId: string;
  toolName: string;
  input?: ToolInput;
  context?: Partial<ToolContext>;
}

export enum ToolErrorCode {
  TOOL_NOT_FOUND = 'TOOL_NOT_FOUND',
  INVALID_INPUT = 'INVALID_INPUT',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  TIMEOUT = 'TIMEOUT',
  EXECUTION_FAILED = 'EXECUTION_FAILED',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR = 'AUTHORIZATION_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

// Tool Result Types
export interface ToolResultContentType {
  type: 'text' | 'image' | 'error' | 'table' | 'json';
  text?: string;
  imageUrl?: string;
  imageAlt?: string;
  table?: ToolResultTable;
  json?: unknown;
}

export interface ToolResultTable {
  headers: string[];
  rows: (string | number | boolean)[][];
  caption?: string;
}

export interface ToolResultMetadata {
  executionTime: number;
  timestamp: Date;
  toolVersion: string;
  cacheHit?: boolean;
  rateLimitInfo?: ToolRateLimitInfo;
}

// Tool Rate Limiting
export interface ToolRateLimit {
  toolName: string;
  maxRequests: number;
  windowMs: number;
  currentRequests: number;
  resetTime: Date;
}

export interface ToolRateLimitInfo {
  limit: number;
  remaining: number;
  reset: Date;
  retryAfter?: number;
}

// Tool Caching
export interface ToolCache {
  get(key: string): ToolResult | undefined;
  set(key: string, result: ToolResult, ttl?: number): void;
  delete(key: string): boolean;
  clear(): void;
  has(key: string): boolean;
}

export interface ToolCacheEntry {
  key: string;
  result: ToolResult;
  timestamp: Date;
  ttl: number;
  expires: Date;
}

// Tool Monitoring
export interface ToolMetrics {
  toolName: string;
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  averageExecutionTime: number;
  lastExecutionTime?: Date;
  errorRate: number;
}

export interface ToolMonitoring {
  recordExecution(execution: ToolExecution): void;
  getMetrics(toolName: string): ToolMetrics;
  getAllMetrics(): Record<string, ToolMetrics>;
  resetMetrics(toolName?: string): void;
}

// Tool Factory Types
export interface ToolFactory {
  createTool(name: string, handler: ToolHandler, metadata?: Partial<ToolMetadata>): Tool;
  createToolFromClass(toolClass: ToolClass): Tool;
  createToolFromFunction(fn: ToolFunction): Tool;
}

export interface ToolClass {
  name: string;
  description: string;
  inputSchema: Tool['inputSchema'];
  execute: ToolHandler;
  metadata?: Partial<ToolMetadata>;
}

export interface ToolFunction {
  (input: ToolInput, context: ToolContext): Promise<ToolHandlerResult>;
  name?: string;
  description?: string;
  inputSchema?: Tool['inputSchema'];
  metadata?: Partial<ToolMetadata>;
}

// Type Guards
export function isToolHandler(obj: unknown): obj is ToolHandler {
  return typeof obj === 'function';
}

export function isToolContext(obj: unknown): obj is ToolContext {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'requestId' in obj &&
    'timestamp' in obj &&
    'permissions' in obj &&
    'accessLevel' in obj &&
    typeof obj.requestId === 'string' &&
    typeof obj.accessLevel === 'string'
  );
}

export function isToolExecution(obj: unknown): obj is ToolExecution {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'toolName' in obj &&
    'input' in obj &&
    'context' in obj &&
    'startTime' in obj &&
    'status' in obj &&
    typeof obj.id === 'string' &&
    typeof obj.toolName === 'string'
  );
}

export function isToolResult(obj: unknown): obj is ToolResult {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'content' in obj &&
    Array.isArray(obj.content)
  );
}

export function isToolError(obj: unknown): obj is ToolError {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'code' in obj &&
    'message' in obj &&
    typeof obj.code === 'number' &&
    typeof obj.message === 'string'
  );
}

export function isValidToolCategory(category: string): category is ToolCategory {
  return Object.values(ToolCategory).includes(category as ToolCategory);
}

export function isValidToolErrorCode(code: string): code is ToolErrorCode {
  return Object.values(ToolErrorCode).includes(code as ToolErrorCode);
} 