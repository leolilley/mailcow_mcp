/**
 * Domain Management Tools
 * MCP tools for managing Mailcow domains
 */

import { BaseTool, ToolUtils } from '../base';
import { DomainAPI } from '../../api/domains';
import {
  ToolInput,
  ToolContext,
  ToolHandlerResult,
  MailcowDomain,
  CreateDomainRequest,
  UpdateDomainRequest,
  ToolCategory,
  MCPErrorCode,
} from '../../types';
import { Logger } from '../../utils';

/**
 * List all domains
 */
export class ListDomainsTool extends BaseTool {
  readonly name = 'list_domains';
  readonly description = 'List all domains in the Mailcow server with optional filtering';
  readonly inputSchema = {
    type: 'object' as const,
    properties: {
      active_only: {
        type: 'boolean' as const,
        description: 'Only return active domains',
      },
      search: {
        type: 'string' as const,
        description: 'Search domains by name (partial match)',
      },
      limit: {
        type: 'number' as const,
        description: 'Maximum number of domains to return',
        minimum: 1,
        maximum: 1000,
      },
    },
    additionalProperties: false,
  };

  constructor(logger: Logger, private domainAPI: DomainAPI) {
    super(logger, {
      category: ToolCategory.DOMAIN,
      version: '1.0.0',
      requiresAuth: true,
      rateLimited: true,
    });
  }

