/**
 * Domain Management Tools Tests (Fixed Version)
 * Properly mocked unit tests for all domain management tools
 */

import { 
  ListDomainsTool, 
  GetDomainTool, 
  CreateDomainTool, 
  UpdateDomainTool, 
  DeleteDomainTool 
} from '../../../src/tools/domains';
import { DomainAPI } from '../../../src/api/domains';
import { Logger } from '../../../src/utils';
import { ToolContext, MailcowDomain, MCPErrorCode } from '../../../src/types';

// Mock the validation functions
jest.mock('../../../src/tools/validation', () => ({
  validateToolInput: jest.fn(),
  validateToolSchema: jest.fn(() => ({ valid: true, errors: [], warnings: [] }))
}));

describe('Domain Management Tools (Fixed)', () => {
  let logger: Logger;
  let domainAPI: DomainAPI;
  let context: ToolContext;

  // Sample domain data
  const sampleDomains: MailcowDomain[] = [
    {
      domain_name: 'example.com',
      domain_h_name: 'example.com',
      description: 'Main domain',
      active: 1, // Mailcow uses 1/0 instead of boolean
      max_quota_for_domain: 10000,
      def_quota_for_mbox: 1000,
      max_quota_for_mbox: 1000,
      relayhost: '',
      relay_all_recipients: 0, // Mailcow uses 1/0 instead of boolean
      mboxes_in_domain: 5,
      mboxes_left: 95,
      created: '2023-01-01T00:00:00Z',
      modified: '2023-01-15T00:00:00Z',
      tags: [],
    },
    {
      domain_name: 'test.org',
      domain_h_name: 'test.org',
      description: 'Test domain',
      active: 0, // Mailcow uses 1/0 instead of boolean
      max_quota_for_domain: 5000,
      def_quota_for_mbox: 500,
      max_quota_for_mbox: 500,
      relayhost: 'relay.example.com',
      relay_all_recipients: 1, // Mailcow uses 1/0 instead of boolean
      mboxes_in_domain: 2,
      mboxes_left: 98,
      created: '2023-02-01T00:00:00Z',
      modified: '2023-02-10T00:00:00Z',
      tags: [],
    },
  ];

  beforeEach(() => {
    // Create mock instances
    logger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn()
    } as any;

    domainAPI = {
      listDomains: jest.fn(),
      getDomainDetails: jest.fn(),
      createDomain: jest.fn(),
      updateDomain: jest.fn(),
      deleteDomain: jest.fn()
    } as any;

    // Create test context
    context = {
      requestId: 'test-request-123',
      userId: 'test-user',
      timestamp: new Date(),
      permissions: ['domains:read', 'domains:write', 'domains:delete'],
      accessLevel: 'read-write',
      metadata: {}
    };

    // Reset all mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('ListDomainsTool', () => {
    let tool: ListDomainsTool;

    beforeEach(() => {
      tool = new ListDomainsTool(logger, domainAPI);
      // Mock validation methods to succeed by default
      jest.spyOn(tool as any, 'validatePermissions').mockReturnValue(true);
      jest.spyOn(tool as any, 'validateInput').mockReturnValue({ valid: true, errors: [], warnings: [] });
    });

    it('should have correct tool metadata', () => {
      expect(tool.name).toBe('list_domains');
      expect(tool.description).toBe('List all domains in the Mailcow server with optional filtering');
      expect(tool.inputSchema.type).toBe('object');
      expect(tool.inputSchema.properties).toHaveProperty('active_only');
      expect(tool.inputSchema.properties).toHaveProperty('search');
      expect(tool.inputSchema.properties).toHaveProperty('limit');
    });

    it('should list all domains without filters', async () => {
      (domainAPI.listDomains as jest.Mock).mockResolvedValue(sampleDomains);

      const result = await tool.execute({}, context);

      expect(result.success).toBe(true);
      expect(result.result).toBeDefined();
      expect(domainAPI.listDomains).toHaveBeenCalledWith();
      
      // Parse the JSON result
      const content = result.result!.content[0];
      expect(content.type).toBe('text');
      const data = JSON.parse((content as any).text);
      expect(data.total_domains).toBe(2);
      expect(data.filtered_domains).toBe(2);
      expect(data.active_domains).toBe(1);
      expect(data.inactive_domains).toBe(1);
      expect(data.domains).toHaveLength(2);
    });

    it('should filter active domains only', async () => {
      (domainAPI.listDomains as jest.Mock).mockResolvedValue(sampleDomains);

      const result = await tool.execute({ active_only: true }, context);

      expect(result.success).toBe(true);
      const content = result.result!.content[0];
      const data = JSON.parse((content as any).text);
      expect(data.filtered_domains).toBe(1);
      expect(data.domains[0].domain).toBe('example.com');
    });

    it('should search domains by name', async () => {
      (domainAPI.listDomains as jest.Mock).mockResolvedValue(sampleDomains);

      const result = await tool.execute({ search: 'test' }, context);

      expect(result.success).toBe(true);
      const content = result.result!.content[0];
      const data = JSON.parse((content as any).text);
      expect(data.filtered_domains).toBe(1);
      expect(data.domains[0].domain).toBe('test.org');
    });

    it('should limit results', async () => {
      (domainAPI.listDomains as jest.Mock).mockResolvedValue(sampleDomains);

      const result = await tool.execute({ limit: 1 }, context);

      expect(result.success).toBe(true);
      const content = result.result!.content[0];
      const data = JSON.parse((content as any).text);
      expect(data.filtered_domains).toBe(1);
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
      (domainAPI.listDomains as jest.Mock).mockRejectedValue(new Error('API Error'));

      const result = await tool.execute({}, context);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(MCPErrorCode.TOOL_EXECUTION_ERROR);
    });
  });

  describe('GetDomainTool', () => {
    let tool: GetDomainTool;

    beforeEach(() => {
      tool = new GetDomainTool(logger, domainAPI);
      jest.spyOn(tool as any, 'validatePermissions').mockReturnValue(true);
      jest.spyOn(tool as any, 'validateInput').mockReturnValue({ valid: true, errors: [], warnings: [] });
    });

    it('should have correct tool metadata', () => {
      expect(tool.name).toBe('get_domain');
      expect(tool.description).toBe('Get detailed information about a specific domain');
      expect(tool.inputSchema.required).toContain('domain');
    });

    it('should get domain details', async () => {
      (domainAPI.getDomainDetails as jest.Mock).mockResolvedValue(sampleDomains[0]);

      const result = await tool.execute({ domain: 'example.com' }, context);

      expect(result.success).toBe(true);
      expect(domainAPI.getDomainDetails).toHaveBeenCalledWith('example.com');
      
      const content = result.result!.content[0];
      const data = JSON.parse((content as any).text);
      expect(data.domain).toBe('example.com');
      expect(data.status).toBe('Active');
    });

    it('should handle domain not found', async () => {
      (domainAPI.getDomainDetails as jest.Mock).mockRejectedValue(new Error('Domain not found'));

      const result = await tool.execute({ domain: 'nonexistent.com' }, context);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(MCPErrorCode.TOOL_EXECUTION_ERROR);
    });
  });

  describe('CreateDomainTool', () => {
    let tool: CreateDomainTool;

    beforeEach(() => {
      tool = new CreateDomainTool(logger, domainAPI);
      jest.spyOn(tool as any, 'validatePermissions').mockReturnValue(true);
      jest.spyOn(tool as any, 'validateInput').mockReturnValue({ valid: true, errors: [], warnings: [] });
    });

    it('should have correct tool metadata', () => {
      expect(tool.name).toBe('create_domain');
      expect(tool.description).toBe('Create a new domain in the Mailcow server');
      expect(tool.inputSchema.required).toContain('domain');
    });

    it('should create domain with required parameters', async () => {
      const newDomain = { ...sampleDomains[0], domain: 'new.com' };
      (domainAPI.createDomain as jest.Mock).mockResolvedValue(newDomain);

      const result = await tool.execute({ domain: 'new.com' }, context);

      expect(result.success).toBe(true);
      expect(domainAPI.createDomain).toHaveBeenCalledWith({
        domain: 'new.com',
        description: undefined,
        quota: 1000,
        maxquota: 10000,
        relayhost: undefined,
        relay_all_recipients: false
      });
    });

    it('should create domain with all parameters', async () => {
      const newDomain = { ...sampleDomains[0], domain: 'full.com' };
      (domainAPI.createDomain as jest.Mock).mockResolvedValue(newDomain);

      const input = {
        domain: 'full.com',
        description: 'Full featured domain',
        quota: 2000,
        max_quota: 20000,
        relay_host: 'relay.full.com',
        relay_all_recipients: true
      };

      const result = await tool.execute(input, context);

      expect(result.success).toBe(true);
      expect(domainAPI.createDomain).toHaveBeenCalledWith({
        domain: 'full.com',
        description: 'Full featured domain',
        quota: 2000,
        maxquota: 20000,
        relayhost: 'relay.full.com',
        relay_all_recipients: true
      });
    });

    it('should validate quota relationship', async () => {
      const input = {
        domain: 'invalid.com',
        quota: 10000,
        max_quota: 5000 // quota > max_quota
      };

      const result = await tool.execute(input, context);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(MCPErrorCode.INVALID_PARAMS);
      expect(result.error?.message).toContain('Quota cannot be greater than max_quota');
    });

    it('should handle permission denial', async () => {
      jest.spyOn(tool as any, 'validatePermissions').mockReturnValue(false);

      const result = await tool.execute({ domain: 'test.com' }, context);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(MCPErrorCode.AUTHORIZATION_ERROR);
    });
  });

  describe('UpdateDomainTool', () => {
    let tool: UpdateDomainTool;

    beforeEach(() => {
      tool = new UpdateDomainTool(logger, domainAPI);
      jest.spyOn(tool as any, 'validatePermissions').mockReturnValue(true);
      jest.spyOn(tool as any, 'validateInput').mockReturnValue({ valid: true, errors: [], warnings: [] });
    });

    it('should have correct tool metadata', () => {
      expect(tool.name).toBe('update_domain');
      expect(tool.description).toBe('Update settings for an existing domain');
      expect(tool.inputSchema.required).toContain('domain');
    });

    it('should update domain with partial data', async () => {
      const updatedDomain = { ...sampleDomains[0], description: 'Updated description' };
      (domainAPI.getDomainDetails as jest.Mock).mockResolvedValue(sampleDomains[0]);
      (domainAPI.updateDomain as jest.Mock).mockResolvedValue(updatedDomain);

      const input = {
        domain: 'example.com',
        description: 'Updated description'
      };

      const result = await tool.execute(input, context);

      expect(result.success).toBe(true);
      expect(domainAPI.getDomainDetails).toHaveBeenCalledWith('example.com');
      expect(domainAPI.updateDomain).toHaveBeenCalledWith('example.com', {
        description: 'Updated description'
      });
    });

    it('should validate quota relationship on update', async () => {
      (domainAPI.getDomainDetails as jest.Mock).mockResolvedValue(sampleDomains[0]);

      const input = {
        domain: 'example.com',
        quota: 15000,
        max_quota: 10000 // quota > max_quota
      };

      const result = await tool.execute(input, context);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(MCPErrorCode.INVALID_PARAMS);
    });

    it('should handle domain not found', async () => {
      (domainAPI.getDomainDetails as jest.Mock).mockRejectedValue(new Error('Not found'));

      const result = await tool.execute({ domain: 'missing.com' }, context);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(MCPErrorCode.RESOURCE_NOT_FOUND);
    });
  });

  describe('DeleteDomainTool', () => {
    let tool: DeleteDomainTool;

    beforeEach(() => {
      tool = new DeleteDomainTool(logger, domainAPI);
      jest.spyOn(tool as any, 'validatePermissions').mockReturnValue(true);
      jest.spyOn(tool as any, 'validateInput').mockReturnValue({ valid: true, errors: [], warnings: [] });
    });

    it('should have correct tool metadata', () => {
      expect(tool.name).toBe('delete_domain');
      expect(tool.description).toContain('Delete a domain from the Mailcow server');
      expect(tool.inputSchema.required).toContain('domain');
      expect(tool.inputSchema.required).toContain('confirm');
    });

    it('should delete domain with confirmation', async () => {
      (domainAPI.getDomainDetails as jest.Mock).mockResolvedValue(sampleDomains[0]);
      (domainAPI.deleteDomain as jest.Mock).mockResolvedValue(undefined);

      const input = {
        domain: 'example.com',
        confirm: true
      };

      const result = await tool.execute(input, context);

      expect(result.success).toBe(true);
      expect(domainAPI.getDomainDetails).toHaveBeenCalledWith('example.com');
      expect(domainAPI.deleteDomain).toHaveBeenCalledWith('example.com');
      
      const content = result.result!.content[0];
      const data = JSON.parse((content as any).text);
      expect(data.message).toContain('deleted successfully');
      expect(data.warning).toContain('permanently deleted');
    });

    it('should require confirmation', async () => {
      const input = {
        domain: 'example.com',
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
        confirm: true
      };

      const result = await tool.execute(input, context);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(MCPErrorCode.AUTHORIZATION_ERROR);
    });

    it('should handle domain not found', async () => {
      (domainAPI.getDomainDetails as jest.Mock).mockRejectedValue(new Error('Not found'));

      const input = {
        domain: 'missing.com',
        confirm: true
      };

      const result = await tool.execute(input, context);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(MCPErrorCode.RESOURCE_NOT_FOUND);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    let listTool: ListDomainsTool;

    beforeEach(() => {
      listTool = new ListDomainsTool(logger, domainAPI);
      jest.spyOn(listTool as any, 'validatePermissions').mockReturnValue(true);
    });

    it('should handle empty search strings', async () => {
      jest.spyOn(listTool as any, 'validateInput').mockReturnValue({ valid: true, errors: [], warnings: [] });
      (domainAPI.listDomains as jest.Mock).mockResolvedValue(sampleDomains);

      const result = await listTool.execute({ search: '' }, context);
      expect(result.success).toBe(true);
    });

    it('should handle zero and negative limits', async () => {
      jest.spyOn(listTool as any, 'validateInput').mockReturnValue({ valid: true, errors: [], warnings: [] });
      (domainAPI.listDomains as jest.Mock).mockResolvedValue(sampleDomains);

      const result1 = await listTool.execute({ limit: 0 }, context);
      expect(result1.success).toBe(true);

      const result2 = await listTool.execute({ limit: -1 }, context);
      expect(result2.success).toBe(true);
    });

    it('should handle network errors gracefully', async () => {
      jest.spyOn(listTool as any, 'validateInput').mockReturnValue({ valid: true, errors: [], warnings: [] });
      (domainAPI.listDomains as jest.Mock).mockRejectedValue(new Error('Network timeout'));

      const result = await listTool.execute({}, context);
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(MCPErrorCode.TOOL_EXECUTION_ERROR);
    });
  });
});