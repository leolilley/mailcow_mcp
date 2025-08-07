/**
 * Mailbox Tools Loading Test
 * Verify that mailbox tools can be imported and instantiated correctly
 */

import { MailboxTools } from '../../src/tools/mailboxes';
import { MailboxAPI } from '../../src/api/mailboxes';
import { APIClient } from '../../src/api/client';
import { Logger, ConsoleLogDestination } from '../../src/utils';

describe('Mailbox Tools Loading', () => {
  let logger: Logger;
  let mockAPIClient: APIClient;
  let mailboxAPI: MailboxAPI;

  beforeEach(() => {
    logger = new Logger({ level: 'error' }, new ConsoleLogDestination());
    
    // Create a mock API client
    mockAPIClient = {
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
    } as any;
    
    mailboxAPI = new MailboxAPI(mockAPIClient);
  });

  it('should successfully import and instantiate all mailbox tools', () => {
    // Test that all mailbox tools can be instantiated
    expect(() => {
      const listTool = new MailboxTools.ListMailboxesTool(logger, mailboxAPI);
      const getTool = new MailboxTools.GetMailboxTool(logger, mailboxAPI);
      const createTool = new MailboxTools.CreateMailboxTool(logger, mailboxAPI);
      const updateTool = new MailboxTools.UpdateMailboxTool(logger, mailboxAPI);
      const deleteTool = new MailboxTools.DeleteMailboxTool(logger, mailboxAPI);

      // Verify tool names
      expect(listTool.name).toBe('list_mailboxes');
      expect(getTool.name).toBe('get_mailbox');
      expect(createTool.name).toBe('create_mailbox');
      expect(updateTool.name).toBe('update_mailbox');
      expect(deleteTool.name).toBe('delete_mailbox');

      // Verify tools have proper descriptions
      expect(listTool.description).toContain('List all mailboxes');
      expect(getTool.description).toContain('Get detailed information');
      expect(createTool.description).toContain('Create a new mailbox');
      expect(updateTool.description).toContain('Update settings');
      expect(deleteTool.description).toContain('Delete a mailbox');

      // Verify tools have input schemas
      expect(listTool.inputSchema).toBeDefined();
      expect(getTool.inputSchema).toBeDefined();
      expect(createTool.inputSchema).toBeDefined();
      expect(updateTool.inputSchema).toBeDefined();
      expect(deleteTool.inputSchema).toBeDefined();

      // Verify required fields for tools that need them
      expect(getTool.inputSchema.required).toContain('username');
      expect(createTool.inputSchema.required).toEqual(['local_part', 'domain', 'password']);
      expect(updateTool.inputSchema.required).toContain('username');
      expect(deleteTool.inputSchema.required).toEqual(['username', 'confirm']);
      
    }).not.toThrow();
  });

  it('should have tools with proper input schemas', () => {
    const listTool = new MailboxTools.ListMailboxesTool(logger, mailboxAPI);
    const getTool = new MailboxTools.GetMailboxTool(logger, mailboxAPI);
    const createTool = new MailboxTools.CreateMailboxTool(logger, mailboxAPI);
    
    // Verify ListMailboxesTool schema
    expect(listTool.inputSchema.properties).toHaveProperty('domain');
    expect(listTool.inputSchema.properties).toHaveProperty('active_only');
    expect(listTool.inputSchema.properties).toHaveProperty('search');
    expect(listTool.inputSchema.properties).toHaveProperty('limit');
    expect(listTool.inputSchema.properties).toHaveProperty('show_quota_usage');
    
    // Verify GetMailboxTool schema
    expect(getTool.inputSchema.properties).toHaveProperty('username');
    expect(getTool.inputSchema.properties.username).toHaveProperty('pattern');
    
    // Verify CreateMailboxTool schema
    expect(createTool.inputSchema.properties).toHaveProperty('local_part');
    expect(createTool.inputSchema.properties).toHaveProperty('domain');
    expect(createTool.inputSchema.properties).toHaveProperty('password');
    expect(createTool.inputSchema.properties).toHaveProperty('quota');
    expect(createTool.inputSchema.properties).toHaveProperty('name');
    expect(createTool.inputSchema.properties).toHaveProperty('active');
  });

  it('should verify mailbox API can be instantiated', () => {
    expect(() => {
      const api = new MailboxAPI(mockAPIClient);
      expect(api).toBeDefined();
      expect(typeof api.listMailboxes).toBe('function');
      expect(typeof api.getMailboxDetails).toBe('function');
      expect(typeof api.createMailbox).toBe('function');
      expect(typeof api.updateMailbox).toBe('function');
      expect(typeof api.deleteMailbox).toBe('function');
      expect(typeof api.setMailboxQuota).toBe('function');
    }).not.toThrow();
  });
});