  async execute(input: ToolInput, context: ToolContext): Promise<ToolHandlerResult> {
    try {
      this.logExecution(input, context, true);

      // Validate permissions
      if (!this.validatePermissions(context, ['domains:read', 'read'])) {
        return {
          success: false,
          error: {
            code: MCPErrorCode.AUTHORIZATION_ERROR,
            message: 'Permission denied: requires domains:read permission',
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

      const { active_only = false, search, limit = 100 } = input;

      // Fetch domains from API
      const domains = await this.domainAPI.listDomains();

      // Apply filters
      let filteredDomains = domains;

      if (active_only) {
        filteredDomains = filteredDomains.filter(domain => domain.active);
      }

      if (search && typeof search === 'string') {
        const searchLower = search.toLowerCase();
        filteredDomains = filteredDomains.filter(domain =>
          domain.domain.toLowerCase().includes(searchLower) ||
          domain.description?.toLowerCase().includes(searchLower)
        );
      }

      if (typeof limit === 'number' && limit > 0 && limit < filteredDomains.length) {
        filteredDomains = filteredDomains.slice(0, limit);
      }

      // Format results
      const summary = {
        total_domains: domains.length,
        filtered_domains: filteredDomains.length,
        active_domains: domains.filter(d => d.active).length,
        inactive_domains: domains.filter(d => !d.active).length,
        domains: filteredDomains.map(domain => ({
          domain: domain.domain,
          description: domain.description || 'No description',
          active: domain.active,
          quota: `${domain.quota} MB`,
          max_quota: `${domain.maxquota} MB`,
          relay_host: domain.relayhost || 'None',
          created: domain.created,
          modified: domain.modified,
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
 * Get detailed information about a specific domain
 */
export class GetDomainTool extends BaseTool {
  readonly name = 'get_domain';
  readonly description = 'Get detailed information about a specific domain';
  readonly inputSchema = {
    type: 'object' as const,
    properties: {
      domain: {
        type: 'string' as const,
        description: 'Domain name to retrieve details for',
        pattern: '^[a-zA-Z0-9][a-zA-Z0-9\\-]{0,61}[a-zA-Z0-9](?:\\.[a-zA-Z0-9][a-zA-Z0-9\\-]{0,61}[a-zA-Z0-9])*$',
      },
    },
    required: ['domain'],
    additionalProperties: false,
  };

  constructor(logger: Logger, private domainAPI: DomainAPI) {
    super(logger, {
      category: ToolCategory.DOMAIN,
      version: '1.0.0',
      requiresAuth: true,
      rateLimited: true,
    });
  }

  async execute(input: ToolInput, context: ToolContext): Promise<ToolHandlerResult> {
    try {
      this.logExecution(input, context, true);

      // Validate permissions
      if (!this.validatePermissions(context, ['domains:read', 'read'])) {
        return {
          success: false,
          error: {
            code: MCPErrorCode.AUTHORIZATION_ERROR,
            message: 'Permission denied: requires domains:read permission',
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

      const { domain } = input;

      if (typeof domain !== 'string') {
        return {
          success: false,
          error: {
            code: MCPErrorCode.INVALID_PARAMS,
            message: 'Domain must be a string',
          },
        };
      }

      // Fetch domain details
      const domainDetails = await this.domainAPI.getDomainDetails(domain);

      const formattedDomain = {
        domain: domainDetails.domain,
        description: domainDetails.description || 'No description',
        active: domainDetails.active,
        status: domainDetails.active ? 'Active' : 'Inactive',
        quota: {
          limit: `${domainDetails.quota} MB`,
          max_limit: `${domainDetails.maxquota} MB`,
          usage_percent: domainDetails.maxquota > 0 
            ? Math.round((domainDetails.quota / domainDetails.maxquota) * 100) 
            : 0,
        },
        relay: {
          host: domainDetails.relayhost || 'None',
          relay_all: domainDetails.relay_all_recipients || false,
        },
        timestamps: {
          created: domainDetails.created,
          last_modified: domainDetails.modified,
        },
        attributes: domainDetails.attributes || {},
      };

      return {
        success: true,
        result: ToolUtils.createJsonResult(formattedDomain),
      };
    } catch (error) {
      return this.handleError(error as Error, context);
    }
  }
}

/**
 * Create a new domain
 */
export class CreateDomainTool extends BaseTool {
  readonly name = 'create_domain';
  readonly description = 'Create a new domain in the Mailcow server';
  readonly inputSchema = {
    type: 'object' as const,
    properties: {
      domain: {
        type: 'string' as const,
        description: 'Domain name to create',
        pattern: '^[a-zA-Z0-9][a-zA-Z0-9\\-]{0,61}[a-zA-Z0-9](?:\\.[a-zA-Z0-9][a-zA-Z0-9\\-]{0,61}[a-zA-Z0-9])*$',
      },
      description: {
        type: 'string' as const,
        description: 'Optional description for the domain',
      },
      quota: {
        type: 'number' as const,
        description: 'Domain quota in MB',
        minimum: 0,
      },
      max_quota: {
        type: 'number' as const,
        description: 'Maximum quota in MB',
        minimum: 0,
      },
      relay_host: {
        type: 'string' as const,
        description: 'Optional relay host for outgoing mail',
      },
      relay_all_recipients: {
        type: 'boolean' as const,
        description: 'Relay all recipients (bypass local delivery)',
      },
    },
    required: ['domain'],
    additionalProperties: false,
  };

  constructor(logger: Logger, private domainAPI: DomainAPI) {
    super(logger, {
      category: ToolCategory.DOMAIN,
      version: '1.0.0',
      requiresAuth: true,
      rateLimited: true,
    });
  }

  async execute(input: ToolInput, context: ToolContext): Promise<ToolHandlerResult> {
    try {
      this.logExecution(input, context, true);

      // Validate permissions
      if (!this.validatePermissions(context, ['domains:write', 'write'])) {
        return {
          success: false,
          error: {
            code: MCPErrorCode.AUTHORIZATION_ERROR,
            message: 'Permission denied: requires domains:write permission',
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
        description, 
        quota = 1000, 
        max_quota = 10000, 
        relay_host, 
        relay_all_recipients = false 
      } = input;

      if (typeof domain !== 'string') {
        return {
          success: false,
          error: {
            code: MCPErrorCode.INVALID_PARAMS,
            message: 'Domain must be a string',
          },
        };
      }

      // Validate quota relationship
      const quotaNum = typeof quota === 'number' ? quota : 1000;
      const maxQuotaNum = typeof max_quota === 'number' ? max_quota : 10000;
      
      if (quotaNum > maxQuotaNum) {
        return {
          success: false,
          error: {
            code: MCPErrorCode.INVALID_PARAMS,
            message: 'Quota cannot be greater than max_quota',
          },
        };
      }

      // Create domain request
      const domainRequest: CreateDomainRequest = {
        domain,
        description: typeof description === 'string' ? description : undefined,
        quota: quotaNum,
        maxquota: maxQuotaNum,
        relayhost: typeof relay_host === 'string' ? relay_host : undefined,
        relay_all_recipients: typeof relay_all_recipients === 'boolean' ? relay_all_recipients : false,
      };

      // Create domain
      const createdDomain = await this.domainAPI.createDomain(domainRequest);

      const result = {
        message: `Domain '${createdDomain.domain}' created successfully`,
        domain: {
          domain: createdDomain.domain,
          description: createdDomain.description || 'No description',
          active: createdDomain.active,
          quota: `${createdDomain.quota} MB`,
          max_quota: `${createdDomain.maxquota} MB`,
          relay_host: createdDomain.relayhost || 'None',
          relay_all: createdDomain.relay_all_recipients || false,
          created: createdDomain.created,
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
 * Update an existing domain
 */
export class UpdateDomainTool extends BaseTool {
  readonly name = 'update_domain';
  readonly description = 'Update settings for an existing domain';
  readonly inputSchema = {
    type: 'object' as const,
    properties: {
      domain: {
        type: 'string' as const,
        description: 'Domain name to update',
        pattern: '^[a-zA-Z0-9][a-zA-Z0-9\\-]{0,61}[a-zA-Z0-9](?:\\.[a-zA-Z0-9][a-zA-Z0-9\\-]{0,61}[a-zA-Z0-9])*$',
      },
      description: {
        type: 'string' as const,
        description: 'Updated description for the domain',
      },
      active: {
        type: 'boolean' as const,
        description: 'Whether the domain should be active',
      },
      quota: {
        type: 'number' as const,
        description: 'Updated domain quota in MB',
        minimum: 0,
      },
      max_quota: {
        type: 'number' as const,
        description: 'Updated maximum quota in MB',
        minimum: 0,
      },
      relay_host: {
        type: 'string' as const,
        description: 'Updated relay host for outgoing mail (empty string to remove)',
      },
      relay_all_recipients: {
        type: 'boolean' as const,
        description: 'Updated setting for relaying all recipients',
      },
    },
    required: ['domain'],
    additionalProperties: false,
  };

  constructor(logger: Logger, private domainAPI: DomainAPI) {
    super(logger, {
      category: ToolCategory.DOMAIN,
      version: '1.0.0',
      requiresAuth: true,
      rateLimited: true,
    });
  }

  async execute(input: ToolInput, context: ToolContext): Promise<ToolHandlerResult> {
    try {
      this.logExecution(input, context, true);

      // Validate permissions
      if (!this.validatePermissions(context, ['domains:write', 'write'])) {
        return {
          success: false,
          error: {
            code: MCPErrorCode.AUTHORIZATION_ERROR,
            message: 'Permission denied: requires domains:write permission',
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

      const { domain, description, active, quota, max_quota, relay_host, relay_all_recipients } = input;

      if (typeof domain !== 'string') {
        return {
          success: false,
          error: {
            code: MCPErrorCode.INVALID_PARAMS,
            message: 'Domain must be a string',
          },
        };
      }

      // Check if domain exists
      try {
        await this.domainAPI.getDomainDetails(domain);
      } catch {
        return {
          success: false,
          error: {
            code: MCPErrorCode.RESOURCE_NOT_FOUND,
            message: `Domain '${domain}' not found`,
          },
        };
      }

      // Validate quota relationship
      if (quota !== undefined && max_quota !== undefined && 
          typeof quota === 'number' && typeof max_quota === 'number' && 
          quota > max_quota) {
        return {
          success: false,
          error: {
            code: MCPErrorCode.INVALID_PARAMS,
            message: 'Quota cannot be greater than max_quota',
          },
        };
      }

      // Build update request (only include provided fields)
      const updateRequest: UpdateDomainRequest = {};
      if (description !== undefined && typeof description === 'string') updateRequest.description = description;
      if (active !== undefined && typeof active === 'boolean') updateRequest.active = active;
      if (quota !== undefined && typeof quota === 'number') updateRequest.quota = quota;
      if (max_quota !== undefined && typeof max_quota === 'number') updateRequest.maxquota = max_quota;
      if (relay_host !== undefined && typeof relay_host === 'string') updateRequest.relayhost = relay_host || undefined;
      if (relay_all_recipients !== undefined && typeof relay_all_recipients === 'boolean') updateRequest.relay_all_recipients = relay_all_recipients;

      // Update domain
      const updatedDomain = await this.domainAPI.updateDomain(domain, updateRequest);

      const result = {
        message: `Domain '${updatedDomain.domain}' updated successfully`,
        domain: {
          domain: updatedDomain.domain,
          description: updatedDomain.description || 'No description',
          active: updatedDomain.active,
          status: updatedDomain.active ? 'Active' : 'Inactive',
          quota: `${updatedDomain.quota} MB`,
          max_quota: `${updatedDomain.maxquota} MB`,
          relay_host: updatedDomain.relayhost || 'None',
          relay_all: updatedDomain.relay_all_recipients || false,
          last_modified: updatedDomain.modified,
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
 * Delete a domain
 */
export class DeleteDomainTool extends BaseTool {
  readonly name = 'delete_domain';
  readonly description = 'Delete a domain from the Mailcow server (WARNING: This will also delete all associated mailboxes and aliases!)';
  readonly inputSchema = {
    type: 'object' as const,
    properties: {
      domain: {
        type: 'string' as const,
        description: 'Domain name to delete',
        pattern: '^[a-zA-Z0-9][a-zA-Z0-9\\-]{0,61}[a-zA-Z0-9](?:\\.[a-zA-Z0-9][a-zA-Z0-9\\-]{0,61}[a-zA-Z0-9])*$',
      },
      confirm: {
        type: 'boolean' as const,
        description: 'Confirmation that you want to delete the domain and ALL associated data',
      },
    },
    required: ['domain', 'confirm'],
    additionalProperties: false,
  };

  constructor(logger: Logger, private domainAPI: DomainAPI) {
    super(logger, {
      category: ToolCategory.DOMAIN,
      version: '1.0.0',
      requiresAuth: true,
      rateLimited: true,
    });
  }

  async execute(input: ToolInput, context: ToolContext): Promise<ToolHandlerResult> {
    try {
      this.logExecution(input, context, true);

      // Validate permissions
      if (!this.validatePermissions(context, ['domains:delete', 'write'])) {
        return {
          success: false,
          error: {
            code: MCPErrorCode.AUTHORIZATION_ERROR,
            message: 'Permission denied: requires domains:delete permission',
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

      const { domain, confirm } = input;

      if (typeof domain !== 'string') {
        return {
          success: false,
          error: {
            code: MCPErrorCode.INVALID_PARAMS,
            message: 'Domain must be a string',
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
            message: 'Domain deletion requires explicit confirmation (confirm: true)',
          },
        };
      }

      // Check if domain exists and get details first
      let domainDetails: MailcowDomain;
      try {
        domainDetails = await this.domainAPI.getDomainDetails(domain);
      } catch {
        return {
          success: false,
          error: {
            code: MCPErrorCode.RESOURCE_NOT_FOUND,
            message: `Domain '${domain}' not found`,
          },
        };
      }

      // Delete domain
      await this.domainAPI.deleteDomain(domain);

      const result = {
        message: `Domain '${domain}' deleted successfully`,
        deleted_domain: {
          domain: domainDetails.domain,
          description: domainDetails.description || 'No description',
          was_active: domainDetails.active,
          quota: `${domainDetails.quota} MB`,
          max_quota: `${domainDetails.maxquota} MB`,
          deleted_at: new Date().toISOString(),
        },
        warning: 'All associated mailboxes, aliases, and data have been permanently deleted',
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

// Export all domain tools
export const DomainTools = {
  ListDomainsTool,
  GetDomainTool,
  CreateDomainTool,
  UpdateDomainTool,
  DeleteDomainTool,
};