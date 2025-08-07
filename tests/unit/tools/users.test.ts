/**
 * User Management Tools Tests
 * Comprehensive unit tests for all user management tools
 */

import { 
  ListUsersTool, 
  GetUserTool, 
  CreateUserTool, 
  UpdateUserTool, 
  DeleteUserTool 
} from '../../../src/tools/users';
import { UsersAPI } from '../../../src/api/users';
import { Logger } from '../../../src/utils';
import { ToolContext, MailcowUser, MCPErrorCode } from '../../../src/types';

// Mock the validation functions
jest.mock('../../../src/tools/validation', () => ({
  validateToolInput: jest.fn(),
  validateToolSchema: jest.fn(() => ({ valid: true, errors: [], warnings: [] }))
}));

describe('User Management Tools', () => {
  let logger: Logger;
  let usersAPI: UsersAPI;
  let context: ToolContext;

  // Sample user data
  const sampleUsers: MailcowUser[] = [
    {
      id: 1,
      username: 'john@example.com',
      domain: 'example.com',
      local_part: 'john',
      name: 'John Doe',
      active: true,
      quota: 1000,
      quota_used: 250,
      created: new Date('2023-01-01'),
      modified: new Date('2023-01-15'),
      attributes: {}
    },
    {
      id: 2,
      username: 'jane@test.org',
      domain: 'test.org',
      local_part: 'jane',
      name: 'Jane Smith',
      active: false,
      quota: 500,
      quota_used: 100,
      created: new Date('2023-02-01'),
      modified: new Date('2023-02-10'),
      attributes: { department: 'IT' }
    }
  ];

  beforeEach(() => {
    // Create mock instances
    logger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn()
    } as any;

    usersAPI = {
      listUsers: jest.fn(),
      getUser: jest.fn(),
      createUser: jest.fn(),
      updateUser: jest.fn(),
      deleteUser: jest.fn()
    } as any;

    // Create test context
    context = {
      requestId: 'test-request-123',
      userId: 'test-user',
      timestamp: new Date(),
      permissions: ['users:read', 'users:write', 'users:delete', 'mailboxes:read', 'mailboxes:write'],
      accessLevel: 'read-write',
      metadata: {}
    };

    // Reset all mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('ListUsersTool', () => {
    let tool: ListUsersTool;

    beforeEach(() => {
      tool = new ListUsersTool(logger, usersAPI);
      // Mock validation methods to succeed by default
      jest.spyOn(tool as any, 'validatePermissions').mockReturnValue(true);
      jest.spyOn(tool as any, 'validateInput').mockReturnValue({ valid: true, errors: [], warnings: [] });
    });

    it('should have correct tool metadata', () => {
      expect(tool.name).toBe('list_users');
      expect(tool.description).toBe('List all users in the Mailcow server with optional filtering');
      expect(tool.inputSchema.type).toBe('object');
      expect(tool.inputSchema.properties).toHaveProperty('active_only');
      expect(tool.inputSchema.properties).toHaveProperty('domain');
      expect(tool.inputSchema.properties).toHaveProperty('username');
      expect(tool.inputSchema.properties).toHaveProperty('limit');
    });

    it('should list all users without filters', async () => {
      (usersAPI.listUsers as jest.Mock).mockResolvedValue(sampleUsers);

      const result = await tool.execute({}, context);

      expect(result.success).toBe(true);
      expect(result.result).toBeDefined();
      expect(usersAPI.listUsers).toHaveBeenCalledWith({
        limit: 100,
        offset: 0
      });
      
      // Parse the JSON result
      const content = result.result!.content[0];
      expect(content.type).toBe('text');
      const data = JSON.parse((content as any).text);
      expect(data.total_users).toBe(2);
      expect(data.filtered_users).toBe(2);
      expect(data.active_users).toBe(1);
      expect(data.inactive_users).toBe(1);
      expect(data.users).toHaveLength(2);
    });

    it('should filter active users only', async () => {
      // Mock API to return only active users when filter is applied
      (usersAPI.listUsers as jest.Mock).mockResolvedValue([sampleUsers[0]]);

      const result = await tool.execute({ active_only: true }, context);

      expect(result.success).toBe(true);
      expect(usersAPI.listUsers).toHaveBeenCalledWith({ 
        active: true,
        limit: 100,
        offset: 0
      });
      
      const content = result.result!.content[0];
      const data = JSON.parse((content as any).text);
      expect(data.filtered_users).toBe(1);
      expect(data.users[0].username).toBe('john@example.com');
    });

    it('should filter by domain', async () => {
      (usersAPI.listUsers as jest.Mock).mockResolvedValue(sampleUsers);

      const result = await tool.execute({ domain: 'example.com' }, context);

      expect(result.success).toBe(true);
      expect(usersAPI.listUsers).toHaveBeenCalledWith({ 
        domain: 'example.com',
        limit: 100,
        offset: 0
      });
    });

    it('should limit results', async () => {
      (usersAPI.listUsers as jest.Mock).mockResolvedValue(sampleUsers);

      const result = await tool.execute({ limit: 1 }, context);

      expect(result.success).toBe(true);
      const content = result.result!.content[0];
      const data = JSON.parse((content as any).text);
      expect(data.filtered_users).toBe(1);
    });

    it('should handle permission denial', async () => {
      // Mock permission validation to fail
      jest.spyOn(tool as any, 'validatePermissions').mockReturnValue(false);

      const result = await tool.execute({}, context);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(MCPErrorCode.AUTHORIZATION_ERROR);
      expect(result.error?.message).toContain('Permission denied');
    });

    it('should handle input validation errors', async () => {
      // Mock input validation to fail
      jest.spyOn(tool as any, 'validateInput').mockReturnValue({
        valid: false,
        errors: [{ field: 'limit', message: 'Invalid limit value', code: 'INVALID' }],
        warnings: []
      });

      const result = await tool.execute({ limit: 'invalid' }, context);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(MCPErrorCode.INVALID_PARAMS);
    });

    it('should handle API errors', async () => {
      (usersAPI.listUsers as jest.Mock).mockRejectedValue(new Error('API Error'));

      const result = await tool.execute({}, context);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(MCPErrorCode.TOOL_EXECUTION_ERROR);
    });

    it('should show quota usage information', async () => {
      (usersAPI.listUsers as jest.Mock).mockResolvedValue(sampleUsers);

      const result = await tool.execute({}, context);

      expect(result.success).toBe(true);
      const content = result.result!.content[0];
      const data = JSON.parse((content as any).text);
      
      expect(data.users[0].quota_percent).toBe(25); // 250 / 1000 * 100
      expect(data.users[1].quota_percent).toBe(20); // 100 / 500 * 100
    });
  });

  describe('GetUserTool', () => {
    let tool: GetUserTool;

    beforeEach(() => {
      tool = new GetUserTool(logger, usersAPI);
      jest.spyOn(tool as any, 'validatePermissions').mockReturnValue(true);
      jest.spyOn(tool as any, 'validateInput').mockReturnValue({ valid: true, errors: [], warnings: [] });
    });

    it('should have correct tool metadata', () => {
      expect(tool.name).toBe('get_user');
      expect(tool.description).toBe('Get detailed information about a specific user');
      expect(tool.inputSchema.required).toContain('username');
    });

    it('should get user details', async () => {
      (usersAPI.getUser as jest.Mock).mockResolvedValue(sampleUsers[0]);

      const result = await tool.execute({ username: 'john@example.com' }, context);

      expect(result.success).toBe(true);
      expect(usersAPI.getUser).toHaveBeenCalledWith('john@example.com');
      
      const content = result.result!.content[0];
      const data = JSON.parse((content as any).text);
      expect(data.username).toBe('john@example.com');
      expect(data.status).toBe('Active');
      expect(data.quota_details).toBeDefined();
      expect(data.quota_details.usage_percent).toBe(25);
      expect(data.quota_details.quota_status).toBe('Available');
    });

    it('should handle user not found', async () => {
      (usersAPI.getUser as jest.Mock).mockResolvedValue(null);

      const result = await tool.execute({ username: 'nonexistent@example.com' }, context);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(MCPErrorCode.RESOURCE_NOT_FOUND);
      expect(result.error?.message).toContain('not found');
    });

    it('should show quota status as Full when quota is exceeded', async () => {
      const fullUser = { ...sampleUsers[0], quota: 100, quota_used: 100 };
      (usersAPI.getUser as jest.Mock).mockResolvedValue(fullUser);

      const result = await tool.execute({ username: 'john@example.com' }, context);

      expect(result.success).toBe(true);
      const content = result.result!.content[0];
      const data = JSON.parse((content as any).text);
      expect(data.quota_details.quota_status).toBe('Full');
    });

    it('should show quota status as Nearly Full when over 90%', async () => {
      const nearlyFullUser = { ...sampleUsers[0], quota: 100, quota_used: 95 };
      (usersAPI.getUser as jest.Mock).mockResolvedValue(nearlyFullUser);

      const result = await tool.execute({ username: 'john@example.com' }, context);

      expect(result.success).toBe(true);
      const content = result.result!.content[0];
      const data = JSON.parse((content as any).text);
      expect(data.quota_details.quota_status).toBe('Nearly Full');
    });
  });

  describe('CreateUserTool', () => {
    let tool: CreateUserTool;

    beforeEach(() => {
      tool = new CreateUserTool(logger, usersAPI);
      jest.spyOn(tool as any, 'validatePermissions').mockReturnValue(true);
      jest.spyOn(tool as any, 'validateInput').mockReturnValue({ valid: true, errors: [], warnings: [] });
    });

    it('should have correct tool metadata', () => {
      expect(tool.name).toBe('create_user');
      expect(tool.description).toBe('Create a new user in the Mailcow server');
      expect(tool.inputSchema.required).toContain('local_part');
      expect(tool.inputSchema.required).toContain('domain');
      expect(tool.inputSchema.required).toContain('password');
      expect(tool.inputSchema.required).toContain('quota');
    });

    it('should create user with required parameters', async () => {
      const newUser = { ...sampleUsers[0], username: 'bob@example.com', local_part: 'bob' };
      (usersAPI.createUser as jest.Mock).mockResolvedValue(newUser);

      const input = {
        local_part: 'bob',
        domain: 'example.com',
        password: 'securepass123',
        quota: 1000
      };

      const result = await tool.execute(input, context);

      expect(result.success).toBe(true);
      expect(usersAPI.createUser).toHaveBeenCalledWith({
        local_part: 'bob',
        domain: 'example.com',
        password: 'securepass123',
        quota: 1000,
        name: undefined,
        active: true
      });
      
      const content = result.result!.content[0];
      const data = JSON.parse((content as any).text);
      expect(data.message).toContain('created successfully');
    });

    it('should create user with all parameters', async () => {
      const newUser = { ...sampleUsers[0], username: 'alice@example.com', local_part: 'alice' };
      (usersAPI.createUser as jest.Mock).mockResolvedValue(newUser);

      const input = {
        local_part: 'alice',
        domain: 'example.com',
        password: 'securepass123',
        quota: 2000,
        name: 'Alice Johnson',
        active: false
      };

      const result = await tool.execute(input, context);

      expect(result.success).toBe(true);
      expect(usersAPI.createUser).toHaveBeenCalledWith({
        local_part: 'alice',
        domain: 'example.com',
        password: 'securepass123',
        quota: 2000,
        name: 'Alice Johnson',
        active: false
      });
    });

    it('should validate required parameters', async () => {
      const input = {
        local_part: 123, // Invalid type
        domain: 'example.com',
        password: 'securepass123',
        quota: 1000
      };

      const result = await tool.execute(input, context);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(MCPErrorCode.INVALID_PARAMS);
      expect(result.error?.message).toContain('must be strings');
    });

    it('should handle permission denial', async () => {
      jest.spyOn(tool as any, 'validatePermissions').mockReturnValue(false);

      const input = {
        local_part: 'test',
        domain: 'example.com',
        password: 'securepass123',
        quota: 1000
      };

      const result = await tool.execute(input, context);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(MCPErrorCode.AUTHORIZATION_ERROR);
    });
  });

  describe('UpdateUserTool', () => {
    let tool: UpdateUserTool;

    beforeEach(() => {
      tool = new UpdateUserTool(logger, usersAPI);
      jest.spyOn(tool as any, 'validatePermissions').mockReturnValue(true);
      jest.spyOn(tool as any, 'validateInput').mockReturnValue({ valid: true, errors: [], warnings: [] });
    });

    it('should have correct tool metadata', () => {
      expect(tool.name).toBe('update_user');
      expect(tool.description).toBe('Update settings for an existing user');
      expect(tool.inputSchema.required).toContain('username');
    });

    it('should update user with partial data', async () => {
      const updatedUser = { ...sampleUsers[0], quota: 2000 };
      (usersAPI.getUser as jest.Mock).mockResolvedValue(sampleUsers[0]);
      (usersAPI.updateUser as jest.Mock).mockResolvedValue(updatedUser);

      const input = {
        username: 'john@example.com',
        quota: 2000
      };

      const result = await tool.execute(input, context);

      expect(result.success).toBe(true);
      expect(usersAPI.getUser).toHaveBeenCalledWith('john@example.com');
      expect(usersAPI.updateUser).toHaveBeenCalledWith('john@example.com', {
        quota: 2000
      });
      
      const content = result.result!.content[0];
      const data = JSON.parse((content as any).text);
      expect(data.message).toContain('updated successfully');
      expect(data.updated_fields).toEqual(['quota']);
    });

    it('should update multiple fields', async () => {
      const updatedUser = { 
        ...sampleUsers[0], 
        quota: 2000, 
        name: 'John Updated',
        active: false 
      };
      (usersAPI.getUser as jest.Mock).mockResolvedValue(sampleUsers[0]);
      (usersAPI.updateUser as jest.Mock).mockResolvedValue(updatedUser);

      const input = {
        username: 'john@example.com',
        quota: 2000,
        name: 'John Updated',
        active: false
      };

      const result = await tool.execute(input, context);

      expect(result.success).toBe(true);
      expect(usersAPI.updateUser).toHaveBeenCalledWith('john@example.com', {
        quota: 2000,
        name: 'John Updated',
        active: false
      });
    });

    it('should handle user not found', async () => {
      (usersAPI.getUser as jest.Mock).mockResolvedValue(null);

      const input = {
        username: 'missing@example.com',
        quota: 1000
      };

      const result = await tool.execute(input, context);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(MCPErrorCode.RESOURCE_NOT_FOUND);
    });

    it('should require at least one update parameter', async () => {
      (usersAPI.getUser as jest.Mock).mockResolvedValue(sampleUsers[0]);

      const input = {
        username: 'john@example.com'
      };

      const result = await tool.execute(input, context);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(MCPErrorCode.INVALID_PARAMS);
      expect(result.error?.message).toContain('No update parameters provided');
    });
  });

  describe('DeleteUserTool', () => {
    let tool: DeleteUserTool;

    beforeEach(() => {
      tool = new DeleteUserTool(logger, usersAPI);
      jest.spyOn(tool as any, 'validatePermissions').mockReturnValue(true);
      jest.spyOn(tool as any, 'validateInput').mockReturnValue({ valid: true, errors: [], warnings: [] });
    });

    it('should have correct tool metadata', () => {
      expect(tool.name).toBe('delete_user');
      expect(tool.description).toContain('Delete a user from the Mailcow server');
      expect(tool.inputSchema.required).toContain('username');
      expect(tool.inputSchema.required).toContain('confirm');
    });

    it('should delete user with confirmation', async () => {
      (usersAPI.getUser as jest.Mock).mockResolvedValue(sampleUsers[0]);
      (usersAPI.deleteUser as jest.Mock).mockResolvedValue(true);

      const input = {
        username: 'john@example.com',
        confirm: true
      };

      const result = await tool.execute(input, context);

      expect(result.success).toBe(true);
      expect(usersAPI.getUser).toHaveBeenCalledWith('john@example.com');
      expect(usersAPI.deleteUser).toHaveBeenCalledWith('john@example.com');
      
      const content = result.result!.content[0];
      const data = JSON.parse((content as any).text);
      expect(data.message).toContain('deleted successfully');
      expect(data.warning).toContain('permanently deleted');
    });

    it('should require confirmation', async () => {
      const input = {
        username: 'john@example.com',
        confirm: false
      };

      const result = await tool.execute(input, context);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(MCPErrorCode.INVALID_PARAMS);
      expect(result.error?.message).toContain('requires explicit confirmation');
    });

    it('should handle permission denial', async () => {
      jest.spyOn(tool as any, 'validatePermissions').mockReturnValue(false);

      const input = {
        username: 'john@example.com',
        confirm: true
      };

      const result = await tool.execute(input, context);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(MCPErrorCode.AUTHORIZATION_ERROR);
    });

    it('should handle user not found', async () => {
      (usersAPI.getUser as jest.Mock).mockResolvedValue(null);

      const input = {
        username: 'missing@example.com',
        confirm: true
      };

      const result = await tool.execute(input, context);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(MCPErrorCode.RESOURCE_NOT_FOUND);
    });

    it('should handle deletion failure', async () => {
      (usersAPI.getUser as jest.Mock).mockResolvedValue(sampleUsers[0]);
      (usersAPI.deleteUser as jest.Mock).mockResolvedValue(false);

      const input = {
        username: 'john@example.com',
        confirm: true
      };

      const result = await tool.execute(input, context);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(MCPErrorCode.INTERNAL_ERROR);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    let listTool: ListUsersTool;

    beforeEach(() => {
      listTool = new ListUsersTool(logger, usersAPI);
      jest.spyOn(listTool as any, 'validatePermissions').mockReturnValue(true);
    });

    it('should handle empty username filter', async () => {
      jest.spyOn(listTool as any, 'validateInput').mockReturnValue({ valid: true, errors: [], warnings: [] });
      (usersAPI.listUsers as jest.Mock).mockResolvedValue(sampleUsers);

      const result = await listTool.execute({ username: '' }, context);
      expect(result.success).toBe(true);
    });

    it('should handle zero and negative limits', async () => {
      jest.spyOn(listTool as any, 'validateInput').mockReturnValue({ valid: true, errors: [], warnings: [] });
      (usersAPI.listUsers as jest.Mock).mockResolvedValue(sampleUsers);

      const result1 = await listTool.execute({ limit: 0 }, context);
      expect(result1.success).toBe(true);

      const result2 = await listTool.execute({ limit: -1 }, context);
      expect(result2.success).toBe(true);
    });

    it('should handle network errors gracefully', async () => {
      jest.spyOn(listTool as any, 'validateInput').mockReturnValue({ valid: true, errors: [], warnings: [] });
      (usersAPI.listUsers as jest.Mock).mockRejectedValue(new Error('Network timeout'));

      const result = await listTool.execute({}, context);
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(MCPErrorCode.TOOL_EXECUTION_ERROR);
    });

    it('should handle users with zero quota', async () => {
      const zeroQuotaUser = { ...sampleUsers[0], quota: 0 };
      jest.spyOn(listTool as any, 'validateInput').mockReturnValue({ valid: true, errors: [], warnings: [] });
      (usersAPI.listUsers as jest.Mock).mockResolvedValue([zeroQuotaUser]);

      const result = await listTool.execute({}, context);
      expect(result.success).toBe(true);
      
      const content = result.result!.content[0];
      const data = JSON.parse((content as any).text);
      expect(data.users[0].quota_percent).toBe(0);
    });
  });
});