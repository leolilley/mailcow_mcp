/**
 * Mailbox Management Tools
 * MCP tools for managing Mailcow mailboxes
 */

import { BaseTool, ToolUtils } from '../base';
import { MailboxAPI } from '../../api/mailboxes';
import {
  ToolInput,
  ToolContext,
  ToolHandlerResult,
  MailcowMailbox,
  CreateMailboxRequest,
  UpdateMailboxRequest,
  ToolCategory,
  MCPErrorCode,
} from '../../types';
import { Logger } from '../../utils';

/**
 * List all mailboxes
 */
export class ListMailboxesTool extends BaseTool {
  readonly name = 'list_mailboxes';
  readonly description = 'List all mailboxes in the Mailcow server with optional filtering';
  readonly inputSchema = {
    type: 'object' as const,
    properties: {
      domain: {
        type: 'string' as const,
        description: 'Filter by specific domain',
        pattern: '^[a-zA-Z0-9][a-zA-Z0-9\\\\-]{0,61}[a-zA-Z0-9](?:\\\\.[a-zA-Z0-9][a-zA-Z0-9\\\\-]{0,61}[a-zA-Z0-9])*$',
      },
      active_only: {
        type: 'boolean' as const,
        description: 'Only return active mailboxes',
      },
      search: {
        type: 'string' as const,
        description: 'Search mailboxes by username or name (partial match)',
      },
      limit: {
        type: 'number' as const,
        description: 'Maximum number of mailboxes to return',
        minimum: 1,
        maximum: 1000,
      },
      show_quota_usage: {
        type: 'boolean' as const,
        description: 'Include quota usage information in results',
      },
    },
    additionalProperties: false,
  };

  constructor(logger: Logger, private mailboxAPI: MailboxAPI) {
    super(logger, {
      category: ToolCategory.MAILBOX,
      version: '1.0.0',
      requiresAuth: true,
      rateLimited: true,
    });
  }

  async execute(input: ToolInput, context: ToolContext): Promise<ToolHandlerResult> {
    try {
      this.logExecution(input, context, true);

      // Validate permissions
      if (!this.validatePermissions(context, ['mailboxes:read', 'read'])) {
        return {
          success: false,
          error: {
            code: MCPErrorCode.AUTHORIZATION_ERROR,
            message: 'Permission denied: requires mailboxes:read permission',
          },
        };
      }

      // Validate input
      const validation = this.validateInput(input);
      if (!validation.valid) {
        return {
          success: false,
          error: {
            code: MCPErrorCode.INVALID_PARAMS,
            message: `Input validation failed: ${validation.errors.map(e => e.message).join(', ')}`,
          },
        };
      }

      const { 
        domain, 
        active_only = false, 
        search, 
        limit = 100, 
        show_quota_usage = true 
      } = input;

      // Fetch mailboxes from API
      const mailboxes = await this.mailboxAPI.listMailboxes();

      // Apply filters
      let filteredMailboxes = mailboxes;

      if (typeof domain === 'string') {
        filteredMailboxes = filteredMailboxes.filter(mailbox => mailbox.domain === domain);
      }

      if (active_only) {
        filteredMailboxes = filteredMailboxes.filter(mailbox => mailbox.active);
      }

      if (search && typeof search === 'string') {
        const searchLower = search.toLowerCase();
        filteredMailboxes = filteredMailboxes.filter(mailbox =>
          mailbox.username.toLowerCase().includes(searchLower) ||
          mailbox.local_part.toLowerCase().includes(searchLower) ||
          (mailbox.name && mailbox.name.toLowerCase().includes(searchLower))
        );
      }

      if (typeof limit === 'number' && limit > 0 && limit < filteredMailboxes.length) {
        filteredMailboxes = filteredMailboxes.slice(0, limit);
      }

      // Calculate quota statistics
      const quotaStats = {
        total_quota: mailboxes.reduce((sum, m) => sum + m.quota, 0),
        total_used: mailboxes.reduce((sum, m) => sum + m.quota_used, 0),
        avg_usage_percent: mailboxes.length > 0 
          ? Math.round(mailboxes.reduce((sum, m) => sum + (m.quota > 0 ? (m.quota_used / m.quota) * 100 : 0), 0) / mailboxes.length)
          : 0,
      };

      // Format results
      const summary = {
        total_mailboxes: mailboxes.length,
        filtered_mailboxes: filteredMailboxes.length,
        active_mailboxes: mailboxes.filter(m => m.active).length,
        inactive_mailboxes: mailboxes.filter(m => !m.active).length,
        quota_statistics: show_quota_usage ? quotaStats : undefined,
        mailboxes: filteredMailboxes.map(mailbox => ({
          username: mailbox.username,
          domain: mailbox.domain,
          local_part: mailbox.local_part,
          name: mailbox.name || 'No name set',
          active: mailbox.active,
          quota_info: show_quota_usage ? {
            quota_mb: mailbox.quota,
            used_mb: mailbox.quota_used,
            usage_percent: mailbox.quota > 0 ? Math.round((mailbox.quota_used / mailbox.quota) * 100) : 0,
            available_mb: Math.max(0, mailbox.quota - mailbox.quota_used),
          } : undefined,
          created: mailbox.created,
          modified: mailbox.modified,
        })),
      };

      return {
        success: true,
        result: ToolUtils.createJsonResult(summary),
      };
    } catch (error) {
      return this.handleError(error as Error, context);
    }
  }
}

