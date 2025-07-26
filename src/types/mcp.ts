/**
 * MCP Protocol Types
 * Based on JSON-RPC 2.0 specification and MCP protocol
 */

// JSON-RPC 2.0 Base Types
export interface MCPRequest {
  jsonrpc: '2.0';
  id: string | number;
  method: string;
  params?: unknown;
}

export interface MCPResponse {
  jsonrpc: '2.0';
  id: string | number;
  result?: unknown;
  error?: MCPError;
}

export interface MCPNotification {
  jsonrpc: '2.0';
  method: string;
  params?: unknown;
}

export interface MCPError {
  code: number;
  message: string;
  data?: unknown;
}

// MCP Protocol Specific Types
export interface MCPCapabilities {
  tools?: boolean;
  resources?: boolean;
  prompts?: boolean;
  [key: string]: unknown;
}

export interface MCPServerCapabilities {
  capabilities: MCPCapabilities;
  serverInfo?: {
    name: string;
    version: string;
  };
}

// Tool Types
export interface Tool {
  name: string;
  description: string;
  inputSchema: ToolSchema;
}

export interface ToolSchema {
  type: 'object';
  properties: Record<string, ToolProperty>;
  required?: string[];
  additionalProperties?: boolean;
}

export interface ToolProperty {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description?: string;
  enum?: string[];
  items?: ToolProperty;
  properties?: Record<string, ToolProperty>;
  minimum?: number;
  maximum?: number;
  pattern?: string;
  format?: string;
}

export interface ToolInput {
  [key: string]: unknown;
}

export interface ToolResult {
  content: ToolResultContent[];
}

export interface ToolResultContent {
  type: 'text' | 'image' | 'error';
  text?: string;
  imageUrl?: string;
  imageAlt?: string;
}

export interface ToolError {
  code: number;
  message: string;
  details?: unknown;
}

// Resource Types
export interface Resource {
  uri: string;
  name: string;
  description?: string;
  mimeType: string;
  contents: ResourceContents[];
}

export interface ResourceContents {
  uri: string;
  mimeType: string;
  text?: string;
  base64?: string;
}

export interface ResourceSchema {
  uri: string;
  name: string;
  description?: string;
  mimeType: string;
}

// Prompt Types
export interface Prompt {
  id: string;
  prompt: string;
  description?: string;
  isRequired?: boolean;
}

export interface PromptResult {
  id: string;
  value: string;
}

// Error Codes
export enum MCPErrorCode {
  // JSON-RPC 2.0 Standard Errors
  PARSE_ERROR = -32700,
  INVALID_REQUEST = -32600,
  METHOD_NOT_FOUND = -32601,
  INVALID_PARAMS = -32602,
  INTERNAL_ERROR = -32603,

  // MCP Protocol Specific Errors
  TOOL_NOT_FOUND = -32001,
  TOOL_EXECUTION_ERROR = -32002,
  RESOURCE_NOT_FOUND = -32003,
  RESOURCE_ACCESS_ERROR = -32004,
  AUTHENTICATION_ERROR = -32005,
  AUTHORIZATION_ERROR = -32006,
  RATE_LIMIT_ERROR = -32007,
  VALIDATION_ERROR = -32008,
}

// Type Guards
export function isMCPRequest(obj: unknown): obj is MCPRequest {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'jsonrpc' in obj &&
    obj.jsonrpc === '2.0' &&
    'id' in obj &&
    'method' in obj &&
    typeof obj.method === 'string'
  );
}

export function isMCPResponse(obj: unknown): obj is MCPResponse {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'jsonrpc' in obj &&
    obj.jsonrpc === '2.0' &&
    'id' in obj
  );
}

export function isMCPNotification(obj: unknown): obj is MCPNotification {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'jsonrpc' in obj &&
    obj.jsonrpc === '2.0' &&
    'method' in obj &&
    typeof obj.method === 'string' &&
    !('id' in obj)
  );
}

export function isTool(obj: unknown): obj is Tool {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'name' in obj &&
    'description' in obj &&
    'inputSchema' in obj &&
    typeof obj.name === 'string' &&
    typeof obj.description === 'string'
  );
}

export function isResource(obj: unknown): obj is Resource {
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