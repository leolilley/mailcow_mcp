/**
 * Mailbox Management Tools Tests
 * Comprehensive unit tests for all mailbox management tools
 */

import { 
  ListMailboxesTool, 
  GetMailboxTool, 
  CreateMailboxTool, 
  UpdateMailboxTool, 
  DeleteMailboxTool 
} from '../../../src/tools/mailboxes';
import { MailboxAPI } from '../../../src/api/mailboxes';
import { Logger } from '../../../src/utils';
import { ToolContext, MailcowMailbox, MCPErrorCode } from '../../../src/types';

// Mock the validation functions
jest.mock('../../../src/tools/validation', () => ({
  validateToolInput: jest.fn(),
  validateToolSchema: jest.fn(() => ({ valid: true, errors: [], warnings: [] }))
}));

describe('Mailbox Management Tools', () => {
  let logger: Logger;
  let mailboxAPI: MailboxAPI;
  let context: ToolContext;

  // Sample mailbox data
  const sampleMailboxes: MailcowMailbox[] = [
    {
      id: 1,
      username: 'john@example.com',
      domain: 'example.com',
      local_part: 'john',
      quota: 1000,
      quota_used: 250,
      name: 'John Doe',
      active: true,
      created: new Date('2023-01-01'),
      modified: new Date('2023-01-15'),
      attributes: {}
    },
    {
      id: 2,
      username: 'jane@test.org',
      domain: 'test.org',
      local_part: 'jane',
      quota: 2000,
      quota_used: 1800,
      name: 'Jane Smith',
      active: false,
      created: new Date('2023-02-01'),
      modified: new Date('2023-02-10'),
      attributes: {}
    },
    {
      id: 3,
      username: 'admin@example.com',
      domain: 'example.com',
      local_part: 'admin',
      quota: 5000,
      quota_used: 100,
      name: 'Administrator',
      active: true,
      created: new Date('2023-01-10'),
      modified: new Date('2023-01-20'),
      attributes: {}
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

    mailboxAPI = {
      listMailboxes: jest.fn(),
      getMailboxDetails: jest.fn(),
      createMailbox: jest.fn(),
      updateMailbox: jest.fn(),
      deleteMailbox: jest.fn(),
      setMailboxQuota: jest.fn()
    } as any;

    // Create test context
    context = {
      requestId: 'test-request-123',
      userId: 'test-user',
      timestamp: new Date(),
      permissions: ['mailboxes:read', 'mailboxes:write', 'mailboxes:delete'],
      accessLevel: 'read-write',
      metadata: {}
    };

    // Reset all mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('ListMailboxesTool', () => {
    let tool: ListMailboxesTool;

    beforeEach(() => {
      tool = new ListMailboxesTool(logger, mailboxAPI);
      jest.spyOn(tool as any, 'validatePermissions').mockReturnValue(true);
      jest.spyOn(tool as any, 'validateInput').mockReturnValue({ valid: true, errors: [], warnings: [] });
    });

    it('should have correct tool metadata', () => {
      expect(tool.name).toBe('list_mailboxes');
      expect(tool.description).toBe('List all mailboxes in the Mailcow server with optional filtering');
      expect(tool.inputSchema.type).toBe('object');
      expect(tool.inputSchema.properties).toHaveProperty('domain');
      expect(tool.inputSchema.properties).toHaveProperty('active_only');
      expect(tool.inputSchema.properties).toHaveProperty('search');
      expect(tool.inputSchema.properties).toHaveProperty('limit');
      expect(tool.inputSchema.properties).toHaveProperty('show_quota_usage');
    });

    it('should list all mailboxes without filters', async () => {
      (mailboxAPI.listMailboxes as jest.Mock).mockResolvedValue(sampleMailboxes);

      const result = await tool.execute({}, context);

      expect(result.success).toBe(true);
      expect(result.result).toBeDefined();
      expect(mailboxAPI.listMailboxes).toHaveBeenCalledWith();
      
      const content = result.result!.content[0];
      expect(content.type).toBe('text');
      const data = JSON.parse((content as any).text);
      expect(data.total_mailboxes).toBe(3);
      expect(data.filtered_mailboxes).toBe(3);
      expect(data.active_mailboxes).toBe(2);
      expect(data.inactive_mailboxes).toBe(1);
      expect(data.mailboxes).toHaveLength(3);
      expect(data.quota_statistics).toBeDefined();
    });

    it('should filter mailboxes by domain', async () => {
      (mailboxAPI.listMailboxes as jest.Mock).mockResolvedValue(sampleMailboxes);

      const result = await tool.execute({ domain: 'example.com' }, context);

      expect(result.success).toBe(true);
      const content = result.result!.content[0];
      const data = JSON.parse((content as any).text);
      expect(data.filtered_mailboxes).toBe(2);
      expect(data.mailboxes.every((m: any) => m.domain === 'example.com')).toBe(true);
    });

    it('should filter active mailboxes only', async () => {
      (mailboxAPI.listMailboxes as jest.Mock).mockResolvedValue(sampleMailboxes);

      const result = await tool.execute({ active_only: true }, context);

      expect(result.success).toBe(true);
      const content = result.result!.content[0];
      const data = JSON.parse((content as any).text);
      expect(data.filtered_mailboxes).toBe(2);
      expect(data.mailboxes.every((m: any) => m.active)).toBe(true);
    });

    it('should search mailboxes by username', async () => {
      (mailboxAPI.listMailboxes as jest.Mock).mockResolvedValue(sampleMailboxes);

      const result = await tool.execute({ search: 'john' }, context);

      expect(result.success).toBe(true);
      const content = result.result!.content[0];
      const data = JSON.parse((content as any).text);
      expect(data.filtered_mailboxes).toBe(1);
      expect(data.mailboxes[0].username).toBe('john@example.com');
    });

    it('should limit results', async () => {
      (mailboxAPI.listMailboxes as jest.Mock).mockResolvedValue(sampleMailboxes);

      const result = await tool.execute({ limit: 1 }, context);

      expect(result.success).toBe(true);
      const content = result.result!.content[0];
      const data = JSON.parse((content as any).text);
      expect(data.filtered_mailboxes).toBe(1);
      expect(data.mailboxes).toHaveLength(1);
    });

    it('should exclude quota statistics when requested', async () => {
      (mailboxAPI.listMailboxes as jest.Mock).mockResolvedValue(sampleMailboxes);

      const result = await tool.execute({ show_quota_usage: false }, context);

      expect(result.success).toBe(true);
      const content = result.result!.content[0];
      const data = JSON.parse((content as any).text);
      expect(data.quota_statistics).toBeUndefined();
      expect(data.mailboxes[0].quota_info).toBeUndefined();
    });

    it('should handle permission denial', async () => {
      jest.spyOn(tool as any, 'validatePermissions').mockReturnValue(false);

      const result = await tool.execute({}, context);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(MCPErrorCode.AUTHORIZATION_ERROR);
      expect(result.error?.message).toContain('Permission denied');
    });

    it('should handle API errors', async () => {
      (mailboxAPI.listMailboxes as jest.Mock).mockRejectedValue(new Error('API Error'));

      const result = await tool.execute({}, context);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(MCPErrorCode.TOOL_EXECUTION_ERROR);
    });
  });

  describe('GetMailboxTool', () => {
    let tool: GetMailboxTool;

    beforeEach(() => {
      tool = new GetMailboxTool(logger, mailboxAPI);
      jest.spyOn(tool as any, 'validatePermissions').mockReturnValue(true);
      jest.spyOn(tool as any, 'validateInput').mockReturnValue({ valid: true, errors: [], warnings: [] });
    });

    it('should have correct tool metadata', () => {
      expect(tool.name).toBe('get_mailbox');
      expect(tool.description).toBe('Get detailed information about a specific mailbox');
      expect(tool.inputSchema.required).toContain('username');
    });

    it('should get mailbox details', async () => {
      (mailboxAPI.getMailboxDetails as jest.Mock).mockResolvedValue(sampleMailboxes[0]);

      const result = await tool.execute({ username: 'john@example.com' }, context);

      expect(result.success).toBe(true);
      expect(mailboxAPI.getMailboxDetails).toHaveBeenCalledWith('john@example.com');
      
      const content = result.result!.content[0];
      const data = JSON.parse((content as any).text);
      expect(data.username).toBe('john@example.com');
      expect(data.status).toBe('Active');
      expect(data.quota_details).toBeDefined();
      expect(data.quota_details.usage_percent).toBe(25); // 250/1000 * 100
      expect(data.quota_details.quota_status).toBe('Available');
    });

    it('should calculate quota status correctly for full mailbox', async () => {
      const fullMailbox = { ...sampleMailboxes[1], quota_used: 2000 }; // 100% full
      (mailboxAPI.getMailboxDetails as jest.Mock).mockResolvedValue(fullMailbox);

      const result = await tool.execute({ username: 'jane@test.org' }, context);

      expect(result.success).toBe(true);
      const content = result.result!.content[0];
      const data = JSON.parse((content as any).text);
      expect(data.quota_details.usage_percent).toBe(100);
      expect(data.quota_details.quota_status).toBe('Full');
    });

    it('should calculate quota status correctly for nearly full mailbox', async () => {
      const nearlyFullMailbox = { ...sampleMailboxes[0], quota_used: 950 }; // 95% full
      (mailboxAPI.getMailboxDetails as jest.Mock).mockResolvedValue(nearlyFullMailbox);

      const result = await tool.execute({ username: 'john@example.com' }, context);

      expect(result.success).toBe(true);
      const content = result.result!.content[0];
      const data = JSON.parse((content as any).text);
      expect(data.quota_details.usage_percent).toBe(95);
      expect(data.quota_details.quota_status).toBe('Nearly Full');
    });

    it('should handle invalid username parameter', async () => {
      const result = await tool.execute({ username: 123 }, context);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(MCPErrorCode.INVALID_PARAMS);
    });

    it('should handle mailbox not found', async () => {
      (mailboxAPI.getMailboxDetails as jest.Mock).mockRejectedValue(new Error('Mailbox not found'));

      const result = await tool.execute({ username: 'nonexistent@example.com' }, context);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(MCPErrorCode.TOOL_EXECUTION_ERROR);
    });
  });

  describe('CreateMailboxTool', () => {
    let tool: CreateMailboxTool;

    beforeEach(() => {
      tool = new CreateMailboxTool(logger, mailboxAPI);
      jest.spyOn(tool as any, 'validatePermissions').mockReturnValue(true);
      jest.spyOn(tool as any, 'validateInput').mockReturnValue({ valid: true, errors: [], warnings: [] });
    });

    it('should have correct tool metadata', () => {
      expect(tool.name).toBe('create_mailbox');
      expect(tool.description).toBe('Create a new mailbox in the Mailcow server');
      expect(tool.inputSchema.required).toEqual(['local_part', 'domain', 'password']);
    });

    it('should create mailbox with required parameters', async () => {
      const newMailbox = { ...sampleMailboxes[0], username: 'new@example.com', local_part: 'new' };
      (mailboxAPI.createMailbox as jest.Mock).mockResolvedValue(newMailbox);

      const input = {
        local_part: 'new',
        domain: 'example.com',
        password: 'securepassword123'
      };

      const result = await tool.execute(input, context);

      expect(result.success).toBe(true);
      expect(mailboxAPI.createMailbox).toHaveBeenCalledWith({
        local_part: 'new',
        domain: 'example.com',
        password: 'securepassword123',
        quota: 1000,
        name: undefined,
        active: true
      });
    });

    it('should create mailbox with all parameters', async () => {
      const newMailbox = { ...sampleMailboxes[0], username: 'full@example.com', local_part: 'full' };
      (mailboxAPI.createMailbox as jest.Mock).mockResolvedValue(newMailbox);

      const input = {
        local_part: 'full',
        domain: 'example.com',
        password: 'securepassword123',
        quota: 2000,
        name: 'Full User',
        active: false
      };

      const result = await tool.execute(input, context);

      expect(result.success).toBe(true);
      expect(mailboxAPI.createMailbox).toHaveBeenCalledWith({
        local_part: 'full',
        domain: 'example.com',
        password: 'securepassword123',
        quota: 2000,
        name: 'Full User',
        active: false
      });
    });

    it('should validate required string parameters', async () => {
      const input = {
        local_part: 123,
        domain: 'example.com',
        password: 'password123'
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
        password: 'password123'
      };

      const result = await tool.execute(input, context);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(MCPErrorCode.AUTHORIZATION_ERROR);
    });
  });

  describe('UpdateMailboxTool', () => {
    let tool: UpdateMailboxTool;

    beforeEach(() => {
      tool = new UpdateMailboxTool(logger, mailboxAPI);
      jest.spyOn(tool as any, 'validatePermissions').mockReturnValue(true);
      jest.spyOn(tool as any, 'validateInput').mockReturnValue({ valid: true, errors: [], warnings: [] });
    });

    it('should have correct tool metadata', () => {
      expect(tool.name).toBe('update_mailbox');
      expect(tool.description).toBe('Update settings for an existing mailbox');
      expect(tool.inputSchema.required).toContain('username');
    });

    it('should update mailbox with partial data', async () => {
      const updatedMailbox = { ...sampleMailboxes[0], quota: 2000 };
      (mailboxAPI.getMailboxDetails as jest.Mock).mockResolvedValue(sampleMailboxes[0]);
      (mailboxAPI.updateMailbox as jest.Mock).mockResolvedValue(updatedMailbox);

      const input = {
        username: 'john@example.com',
        quota: 2000
      };

      const result = await tool.execute(input, context);

      expect(result.success).toBe(true);
      expect(mailboxAPI.getMailboxDetails).toHaveBeenCalledWith('john@example.com');
      expect(mailboxAPI.updateMailbox).toHaveBeenCalledWith('john@example.com', {
        quota: 2000
      });

      const content = result.result!.content[0];
      const data = JSON.parse((content as any).text);
      expect(data.updated_fields).toEqual(['quota']);
    });

    it('should update mailbox with multiple fields', async () => {
      const updatedMailbox = { ...sampleMailboxes[0], quota: 3000, name: 'Updated Name' };
      (mailboxAPI.getMailboxDetails as jest.Mock).mockResolvedValue(sampleMailboxes[0]);
      (mailboxAPI.updateMailbox as jest.Mock).mockResolvedValue(updatedMailbox);

      const input = {
        username: 'john@example.com',
        quota: 3000,
        name: 'Updated Name',
        active: false
      };

      const result = await tool.execute(input, context);

      expect(result.success).toBe(true);
      expect(mailboxAPI.updateMailbox).toHaveBeenCalledWith('john@example.com', {
        quota: 3000,
        name: 'Updated Name',
        active: false
      });

      const content = result.result!.content[0];
      const data = JSON.parse((content as any).text);
      expect(data.updated_fields).toEqual(['quota', 'name', 'active']);
    });

    it('should reject update with no parameters', async () => {
      (mailboxAPI.getMailboxDetails as jest.Mock).mockResolvedValue(sampleMailboxes[0]);

      const input = {
        username: 'john@example.com'
      };

      const result = await tool.execute(input, context);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(MCPErrorCode.INVALID_PARAMS);
      expect(result.error?.message).toContain('No update parameters provided');
    });

    it('should handle mailbox not found', async () => {
      (mailboxAPI.getMailboxDetails as jest.Mock).mockRejectedValue(new Error('Not found'));

      const input = {
        username: 'missing@example.com',
        quota: 2000
      };

      const result = await tool.execute(input, context);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(MCPErrorCode.RESOURCE_NOT_FOUND);
    });
  });

  describe('DeleteMailboxTool', () => {
    let tool: DeleteMailboxTool;

    beforeEach(() => {
      tool = new DeleteMailboxTool(logger, mailboxAPI);
      jest.spyOn(tool as any, 'validatePermissions').mockReturnValue(true);
      jest.spyOn(tool as any, 'validateInput').mockReturnValue({ valid: true, errors: [], warnings: [] });
    });

    it('should have correct tool metadata', () => {
      expect(tool.name).toBe('delete_mailbox');
      expect(tool.description).toContain('Delete a mailbox from the Mailcow server');
      expect(tool.inputSchema.required).toEqual(['username', 'confirm']);
    });

    it('should delete mailbox with confirmation', async () => {
      (mailboxAPI.getMailboxDetails as jest.Mock).mockResolvedValue(sampleMailboxes[0]);
      (mailboxAPI.deleteMailbox as jest.Mock).mockResolvedValue(undefined);

      const input = {
        username: 'john@example.com',
        confirm: true
      };

      const result = await tool.execute(input, context);

      expect(result.success).toBe(true);
      expect(mailboxAPI.getMailboxDetails).toHaveBeenCalledWith('john@example.com');
      expect(mailboxAPI.deleteMailbox).toHaveBeenCalledWith('john@example.com');
      
      const content = result.result!.content[0];
      const data = JSON.parse((content as any).text);
      expect(data.message).toContain('deleted successfully');
      expect(data.warning).toContain('permanently deleted');
      expect(data.deleted_mailbox.username).toBe('john@example.com');
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

    it('should validate parameters', async () => {
      const result1 = await tool.execute({ username: 123, confirm: true }, context);
      expect(result1.success).toBe(false);
      expect(result1.error?.code).toBe(MCPErrorCode.INVALID_PARAMS);

      const result2 = await tool.execute({ username: 'test@example.com', confirm: 'yes' }, context);
      expect(result2.success).toBe(false);
      expect(result2.error?.code).toBe(MCPErrorCode.INVALID_PARAMS);
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

    it('should handle mailbox not found', async () => {
      (mailboxAPI.getMailboxDetails as jest.Mock).mockRejectedValue(new Error('Not found'));

      const input = {
        username: 'missing@example.com',
        confirm: true
      };

      const result = await tool.execute(input, context);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(MCPErrorCode.RESOURCE_NOT_FOUND);
    });
  });

  describe('Input Validation', () => {
    let listTool: ListMailboxesTool;

    beforeEach(() => {
      listTool = new ListMailboxesTool(logger, mailboxAPI);
      jest.spyOn(listTool as any, 'validatePermissions').mockReturnValue(true);
    });

    it('should validate input schema', async () => {
      jest.spyOn(listTool as any, 'validateInput').mockReturnValue({
        valid: false,
        errors: [{ field: 'limit', message: 'Invalid limit value', code: 'INVALID' }],
        warnings: []
      });

      const result = await listTool.execute({ limit: 'invalid' }, context);
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(MCPErrorCode.INVALID_PARAMS);
    });

    it('should handle edge cases in filtering', async () => {
      jest.spyOn(listTool as any, 'validateInput').mockReturnValue({ valid: true, errors: [], warnings: [] });
      (mailboxAPI.listMailboxes as jest.Mock).mockResolvedValue(sampleMailboxes);

      // Empty search should return all
      const result1 = await listTool.execute({ search: '' }, context);
      expect(result1.success).toBe(true);

      // Zero limit should not apply limit
      const result2 = await listTool.execute({ limit: 0 }, context);
      expect(result2.success).toBe(true);

      // Negative limit should not apply limit
      const result3 = await listTool.execute({ limit: -1 }, context);
      expect(result3.success).toBe(true);
    });
  });

  describe('Error Handling', () => {
    let createTool: CreateMailboxTool;

    beforeEach(() => {
      createTool = new CreateMailboxTool(logger, mailboxAPI);
      jest.spyOn(createTool as any, 'validatePermissions').mockReturnValue(true);
      jest.spyOn(createTool as any, 'validateInput').mockReturnValue({ valid: true, errors: [], warnings: [] });
    });

    it('should handle various API errors', async () => {
      const input = {
        local_part: 'test',
        domain: 'example.com',
        password: 'password123'
      };

      // Domain not found
      (mailboxAPI.createMailbox as jest.Mock).mockRejectedValue(new Error('Domain not found'));
      const result1 = await createTool.execute(input, context);
      expect(result1.success).toBe(false);

      // Username already exists
      (mailboxAPI.createMailbox as jest.Mock).mockRejectedValue(new Error('Username already exists'));
      const result2 = await createTool.execute(input, context);
      expect(result2.success).toBe(false);

      // Quota exceeded
      (mailboxAPI.createMailbox as jest.Mock).mockRejectedValue(new Error('Domain quota exceeded'));
      const result3 = await createTool.execute(input, context);
      expect(result3.success).toBe(false);
    });
  });
});