/**
 * Get detailed information about a specific mailbox
 */
export class GetMailboxTool extends BaseTool {
  readonly name = 'get_mailbox';
  readonly description = 'Get detailed information about a specific mailbox';
  readonly inputSchema = {
    type: 'object' as const,
    properties: {
      username: {
        type: 'string' as const,
        description: 'Full username (email address) of the mailbox to retrieve',
        pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$',
      },
    },
    required: ['username'],
    additionalProperties: false,
  };

  constructor(logger: Logger, private mailboxAPI: MailboxAPI) {
    super(logger, {
      category: ToolCategory.MAILBOX,
      version: '1.0.0',
      requiresAuth: true,
      rateLimited: true,
    });
  }

  async execute(input: ToolInput, context: ToolContext): Promise<ToolHandlerResult> {
    try {
      this.logExecution(input, context, true);

      // Validate permissions
      if (!this.validatePermissions(context, ['mailboxes:read', 'read'])) {
        return {
          success: false,
          error: {
            code: MCPErrorCode.AUTHORIZATION_ERROR,
            message: 'Permission denied: requires mailboxes:read permission',
          },
        };
      }

      // Validate input
      const validation = this.validateInput(input);
      if (!validation.valid) {
        return {
          success: false,
          error: {
            code: MCPErrorCode.INVALID_PARAMS,
            message: `Input validation failed: ${validation.errors.map(e => e.message).join(', ')}`,
          },
        };
      }

      const { username } = input;

      if (typeof username !== 'string') {
        return {
          success: false,
          error: {
            code: MCPErrorCode.INVALID_PARAMS,
            message: 'Username must be a string',
          },
        };
      }

      // Fetch mailbox details
      const mailboxDetails = await this.mailboxAPI.getMailboxDetails(username);

      const formattedMailbox = {
        username: mailboxDetails.username,
        domain: mailboxDetails.domain,
        local_part: mailboxDetails.local_part,
        name: mailboxDetails.name || 'No name set',
        active: mailboxDetails.active,
        status: mailboxDetails.active ? 'Active' : 'Inactive',
        quota_details: {
          quota_mb: mailboxDetails.quota,
          used_mb: mailboxDetails.quota_used,
          available_mb: Math.max(0, mailboxDetails.quota - mailboxDetails.quota_used),
          usage_percent: mailboxDetails.quota > 0 
            ? Math.round((mailboxDetails.quota_used / mailboxDetails.quota) * 100) 
            : 0,
          quota_status: mailboxDetails.quota > 0 && mailboxDetails.quota_used >= mailboxDetails.quota 
            ? 'Full' 
            : mailboxDetails.quota > 0 && (mailboxDetails.quota_used / mailboxDetails.quota) > 0.9 
            ? 'Nearly Full' 
            : 'Available',
        },
        timestamps: {
          created: mailboxDetails.created,
          last_modified: mailboxDetails.modified,
        },
        attributes: mailboxDetails.attributes || {},
        mailbox_id: mailboxDetails.id,
      };

      return {
        success: true,
        result: ToolUtils.createJsonResult(formattedMailbox),
      };
    } catch (error) {
      return this.handleError(error as Error, context);
    }
  }
}

