/**
 * Resource Types
 * Defines types for MCP resource implementation, handlers, validation, and URI patterns
 */

import { Resource, ResourceContents } from './mcp';

// Resource Handler Types
export interface ResourceHandler<TInput = unknown, TResult = Resource> {
  (input: TInput, context: ResourceContext): Promise<ResourceHandlerResult<TResult>>;
}

export interface ResourceHandlerResult<T = Resource> {
  success: boolean;
  resource?: T;
  error?: ResourceError;
  metadata?: ResourceMetadata;
}

export interface ResourceContext {
  requestId: string;
  userId?: string;
  sessionId?: string;
  timestamp: Date;
  permissions: string[];
  accessLevel: 'read-only' | 'read-write';
  uri: string;
  metadata?: Record<string, unknown>;
}

// Resource Validation Types
export interface ResourceValidation {
  validateURI(uri: string): ValidationResult;
  validatePermissions(context: ResourceContext, resource: Resource): boolean;
  validateAccess(context: ResourceContext, resource: Resource): boolean;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
  value?: unknown;
}

export interface ValidationWarning {
  field: string;
  message: string;
  suggestion?: string;
}

// Resource Registry Types
export interface ResourceRegistry {
  register(resource: Resource): void;
  unregister(uri: string): boolean;
  get(uri: string): Resource | undefined;
  list(): Resource[];
  has(uri: string): boolean;
  clear(): void;
  findByPattern(pattern: string): Resource[];
}

export interface ResourceCapabilities {
  resources: Resource[];
  count: number;
  categories: string[];
  permissions: string[];
  uriPatterns: string[];
}

// Resource Categories
export enum ResourceCategory {
  DOMAIN = 'domain',
  MAILBOX = 'mailbox',
  ALIAS = 'alias',
  SYSTEM = 'system',
  SPAM = 'spam',
  LOGS = 'logs',
  BACKUP = 'backup',
  CONFIG = 'config',
  UTILITY = 'utility',
}

// Resource Metadata
export interface ResourceMetadata {
  category: ResourceCategory;
  version: string;
  author?: string;
  description?: string;
  tags?: string[];
  requiresAuth: boolean;
  rateLimited: boolean;
  cacheable: boolean;
  cacheTTL?: number;
  timeout?: number;
  retries?: number;
}

// Resource URI Types
export interface ResourceURI {
  scheme: string;
  authority?: string;
  path: string;
  query?: Record<string, string>;
  fragment?: string;
}

export interface ResourceURIPattern {
  pattern: string;
  regex: RegExp;
  parameters: string[];
  example: string;
}

// Resource Execution Types
export interface ResourceExecution {
  id: string;
  uri: string;
  handler: string;
  input: unknown;
  context: ResourceContext;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  resource?: Resource;
  error?: ResourceError;
  metadata?: Record<string, unknown>;
}

export interface ResourceExecutionResult {
  execution: ResourceExecution;
  success: boolean;
  resource?: Resource;
  error?: ResourceError;
}

// Resource Error Types
export interface ResourceError {
  code: number;
  message: string;
  details?: unknown;
  uri?: string;
  executionId?: string;
}

export enum ResourceErrorCode {
  RESOURCE_NOT_FOUND = -32003,
  RESOURCE_ACCESS_ERROR = -32004,
  RESOURCE_VALIDATION_ERROR = -32009,
  RESOURCE_TIMEOUT = -32010,
  RESOURCE_EXECUTION_FAILED = -32011,
  RESOURCE_PERMISSION_DENIED = -32012,
  RESOURCE_RATE_LIMIT_EXCEEDED = -32013,
  RESOURCE_NETWORK_ERROR = -32014,
  RESOURCE_UNKNOWN_ERROR = -32015,
}

// Resource Result Types
export interface ResourceContent {
  type: 'text' | 'image' | 'json' | 'xml' | 'binary';
  mimeType: string;
  text?: string;
  imageUrl?: string;
  imageAlt?: string;
  json?: unknown;
  xml?: string;
  base64?: string;
  size?: number;
}

export interface ResourceMetadata {
  executionTime: number;
  timestamp: Date;
  resourceVersion: string;
  cacheHit?: boolean;
  rateLimitInfo?: ResourceRateLimitInfo;
  lastModified?: Date;
  etag?: string;
}

