/**
 * Mailcow API Endpoints
 * Defines the actual Mailcow API endpoint patterns used throughout the application
 */

import { APIAction } from '../types/api';

// Mailcow uses action-based endpoints, not RESTful patterns
export const API_ENDPOINTS = {
  // Domain endpoints
  DOMAINS: {
    LIST: '/api/v1/get/domain',
    CREATE: '/api/v1/add/domain',
    UPDATE: '/api/v1/edit/domain',
    DELETE: '/api/v1/delete/domain',
  },

  // Mailbox endpoints
  MAILBOXES: {
    LIST: '/api/v1/get/mailbox',
    CREATE: '/api/v1/add/mailbox',
    UPDATE: '/api/v1/edit/mailbox',
    DELETE: '/api/v1/delete/mailbox',
  },

  // Alias endpoints
  ALIASES: {
    LIST: '/api/v1/get/alias',
    CREATE: '/api/v1/add/alias',
    UPDATE: '/api/v1/edit/alias',
    DELETE: '/api/v1/delete/alias',
    GET: '/api/v1/get/alias',
  },

  // User endpoints
  USERS: {
    LIST: '/api/v1/get/user',
    CREATE: '/api/v1/add/user',
    UPDATE: '/api/v1/edit/user',
    DELETE: '/api/v1/delete/user',
  },

  // DKIM endpoints
  DKIM: {
    LIST: '/api/v1/get/dkim',
    CREATE: '/api/v1/add/dkim',
    UPDATE: '/api/v1/edit/dkim',
    DELETE: '/api/v1/delete/dkim',
  },

  // Quarantine endpoints
  QUARANTINE: {
    LIST: '/api/v1/get/quarantine',
    UPDATE: '/api/v1/edit/quarantine',
  },

  // TLS Policy endpoints
  TLS_POLICY: {
    LIST: '/api/v1/get/tls-policy',
    CREATE: '/api/v1/add/tls-policy',
    UPDATE: '/api/v1/edit/tls-policy',
    DELETE: '/api/v1/delete/tls-policy',
  },

  // OAuth2 endpoints
  OAUTH2: {
    LIST: '/api/v1/get/oauth2',
    CREATE: '/api/v1/add/oauth2',
    UPDATE: '/api/v1/edit/oauth2',
    DELETE: '/api/v1/delete/oauth2',
  },

  // App Passwords endpoints
  APP_PASSWD: {
    LIST: '/api/v1/get/app-passwd',
    CREATE: '/api/v1/add/app-passwd',
    DELETE: '/api/v1/delete/app-passwd',
  },

  // Rspamd endpoints
  RSPAMD: {
    GET: '/api/v1/get/rspamd',
    UPDATE: '/api/v1/edit/rspamd',
  },

  // System endpoints
  SYSTEM: {
    STATUS: '/api/v1/get/system/status',
    SERVICES: '/api/v1/get/system/services',
    SERVICE_ACTION: '/api/v1/edit/system/service',
    BACKUP_STATUS: '/api/v1/get/system/backup',
    BACKUP_CREATE: '/api/v1/add/system/backup',
  },

  // Resource endpoints
  RESOURCES: {
    SERVICES: '/api/v1/get/services',
  },

  // Spam endpoints
  SPAM: {
    SETTINGS: '/api/v1/get/spam/settings',
    UPDATE_SETTINGS: '/api/v1/edit/spam/settings',
  },

  // Log endpoints
  LOGS: {
    LIST: '/api/v1/get/logs',
  },

  // Backup endpoints
  BACKUP: {
    GET: '/api/v1/get/backup',
    CREATE: '/api/v1/add/backup',
    UPDATE: '/api/v1/edit/backup',
  },

  // Jobs endpoints (sync jobs)
  SYNCJOBS: {
    LIST: '/api/v1/get/syncjob',
    CREATE: '/api/v1/add/syncjob',
    UPDATE: '/api/v1/edit/syncjob',
    DELETE: '/api/v1/delete/syncjob',
    GET: '/api/v1/get/syncjob',
  },

  // Queue endpoints (mail queue)
  QUEUE: {
    LIST: '/api/v1/get/mailq',
    FLUSH: '/api/v1/edit/mailq',
    DELETE: '/api/v1/delete/mailq',
    GET: '/api/v1/get/mailq',
    HOLD: '/api/v1/edit/mailq',
    RELEASE: '/api/v1/edit/mailq',
  },
};