/**
 * Create a new mailbox
 */
export class CreateMailboxTool extends BaseTool {
  readonly name = 'create_mailbox';
  readonly description = 'Create a new mailbox in the Mailcow server';
  readonly inputSchema = {
    type: 'object' as const,
    properties: {
      local_part: {
        type: 'string' as const,
        description: 'Local part of the email address (before @)',
        pattern: '^[a-zA-Z0-9._%+-]+$',
        maxLength: 64,
      },
      domain: {
        type: 'string' as const,
        description: 'Domain for the mailbox',
        pattern: '^[a-zA-Z0-9][a-zA-Z0-9\\\\-]{0,61}[a-zA-Z0-9](?:\\\\.[a-zA-Z0-9][a-zA-Z0-9\\\\-]{0,61}[a-zA-Z0-9])*$',
      },
      password: {
        type: 'string' as const,
        description: 'Password for the mailbox',
        minLength: 8,
        maxLength: 128,
      },
      quota: {
        type: 'number' as const,
        description: 'Mailbox quota in MB',
        minimum: 0,
        maximum: 100000,
      },
      name: {
        type: 'string' as const,
        description: 'Full name for the mailbox user',
        maxLength: 255,
      },
      active: {
        type: 'boolean' as const,
        description: 'Whether the mailbox should be active',
      },
    },
    required: ['local_part', 'domain', 'password'],
    additionalProperties: false,
  };

  constructor(logger: Logger, private mailboxAPI: MailboxAPI) {
    super(logger, {
      category: ToolCategory.MAILBOX,
      version: '1.0.0',
      requiresAuth: true,
      rateLimited: true,
    });
  }

  async execute(input: ToolInput, context: ToolContext): Promise<ToolHandlerResult> {
    try {
      this.logExecution(input, context, true);

      // Validate permissions
      if (!this.validatePermissions(context, ['mailboxes:write', 'write'])) {
        return {
          success: false,
          error: {
            code: MCPErrorCode.AUTHORIZATION_ERROR,
            message: 'Permission denied: requires mailboxes:write permission',
          },
        };
      }

      // Validate input
      const validation = this.validateInput(input);
      if (!validation.valid) {
        return {
          success: false,
          error: {
            code: MCPErrorCode.INVALID_PARAMS,
            message: `Input validation failed: ${validation.errors.map(e => e.message).join(', ')}`,
          },
        };
      }

      const { 
        local_part, 
        domain, 
        password, 
        quota = 1000, 
        name, 
        active = true 
      } = input;

      // Validate required string fields
      if (typeof local_part !== 'string' || typeof domain !== 'string' || typeof password !== 'string') {
        return {
          success: false,
          error: {
            code: MCPErrorCode.INVALID_PARAMS,
            message: 'local_part, domain, and password must be strings',
          },
        };
      }

      // Create mailbox request
      const mailboxRequest: CreateMailboxRequest = {
        local_part,
        domain,
        password,
        quota: typeof quota === 'number' ? quota : 1000,
        name: typeof name === 'string' ? name : undefined,
        active: typeof active === 'boolean' ? active : true,
      };

      // Create mailbox
      const createdMailbox = await this.mailboxAPI.createMailbox(mailboxRequest);

      const result = {
        message: `Mailbox '${createdMailbox.username}' created successfully`,
        mailbox: {
          username: createdMailbox.username,
          domain: createdMailbox.domain,
          local_part: createdMailbox.local_part,
          name: createdMailbox.name || 'No name set',
          active: createdMailbox.active,
          quota_mb: createdMailbox.quota,
          quota_used_mb: createdMailbox.quota_used,
          created: createdMailbox.created,
          mailbox_id: createdMailbox.id,
        },
      };

      return {
        success: true,
        result: ToolUtils.createJsonResult(result),
      };
    } catch (error) {
      return this.handleError(error as Error, context);
    }
  }
}

