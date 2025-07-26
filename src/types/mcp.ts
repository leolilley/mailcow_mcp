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
  tools?: {
    listChanged?: boolean;
  };
  resources?: {
    listChanged?: boolean;
  };
  prompts?: {
    listChanged?: boolean;
  };
  [key: string]: unknown;
}

export interface MCPServerCapabilities {
  capabilities: MCPCapabilities;
  serverInfo?: {
    name: string;
    version: string;
  };
}

// Annotations (from MCP spec)
export interface Annotations {
  audience?: ('user' | 'assistant')[];
  lastModified?: string;
  priority?: number;
}

// Tool Types (updated to match MCP spec)
export interface Tool {
  name: string;
  title?: string;
  description?: string;
  inputSchema: ToolSchema;
  outputSchema?: ToolSchema;
  annotations?: ToolAnnotations;
}

export interface ToolAnnotations {
  title?: string;
  destructiveHint?: boolean;
  idempotentHint?: boolean;
  openWorldHint?: boolean;
  readOnlyHint?: boolean;
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

// Content Types (from MCP spec)
export interface TextContent {
  type: 'text';
  text: string;
  annotations?: Annotations;
}

export interface ImageContent {
  type: 'image';
  data: string; // base64 encoded
  mimeType: string;
  annotations?: Annotations;
}

export interface AudioContent {
  type: 'audio';
  data: string; // base64 encoded
  mimeType: string;
  annotations?: Annotations;
}

export interface ResourceLink {
  type: 'resource_link';
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
  annotations?: Annotations;
}

export interface EmbeddedResource {
  type: 'resource';
  resource: {
    uri: string;
    title: string;
    mimeType?: string;
    text?: string;
    blob?: string; // base64 encoded
    annotations?: Annotations;
  };
  annotations?: Annotations;
}

export type ContentBlock =
  | TextContent
  | ImageContent
  | AudioContent
  | ResourceLink
  | EmbeddedResource;

// Tool Result (updated to match MCP spec)
export interface ToolResult {
  content: ContentBlock[];
  isError?: boolean;
  structuredContent?: unknown;
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
    'inputSchema' in obj &&
    typeof obj.name === 'string'
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

export function isTextContent(obj: unknown): obj is TextContent {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'type' in obj &&
    obj.type === 'text' &&
    'text' in obj &&
    typeof obj.text === 'string'
  );
}

export function isImageContent(obj: unknown): obj is ImageContent {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'type' in obj &&
    obj.type === 'image' &&
    'data' in obj &&
    'mimeType' in obj &&
    typeof obj.data === 'string' &&
    typeof obj.mimeType === 'string'
  );
}

export function isAudioContent(obj: unknown): obj is AudioContent {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'type' in obj &&
    obj.type === 'audio' &&
    'data' in obj &&
    'mimeType' in obj &&
    typeof obj.data === 'string' &&
    typeof obj.mimeType === 'string'
  );
}

export function isResourceLink(obj: unknown): obj is ResourceLink {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'type' in obj &&
    obj.type === 'resource_link' &&
    'uri' in obj &&
    'name' in obj &&
    typeof obj.uri === 'string' &&
    typeof obj.name === 'string'
  );
}

export function isEmbeddedResource(obj: unknown): obj is EmbeddedResource {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'type' in obj &&
    obj.type === 'resource' &&
    'resource' in obj &&
    typeof obj.resource === 'object' &&
    obj.resource !== null &&
    'uri' in obj.resource &&
    'title' in obj.resource &&
    typeof obj.resource.uri === 'string' &&
    typeof obj.resource.title === 'string'
  );
} 