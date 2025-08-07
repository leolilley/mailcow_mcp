/**
 * DKIM Management Tools
 * MCP tools for managing Mailcow DKIM keys
 */

import { BaseTool, ToolUtils } from '../base';
import { DKIMAPI } from '../../api/dkim';
import {
  ToolInput,
  ToolContext,
  ToolHandlerResult,
  CreateDKIMRequest,
  UpdateDKIMRequest,
  ToolCategory,
  MCPErrorCode,
} from '../../types';
import { Logger } from '../../utils';

/**
 * List all DKIM keys
 */
export class ListDKIMKeysTool extends BaseTool {
  readonly name = 'list_dkim_keys';
  readonly description = 'List all DKIM keys in the Mailcow server with optional filtering';
  readonly inputSchema = {
    type: 'object' as const,
    properties: {
      domain: {
        type: 'string' as const,
        description: 'Filter by specific domain',
        pattern: '^[a-zA-Z0-9][a-zA-Z0-9\\\\\\\\-]{0,61}[a-zA-Z0-9](?:\\\\\\\\.[a-zA-Z0-9][a-zA-Z0-9\\\\\\\\-]{0,61}[a-zA-Z0-9])*$',
      },
      active_only: {
        type: 'boolean' as const,
        description: 'Only return active DKIM keys',
      },
      selector: {
        type: 'string' as const,
        description: 'Filter by DKIM selector',
        pattern: '^[a-zA-Z0-9._-]+$',
        maxLength: 63,
      },
      algorithm: {
        type: 'string' as const,
        description: 'Filter by algorithm (rsa or ed25519)',
        enum: ['rsa', 'ed25519'],
      },
      created_after: {
        type: 'string' as const,
        description: 'Filter by creation date (after this date)',
        format: 'date-time',
      },
      created_before: {
        type: 'string' as const,
        description: 'Filter by creation date (before this date)', 
        format: 'date-time',
      },
      limit: {
        type: 'number' as const,
        description: 'Maximum number of DKIM keys to return',
        minimum: 1,
        maximum: 1000,
      },
      offset: {
        type: 'number' as const,
        description: 'Number of DKIM keys to skip for pagination',
        minimum: 0,
      },
    },
    additionalProperties: false,
  };