/**
 * Update an existing mailbox
 */
export class UpdateMailboxTool extends BaseTool {
  readonly name = 'update_mailbox';
  readonly description = 'Update settings for an existing mailbox';
  readonly inputSchema = {
    type: 'object' as const,
    properties: {
      username: {
        type: 'string' as const,
        description: 'Full username (email address) of the mailbox to update',
        pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$',
      },
      quota: {
        type: 'number' as const,
        description: 'Updated mailbox quota in MB',
        minimum: 0,
        maximum: 100000,
      },
      password: {
        type: 'string' as const,
        description: 'Updated password for the mailbox',
        minLength: 8,
        maxLength: 128,
      },
      name: {
        type: 'string' as const,
        description: 'Updated full name for the mailbox user',
        maxLength: 255,
      },
      active: {
        type: 'boolean' as const,
        description: 'Whether the mailbox should be active',
      },
    },
    required: ['username'],
    additionalProperties: false,
  };

  constructor(logger: Logger, private mailboxAPI: MailboxAPI) {
    super(logger, {
      category: ToolCategory.MAILBOX,
      version: '1.0.0',
      requiresAuth: true,
      rateLimited: true,
    });
  }

  async execute(input: ToolInput, context: ToolContext): Promise<ToolHandlerResult> {
    try {
      this.logExecution(input, context, true);

      // Validate permissions
      if (!this.validatePermissions(context, ['mailboxes:write', 'write'])) {
        return {
          success: false,
          error: {
            code: MCPErrorCode.AUTHORIZATION_ERROR,
            message: 'Permission denied: requires mailboxes:write permission',
          },
        };
      }

      // Validate input
      const validation = this.validateInput(input);
      if (!validation.valid) {
        return {
          success: false,
          error: {
            code: MCPErrorCode.INVALID_PARAMS,
            message: `Input validation failed: ${validation.errors.map(e => e.message).join(', ')}`,
          },
        };
      }

      const { username, quota, password, name, active } = input;

      if (typeof username !== 'string') {
        return {
          success: false,
          error: {
            code: MCPErrorCode.INVALID_PARAMS,
            message: 'Username must be a string',
          },
        };
      }

      // Check if mailbox exists
      try {
        await this.mailboxAPI.getMailboxDetails(username);
      } catch {
        return {
          success: false,
          error: {
            code: MCPErrorCode.RESOURCE_NOT_FOUND,
            message: `Mailbox '${username}' not found`,
          },
        };
      }

      // Build update request (only include provided fields)
      const updateRequest: UpdateMailboxRequest = {};
      if (quota !== undefined && typeof quota === 'number') updateRequest.quota = quota;
      if (password !== undefined && typeof password === 'string') updateRequest.password = password;
      if (name !== undefined && typeof name === 'string') updateRequest.name = name;
      if (active !== undefined && typeof active === 'boolean') updateRequest.active = active;

      // Check if there are any updates to apply
      if (Object.keys(updateRequest).length === 0) {
        return {
          success: false,
          error: {
            code: MCPErrorCode.INVALID_PARAMS,
            message: 'No update parameters provided',
          },
        };
      }

      // Update mailbox
      const updatedMailbox = await this.mailboxAPI.updateMailbox(username, updateRequest);

      const result = {
        message: `Mailbox '${updatedMailbox.username}' updated successfully`,
        mailbox: {
          username: updatedMailbox.username,
          domain: updatedMailbox.domain,
          local_part: updatedMailbox.local_part,
          name: updatedMailbox.name || 'No name set',
          active: updatedMailbox.active,
          status: updatedMailbox.active ? 'Active' : 'Inactive',
          quota_mb: updatedMailbox.quota,
          quota_used_mb: updatedMailbox.quota_used,
          last_modified: updatedMailbox.modified,
          mailbox_id: updatedMailbox.id,
        },
        updated_fields: Object.keys(updateRequest),
      };

      return {
        success: true,
        result: ToolUtils.createJsonResult(result),
      };
    } catch (error) {
      return this.handleError(error as Error, context);
    }
  }
}