// Helper functions for building endpoint URLs
export function buildDomainEndpoint(action: APIAction): string {
  switch (action) {
    case APIAction.LIST:
      return API_ENDPOINTS.DOMAINS.LIST;
    case APIAction.CREATE:
      return API_ENDPOINTS.DOMAINS.CREATE;
    case APIAction.UPDATE:
      return API_ENDPOINTS.DOMAINS.UPDATE;
    case APIAction.DELETE:
      return API_ENDPOINTS.DOMAINS.DELETE;
    default:
      throw new Error(`Unknown domain action: ${action}`);
  }
}

export function buildMailboxEndpoint(action: APIAction): string {
  switch (action) {
    case APIAction.LIST:
      return API_ENDPOINTS.MAILBOXES.LIST;
    case APIAction.CREATE:
      return API_ENDPOINTS.MAILBOXES.CREATE;
    case APIAction.UPDATE:
      return API_ENDPOINTS.MAILBOXES.UPDATE;
    case APIAction.DELETE:
      return API_ENDPOINTS.MAILBOXES.DELETE;
    default:
      throw new Error(`Unknown mailbox action: ${action}`);
  }
}

export function buildAliasEndpoint(
  action:
    | APIAction.LIST
    | APIAction.CREATE
    | APIAction.UPDATE
    | APIAction.DELETE
    | APIAction.GET
): string {
  switch (action) {
    case APIAction.LIST:
      return API_ENDPOINTS.ALIASES.LIST;
    case APIAction.CREATE:
      return API_ENDPOINTS.ALIASES.CREATE;
    case APIAction.UPDATE:
      return API_ENDPOINTS.ALIASES.UPDATE;
    case APIAction.DELETE:
      return API_ENDPOINTS.ALIASES.DELETE;
    case APIAction.GET:
      return API_ENDPOINTS.ALIASES.GET;
    default:
      throw new Error(`Unknown alias action: ${action}`);
  }
}

export function buildUserEndpoint(
  action:
    | APIAction.LIST
    | APIAction.CREATE
    | APIAction.UPDATE
    | APIAction.DELETE
    | APIAction.GET
): string {
  switch (action) {
    case APIAction.LIST:
      return API_ENDPOINTS.USERS.LIST;
    case APIAction.CREATE:
      return API_ENDPOINTS.USERS.CREATE;
    case APIAction.UPDATE:
      return API_ENDPOINTS.USERS.UPDATE;
    case APIAction.DELETE:
      return API_ENDPOINTS.USERS.DELETE;
    default:
      throw new Error(`Unknown user action: ${action}`);
  }
}

export function buildDKIMEndpoint(
  action:
    | APIAction.LIST
    | APIAction.CREATE
    | APIAction.UPDATE
    | APIAction.DELETE
): string {
  switch (action) {
    case APIAction.LIST:
      return API_ENDPOINTS.DKIM.LIST;
    case APIAction.CREATE:
      return API_ENDPOINTS.DKIM.CREATE;
    case APIAction.UPDATE:
      return API_ENDPOINTS.DKIM.UPDATE;
    case APIAction.DELETE:
      return API_ENDPOINTS.DKIM.DELETE;
    default:
      throw new Error(`Unknown DKIM action: ${action}`);
  }
}

export function buildQuarantineEndpoint(
  action: APIAction.LIST | APIAction.UPDATE
): string {
  switch (action) {
    case APIAction.LIST:
      return API_ENDPOINTS.QUARANTINE.LIST;
    case APIAction.UPDATE:
      return API_ENDPOINTS.QUARANTINE.UPDATE;
    default:
      throw new Error(`Unknown quarantine action: ${action}`);
  }
}

export function buildTLSPolicyEndpoint(
  action:
    | APIAction.LIST
    | APIAction.CREATE
    | APIAction.UPDATE
    | APIAction.DELETE
): string {
  switch (action) {
    case APIAction.LIST:
      return API_ENDPOINTS.TLS_POLICY.LIST;
    case APIAction.CREATE:
      return API_ENDPOINTS.TLS_POLICY.CREATE;
    case APIAction.UPDATE:
      return API_ENDPOINTS.TLS_POLICY.UPDATE;
    case APIAction.DELETE:
      return API_ENDPOINTS.TLS_POLICY.DELETE;
    default:
      throw new Error(`Unknown TLS policy action: ${action}`);
  }
}

