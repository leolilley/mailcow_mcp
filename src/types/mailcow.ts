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
  domain_name: string;
  domain_h_name: string;
  description?: string;
  active: number; // Mailcow uses 1/0 instead of boolean
  max_quota_for_domain: number;
  def_quota_for_mbox: number;
  max_quota_for_mbox: number;
  relayhost: string; // "1" or "0"
  relay_all_recipients: number;
  mboxes_in_domain: number;
  mboxes_left: number;
  created: string;
  modified: string;
  tags?: string[];
  // Legacy fields for backward compatibility
  domain?: string;
  quota?: number;
  maxquota?: number;
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
  username: string;
  domain: string;
  local_part: string;
  name: string;
  quota: number;
  messages: number;
  active: number; // Mailcow uses 1/0 instead of boolean
  active_int: number;
  created: string;
  modified: string;
  attributes?: Record<string, unknown>;
  // Legacy fields for backward compatibility
  id?: number;
  quota_used?: number;
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

// User Types
export interface MailcowUser {
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

export interface CreateUserRequest {
  local_part: string;
  domain: string;
  quota: number;
  password: string;
  name?: string;
  active?: boolean;
}

export interface UpdateUserRequest {
  quota?: number;
  password?: string;
  name?: string;
  active?: boolean;
}

// DKIM Types
export interface MailcowDKIM {
  id: number;
  domain: string;
  selector: string;
  key_size: number;
  algorithm: 'rsa' | 'ed25519';
  public_key: string;
  private_key?: string;
  active: boolean;
  created: Date;
  modified: Date;
}

export interface CreateDKIMRequest {
  domain: string;
  selector: string;
  key_size?: number;
  algorithm?: 'rsa' | 'ed25519';
}

export interface UpdateDKIMRequest {
  active?: boolean;
  selector?: string;
  key_size?: number;
  algorithm?: 'rsa' | 'ed25519';
}

// Quarantine Types
export interface MailcowQuarantineItem {
  id: string;
  sender: string;
  recipient: string;
  subject: string;
  timestamp: Date;
  size: number;
  reason: string;
  action: 'release' | 'delete' | 'whitelist' | 'blacklist';
  headers?: Record<string, string>;
}

export interface QuarantineFilter {
  sender?: string;
  recipient?: string;
  subject?: string;
  reason?: string;
  start_time?: Date;
  end_time?: Date;
}

export interface QuarantineAction {
  action: 'release' | 'delete' | 'whitelist' | 'blacklist';
  items: string[];
}

// TLS Policy Types
export interface MailcowTLSPolicy {
  id: number;
  domain: string;
  policy: 'none' | 'may' | 'encrypt' | 'dane' | 'dane-only' | 'fingerprint' | 'verify' | 'secure';
  parameters?: Record<string, unknown>;
  active: boolean;
  created: Date;
  modified: Date;
}

export interface CreateTLSPolicyRequest {
  domain: string;
  policy: 'none' | 'may' | 'encrypt' | 'dane' | 'dane-only' | 'fingerprint' | 'verify' | 'secure';
  parameters?: Record<string, unknown>;
}

export interface UpdateTLSPolicyRequest {
  policy?: 'none' | 'may' | 'encrypt' | 'dane' | 'dane-only' | 'fingerprint' | 'verify' | 'secure';
  parameters?: Record<string, unknown>;
  active?: boolean;
}

// OAuth2 Types
export interface MailcowOAuth2Client {
  id: number;
  client_id: string;
  client_secret?: string;
  name: string;
  description?: string;
  redirect_uris: string[];
  scopes: string[];
  active: boolean;
  created: Date;
  modified: Date;
}

export interface CreateOAuth2Request {
  name: string;
  description?: string;
  redirect_uris: string[];
  scopes: string[];
}

export interface UpdateOAuth2Request {
  name?: string;
  description?: string;
  redirect_uris?: string[];
  scopes?: string[];
  active?: boolean;
}

// App Password Types
export interface MailcowAppPassword {
  id: number;
  username: string;
  app_name: string;
  password_hash: string;
  created: Date;
  last_used?: Date;
  active: boolean;
}

export interface CreateAppPasswordRequest {
  username: string;
  app_name: string;
  password: string;
}

// Rspamd Types
export interface MailcowRspamdSettings {
  enabled: boolean;
  score_threshold: number;
  whitelist: string[];
  blacklist: string[];
  greylist_enabled: boolean;
  bayes_enabled: boolean;
  settings: Record<string, unknown>;
}

export interface UpdateRspamdSettingsRequest {
  enabled?: boolean;
  score_threshold?: number;
  whitelist?: string[];
  blacklist?: string[];
  greylist_enabled?: boolean;
  bayes_enabled?: boolean;
  settings?: Record<string, unknown>;
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

// User Filter
export interface UserFilter {
  domain?: string;
  active?: boolean;
  username?: string;
  created_after?: Date;
  created_before?: Date;
}

// DKIM Filter
export interface DKIMFilter {
  domain?: string;
  active?: boolean;
  selector?: string;
  algorithm?: 'rsa' | 'ed25519';
  created_after?: Date;
  created_before?: Date;
}

// TLS Policy Filter
export interface TLSPolicyFilter {
  domain?: string;
  active?: boolean;
  policy?: 'none' | 'may' | 'encrypt' | 'dane' | 'dane-only' | 'fingerprint' | 'verify' | 'secure';
  created_after?: Date;
  created_before?: Date;
}

// OAuth2 Filter
export interface OAuth2Filter {
  active?: boolean;
  name?: string;
  client_id?: string;
  created_after?: Date;
  created_before?: Date;
}

// App Password Filter
export interface AppPasswordFilter {
  username?: string;
  app_name?: string;
  active?: boolean;
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

export function isMailcowSystemStatus(
  obj: unknown
): obj is MailcowSystemStatus {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'status' in obj &&
    'services' in obj &&
    'uptime' in obj &&
    'version' in obj &&
    'last_check' in obj
  );
}

// Type guards for new entities
export function isMailcowUser(obj: unknown): obj is MailcowUser {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'username' in obj &&
    'domain' in obj &&
    'local_part' in obj &&
    'quota' in obj &&
    'quota_used' in obj &&
    'active' in obj &&
    'created' in obj &&
    'modified' in obj
  );
}

export function isMailcowDKIM(obj: unknown): obj is MailcowDKIM {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'domain' in obj &&
    'selector' in obj &&
    'key_size' in obj &&
    'algorithm' in obj &&
    'public_key' in obj &&
    'active' in obj &&
    'created' in obj &&
    'modified' in obj
  );
}