/**
 * Delete a mailbox
 */
export class DeleteMailboxTool extends BaseTool {
  readonly name = 'delete_mailbox';
  readonly description = 'Delete a mailbox from the Mailcow server (WARNING: This will permanently delete all emails in the mailbox!)';
  readonly inputSchema = {
    type: 'object' as const,
    properties: {
      username: {
        type: 'string' as const,
        description: 'Full username (email address) of the mailbox to delete',
        pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$',
      },
      confirm: {
        type: 'boolean' as const,
        description: 'Confirmation that you want to delete the mailbox and ALL associated emails',
      },
    },
    required: ['username', 'confirm'],
    additionalProperties: false,
  };

  constructor(logger: Logger, private mailboxAPI: MailboxAPI) {
    super(logger, {
      category: ToolCategory.MAILBOX,
      version: '1.0.0',
      requiresAuth: true,
      rateLimited: true,
    });
  }

  async execute(input: ToolInput, context: ToolContext): Promise<ToolHandlerResult> {
    try {
      this.logExecution(input, context, true);

      // Validate permissions
      if (!this.validatePermissions(context, ['mailboxes:delete', 'write'])) {
        return {
          success: false,
          error: {
            code: MCPErrorCode.AUTHORIZATION_ERROR,
            message: 'Permission denied: requires mailboxes:delete permission',
          },
        };
      }

      // Validate input
      const validation = this.validateInput(input);
      if (!validation.valid) {
        return {
          success: false,
          error: {
            code: MCPErrorCode.INVALID_PARAMS,
            message: `Input validation failed: ${validation.errors.map(e => e.message).join(', ')}`,
          },
        };
      }

      const { username, confirm } = input;

      if (typeof username !== 'string') {
        return {
          success: false,
          error: {
            code: MCPErrorCode.INVALID_PARAMS,
            message: 'Username must be a string',
          },
        };
      }

      if (typeof confirm !== 'boolean') {
        return {
          success: false,
          error: {
            code: MCPErrorCode.INVALID_PARAMS,
            message: 'Confirm must be a boolean',
          },
        };
      }

      // Check confirmation
      if (!confirm) {
        return {
          success: false,
          error: {
            code: MCPErrorCode.INVALID_PARAMS,
            message: 'Mailbox deletion requires explicit confirmation (confirm: true)',
          },
        };
      }

      // Check if mailbox exists and get details first
      let mailboxDetails: MailcowMailbox;
      try {
        mailboxDetails = await this.mailboxAPI.getMailboxDetails(username);
      } catch {
        return {
          success: false,
          error: {
            code: MCPErrorCode.RESOURCE_NOT_FOUND,
            message: `Mailbox '${username}' not found`,
          },
        };
      }

      // Delete mailbox
      await this.mailboxAPI.deleteMailbox(username);

      const result = {
        message: `Mailbox '${username}' deleted successfully`,
        deleted_mailbox: {
          username: mailboxDetails.username,
          domain: mailboxDetails.domain,
          local_part: mailboxDetails.local_part,
          name: mailboxDetails.name || 'No name set',
          was_active: mailboxDetails.active,
          quota_mb: mailboxDetails.quota,
          quota_used_mb: mailboxDetails.quota_used,
          deleted_at: new Date().toISOString(),
          mailbox_id: mailboxDetails.id,
        },
        warning: 'All emails in this mailbox have been permanently deleted and cannot be recovered',
      };

      return {
        success: true,
        result: ToolUtils.createJsonResult(result),
      };
    } catch (error) {
      return this.handleError(error as Error, context);
    }
  }
}

// Export all mailbox tools
export const MailboxTools = {
  ListMailboxesTool,
  GetMailboxTool,
  CreateMailboxTool,
  UpdateMailboxTool,
  DeleteMailboxTool,
};