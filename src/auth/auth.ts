import { AuthResult, AccessLevel, SessionToken, Permission, PermissionCondition } from '../types';
import { APIKeyManager } from './api-key';
import { createSession, validateSessionToken, refreshSession } from './session';
import { auditLog } from './security';

// Define operation types for better type safety
type OperationType = 'read' | 'write' | 'admin';

// Define specific operation categories
const READ_OPERATIONS = ['get', 'list', 'read', 'view', 'status'] as const;
const WRITE_OPERATIONS = ['create', 'add', 'update', 'edit', 'delete', 'remove', 'post', 'put'] as const;
const ADMIN_OPERATIONS = ['restart', 'backup', 'restore', 'config', 'system'] as const;

type ReadOperation = typeof READ_OPERATIONS[number];
type WriteOperation = typeof WRITE_OPERATIONS[number];
type AdminOperation = typeof ADMIN_OPERATIONS[number];

// Define resource types for better type safety
type ResourceType = 'domain' | 'domains' | 'mailbox' | 'mailboxes' | 'alias' | 'aliases' | 'system' | 'admin' | 'general';

// Define action types for better type safety
type ActionType = 'get' | 'list' | 'create' | 'update' | 'delete' | 'restart' | 'backup' | 'restore' | 'config';

export class AuthManager {
  private apiKeyManager: APIKeyManager;

  constructor() {
    this.apiKeyManager = new APIKeyManager();
  }

  async validateAPIKey(apiKey: string, clientIp?: string): Promise<AuthResult> {
    const result = await this.apiKeyManager.validateAPIKey(apiKey, clientIp);
    if (!result.success) {
      auditLog('auth_failure', { apiKey, clientIp, error: result.error });
    }
    return result;
  }

  async createSession(apiKey: string, accessLevel: AccessLevel): Promise<SessionToken> {
    const session = await createSession(apiKey, accessLevel);
    auditLog('session_created', { apiKey, accessLevel, session });
    return session;
  }

  async validateSession(sessionToken: string): Promise<boolean> {
    return validateSessionToken(sessionToken);
  }

  async refreshSession(sessionToken: string): Promise<SessionToken | null> {
    const session = await refreshSession(sessionToken);
    if (session) auditLog('session_refreshed', { sessionToken });
    return session;
  }

  checkPermission(accessLevel: AccessLevel, operation: string, permissions: Permission[] = []): boolean {
    // Validate that the operation is recognized
    if (!this.isValidOperation(operation)) {
      auditLog('access_denied', { accessLevel, operation, reason: 'unknown_operation' });
      return false;
    }

    const operationType = this.getOperationType(operation);

    // Basic access level checks
    if (accessLevel === 'read-only' && operationType !== 'read') {
      auditLog('access_denied', { accessLevel, operation, reason: 'read-only_access_level' });
      return false;
    }

    // Check specific permissions if provided
    if (permissions.length > 0) {
      const hasPermission = this.checkSpecificPermissions(operation, permissions);
      if (!hasPermission) {
        auditLog('access_denied', { accessLevel, operation, reason: 'insufficient_permissions' });
        return false;
      }
    }

    // Log successful permission check
    auditLog('access_granted', { accessLevel, operation });
    return true;
  }

  private getOperationType(operation: string): OperationType {
    const lowerOperation = operation.toLowerCase();
    
    // Check for write operations using the defined type
    const hasWriteOperation = WRITE_OPERATIONS.some((op: WriteOperation) => 
      lowerOperation.includes(op)
    );
    if (hasWriteOperation) return 'write';
    
    // Check for admin operations using the defined type
    const hasAdminOperation = ADMIN_OPERATIONS.some((op: AdminOperation) => 
      lowerOperation.includes(op)
    );
    if (hasAdminOperation) return 'admin';
    
    // Default to read operations
    return 'read';
  }

  private isValidOperation(operation: string): boolean {
    const lowerOperation = operation.toLowerCase();
    
    // Check if operation matches any of our defined operation types
    return READ_OPERATIONS.some((op: ReadOperation) => lowerOperation.includes(op)) ||
           WRITE_OPERATIONS.some((op: WriteOperation) => lowerOperation.includes(op)) ||
           ADMIN_OPERATIONS.some((op: AdminOperation) => lowerOperation.includes(op));
  }

