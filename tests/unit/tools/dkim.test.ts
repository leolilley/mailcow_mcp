/**
 * DKIM Management Tools Tests
 * Comprehensive unit tests for all DKIM management tools
 */

import { 
  ListDKIMKeysTool, 
  GetDKIMKeyTool, 
  CreateDKIMKeyTool, 
  UpdateDKIMKeyTool, 
  DeleteDKIMKeyTool 
} from '../../../src/tools/dkim';
import { DKIMAPI } from '../../../src/api/dkim';
import { Logger } from '../../../src/utils';
import { ToolContext, MailcowDKIM, MCPErrorCode } from '../../../src/types';

// Mock the validation functions
jest.mock('../../../src/tools/validation', () => ({
  validateToolInput: jest.fn(),
  validateToolSchema: jest.fn(() => ({ valid: true, errors: [], warnings: [] }))
}));

describe('DKIM Management Tools', () => {
  let logger: Logger;
  let dkimAPI: DKIMAPI;
  let context: ToolContext;

  // Sample DKIM data
  const sampleDKIMKeys: MailcowDKIM[] = [
    {
      id: 1,
      domain: 'example.com',
      selector: 'default',
      algorithm: 'rsa',
      key_size: 2048,
      active: true,
      public_key: 'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA123456789abcdef...',
      created: new Date('2023-01-01'),
      modified: new Date('2023-01-15')
    },
    {
      id: 2,
      domain: 'test.org',
      selector: 'mail',
      algorithm: 'ed25519',
      key_size: 256,
      active: false,
      public_key: 'MCowBQYDK2VwAyEA123456789abcdef...',
      created: new Date('2023-02-01'),
      modified: new Date('2023-02-10')
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

    dkimAPI = {
      listDKIMKeys: jest.fn(),
      getDKIMKey: jest.fn(),
      createDKIMKey: jest.fn(),
      updateDKIMKey: jest.fn(),
      deleteDKIMKey: jest.fn(),
      generateDKIMDNSRecord: jest.fn(),
      validateDKIMKey: jest.fn()
    } as any;

    // Create test context
    context = {
      requestId: 'test-request-123',
      userId: 'test-user',
      timestamp: new Date(),
      permissions: ['dkim:read', 'dkim:write', 'dkim:delete', 'domains:read', 'domains:write'],
      accessLevel: 'read-write',
      metadata: {}
    };

    // Reset all mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('ListDKIMKeysTool', () => {
    let tool: ListDKIMKeysTool;

    beforeEach(() => {
      tool = new ListDKIMKeysTool(logger, dkimAPI);
      // Mock validation methods to succeed by default
      jest.spyOn(tool as any, 'validatePermissions').mockReturnValue(true);
      jest.spyOn(tool as any, 'validateInput').mockReturnValue({ valid: true, errors: [], warnings: [] });
    });

    it('should have correct tool metadata', () => {
      expect(tool.name).toBe('list_dkim_keys');
      expect(tool.description).toBe('List all DKIM keys in the Mailcow server with optional filtering');
      expect(tool.inputSchema.type).toBe('object');
      expect(tool.inputSchema.properties).toHaveProperty('active_only');
      expect(tool.inputSchema.properties).toHaveProperty('domain');
      expect(tool.inputSchema.properties).toHaveProperty('selector');
      expect(tool.inputSchema.properties).toHaveProperty('algorithm');
      expect(tool.inputSchema.properties).toHaveProperty('limit');
    });

    it('should list all DKIM keys without filters', async () => {
      (dkimAPI.listDKIMKeys as jest.Mock).mockResolvedValue(sampleDKIMKeys);

      const result = await tool.execute({}, context);

      expect(result.success).toBe(true);
      expect(result.result).toBeDefined();
      expect(dkimAPI.listDKIMKeys).toHaveBeenCalledWith({
        limit: 100,
        offset: 0
      });
      
      // Parse the JSON result
      const content = result.result!.content[0];
      expect(content.type).toBe('text');
      const data = JSON.parse((content as any).text);
      expect(data.total_keys).toBe(2);
      expect(data.filtered_keys).toBe(2);
      expect(data.active_keys).toBe(1);
      expect(data.inactive_keys).toBe(1);
      expect(data.algorithm_breakdown.rsa).toBe(1);
      expect(data.algorithm_breakdown.ed25519).toBe(1);
      expect(data.keys).toHaveLength(2);
    });

    it('should filter active DKIM keys only', async () => {
      // Mock API to return only active keys when filter is applied
      (dkimAPI.listDKIMKeys as jest.Mock).mockResolvedValue([sampleDKIMKeys[0]]);

      const result = await tool.execute({ active_only: true }, context);

      expect(result.success).toBe(true);
      expect(dkimAPI.listDKIMKeys).toHaveBeenCalledWith({ 
        active: true,
        limit: 100,
        offset: 0
      });
      
      const content = result.result!.content[0];
      const data = JSON.parse((content as any).text);
      expect(data.filtered_keys).toBe(1);
      expect(data.keys[0].domain).toBe('example.com');
    });

    it('should filter by domain', async () => {
      (dkimAPI.listDKIMKeys as jest.Mock).mockResolvedValue(sampleDKIMKeys);

      const result = await tool.execute({ domain: 'example.com' }, context);

      expect(result.success).toBe(true);
      expect(dkimAPI.listDKIMKeys).toHaveBeenCalledWith({ 
        domain: 'example.com',
        limit: 100,
        offset: 0
      });
    });

    it('should filter by algorithm', async () => {
      (dkimAPI.listDKIMKeys as jest.Mock).mockResolvedValue(sampleDKIMKeys);

      const result = await tool.execute({ algorithm: 'rsa' }, context);

      expect(result.success).toBe(true);
      expect(dkimAPI.listDKIMKeys).toHaveBeenCalledWith({ 
        algorithm: 'rsa',
        limit: 100,
        offset: 0
      });
    });

    it('should limit results', async () => {
      (dkimAPI.listDKIMKeys as jest.Mock).mockResolvedValue(sampleDKIMKeys);

      const result = await tool.execute({ limit: 1 }, context);

      expect(result.success).toBe(true);
      const content = result.result!.content[0];
      const data = JSON.parse((content as any).text);
      expect(data.filtered_keys).toBe(1);
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
      (dkimAPI.listDKIMKeys as jest.Mock).mockRejectedValue(new Error('API Error'));

      const result = await tool.execute({}, context);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(MCPErrorCode.TOOL_EXECUTION_ERROR);
    });

    it('should show public key preview', async () => {
      (dkimAPI.listDKIMKeys as jest.Mock).mockResolvedValue(sampleDKIMKeys);

      const result = await tool.execute({}, context);

      expect(result.success).toBe(true);
      const content = result.result!.content[0];
      const data = JSON.parse((content as any).text);
      
      expect(data.keys[0].public_key_preview).toContain('...');
      expect(data.keys[0].public_key_preview.length).toBeLessThan(100);
    });
  });

  describe('GetDKIMKeyTool', () => {
    let tool: GetDKIMKeyTool;

    beforeEach(() => {
      tool = new GetDKIMKeyTool(logger, dkimAPI);
      jest.spyOn(tool as any, 'validatePermissions').mockReturnValue(true);
      jest.spyOn(tool as any, 'validateInput').mockReturnValue({ valid: true, errors: [], warnings: [] });
    });

    it('should have correct tool metadata', () => {
      expect(tool.name).toBe('get_dkim_key');
      expect(tool.description).toBe('Get detailed information about a specific DKIM key');
      expect(tool.inputSchema.required).toContain('domain');
      expect(tool.inputSchema.required).toContain('selector');
    });

    it('should get DKIM key details', async () => {
      const dnsRecord = 'v=DKIM1; k=rsa; p=MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA123456789abcdef...';
      (dkimAPI.getDKIMKey as jest.Mock).mockResolvedValue(sampleDKIMKeys[0]);
      (dkimAPI.generateDKIMDNSRecord as jest.Mock).mockReturnValue(dnsRecord);
      (dkimAPI.validateDKIMKey as jest.Mock).mockReturnValue(true);

      const result = await tool.execute({ 
        domain: 'example.com', 
        selector: 'default' 
      }, context);

      expect(result.success).toBe(true);
      expect(dkimAPI.getDKIMKey).toHaveBeenCalledWith('example.com', 'default');
      expect(dkimAPI.generateDKIMDNSRecord).toHaveBeenCalledWith(sampleDKIMKeys[0]);
      expect(dkimAPI.validateDKIMKey).toHaveBeenCalledWith(sampleDKIMKeys[0]);
      
      const content = result.result!.content[0];
      const data = JSON.parse((content as any).text);
      expect(data.domain).toBe('example.com');
      expect(data.selector).toBe('default');
      expect(data.status).toBe('Active');
      expect(data.dns_record).toBe(dnsRecord);
      expect(data.dns_host).toBe('default._domainkey.example.com');
      expect(data.validation_status).toBe('Valid');
    });

    it('should handle DKIM key not found', async () => {
      (dkimAPI.getDKIMKey as jest.Mock).mockResolvedValue(null);

      const result = await tool.execute({ 
        domain: 'nonexistent.com', 
        selector: 'default' 
      }, context);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(MCPErrorCode.RESOURCE_NOT_FOUND);
      expect(result.error?.message).toContain('not found');
    });

    it('should validate input parameters', async () => {
      const result = await tool.execute({ 
        domain: 123, 
        selector: 'default' 
      }, context);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(MCPErrorCode.INVALID_PARAMS);
      expect(result.error?.message).toContain('must be strings');
    });
  });

  describe('CreateDKIMKeyTool', () => {
    let tool: CreateDKIMKeyTool;

    beforeEach(() => {
      tool = new CreateDKIMKeyTool(logger, dkimAPI);
      jest.spyOn(tool as any, 'validatePermissions').mockReturnValue(true);
      jest.spyOn(tool as any, 'validateInput').mockReturnValue({ valid: true, errors: [], warnings: [] });
    });

    it('should have correct tool metadata', () => {
      expect(tool.name).toBe('create_dkim_key');
      expect(tool.description).toBe('Create a new DKIM key for a domain in the Mailcow server');
      expect(tool.inputSchema.required).toContain('domain');
      expect(tool.inputSchema.required).toContain('selector');
    });

    it('should create DKIM key with required parameters', async () => {
      const newKey = { ...sampleDKIMKeys[0], domain: 'new.com', selector: 'mail' };
      const dnsRecord = 'v=DKIM1; k=rsa; p=MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA123456789abcdef...';
      
      (dkimAPI.createDKIMKey as jest.Mock).mockResolvedValue(newKey);
      (dkimAPI.generateDKIMDNSRecord as jest.Mock).mockReturnValue(dnsRecord);

      const input = {
        domain: 'new.com',
        selector: 'mail'
      };

      const result = await tool.execute(input, context);

      expect(result.success).toBe(true);
      expect(dkimAPI.createDKIMKey).toHaveBeenCalledWith({
        domain: 'new.com',
        selector: 'mail',
        key_size: 2048,
        algorithm: 'rsa'
      });
      
      const content = result.result!.content[0];
      const data = JSON.parse((content as any).text);
      expect(data.message).toContain('created successfully');
      expect(data.dns_configuration).toBeDefined();
      expect(data.dns_configuration.dns_record).toBe(dnsRecord);
    });

    it('should create DKIM key with all parameters', async () => {
      const newKey = { ...sampleDKIMKeys[1], domain: 'new.com', selector: 'ed25519' };
      const dnsRecord = 'v=DKIM1; k=ed25519; p=MCowBQYDK2VwAyEA123456789abcdef...';
      
      (dkimAPI.createDKIMKey as jest.Mock).mockResolvedValue(newKey);
      (dkimAPI.generateDKIMDNSRecord as jest.Mock).mockReturnValue(dnsRecord);

      const input = {
        domain: 'new.com',
        selector: 'ed25519',
        key_size: 4096,
        algorithm: 'ed25519'
      };

      const result = await tool.execute(input, context);

      expect(result.success).toBe(true);
      expect(dkimAPI.createDKIMKey).toHaveBeenCalledWith({
        domain: 'new.com',
        selector: 'ed25519',
        key_size: 4096,
        algorithm: 'ed25519'
      });
    });

    it('should validate required parameters', async () => {
      const input = {
        domain: 123, // Invalid type
        selector: 'mail'
      };

      const result = await tool.execute(input, context);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(MCPErrorCode.INVALID_PARAMS);
      expect(result.error?.message).toContain('must be strings');
    });

    it('should handle permission denial', async () => {
      jest.spyOn(tool as any, 'validatePermissions').mockReturnValue(false);

      const input = {
        domain: 'test.com',
        selector: 'mail'
      };

      const result = await tool.execute(input, context);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(MCPErrorCode.AUTHORIZATION_ERROR);
    });
  });

  describe('UpdateDKIMKeyTool', () => {
    let tool: UpdateDKIMKeyTool;

    beforeEach(() => {
      tool = new UpdateDKIMKeyTool(logger, dkimAPI);
      jest.spyOn(tool as any, 'validatePermissions').mockReturnValue(true);
      jest.spyOn(tool as any, 'validateInput').mockReturnValue({ valid: true, errors: [], warnings: [] });
    });

    it('should have correct tool metadata', () => {
      expect(tool.name).toBe('update_dkim_key');
      expect(tool.description).toBe('Update settings for an existing DKIM key');
      expect(tool.inputSchema.required).toContain('domain');
      expect(tool.inputSchema.required).toContain('selector');
    });

    it('should update DKIM key with partial data', async () => {
      const updatedKey = { ...sampleDKIMKeys[0], active: false };
      const dnsRecord = 'v=DKIM1; k=rsa; p=MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA123456789abcdef...';
      
      (dkimAPI.getDKIMKey as jest.Mock).mockResolvedValue(sampleDKIMKeys[0]);
      (dkimAPI.updateDKIMKey as jest.Mock).mockResolvedValue(updatedKey);
      (dkimAPI.generateDKIMDNSRecord as jest.Mock).mockReturnValue(dnsRecord);

      const input = {
        domain: 'example.com',
        selector: 'default',
        active: false
      };

      const result = await tool.execute(input, context);

      expect(result.success).toBe(true);
      expect(dkimAPI.getDKIMKey).toHaveBeenCalledWith('example.com', 'default');
      expect(dkimAPI.updateDKIMKey).toHaveBeenCalledWith('example.com', 'default', {
        active: false
      });
      
      const content = result.result!.content[0];
      const data = JSON.parse((content as any).text);
      expect(data.message).toContain('updated successfully');
      expect(data.updated_fields).toEqual(['active']);
    });

    it('should update multiple fields', async () => {
      const updatedKey = { 
        ...sampleDKIMKeys[0], 
        active: false, 
        key_size: 4096,
        algorithm: 'ed25519'
      };
      const dnsRecord = 'v=DKIM1; k=ed25519; p=MCowBQYDK2VwAyEA123456789abcdef...';
      
      (dkimAPI.getDKIMKey as jest.Mock).mockResolvedValue(sampleDKIMKeys[0]);
      (dkimAPI.updateDKIMKey as jest.Mock).mockResolvedValue(updatedKey);
      (dkimAPI.generateDKIMDNSRecord as jest.Mock).mockReturnValue(dnsRecord);

      const input = {
        domain: 'example.com',
        selector: 'default',
        active: false,
        key_size: 4096,
        algorithm: 'ed25519'
      };

      const result = await tool.execute(input, context);

      expect(result.success).toBe(true);
      expect(dkimAPI.updateDKIMKey).toHaveBeenCalledWith('example.com', 'default', {
        active: false,
        key_size: 4096,
        algorithm: 'ed25519'
      });
    });

    it('should handle DKIM key not found', async () => {
      (dkimAPI.getDKIMKey as jest.Mock).mockResolvedValue(null);

      const input = {
        domain: 'missing.com',
        selector: 'default',
        active: false
      };

      const result = await tool.execute(input, context);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(MCPErrorCode.RESOURCE_NOT_FOUND);
    });

    it('should require at least one update parameter', async () => {
      (dkimAPI.getDKIMKey as jest.Mock).mockResolvedValue(sampleDKIMKeys[0]);

      const input = {
        domain: 'example.com',
        selector: 'default'
      };

      const result = await tool.execute(input, context);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(MCPErrorCode.INVALID_PARAMS);
      expect(result.error?.message).toContain('No update parameters provided');
    });
  });

  describe('DeleteDKIMKeyTool', () => {
    let tool: DeleteDKIMKeyTool;

    beforeEach(() => {
      tool = new DeleteDKIMKeyTool(logger, dkimAPI);
      jest.spyOn(tool as any, 'validatePermissions').mockReturnValue(true);
      jest.spyOn(tool as any, 'validateInput').mockReturnValue({ valid: true, errors: [], warnings: [] });
    });

    it('should have correct tool metadata', () => {
      expect(tool.name).toBe('delete_dkim_key');
      expect(tool.description).toContain('Delete a DKIM key from the Mailcow server');
      expect(tool.inputSchema.required).toContain('domain');
      expect(tool.inputSchema.required).toContain('selector');
      expect(tool.inputSchema.required).toContain('confirm');
    });

    it('should delete DKIM key with confirmation', async () => {
      (dkimAPI.getDKIMKey as jest.Mock).mockResolvedValue(sampleDKIMKeys[0]);
      (dkimAPI.deleteDKIMKey as jest.Mock).mockResolvedValue(true);

      const input = {
        domain: 'example.com',
        selector: 'default',
        confirm: true
      };

      const result = await tool.execute(input, context);

      expect(result.success).toBe(true);
      expect(dkimAPI.getDKIMKey).toHaveBeenCalledWith('example.com', 'default');
      expect(dkimAPI.deleteDKIMKey).toHaveBeenCalledWith('example.com', 'default');
      
      const content = result.result!.content[0];
      const data = JSON.parse((content as any).text);
      expect(data.message).toContain('deleted successfully');
      expect(data.warning).toContain('no longer be DKIM signed');
      expect(data.dns_cleanup).toContain('default._domainkey.example.com');
    });

    it('should require confirmation', async () => {
      const input = {
        domain: 'example.com',
        selector: 'default',
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
        domain: 'example.com',
        selector: 'default',
        confirm: true
      };

      const result = await tool.execute(input, context);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(MCPErrorCode.AUTHORIZATION_ERROR);
    });

    it('should handle DKIM key not found', async () => {
      (dkimAPI.getDKIMKey as jest.Mock).mockResolvedValue(null);

      const input = {
        domain: 'missing.com',
        selector: 'default',
        confirm: true
      };

      const result = await tool.execute(input, context);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(MCPErrorCode.RESOURCE_NOT_FOUND);
    });

    it('should handle deletion failure', async () => {
      (dkimAPI.getDKIMKey as jest.Mock).mockResolvedValue(sampleDKIMKeys[0]);
      (dkimAPI.deleteDKIMKey as jest.Mock).mockResolvedValue(false);

      const input = {
        domain: 'example.com',
        selector: 'default',
        confirm: true
      };

      const result = await tool.execute(input, context);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(MCPErrorCode.INTERNAL_ERROR);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    let listTool: ListDKIMKeysTool;

    beforeEach(() => {
      listTool = new ListDKIMKeysTool(logger, dkimAPI);
      jest.spyOn(listTool as any, 'validatePermissions').mockReturnValue(true);
    });

    it('should handle empty selector filter', async () => {
      jest.spyOn(listTool as any, 'validateInput').mockReturnValue({ valid: true, errors: [], warnings: [] });
      (dkimAPI.listDKIMKeys as jest.Mock).mockResolvedValue(sampleDKIMKeys);

      const result = await listTool.execute({ selector: '' }, context);
      expect(result.success).toBe(true);
    });

    it('should handle zero and negative limits', async () => {
      jest.spyOn(listTool as any, 'validateInput').mockReturnValue({ valid: true, errors: [], warnings: [] });
      (dkimAPI.listDKIMKeys as jest.Mock).mockResolvedValue(sampleDKIMKeys);

      const result1 = await listTool.execute({ limit: 0 }, context);
      expect(result1.success).toBe(true);

      const result2 = await listTool.execute({ limit: -1 }, context);
      expect(result2.success).toBe(true);
    });

    it('should handle network errors gracefully', async () => {
      jest.spyOn(listTool as any, 'validateInput').mockReturnValue({ valid: true, errors: [], warnings: [] });
      (dkimAPI.listDKIMKeys as jest.Mock).mockRejectedValue(new Error('Network timeout'));

      const result = await listTool.execute({}, context);
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(MCPErrorCode.TOOL_EXECUTION_ERROR);
    });

    it('should handle DKIM keys without public keys', async () => {
      const keyWithoutPublicKey = { ...sampleDKIMKeys[0], public_key: undefined };
      jest.spyOn(listTool as any, 'validateInput').mockReturnValue({ valid: true, errors: [], warnings: [] });
      (dkimAPI.listDKIMKeys as jest.Mock).mockResolvedValue([keyWithoutPublicKey]);

      const result = await listTool.execute({}, context);
      expect(result.success).toBe(true);
      
      const content = result.result!.content[0];
      const data = JSON.parse((content as any).text);
      expect(data.keys[0].public_key_preview).toBe('N/A');
    });

    it('should filter by date ranges', async () => {
      jest.spyOn(listTool as any, 'validateInput').mockReturnValue({ valid: true, errors: [], warnings: [] });
      (dkimAPI.listDKIMKeys as jest.Mock).mockResolvedValue(sampleDKIMKeys);

      const result = await listTool.execute({ 
        created_after: '2023-01-15T00:00:00Z',
        created_before: '2023-02-15T00:00:00Z'
      }, context);

      expect(result.success).toBe(true);
      expect(dkimAPI.listDKIMKeys).toHaveBeenCalledWith({
        created_after: new Date('2023-01-15T00:00:00Z'),
        created_before: new Date('2023-02-15T00:00:00Z'),
        limit: 100,
        offset: 0
      });
    });
  });
});