// Resource Rate Limiting
export interface ResourceRateLimit {
  uri: string;
  maxRequests: number;
  windowMs: number;
  currentRequests: number;
  resetTime: Date;
}

export interface ResourceRateLimitInfo {
  limit: number;
  remaining: number;
  reset: Date;
  retryAfter?: number;
}

// Resource Caching
export interface ResourceCache {
  get(key: string): Resource | undefined;
  set(key: string, resource: Resource, ttl?: number): void;
  delete(key: string): boolean;
  clear(): void;
  has(key: string): boolean;
  getCacheKey(uri: string, context: ResourceContext): string;
}

export interface ResourceCacheEntry {
  key: string;
  resource: Resource;
  timestamp: Date;
  ttl: number;
  expires: Date;
  etag?: string;
  lastModified?: Date;
}

// Resource Monitoring
export interface ResourceMetrics {
  uri: string;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  lastRequestTime?: Date;
  errorRate: number;
  cacheHitRate: number;
}

export interface ResourceMonitoring {
  recordRequest(execution: ResourceExecution): void;
  getMetrics(uri: string): ResourceMetrics;
  getAllMetrics(): Record<string, ResourceMetrics>;
  resetMetrics(uri?: string): void;
}

// Resource Factory Types
export interface ResourceFactory {
  createResource(uri: string, handler: ResourceHandler, metadata?: Partial<ResourceMetadata>): Resource;
  createResourceFromClass(resourceClass: ResourceClass): Resource;
  createResourceFromFunction(fn: ResourceFunction): Resource;
}

export interface ResourceClass {
  uri: string;
  name: string;
  description: string;
  mimeType: string;
  contents: ResourceContents[];
  metadata?: Partial<ResourceMetadata>;
}

export interface ResourceFunction {
  (input: unknown, context: ResourceContext): Promise<ResourceHandlerResult>;
  uri?: string;
  name?: string;
  description?: string;
  mimeType?: string;
  metadata?: Partial<ResourceMetadata>;
}

// Resource URI Patterns
export interface ResourceURIPatterns {
  domains: string;
  domainDetails: string;
  mailboxes: string;
  mailboxDetails: string;
  aliases: string;
  aliasDetails: string;
  systemStatus: string;
  services: string;
  logs: string;
  spamSettings: string;
  backupStatus: string;
}

// Type Guards
export function isResourceHandler(obj: unknown): obj is ResourceHandler {
  return typeof obj === 'function';
}

export function isResourceContext(obj: unknown): obj is ResourceContext {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'requestId' in obj &&
    'timestamp' in obj &&
    'permissions' in obj &&
    'accessLevel' in obj &&
    'uri' in obj &&
    typeof obj.requestId === 'string' &&
    typeof obj.accessLevel === 'string' &&
    typeof obj.uri === 'string'
  );
}

export function isResourceExecution(obj: unknown): obj is ResourceExecution {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'uri' in obj &&
    'handler' in obj &&
    'context' in obj &&
    'startTime' in obj &&
    'status' in obj &&
    typeof obj.id === 'string' &&
    typeof obj.uri === 'string' &&
    typeof obj.handler === 'string'
  );
}

export function isResourceType(obj: unknown): obj is Resource {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'uri' in obj &&
    'name' in obj &&
    'mimeType' in obj &&
    'contents' in obj &&
    typeof obj.uri === 'string' &&
    typeof obj.name === 'string' &&
    typeof obj.mimeType === 'string' &&
    Array.isArray(obj.contents)
  );
}

export function isResourceError(obj: unknown): obj is ResourceError {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'code' in obj &&
    'message' in obj &&
    typeof obj.code === 'number' &&
    typeof obj.message === 'string'
  );
}

export function isValidResourceCategory(category: string): category is ResourceCategory {
  return Object.values(ResourceCategory).includes(category as ResourceCategory);
}

export function isValidResourceErrorCode(code: number): code is ResourceErrorCode {
  return Object.values(ResourceErrorCode).includes(code as ResourceErrorCode);
}

export function isValidURI(uri: string): boolean {
  try {
    // Basic URI validation - check for scheme and path
    const hasScheme = /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(uri);
    const hasPath = /\//.test(uri);
    return hasScheme && hasPath;
  } catch {
    return false;
  }
} 