  constructor(logger: Logger, private dkimAPI: DKIMAPI) {
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
      if (!this.validatePermissions(context, ['dkim:read', 'domains:read', 'read'])) {
        return {
          success: false,
          error: {
            code: MCPErrorCode.AUTHORIZATION_ERROR,
            message: 'Permission denied: requires dkim:read permission',
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
        selector,
        algorithm,
        created_after,
        created_before,
        limit = 100,
        offset = 0,
      } = input;

      // Build API parameters
      const params: any = {};
      if (typeof domain === 'string') params.domain = domain;
      if (active_only) params.active = true;
      if (typeof selector === 'string') params.selector = selector;
      if (typeof algorithm === 'string') params.algorithm = algorithm as 'rsa' | 'ed25519';
      if (typeof created_after === 'string') params.created_after = new Date(created_after);
      if (typeof created_before === 'string') params.created_before = new Date(created_before);
      if (typeof limit === 'number' && limit > 0) params.limit = limit;
      if (typeof offset === 'number' && offset >= 0) params.offset = offset;

      // Fetch DKIM keys from API
      const keys = await this.dkimAPI.listDKIMKeys(params);

      // Apply client-side filtering if needed
      let filteredKeys = keys;
      
      if (active_only && !params.active) {
        filteredKeys = filteredKeys.filter(key => key.active);
      }

      if (typeof limit === 'number' && limit > 0) {
        const startIndex = typeof offset === 'number' ? offset : 0;
        filteredKeys = filteredKeys.slice(startIndex, startIndex + limit);
      }

      // Format results
      const summary = {
        total_keys: keys.length,
        filtered_keys: filteredKeys.length,
        active_keys: keys.filter(k => k.active).length,
        inactive_keys: keys.filter(k => !k.active).length,
        algorithm_breakdown: {
          rsa: keys.filter(k => k.algorithm === 'rsa').length,
          ed25519: keys.filter(k => k.algorithm === 'ed25519').length,
        },
        filters_applied: params,
        keys: filteredKeys.map(key => ({
          domain: key.domain,
          selector: key.selector,
          algorithm: key.algorithm,
          key_size: key.key_size,
          active: key.active,
          public_key_preview: key.public_key ? `${key.public_key.substring(0, 50)}...` : 'N/A',
          created: key.created,
          modified: key.modified,
          key_id: key.id,
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
 * Get detailed information about a specific DKIM key
 */
export class GetDKIMKeyTool extends BaseTool {
  readonly name = 'get_dkim_key';
  readonly description = 'Get detailed information about a specific DKIM key';
  readonly inputSchema = {
    type: 'object' as const,
    properties: {
      domain: {
        type: 'string' as const,
        description: 'Domain of the DKIM key',
        pattern: '^[a-zA-Z0-9][a-zA-Z0-9\\\\\\\\-]{0,61}[a-zA-Z0-9](?:\\\\\\\\.[a-zA-Z0-9][a-zA-Z0-9\\\\\\\\-]{0,61}[a-zA-Z0-9])*$',
      },
      selector: {
        type: 'string' as const,
        description: 'Selector of the DKIM key',
        pattern: '^[a-zA-Z0-9._-]+$',
        maxLength: 63,
      },
    },
    required: ['domain', 'selector'],
    additionalProperties: false,
  };

  constructor(logger: Logger, private dkimAPI: DKIMAPI) {
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
      if (!this.validatePermissions(context, ['dkim:read', 'domains:read', 'read'])) {
        return {
          success: false,
          error: {
            code: MCPErrorCode.AUTHORIZATION_ERROR,
            message: 'Permission denied: requires dkim:read permission',
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

      const { domain, selector } = input;

      if (typeof domain !== 'string' || typeof selector !== 'string') {
        return {
          success: false,
          error: {
            code: MCPErrorCode.INVALID_PARAMS,
            message: 'Domain and selector must be strings',
          },
        };
      }

      // Fetch DKIM key details
      const keyDetails = await this.dkimAPI.getDKIMKey(domain, selector);

      if (!keyDetails) {
        return {
          success: false,
          error: {
            code: MCPErrorCode.RESOURCE_NOT_FOUND,
            message: `DKIM key for domain '${domain}' with selector '${selector}' not found`,
          },
        };
      }

      // Generate DNS record for the key
      const dnsRecord = this.dkimAPI.generateDKIMDNSRecord(keyDetails);

      const formattedKey = {
        domain: keyDetails.domain,
        selector: keyDetails.selector,
        algorithm: keyDetails.algorithm,
        key_size: keyDetails.key_size,
        active: keyDetails.active,
        status: keyDetails.active ? 'Active' : 'Inactive',
        public_key: keyDetails.public_key,
        dns_record: dnsRecord,
        dns_host: `${keyDetails.selector}._domainkey.${keyDetails.domain}`,
        timestamps: {
          created: keyDetails.created,
          last_modified: keyDetails.modified,
        },
        validation_status: this.dkimAPI.validateDKIMKey(keyDetails) ? 'Valid' : 'Invalid',
        key_id: keyDetails.id,
      };

      return {
        success: true,
        result: ToolUtils.createJsonResult(formattedKey),
      };
    } catch (error) {
      return this.handleError(error as Error, context);
    }
  }
}

/**
 * Create a new DKIM key
 */
export class CreateDKIMKeyTool extends BaseTool {
  readonly name = 'create_dkim_key';
  readonly description = 'Create a new DKIM key for a domain in the Mailcow server';
  readonly inputSchema = {
    type: 'object' as const,
    properties: {
      domain: {
        type: 'string' as const,
        description: 'Domain for the DKIM key',
        pattern: '^[a-zA-Z0-9][a-zA-Z0-9\\\\\\\\-]{0,61}[a-zA-Z0-9](?:\\\\\\\\.[a-zA-Z0-9][a-zA-Z0-9\\\\\\\\-]{0,61}[a-zA-Z0-9])*$',
      },
      selector: {
        type: 'string' as const,
        description: 'Selector for the DKIM key (unique identifier)',
        pattern: '^[a-zA-Z0-9._-]+$',
        maxLength: 63,
      },
      key_size: {
        type: 'number' as const,
        description: 'Key size in bits (1024, 2048, or 4096 for RSA)',
        minimum: 1024,
        maximum: 4096,
      },
      algorithm: {
        type: 'string' as const,
        description: 'Algorithm for the DKIM key',
        enum: ['rsa', 'ed25519'],
      },
    },
    required: ['domain', 'selector'],
    additionalProperties: false,
  };

  constructor(logger: Logger, private dkimAPI: DKIMAPI) {
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
      if (!this.validatePermissions(context, ['dkim:write', 'domains:write', 'write'])) {
        return {
          success: false,
          error: {
            code: MCPErrorCode.AUTHORIZATION_ERROR,
            message: 'Permission denied: requires dkim:write permission',
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
        selector,
        key_size = 2048,
        algorithm = 'rsa',
      } = input;

      // Validate required string fields
      if (typeof domain !== 'string' || typeof selector !== 'string') {
        return {
          success: false,
          error: {
            code: MCPErrorCode.INVALID_PARAMS,
            message: 'Domain and selector must be strings',
          },
        };
      }

      // Create DKIM key request
      const dkimRequest: CreateDKIMRequest = {
        domain,
        selector,
        key_size: typeof key_size === 'number' ? key_size : 2048,
        algorithm: typeof algorithm === 'string' ? algorithm as 'rsa' | 'ed25519' : 'rsa',
      };

      // Create DKIM key
      const createdKey = await this.dkimAPI.createDKIMKey(dkimRequest);

      // Generate DNS record for the new key
      const dnsRecord = this.dkimAPI.generateDKIMDNSRecord(createdKey);

      const result = {
        message: `DKIM key for domain '${createdKey.domain}' with selector '${createdKey.selector}' created successfully`,
        dkim_key: {
          domain: createdKey.domain,
          selector: createdKey.selector,
          algorithm: createdKey.algorithm,
          key_size: createdKey.key_size,
          active: createdKey.active,
          public_key: createdKey.public_key,
          created: createdKey.created,
          key_id: createdKey.id,
        },
        dns_configuration: {
          dns_record: dnsRecord,
          host: `${createdKey.selector}._domainkey.${createdKey.domain}`,
          instructions: 'Add this TXT record to your DNS configuration to enable DKIM signing',
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
 * Update an existing DKIM key
 */
export class UpdateDKIMKeyTool extends BaseTool {
  readonly name = 'update_dkim_key';
  readonly description = 'Update settings for an existing DKIM key';
  readonly inputSchema = {
    type: 'object' as const,
    properties: {
      domain: {
        type: 'string' as const,
        description: 'Domain of the DKIM key to update',
        pattern: '^[a-zA-Z0-9][a-zA-Z0-9\\\\\\\\-]{0,61}[a-zA-Z0-9](?:\\\\\\\\.[a-zA-Z0-9][a-zA-Z0-9\\\\\\\\-]{0,61}[a-zA-Z0-9])*$',
      },
      selector: {
        type: 'string' as const,
        description: 'Selector of the DKIM key to update',
        pattern: '^[a-zA-Z0-9._-]+$',
        maxLength: 63,
      },
      active: {
        type: 'boolean' as const,
        description: 'Whether the DKIM key should be active',
      },
      key_size: {
        type: 'number' as const,
        description: 'Updated key size in bits',
        minimum: 1024,
        maximum: 4096,
      },
      algorithm: {
        type: 'string' as const,
        description: 'Updated algorithm for the DKIM key',
        enum: ['rsa', 'ed25519'],
      },
    },
    required: ['domain', 'selector'],
    additionalProperties: false,
  };

  constructor(logger: Logger, private dkimAPI: DKIMAPI) {
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
      if (!this.validatePermissions(context, ['dkim:write', 'domains:write', 'write'])) {
        return {
          success: false,
          error: {
            code: MCPErrorCode.AUTHORIZATION_ERROR,
            message: 'Permission denied: requires dkim:write permission',
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

      const { domain, selector, active, key_size, algorithm } = input;

      if (typeof domain !== 'string' || typeof selector !== 'string') {
        return {
          success: false,
          error: {
            code: MCPErrorCode.INVALID_PARAMS,
            message: 'Domain and selector must be strings',
          },
        };
      }

      // Check if DKIM key exists
      const existingKey = await this.dkimAPI.getDKIMKey(domain, selector);
      if (!existingKey) {
        return {
          success: false,
          error: {
            code: MCPErrorCode.RESOURCE_NOT_FOUND,
            message: `DKIM key for domain '${domain}' with selector '${selector}' not found`,
          },
        };
      }

      // Build update request (only include provided fields)
      const updateRequest: UpdateDKIMRequest = {};
      if (active !== undefined && typeof active === 'boolean') updateRequest.active = active;
      if (key_size !== undefined && typeof key_size === 'number') updateRequest.key_size = key_size;
      if (algorithm !== undefined && typeof algorithm === 'string') updateRequest.algorithm = algorithm as 'rsa' | 'ed25519';

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

      // Update DKIM key
      const updatedKey = await this.dkimAPI.updateDKIMKey(domain, selector, updateRequest);

      // Generate DNS record for the updated key
      const dnsRecord = this.dkimAPI.generateDKIMDNSRecord(updatedKey);

      const result = {
        message: `DKIM key for domain '${updatedKey.domain}' with selector '${updatedKey.selector}' updated successfully`,
        dkim_key: {
          domain: updatedKey.domain,
          selector: updatedKey.selector,
          algorithm: updatedKey.algorithm,
          key_size: updatedKey.key_size,
          active: updatedKey.active,
          status: updatedKey.active ? 'Active' : 'Inactive',
          public_key: updatedKey.public_key,
          last_modified: updatedKey.modified,
          key_id: updatedKey.id,
        },
        dns_configuration: {
          dns_record: dnsRecord,
          host: `${updatedKey.selector}._domainkey.${updatedKey.domain}`,
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
 * Delete a DKIM key
 */
export class DeleteDKIMKeyTool extends BaseTool {
  readonly name = 'delete_dkim_key';
  readonly description = 'Delete a DKIM key from the Mailcow server (WARNING: This will affect email signing!)';
  readonly inputSchema = {
    type: 'object' as const,
    properties: {
      domain: {
        type: 'string' as const,
        description: 'Domain of the DKIM key to delete',
        pattern: '^[a-zA-Z0-9][a-zA-Z0-9\\\\\\\\-]{0,61}[a-zA-Z0-9](?:\\\\\\\\.[a-zA-Z0-9][a-zA-Z0-9\\\\\\\\-]{0,61}[a-zA-Z0-9])*$',
      },
      selector: {
        type: 'string' as const,
        description: 'Selector of the DKIM key to delete',
        pattern: '^[a-zA-Z0-9._-]+$',
        maxLength: 63,
      },
      confirm: {
        type: 'boolean' as const,
        description: 'Confirmation that you want to delete the DKIM key (affects email signing)',
      },
    },
    required: ['domain', 'selector', 'confirm'],
    additionalProperties: false,
  };

  constructor(logger: Logger, private dkimAPI: DKIMAPI) {
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
      if (!this.validatePermissions(context, ['dkim:delete', 'domains:write', 'write'])) {
        return {
          success: false,
          error: {
            code: MCPErrorCode.AUTHORIZATION_ERROR,
            message: 'Permission denied: requires dkim:delete permission',
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

      const { domain, selector, confirm } = input;

      if (typeof domain !== 'string' || typeof selector !== 'string') {
        return {
          success: false,
          error: {
            code: MCPErrorCode.INVALID_PARAMS,
            message: 'Domain and selector must be strings',
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
            message: 'DKIM key deletion requires explicit confirmation (confirm: true)',
          },
        };
      }

      // Check if DKIM key exists and get details first
      const keyDetails = await this.dkimAPI.getDKIMKey(domain, selector);
      if (!keyDetails) {
        return {
          success: false,
          error: {
            code: MCPErrorCode.RESOURCE_NOT_FOUND,
            message: `DKIM key for domain '${domain}' with selector '${selector}' not found`,
          },
        };
      }

      // Delete DKIM key
      const success = await this.dkimAPI.deleteDKIMKey(domain, selector);

      if (!success) {
        return {
          success: false,
          error: {
            code: MCPErrorCode.INTERNAL_ERROR,
            message: `Failed to delete DKIM key for domain '${domain}' with selector '${selector}'`,
          },
        };
      }

      const result = {
        message: `DKIM key for domain '${domain}' with selector '${selector}' deleted successfully`,
        deleted_key: {
          domain: keyDetails.domain,
          selector: keyDetails.selector,
          algorithm: keyDetails.algorithm,
          key_size: keyDetails.key_size,
          was_active: keyDetails.active,
          deleted_at: new Date().toISOString(),
          key_id: keyDetails.id,
        },
        warning: 'Emails for this domain will no longer be DKIM signed until a new key is created',
        dns_cleanup: `Remove the TXT record for ${keyDetails.selector}._domainkey.${keyDetails.domain} from your DNS configuration`,
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

// Export all DKIM tools
export const DKIMTools = {
  ListDKIMKeysTool,
  GetDKIMKeyTool,
  CreateDKIMKeyTool,
  UpdateDKIMKeyTool,
  DeleteDKIMKeyTool,
};