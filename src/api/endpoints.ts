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

export function buildAliasEndpoint(action: 'list' | 'create' | 'update' | 'delete'): string {
  switch (action) {
    case 'list': return API_ENDPOINTS.ALIASES.LIST;
    case 'create': return API_ENDPOINTS.ALIASES.CREATE;
    case 'update': return API_ENDPOINTS.ALIASES.UPDATE;
    case 'delete': return API_ENDPOINTS.ALIASES.DELETE;
    default: throw new Error(`Unknown alias action: ${action}`);
  }
} 