export function buildOAuth2Endpoint(
  action:
    | APIAction.LIST
    | APIAction.CREATE
    | APIAction.UPDATE
    | APIAction.DELETE
): string {
  switch (action) {
    case APIAction.LIST:
      return API_ENDPOINTS.OAUTH2.LIST;
    case APIAction.CREATE:
      return API_ENDPOINTS.OAUTH2.CREATE;
    case APIAction.UPDATE:
      return API_ENDPOINTS.OAUTH2.UPDATE;
    case APIAction.DELETE:
      return API_ENDPOINTS.OAUTH2.DELETE;
    default:
      throw new Error(`Unknown OAuth2 action: ${action}`);
  }
}

export function buildAppPasswdEndpoint(
  action: APIAction.LIST | APIAction.CREATE | APIAction.DELETE
): string {
  switch (action) {
    case APIAction.LIST:
      return API_ENDPOINTS.APP_PASSWD.LIST;
    case APIAction.CREATE:
      return API_ENDPOINTS.APP_PASSWD.CREATE;
    case APIAction.DELETE:
      return API_ENDPOINTS.APP_PASSWD.DELETE;
    default:
      throw new Error(`Unknown app password action: ${action}`);
  }
}

export function buildRspamdEndpoint(
  action: APIAction.GET | APIAction.UPDATE
): string {
  switch (action) {
    case APIAction.GET:
      return API_ENDPOINTS.RSPAMD.GET;
    case APIAction.UPDATE:
      return API_ENDPOINTS.RSPAMD.UPDATE;
    default:
      throw new Error(`Unknown Rspamd action: ${action}`);
  }
}

export function buildBackupEndpoint(
  action: APIAction.GET | APIAction.CREATE | APIAction.UPDATE
): string {
  switch (action) {
    case APIAction.GET:
      return API_ENDPOINTS.BACKUP.GET;
    case APIAction.CREATE:
      return API_ENDPOINTS.BACKUP.CREATE;
    case APIAction.UPDATE:
      return API_ENDPOINTS.BACKUP.UPDATE;
    default:
      throw new Error(`Unknown backup action: ${action}`);
  }
}

export function buildSyncJobEndpoint(
  action:
    | APIAction.LIST
    | APIAction.CREATE
    | APIAction.UPDATE
    | APIAction.DELETE
    | APIAction.GET
): string {
  switch (action) {
    case APIAction.LIST:
      return API_ENDPOINTS.SYNCJOBS.LIST;
    case APIAction.CREATE:
      return API_ENDPOINTS.SYNCJOBS.CREATE;
    case APIAction.UPDATE:
      return API_ENDPOINTS.SYNCJOBS.UPDATE;
    case APIAction.DELETE:
      return API_ENDPOINTS.SYNCJOBS.DELETE;
    case APIAction.GET:
      return API_ENDPOINTS.SYNCJOBS.GET;
    default:
      throw new Error(`Unknown job action: ${action}`);
  }
}

export function buildQueueEndpoint(
  action:
    | APIAction.LIST
    | APIAction.FLUSH
    | APIAction.DELETE
    | APIAction.GET
    | APIAction.HOLD
    | APIAction.RELEASE
): string {
  switch (action) {
    case APIAction.LIST:
      return API_ENDPOINTS.QUEUE.LIST;
    case APIAction.FLUSH:
      return API_ENDPOINTS.QUEUE.FLUSH;
    case APIAction.DELETE:
      return API_ENDPOINTS.QUEUE.DELETE;
    case APIAction.GET:
      return API_ENDPOINTS.QUEUE.GET;
    case APIAction.HOLD:
      return API_ENDPOINTS.QUEUE.HOLD;
    case APIAction.RELEASE:
      return API_ENDPOINTS.QUEUE.RELEASE;
    default:
      throw new Error(`Unknown queue action: ${action}`);
  }
}

export function buildLogEndpoint(action: APIAction.LIST): string {
  switch (action) {
    case APIAction.LIST:
      return API_ENDPOINTS.LOGS.LIST;
    default:
      throw new Error(`Unknown log action: ${action}`);
  }
}

export function buildResourceEndpoint(
  action: APIAction.GET | APIAction.LIST
): string {
  switch (action) {
    case APIAction.GET:
      return API_ENDPOINTS.RESOURCES.SERVICES;
    case APIAction.LIST:
      return API_ENDPOINTS.RESOURCES.SERVICES;
    default:
      throw new Error(`Unknown resource action: ${action}`);
  }
}