  private checkSpecificPermissions(operation: string, permissions: Permission[]): boolean {
    // Extract action and resource from operation (format: action.resource)
    const operationParts = operation.toLowerCase().split('.');
    const action = operationParts[0] || operation;
    const resource = operationParts[1] || 'general';

    // Check if any permission matches the resource and action
    return permissions.some(permission => {
      // Wildcard resource or action matches any
      if (permission.resource === '*' || permission.actions.includes('*')) {
        return true;
      }
      // Check resource match (handle singular/plural forms)
      const resourceMatch = this.matchesCondition(resource, permission.resource) ||
                           this.matchesCondition(this.normalizeResource(resource), this.normalizeResource(permission.resource));
      if (!resourceMatch) return false;

      // Check action match
      const actionMatch = permission.actions.some(permAction => 
        this.matchesCondition(action, permAction)
      );
      if (!actionMatch) return false;

      // Check conditions if any
      if (permission.conditions && permission.conditions.length > 0) {
        return permission.conditions.every(condition => 
          this.evaluateCondition(condition, resource as ResourceType, action as ActionType)
        );
      }

      return true;
    });
  }

  private normalizeResource(resource: string): string {
    // Normalize plural/singular forms
    const normalized = resource.toLowerCase();
    if (normalized.endsWith('s')) {
      return normalized.slice(0, -1);
    }
    return normalized;
  }

  private matchesCondition(value: string, pattern: string): boolean {
    // Proper wildcard and pattern matching
    if (pattern === '*' || value === '*') return true;
    if (pattern === value) return true;
    if (pattern.startsWith('*') && value.endsWith(pattern.slice(1))) return true;
    if (pattern.endsWith('*') && value.startsWith(pattern.slice(0, -1))) return true;
    // Allow pattern to be a substring wildcard (e.g. foo*bar)
    if (pattern.includes('*')) {
      const [start, end] = pattern.split('*');
      if (value.startsWith(start) && value.endsWith(end)) return true;
    }
    // Regex support for pattern
    try {
      if (pattern.startsWith('^') || pattern.endsWith('$')) {
        const regex = new RegExp(pattern);
        if (regex.test(value)) return true;
      }
    } catch {}
    return value.includes(pattern) || pattern.includes(value);
  }

  private evaluateCondition(
    condition: PermissionCondition, 
    resource: ResourceType, 
    action: ActionType
  ): boolean {
    // Evaluate condition based on type, value, and operator
    const { type, value, operator } = condition;
    
    // First check if the condition type matches the resource
    const resourceTypeMatch = this.matchesResourceType(type, resource);
    if (!resourceTypeMatch) return false;

    // Then evaluate the condition based on the operator and action
    switch (operator) {
      case 'equals':
        return this.evaluateEqualsCondition(value, resource, action);
      case 'starts_with':
        return this.evaluateStartsWithCondition(value, resource, action);
      case 'ends_with':
        return this.evaluateEndsWithCondition(value, resource, action);
      case 'contains':
        return this.evaluateContainsCondition(value, resource, action);
      case 'regex':
        return this.evaluateRegexCondition(value, resource, action);
      default:
        return true;
    }
  }

  private matchesResourceType(conditionType: PermissionCondition['type'], resource: ResourceType): boolean {
    switch (conditionType) {
      case 'domain':
        return resource === 'domain' || resource === 'domains';
      case 'mailbox':
        return resource === 'mailbox' || resource === 'mailboxes';
      case 'alias':
        return resource === 'alias' || resource === 'aliases';
      case 'system':
        return resource === 'system' || resource === 'admin';
      default:
        return true;
    }
  }

  private evaluateEqualsCondition(value: string, resource: ResourceType, action: ActionType): boolean {
    // Check if the action or resource exactly matches the condition value
    return action === value || resource === value;
  }

  private evaluateStartsWithCondition(value: string, resource: ResourceType, action: ActionType): boolean {
    // Check if the action or resource starts with the condition value
    return action.startsWith(value) || resource.startsWith(value);
  }

  private evaluateEndsWithCondition(value: string, resource: ResourceType, action: ActionType): boolean {
    // Check if the action or resource ends with the condition value
    return action.endsWith(value) || resource.endsWith(value);
  }

  private evaluateContainsCondition(value: string, resource: ResourceType, action: ActionType): boolean {
    // Check if the action or resource contains the condition value
    return action.includes(value) || resource.includes(value);
  }

  private evaluateRegexCondition(value: string, resource: ResourceType, action: ActionType): boolean {
    try {
      const regex = new RegExp(value);
      return regex.test(action) || regex.test(resource);
    } catch {
      // If regex is invalid, fall back to contains
      return this.evaluateContainsCondition(value, resource, action);
    }
  }
} 