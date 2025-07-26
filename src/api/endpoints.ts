/**
 * Mailcow API Endpoints
 * Defines the actual Mailcow API endpoint patterns used throughout the application
 */

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
};

// Helper functions for building endpoint URLs
export function buildDomainEndpoint(action: 'list' | 'create' | 'update' | 'delete'): string {
  switch (action) {
    case 'list': return API_ENDPOINTS.DOMAINS.LIST;
    case 'create': return API_ENDPOINTS.DOMAINS.CREATE;
    case 'update': return API_ENDPOINTS.DOMAINS.UPDATE;
    case 'delete': return API_ENDPOINTS.DOMAINS.DELETE;
    default: throw new Error(`Unknown domain action: ${action}`);
  }
}

export function buildMailboxEndpoint(action: 'list' | 'create' | 'update' | 'delete'): string {
  switch (action) {
    case 'list': return API_ENDPOINTS.MAILBOXES.LIST;
    case 'create': return API_ENDPOINTS.MAILBOXES.CREATE;
    case 'update': return API_ENDPOINTS.MAILBOXES.UPDATE;
    case 'delete': return API_ENDPOINTS.MAILBOXES.DELETE;
    default: throw new Error(`Unknown mailbox action: ${action}`);
  }
}

export function buildAliasEndpoint(
  action: 'list' | 'create' | 'update' | 'delete'
): string {
  switch (action) {
    case 'list':
      return API_ENDPOINTS.ALIASES.LIST;
    case 'create':
      return API_ENDPOINTS.ALIASES.CREATE;
    case 'update':
      return API_ENDPOINTS.ALIASES.UPDATE;
    case 'delete':
      return API_ENDPOINTS.ALIASES.DELETE;
    default:
      throw new Error(`Unknown alias action: ${action}`);
  }
}

export function buildUserEndpoint(
  action: 'list' | 'create' | 'update' | 'delete'
): string {
  switch (action) {
    case 'list':
      return API_ENDPOINTS.USERS.LIST;
    case 'create':
      return API_ENDPOINTS.USERS.CREATE;
    case 'update':
      return API_ENDPOINTS.USERS.UPDATE;
    case 'delete':
      return API_ENDPOINTS.USERS.DELETE;
    default:
      throw new Error(`Unknown user action: ${action}`);
  }
}

export function buildDKIMEndpoint(
  action: 'list' | 'create' | 'update' | 'delete'
): string {
  switch (action) {
    case 'list':
      return API_ENDPOINTS.DKIM.LIST;
    case 'create':
      return API_ENDPOINTS.DKIM.CREATE;
    case 'update':
      return API_ENDPOINTS.DKIM.UPDATE;
    case 'delete':
      return API_ENDPOINTS.DKIM.DELETE;
    default:
      throw new Error(`Unknown DKIM action: ${action}`);
  }
}

export function buildQuarantineEndpoint(action: 'list' | 'update'): string {
  switch (action) {
    case 'list':
      return API_ENDPOINTS.QUARANTINE.LIST;
    case 'update':
      return API_ENDPOINTS.QUARANTINE.UPDATE;
    default:
      throw new Error(`Unknown quarantine action: ${action}`);
  }
}

export function buildTLSPolicyEndpoint(
  action: 'list' | 'create' | 'update' | 'delete'
): string {
  switch (action) {
    case 'list':
      return API_ENDPOINTS.TLS_POLICY.LIST;
    case 'create':
      return API_ENDPOINTS.TLS_POLICY.CREATE;
    case 'update':
      return API_ENDPOINTS.TLS_POLICY.UPDATE;
    case 'delete':
      return API_ENDPOINTS.TLS_POLICY.DELETE;
    default:
      throw new Error(`Unknown TLS policy action: ${action}`);
  }
}

export function buildOAuth2Endpoint(
  action: 'list' | 'create' | 'update' | 'delete'
): string {
  switch (action) {
    case 'list':
      return API_ENDPOINTS.OAUTH2.LIST;
    case 'create':
      return API_ENDPOINTS.OAUTH2.CREATE;
    case 'update':
      return API_ENDPOINTS.OAUTH2.UPDATE;
    case 'delete':
      return API_ENDPOINTS.OAUTH2.DELETE;
    default:
      throw new Error(`Unknown OAuth2 action: ${action}`);
  }
}

export function buildAppPasswdEndpoint(
  action: 'list' | 'create' | 'delete'
): string {
  switch (action) {
    case 'list':
      return API_ENDPOINTS.APP_PASSWD.LIST;
    case 'create':
      return API_ENDPOINTS.APP_PASSWD.CREATE;
    case 'delete':
      return API_ENDPOINTS.APP_PASSWD.DELETE;
    default:
      throw new Error(`Unknown app password action: ${action}`);
  }
}

export function buildRspamdEndpoint(action: 'get' | 'update'): string {
  switch (action) {
    case 'get':
      return API_ENDPOINTS.RSPAMD.GET;
    case 'update':
      return API_ENDPOINTS.RSPAMD.UPDATE;
    default:
      throw new Error(`Unknown Rspamd action: ${action}`);
  }
}

export function buildBackupEndpoint(
  action: 'get' | 'create' | 'update'
): string {
  switch (action) {
    case 'get':
      return API_ENDPOINTS.BACKUP.GET;
    case 'create':
      return API_ENDPOINTS.BACKUP.CREATE;
    case 'update':
      return API_ENDPOINTS.BACKUP.UPDATE;
    default:
      throw new Error(`Unknown backup action: ${action}`);
  }
} 