export function isMailcowQuarantineItem(
  obj: unknown
): obj is MailcowQuarantineItem {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'sender' in obj &&
    'recipient' in obj &&
    'subject' in obj &&
    'timestamp' in obj &&
    'size' in obj &&
    'reason' in obj &&
    'action' in obj
  );
}

export function isMailcowTLSPolicy(obj: unknown): obj is MailcowTLSPolicy {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'domain' in obj &&
    'policy' in obj &&
    'active' in obj &&
    'created' in obj &&
    'modified' in obj
  );
}

export function isMailcowOAuth2Client(
  obj: unknown
): obj is MailcowOAuth2Client {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'client_id' in obj &&
    'name' in obj &&
    'redirect_uris' in obj &&
    'scopes' in obj &&
    'active' in obj &&
    'created' in obj &&
    'modified' in obj
  );
}

export function isMailcowAppPassword(obj: unknown): obj is MailcowAppPassword {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'username' in obj &&
    'app_name' in obj &&
    'password_hash' in obj &&
    'created' in obj &&
    'active' in obj
  );
}

export function isMailcowRspamdSettings(
  obj: unknown
): obj is MailcowRspamdSettings {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'enabled' in obj &&
    'score_threshold' in obj &&
    'whitelist' in obj &&
    'blacklist' in obj &&
    'greylist_enabled' in obj &&
    'bayes_enabled' in obj &&
    'settings' in obj
  );
}

// List params for API endpoints
export type ListDomainsParams = DomainFilter & PaginationParams;
export type ListMailboxesParams = MailboxFilter & PaginationParams;
export type ListAliasesParams = AliasFilter & PaginationParams;
export type ListUsersParams = UserFilter & PaginationParams;
export type ListDKIMParams = DKIMFilter & PaginationParams;
export type ListQuarantineParams = QuarantineFilter & PaginationParams;
export type ListTLSPolicyParams = TLSPolicyFilter & PaginationParams;
export type ListOAuth2Params = OAuth2Filter & PaginationParams;
export type ListAppPasswordsParams = AppPasswordFilter & PaginationParams;
export type ListResourcesParams = PaginationParams;
export type ListLogsParams = LogFilter & PaginationParams;

// Job Types (Sync Jobs)
export interface MailcowSyncJob {
  id: number;
  username: string;
  host: string;
  port: number;
  user: string;
  password: string;
  encryption: 'tls' | 'ssl' | 'plain';
  maxage: number;
  maxbytespersecond: number;
  timeout: number;
  active: boolean;
  created: Date;
  modified: Date;
  attributes?: Record<string, unknown>;
}

export interface CreateSyncJobRequest {
  username: string;
  host: string;
  port: number;
  user: string;
  password: string;
  encryption: 'tls' | 'ssl' | 'plain';
  maxage?: number;
  maxbytespersecond?: number;
  timeout?: number;
  active?: boolean;
}

export interface UpdateSyncJobRequest {
  host?: string;
  port?: number;
  user?: string;
  password?: string;
  encryption?: 'tls' | 'ssl' | 'plain';
  maxage?: number;
  maxbytespersecond?: number;
  timeout?: number;
  active?: boolean;
}

// Queue Types (Mail Queue)
export interface MailcowQueueItem {
  id: string;
  sender: string;
  recipient: string;
  subject: string;
  size: number;
  timestamp: Date;
  status: 'active' | 'deferred' | 'hold';
  attempts: number;
  next_attempt?: Date;
  error_message?: string;
}

export interface QueueFilter {
  sender?: string;
  recipient?: string;
  status?: 'active' | 'deferred' | 'hold';
  start_time?: Date;
  end_time?: Date;
}

export interface QueueAction {
  action: 'flush' | 'delete';
  items?: string[];
}

// Type aliases for consistency
export type ListSyncJobsParams = QueueFilter & PaginationParams;
export type ListQueueParams = QueueFilter & PaginationParams; 