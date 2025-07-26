/**
 * API Client Types
 * Defines types for HTTP client, requests, responses, and error handling
 */

// HTTP Request/Response Types
export interface HTTPRequest {
  method: HTTPMethod;
  url: string;
  headers: Record<string, string>;
  body?: unknown;
  timeout?: number;
  retries?: number;
}

export interface HTTPResponse<T = unknown> {
  data: T;
  status: number;
  statusText: string;
  headers: Record<string, string>;
  requestId?: string;
  duration: number;
}

export type HTTPMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';

// API Client Types
export interface APIClient {
  request<T>(options: RequestOptions): Promise<ApiClientResponse<T>>;
  get<T>(url: string, options?: RequestOptions): Promise<ApiClientResponse<T>>;
  post<T>(url: string, data?: unknown, options?: RequestOptions): Promise<ApiClientResponse<T>>;
  put<T>(url: string, data?: unknown, options?: RequestOptions): Promise<ApiClientResponse<T>>;
  delete<T>(url: string, options?: RequestOptions): Promise<ApiClientResponse<T>>;
  patch<T>(url: string, data?: unknown, options?: RequestOptions): Promise<ApiClientResponse<T>>;
}

export interface RequestOptions {
  headers?: Record<string, string>;
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  auth?: AuthOptions;
  validateSSL?: boolean;
  followRedirects?: boolean;
  maxRedirects?: number;
}

export interface AuthOptions {
  type: 'bearer' | 'basic' | 'api_key';
  token?: string;
  username?: string;
  password?: string;
  apiKey?: string;
}

export interface ApiClientResponse<T = unknown> {
  data: T;
  status: number;
  headers: Record<string, string>;
  requestId?: string;
  duration: number;
  success: boolean;
  error?: APIError;
}

// Error Types
export interface APIError {
  code: string;
  message: string;
  status?: number;
  details?: unknown;
  requestId?: string;
  timestamp: Date;
}

export enum APIErrorCode {
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR = 'AUTHORIZATION_ERROR',
  RATE_LIMIT_ERROR = 'RATE_LIMIT_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  SERVER_ERROR = 'SERVER_ERROR',
  CLIENT_ERROR = 'CLIENT_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

// Retry Configuration
export interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  retryableStatusCodes: number[];
  retryableErrors: string[];
}

export interface RetryInfo {
  attempt: number;
  maxAttempts: number;
  delay: number;
  error?: APIError;
}

// Rate Limiting Types
export interface ApiRateLimitConfig {
  requestsPerMinute: number;
  burstSize: number;
  retryAfterSeconds: number;
  windowMs: number;
}

export interface ApiRateLimitInfo {
  limit: number;
  remaining: number;
  reset: Date;
  retryAfter?: number;
}

// Request/Response Interceptors
export interface RequestInterceptor {
  (request: HTTPRequest): HTTPRequest | Promise<HTTPRequest>;
}

export interface ResponseInterceptor<T = unknown> {
  (response: HTTPResponse<T>): HTTPResponse<T> | Promise<HTTPResponse<T>>;
}

export interface ErrorInterceptor {
  (error: APIError): APIError | Promise<APIError>;
}

// API Endpoint Types
export interface APIEndpoint {
  path: string;
  method: HTTPMethod;
  description?: string;
  parameters?: EndpointParameter[];
  responses?: EndpointResponse[];
  requiresAuth?: boolean;
  rateLimited?: boolean;
}

export interface EndpointParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  required: boolean;
  description?: string;
  defaultValue?: unknown;
  validation?: ParameterValidation;
}

export interface ParameterValidation {
  min?: number;
  max?: number;
  pattern?: string;
  enum?: string[];
  format?: string;
}

export interface EndpointResponse {
  status: number;
  description: string;
  schema?: unknown;
}

// Response Handler Types
export interface ResponseHandler<T = unknown> {
  (response: HTTPResponse<T>): T | Promise<T>;
}

export interface ApiErrorHandler {
  (error: APIError): never | Promise<never>;
}

// Request Builder Types
export interface RequestBuilder {
  method(method: HTTPMethod): RequestBuilder;
  url(url: string): RequestBuilder;
  header(name: string, value: string): RequestBuilder;
  headers(headers: Record<string, string>): RequestBuilder;
  body(body: unknown): RequestBuilder;
  timeout(timeout: number): RequestBuilder;
  retries(retries: number): RequestBuilder;
  auth(auth: AuthOptions): RequestBuilder;
  build(): HTTPRequest;
}

// API Client Configuration
export interface APIClientConfig {
  baseURL: string;
  timeout: number;
  retries: number;
  retryDelay: number;
  validateSSL: boolean;
  followRedirects: boolean;
  maxRedirects: number;
  rateLimit: ApiRateLimitConfig;
  auth?: AuthOptions;
  requestInterceptors?: RequestInterceptor[];
  responseInterceptors?: ResponseInterceptor[];
  errorInterceptors?: ErrorInterceptor[];
}

// Type Guards
export function isHTTPRequest(obj: unknown): obj is HTTPRequest {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'method' in obj &&
    'url' in obj &&
    'headers' in obj &&
    typeof obj.method === 'string' &&
    typeof obj.url === 'string' &&
    typeof obj.headers === 'object'
  );
}

export function isHTTPResponse<T>(obj: unknown): obj is HTTPResponse<T> {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'data' in obj &&
    'status' in obj &&
    'headers' in obj &&
    typeof obj.status === 'number' &&
    typeof obj.headers === 'object'
  );
}

export function isAPIError(obj: unknown): obj is APIError {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'code' in obj &&
    'message' in obj &&
    'timestamp' in obj &&
    typeof obj.code === 'string' &&
    typeof obj.message === 'string'
  );
}

export function isValidHTTPMethod(method: string): method is HTTPMethod {
  return ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'].includes(method);
}

export function isValidAPIErrorCode(code: string): code is APIErrorCode {
  return Object.values(APIErrorCode).includes(code as APIErrorCode);
}

// Utility Types
export type RequestOptionsPartial = Partial<RequestOptions>;
export type APIClientConfigPartial = Partial<APIClientConfig>;
export type RetryConfigPartial = Partial<RetryConfig>;
export type ApiRateLimitConfigPartial = Partial<ApiRateLimitConfig>; 

// API Action Types
export enum APIAction {
  LIST = 'list',
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  GET = 'get',
  FLUSH = 'flush',
  HOLD = 'hold',
  RELEASE = 'release',
}
