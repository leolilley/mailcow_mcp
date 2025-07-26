/**
 * Authentication Types
 * Defines authentication-related types for the Mailcow MCP server
 */

// API Key Types
export interface APIKey {
  key: string;
  accessType: AccessLevel;
  permissions: Permission[];
  created: Date;
  expires?: Date;
  lastUsed?: Date;
  description?: string;
}

export type AccessLevel = 'read-only' | 'read-write';

export interface Permission {
  resource: string;
  actions: string[];
  conditions?: PermissionCondition[];
}

export interface PermissionCondition {
  type: 'domain' | 'mailbox' | 'alias' | 'system';
  value: string;
  operator: 'equals' | 'starts_with' | 'ends_with' | 'contains' | 'regex';
}

// Session Types
export interface SessionToken {
  token: string;
  userId: string;
  accessLevel: AccessLevel;
  permissions: Permission[];
  created: Date;
  expires: Date;
  lastActivity: Date;
  ipAddress?: string;
  userAgent?: string;
}

export interface SessionInfo {
  sessionId: string;
  token: SessionToken;
  isActive: boolean;
  remainingTime: number;
}

// Authentication Result Types
export interface AuthResult {
  success: boolean;
  authenticated: boolean;
  session?: SessionToken;
  error?: AuthError;
  user?: UserInfo;
}

export interface AuthError {
  code: AuthErrorCode;
  message: string;
  details?: unknown;
}

export enum AuthErrorCode {
  INVALID_API_KEY = 'INVALID_API_KEY',
  EXPIRED_API_KEY = 'EXPIRED_API_KEY',
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
  SESSION_EXPIRED = 'SESSION_EXPIRED',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  INVALID_TOKEN = 'INVALID_TOKEN',
  TOKEN_REFRESH_FAILED = 'TOKEN_REFRESH_FAILED',
  ACCOUNT_LOCKED = 'ACCOUNT_LOCKED',
  IP_NOT_ALLOWED = 'IP_NOT_ALLOWED',
}

// User Information Types
export interface UserInfo {
  id: string;
  username: string;
  email?: string;
  accessLevel: AccessLevel;
  permissions: Permission[];
  lastLogin?: Date;
  isActive: boolean;
  metadata?: Record<string, unknown>;
}

// Security Types
export interface AuthSecurityConfig {
  requireHTTPS: boolean;
  allowedOrigins: string[];
  maxRequestSize: number;
  rateLimitEnabled: boolean;
  auditLogging: boolean;
  sessionTimeout: number;
  maxSessions: number;
  passwordPolicy?: AuthPasswordPolicy;
  ipWhitelist?: string[];
  ipBlacklist?: string[];
}

export interface AuthPasswordPolicy {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
  maxAge: number;
  preventReuse: number;
}

// Token Management Types
export interface TokenInfo {
  token: string;
  type: 'api_key' | 'session_token';
  accessLevel: AccessLevel;
  permissions: Permission[];
  created: Date;
  expires?: Date;
  lastUsed?: Date;
  isActive: boolean;
}

export interface TokenRefreshRequest {
  token: string;
  extendBy?: number; // seconds
}

export interface TokenRefreshResult {
  success: boolean;
  newToken?: SessionToken;
  error?: AuthError;
}

// Rate Limiting Types
export interface AuthRateLimitInfo {
  limit: number;
  remaining: number;
  reset: Date;
  retryAfter?: number;
}

export interface AuthRateLimitConfig {
  windowMs: number;
  maxRequests: number;
  skipSuccessfulRequests: boolean;
  skipFailedRequests: boolean;
  keyGenerator?: (req: unknown) => string;
}

// Audit Logging Types
export interface AuditLogEntry {
  id: string;
  timestamp: Date;
  userId?: string;
  action: string;
  resource: string;
  ipAddress?: string;
  userAgent?: string;
  success: boolean;
  details?: Record<string, unknown>;
}

export interface AuditLogFilter {
  userId?: string;
  action?: string;
  resource?: string;
  success?: boolean;
  startTime?: Date;
  endTime?: Date;
  limit?: number;
  offset?: number;
}

// Authentication Context Types
export interface AuthContext {
  user?: UserInfo;
  session?: SessionToken;
  permissions: Permission[];
  accessLevel: AccessLevel;
  isAuthenticated: boolean;
  requestId: string;
  timestamp: Date;
}

export interface AuthMiddleware {
  authenticate: (token: string) => Promise<AuthResult>;
  validatePermissions: (context: AuthContext, resource: string, action: string) => boolean;
  refreshSession: (token: string) => Promise<TokenRefreshResult>;
  revokeSession: (token: string) => Promise<boolean>;
}

// Type Guards
export function isAPIKey(obj: unknown): obj is APIKey {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'key' in obj &&
    'accessType' in obj &&
    'permissions' in obj &&
    typeof obj.key === 'string' &&
    (obj.accessType === 'read-only' || obj.accessType === 'read-write') &&
    Array.isArray(obj.permissions)
  );
}

export function isSessionToken(obj: unknown): obj is SessionToken {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'token' in obj &&
    'userId' in obj &&
    'accessLevel' in obj &&
    'permissions' in obj &&
    'created' in obj &&
    'expires' in obj &&
    typeof obj.token === 'string' &&
    typeof obj.userId === 'string' &&
    (obj.accessLevel === 'read-only' || obj.accessLevel === 'read-write')
  );
}

export function isAuthResult(obj: unknown): obj is AuthResult {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'success' in obj &&
    'authenticated' in obj &&
    typeof obj.success === 'boolean' &&
    typeof obj.authenticated === 'boolean'
  );
}

export function isUserInfo(obj: unknown): obj is UserInfo {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'username' in obj &&
    'accessLevel' in obj &&
    'permissions' in obj &&
    'isActive' in obj &&
    typeof obj.id === 'string' &&
    typeof obj.username === 'string' &&
    (obj.accessLevel === 'read-only' || obj.accessLevel === 'read-write') &&
    typeof obj.isActive === 'boolean'
  );
}

export function isValidAccessLevel(level: string): level is AccessLevel {
  return level === 'read-only' || level === 'read-write';
}

export function isValidAuthErrorCode(code: string): code is AuthErrorCode {
  return Object.values(AuthErrorCode).includes(code as AuthErrorCode);
} 