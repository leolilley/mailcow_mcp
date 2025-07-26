import { AuthManager } from '../../../src/auth/auth';
import { Permission } from '../../../src/types';

describe('AuthManager', () => {
  const authManager = new AuthManager();

  it('should validate a valid API key', async () => {
    const result = await authManager.validateAPIKey('a'.repeat(32));
    expect(result.success).toBe(true);
  });

  it('should reject an invalid API key', async () => {
    const result = await authManager.validateAPIKey('short');
    expect(result.success).toBe(false);
  });

  describe('Permission Checking', () => {
    it('should allow read operations for read-only access', () => {
      expect(authManager.checkPermission('read-only', 'get.domains')).toBe(true);
      expect(authManager.checkPermission('read-only', 'list.mailboxes')).toBe(true);
      expect(authManager.checkPermission('read-only', 'view.status')).toBe(true);
    });

    it('should deny write operations for read-only access', () => {
      expect(authManager.checkPermission('read-only', 'create.domain')).toBe(false);
      expect(authManager.checkPermission('read-only', 'delete.mailbox')).toBe(false);
      expect(authManager.checkPermission('read-only', 'update.alias')).toBe(false);
    });

    it('should allow all operations for read-write access', () => {
      expect(authManager.checkPermission('read-write', 'get.domains')).toBe(true);
      expect(authManager.checkPermission('read-write', 'create.domain')).toBe(true);
      expect(authManager.checkPermission('read-write', 'delete.mailbox')).toBe(true);
      expect(authManager.checkPermission('read-write', 'restart.service')).toBe(true);
    });

    it('should check specific permissions when provided', () => {
      const permissions: Permission[] = [
        {
          resource: 'domain',
          actions: ['get', 'list']
        },
        {
          resource: 'mailbox',
          actions: ['create', 'update']
        }
      ];

      // Should allow domain operations
      expect(authManager.checkPermission('read-write', 'get.domain', permissions)).toBe(true);
      expect(authManager.checkPermission('read-write', 'list.domains', permissions)).toBe(true);

      // Should not allow mailbox get operations (not in actions)
      expect(authManager.checkPermission('read-write', 'get.mailbox', permissions)).toBe(false);
      // Should allow mailbox create operations
      expect(authManager.checkPermission('read-write', 'create.mailbox', permissions)).toBe(true);
    });

    it('should handle wildcard permissions', () => {
      const permissions: Permission[] = [
        {
          resource: '*',
          actions: ['get', 'list']
        }
      ];

      expect(authManager.checkPermission('read-write', 'get.anything', permissions)).toBe(true);
      expect(authManager.checkPermission('read-write', 'list.everything', permissions)).toBe(true);
    });

    it('should handle case-insensitive operations', () => {
      expect(authManager.checkPermission('read-only', 'GET.DOMAINS')).toBe(true);
      expect(authManager.checkPermission('read-only', 'Create.Domain')).toBe(false);
      expect(authManager.checkPermission('read-write', 'DELETE.MAILBOX')).toBe(true);
    });

    it('should handle admin operations correctly', () => {
      expect(authManager.checkPermission('read-only', 'restart.service')).toBe(false);
      expect(authManager.checkPermission('read-only', 'backup.system')).toBe(false);
      expect(authManager.checkPermission('read-write', 'restart.service')).toBe(true);
      expect(authManager.checkPermission('read-write', 'backup.system')).toBe(true);
    });

    it('should handle edge cases and complex operations', () => {
      // Test operations with multiple dots
      expect(authManager.checkPermission('read-write', 'get.system.status')).toBe(true);
      expect(authManager.checkPermission('read-only', 'create.mailbox.user')).toBe(false);
      
      // Test operations with special characters
      expect(authManager.checkPermission('read-write', 'get-domain-list')).toBe(true);
      expect(authManager.checkPermission('read-write', 'update_mailbox_settings')).toBe(true);
      
      // Test empty operation
      expect(authManager.checkPermission('read-write', '')).toBe(false);
    });

    it('should evaluate conditions with different operators', () => {
      const permissions: Permission[] = [
        {
          resource: 'domain',
          actions: ['get', 'list']
        }
      ];

      // Test basic permission matching
      expect(authManager.checkPermission('read-write', 'get.domain', permissions)).toBe(true);
      expect(authManager.checkPermission('read-write', 'list.domains', permissions)).toBe(true);
    });

    it('should handle basic resource and action matching', () => {
      const permissions: Permission[] = [
        {
          resource: 'mailbox',
          actions: ['get', 'create']
        }
      ];

      // Test basic permission matching
      expect(authManager.checkPermission('read-write', 'get.mailbox', permissions)).toBe(true);
      expect(authManager.checkPermission('read-write', 'create.mailbox', permissions)).toBe(true);
      expect(authManager.checkPermission('read-write', 'delete.mailbox', permissions)).toBe(false);
    });

    it('should handle specific resource matching', () => {
      const permissions: Permission[] = [
        {
          resource: 'alias',
          actions: ['get', 'update']
        }
      ];

      // Test specific resource matching
      expect(authManager.checkPermission('read-write', 'get.alias', permissions)).toBe(true);
      expect(authManager.checkPermission('read-write', 'update.alias', permissions)).toBe(true);
      expect(authManager.checkPermission('read-write', 'create.alias', permissions)).toBe(false);
    });

    it('should reject unknown operations', () => {
      // Test with operations that don't match our defined types
      expect(authManager.checkPermission('read-write', 'unknown.operation')).toBe(false);
      expect(authManager.checkPermission('read-write', 'invalid_action')).toBe(false);
      expect(authManager.checkPermission('read-write', 'random.operation')).toBe(false);
    });

    it('should validate operation types correctly', () => {
      // Test read operations
      expect(authManager.checkPermission('read-only', 'get.domains')).toBe(true);
      expect(authManager.checkPermission('read-only', 'list.mailboxes')).toBe(true);
      expect(authManager.checkPermission('read-only', 'view.status')).toBe(true);
      
      // Test write operations
      expect(authManager.checkPermission('read-write', 'create.domain')).toBe(true);
      expect(authManager.checkPermission('read-write', 'update.mailbox')).toBe(true);
      expect(authManager.checkPermission('read-write', 'delete.alias')).toBe(true);
      
      // Test admin operations
      expect(authManager.checkPermission('read-write', 'restart.service')).toBe(true);
      expect(authManager.checkPermission('read-write', 'backup.system')).toBe(true);
      expect(authManager.checkPermission('read-write', 'config.system')).toBe(true);
    });
  });
}); 