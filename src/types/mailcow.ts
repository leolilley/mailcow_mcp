/**
 * Mailcow API Types
 * Based on Mailcow API documentation and common email server patterns
 */

// Base API Response Types
export interface MailcowAPIResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface MailcowAPIError {
  code: number;
  message: string;
  details?: unknown;
}

// Domain Types
export interface MailcowDomain {
  domain: string;
  description?: string;
  active: boolean;
  quota: number;
  maxquota: number;
  relayhost?: string;
  relay_all_recipients?: boolean;
  created: Date;
  modified: Date;
  attributes?: Record<string, unknown>;
}

export interface CreateDomainRequest {
  domain: string;
  description?: string;
  quota?: number;
  maxquota?: number;
  relayhost?: string;
  relay_all_recipients?: boolean;
}

export interface UpdateDomainRequest {
  description?: string;
  active?: boolean;
  quota?: number;
  maxquota?: number;
  relayhost?: string;
  relay_all_recipients?: boolean;
}

// Mailbox Types
export interface MailcowMailbox {
  id: number;
  username: string;
  domain: string;
  local_part: string;
  quota: number;
  quota_used: number;
  name?: string;
  active: boolean;
  created: Date;
  modified: Date;
  attributes?: Record<string, unknown>;
}

export interface CreateMailboxRequest {
  local_part: string;
  domain: string;
  quota: number;
  password: string;
  name?: string;
  active?: boolean;
}

export interface UpdateMailboxRequest {
  quota?: number;
  password?: string;
  name?: string;
  active?: boolean;
}

// Alias Types
export interface MailcowAlias {
  id: number;
  address: string;
  goto: string;
  domain: string;
  active: boolean;
  created: Date;
  modified: Date;
  attributes?: Record<string, unknown>;
}

export interface CreateAliasRequest {
  address: string;
  goto: string;
  active?: boolean;
}

export interface UpdateAliasRequest {
  goto?: string;
  active?: boolean;
}

// System Types
export interface MailcowSystemStatus {
  status: 'healthy' | 'warning' | 'error';
  services: MailcowServiceStatus[];
  uptime: number;
  version: string;
  last_check: Date;
}

export interface MailcowServiceStatus {
  name: string;
  status: 'running' | 'stopped' | 'error';
  health: 'healthy' | 'warning' | 'error';
  uptime?: number;
  memory_usage?: number;
  cpu_usage?: number;
}

export interface MailcowService {
  name: string;
  display_name: string;
  description?: string;
  category: 'mail' | 'database' | 'web' | 'antispam' | 'monitoring';
}

// Spam Types
export interface MailcowSpamSettings {
  enabled: boolean;
  score_threshold: number;
  whitelist: string[];
  blacklist: string[];
  greylist_enabled: boolean;
  bayes_enabled: boolean;
  settings: Record<string, unknown>;
}

export interface UpdateSpamSettingsRequest {
  enabled?: boolean;
  score_threshold?: number;
  whitelist?: string[];
  blacklist?: string[];
  greylist_enabled?: boolean;
  bayes_enabled?: boolean;
  settings?: Record<string, unknown>;
}

// Log Types
export interface MailcowLogEntry {
  id: string;
  timestamp: Date;
  level: 'debug' | 'info' | 'warn' | 'error';
  service: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface LogFilter {
  level?: 'debug' | 'info' | 'warn' | 'error';
  service?: string;
  start_time?: Date;
  end_time?: Date;
  limit?: number;
  offset?: number;
}

// Backup Types
export interface MailcowBackupStatus {
  last_backup: Date;
  backup_size: number;
  backup_location: string;
  status: 'success' | 'failed' | 'in_progress';
  error_message?: string;
}

export interface MailcowBackupRequest {
  include_mailboxes: boolean;
  include_aliases: boolean;
  include_domains: boolean;
  include_settings: boolean;
  compression: boolean;
}

// Pagination Types
export interface PaginationParams {
  page?: number;
  limit?: number;
  offset?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

// Filter Types
export interface DomainFilter {
  active?: boolean;
  domain?: string;
  created_after?: Date;
  created_before?: Date;
}

export interface MailboxFilter {
  domain?: string;
  active?: boolean;
  username?: string;
  created_after?: Date;
  created_before?: Date;
}

export interface AliasFilter {
  domain?: string;
  active?: boolean;
  address?: string;
  goto?: string;
  created_after?: Date;
  created_before?: Date;
}

// API Request Types
export interface APIRequestOptions {
  timeout?: number;
  retries?: number;
  headers?: Record<string, string>;
}

// Type Guards
export function isMailcowDomain(obj: unknown): obj is MailcowDomain {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'domain' in obj &&
    'active' in obj &&
    'quota' in obj &&
    typeof obj.domain === 'string' &&
    typeof obj.active === 'boolean' &&
    typeof obj.quota === 'number'
  );
}

export function isMailcowMailbox(obj: unknown): obj is MailcowMailbox {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'username' in obj &&
    'domain' in obj &&
    'quota' in obj &&
    typeof obj.id === 'number' &&
    typeof obj.username === 'string' &&
    typeof obj.domain === 'string' &&
    typeof obj.quota === 'number'
  );
}

export function isMailcowAlias(obj: unknown): obj is MailcowAlias {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'address' in obj &&
    'goto' in obj &&
    'domain' in obj &&
    typeof obj.id === 'number' &&
    typeof obj.address === 'string' &&
    typeof obj.goto === 'string' &&
    typeof obj.domain === 'string'
  );
}

export function isMailcowSystemStatus(obj: unknown): obj is MailcowSystemStatus {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'status' in obj &&
    'services' in obj &&
    typeof obj.status === 'string' &&
    Array.isArray(obj.services)
  );
}

// List params for API endpoints
export type ListDomainsParams = DomainFilter & PaginationParams;
export type ListMailboxesParams = MailboxFilter & PaginationParams;
export type ListAliasesParams = AliasFilter & PaginationParams;
export type ListResourcesParams = PaginationParams;
export type ListLogsParams = LogFilter & PaginationParams; 