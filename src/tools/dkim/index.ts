/**
 * DKIM Tools
 * MCP tools for Mailcow DKIM key management operations
 */

import { 
  ToolInput, 
  ToolContext,
  ToolHandlerResult,
  ToolCategory
} from '../../types';
import { ToolBuilder } from '../base';
import { Logger } from '../../utils';
import { DKIMAPI } from '../../api';
import { 
  CreateDKIMRequest, 
  UpdateDKIMRequest,
  ListDKIMParams 
} from '../../types/mailcow';

/**
 * Create DKIM management tools using the FunctionTool pattern
 */
export function createDKIMTools(dkimAPI: DKIMAPI, logger: Logger) {
  const toolBuilder = new ToolBuilder(logger);

  // List DKIM Keys Tool
  const listDKIMKeysTool = toolBuilder
    .withName('list_dkim_keys')
    .withDescription('List all DKIM keys with optional filtering by domain, selector, or algorithm')
    .withInputSchema({
      type: 'object',
      properties: {
        domain: { type: 'string', description: 'Filter by domain' },
        active: { type: 'boolean', description: 'Filter by active status' },
        selector: { type: 'string', description: 'Filter by selector' },
        algorithm: { type: 'string', description: 'Filter by algorithm (rsa or ed25519)' },
        created_after: { type: 'string', format: 'date-time', description: 'Filter by creation date (after)' },
        created_before: { type: 'string', format: 'date-time', description: 'Filter by creation date (before)' },
        limit: { type: 'number', description: 'Maximum number of results' },
        offset: { type: 'number', description: 'Number of results to skip' }
      },
      additionalProperties: false
    })
    .withHandler(async (input: ToolInput, _context: ToolContext): Promise<ToolHandlerResult> => {
      try {
        const params: ListDKIMParams = {};
        if (input.domain) params.domain = input.domain as string;
        if (input.active !== undefined) params.active = input.active as boolean;
        if (input.selector) params.selector = input.selector as string;
        if (input.algorithm) params.algorithm = input.algorithm as 'rsa' | 'ed25519';
        if (input.created_after) params.created_after = new Date(input.created_after as string);
        if (input.created_before) params.created_before = new Date(input.created_before as string);
        if (input.limit) params.limit = input.limit as number;
        if (input.offset) params.offset = input.offset as number;

        const keys = await dkimAPI.listDKIMKeys(params);
        
        return {
          success: true,
          result: {
            content: [{
              type: 'text',
              text: JSON.stringify({ keys, total: keys.length, filters: params }, null, 2)
            }]
          }
        };
      } catch (error) {
        return {
          success: false,
          error: {
            code: 500,
            message: error instanceof Error ? error.message : 'Failed to list DKIM keys'
          }
        };
      }
    })
    .withMetadata({
      category: ToolCategory.DOMAIN,
      version: '1.0.0',
      requiresAuth: true,
      rateLimited: true
    })
    .build();

  // Get DKIM Key Tool
  const getDKIMKeyTool = toolBuilder
    .withName('get_dkim_key')
    .withDescription('Get a specific DKIM key by domain and selector')
    .withInputSchema({
      type: 'object',
      properties: {
        domain: { type: 'string', description: 'Domain of the DKIM key' },
        selector: { type: 'string', description: 'Selector of the DKIM key' }
      },
      required: ['domain', 'selector'],
      additionalProperties: false
    })
    .withHandler(async (input: ToolInput, _context: ToolContext): Promise<ToolHandlerResult> => {
      try {
        const domain = input.domain as string;
        const selector = input.selector as string;
        const key = await dkimAPI.getDKIMKey(domain, selector);
        
        if (!key) {
          return {
            success: false,
            error: {
              code: 404,
              message: `DKIM key for domain '${domain}' with selector '${selector}' not found`
            }
          };
        }
        
        return {
          success: true,
          result: {
            content: [{
              type: 'text',
              text: JSON.stringify({ key }, null, 2)
            }]
          }
        };
      } catch (error) {
        return {
          success: false,
          error: {
            code: 500,
            message: error instanceof Error ? error.message : 'Failed to get DKIM key'
          }
        };
      }
    })
    .withMetadata({
      category: ToolCategory.DOMAIN,
      version: '1.0.0',
      requiresAuth: true,
      rateLimited: true
    })
    .build();

  // Create DKIM Key Tool
  const createDKIMKeyTool = toolBuilder
    .withName('create_dkim_key')
    .withDescription('Create a new DKIM key for a domain')
    .withInputSchema({
      type: 'object',
      properties: {
        domain: { type: 'string', description: 'Domain for the DKIM key' },
        selector: { type: 'string', description: 'Selector for the DKIM key' },
        key_size: { type: 'number', description: 'Key size in bits (default: 2048 for RSA)' },
        algorithm: { type: 'string', description: 'Algorithm (rsa or ed25519)', enum: ['rsa', 'ed25519'] }
      },
      required: ['domain', 'selector'],
      additionalProperties: false
    })
    .withHandler(async (input: ToolInput, _context: ToolContext): Promise<ToolHandlerResult> => {
      try {
        const dkimData: CreateDKIMRequest = {
          domain: input.domain as string,
          selector: input.selector as string,
          key_size: input.key_size as number,
          algorithm: input.algorithm as 'rsa' | 'ed25519'
        };

        const key = await dkimAPI.createDKIMKey(dkimData);
        
        return {
          success: true,
          result: {
            content: [{
              type: 'text',
              text: JSON.stringify({
                message: `DKIM key for domain '${key.domain}' with selector '${key.selector}' created successfully`,
                key
              }, null, 2)
            }]
          }
        };
      } catch (error) {
        return {
          success: false,
          error: {
            code: 500,
            message: error instanceof Error ? error.message : 'Failed to create DKIM key'
          }
        };
      }
    })
    .withMetadata({
      category: ToolCategory.DOMAIN,
      version: '1.0.0',
      requiresAuth: true,
      rateLimited: true
    })
    .build();

  // Update DKIM Key Tool
  const updateDKIMKeyTool = toolBuilder
    .withName('update_dkim_key')
    .withDescription('Update an existing DKIM key')
    .withInputSchema({
      type: 'object',
      properties: {
        domain: { type: 'string', description: 'Domain of the DKIM key' },
        selector: { type: 'string', description: 'Selector of the DKIM key' },
        active: { type: 'boolean', description: 'Whether the key is active' },
        key_size: { type: 'number', description: 'New key size in bits' },
        algorithm: { type: 'string', description: 'New algorithm (rsa or ed25519)', enum: ['rsa', 'ed25519'] }
      },
      required: ['domain', 'selector'],
      additionalProperties: false
    })
    .withHandler(async (input: ToolInput, _context: ToolContext): Promise<ToolHandlerResult> => {
      try {
        const domain = input.domain as string;
        const selector = input.selector as string;
        const updateData: UpdateDKIMRequest = {};
        
        if (input.active !== undefined) updateData.active = input.active as boolean;
        if (input.key_size !== undefined) updateData.key_size = input.key_size as number;
        if (input.algorithm !== undefined) updateData.algorithm = input.algorithm as 'rsa' | 'ed25519';

        const key = await dkimAPI.updateDKIMKey(domain, selector, updateData);
        
        return {
          success: true,
          result: {
            content: [{
              type: 'text',
              text: JSON.stringify({
                message: `DKIM key for domain '${domain}' with selector '${selector}' updated successfully`,
                key
              }, null, 2)
            }]
          }
        };
      } catch (error) {
        return {
          success: false,
          error: {
            code: 500,
            message: error instanceof Error ? error.message : 'Failed to update DKIM key'
          }
        };
      }
    })
    .withMetadata({
      category: ToolCategory.DOMAIN,
      version: '1.0.0',
      requiresAuth: true,
      rateLimited: true
    })
    .build();

  // Delete DKIM Key Tool
  const deleteDKIMKeyTool = toolBuilder
    .withName('delete_dkim_key')
    .withDescription('Delete a DKIM key by domain and selector')
    .withInputSchema({
      type: 'object',
      properties: {
        domain: { type: 'string', description: 'Domain of the DKIM key' },
        selector: { type: 'string', description: 'Selector of the DKIM key' }
      },
      required: ['domain', 'selector'],
      additionalProperties: false
    })
    .withHandler(async (input: ToolInput, _context: ToolContext): Promise<ToolHandlerResult> => {
      try {
        const domain = input.domain as string;
        const selector = input.selector as string;
        const success = await dkimAPI.deleteDKIMKey(domain, selector);
        
        if (!success) {
          return {
            success: false,
            error: {
              code: 500,
              message: `Failed to delete DKIM key for domain '${domain}' with selector '${selector}'`
            }
          };
        }
        
        return {
          success: true,
          result: {
            content: [{
              type: 'text',
              text: JSON.stringify({
                message: `DKIM key for domain '${domain}' with selector '${selector}' deleted successfully`
              }, null, 2)
            }]
          }
        };
      } catch (error) {
        return {
          success: false,
          error: {
            code: 500,
            message: error instanceof Error ? error.message : 'Failed to delete DKIM key'
          }
        };
      }
    })
    .withMetadata({
      category: ToolCategory.DOMAIN,
      version: '1.0.0',
      requiresAuth: true,
      rateLimited: true
    })
    .build();

  // Activate DKIM Key Tool
  const activateDKIMKeyTool = toolBuilder
    .withName('activate_dkim_key')
    .withDescription('Activate a DKIM key')
    .withInputSchema({
      type: 'object',
      properties: {
        domain: { type: 'string', description: 'Domain of the DKIM key' },
        selector: { type: 'string', description: 'Selector of the DKIM key' }
      },
      required: ['domain', 'selector'],
      additionalProperties: false
    })
    .withHandler(async (input: ToolInput, _context: ToolContext): Promise<ToolHandlerResult> => {
      try {
        const domain = input.domain as string;
        const selector = input.selector as string;
        const key = await dkimAPI.activateDKIMKey(domain, selector);
        
        return {
          success: true,
          result: {
            content: [{
              type: 'text',
              text: JSON.stringify({
                message: `DKIM key for domain '${domain}' with selector '${selector}' activated successfully`,
                key
              }, null, 2)
            }]
          }
        };
      } catch (error) {
        return {
          success: false,
          error: {
            code: 500,
            message: error instanceof Error ? error.message : 'Failed to activate DKIM key'
          }
        };
      }
    })
    .withMetadata({
      category: ToolCategory.DOMAIN,
      version: '1.0.0',
      requiresAuth: true,
      rateLimited: true
    })
    .build();

  // Deactivate DKIM Key Tool
  const deactivateDKIMKeyTool = toolBuilder
    .withName('deactivate_dkim_key')
    .withDescription('Deactivate a DKIM key')
    .withInputSchema({
      type: 'object',
      properties: {
        domain: { type: 'string', description: 'Domain of the DKIM key' },
        selector: { type: 'string', description: 'Selector of the DKIM key' }
      },
      required: ['domain', 'selector'],
      additionalProperties: false
    })
    .withHandler(async (input: ToolInput, _context: ToolContext): Promise<ToolHandlerResult> => {
      try {
        const domain = input.domain as string;
        const selector = input.selector as string;
        const key = await dkimAPI.deactivateDKIMKey(domain, selector);
        
        return {
          success: true,
          result: {
            content: [{
              type: 'text',
              text: JSON.stringify({
                message: `DKIM key for domain '${domain}' with selector '${selector}' deactivated successfully`,
                key
              }, null, 2)
            }]
          }
        };
      } catch (error) {
        return {
          success: false,
          error: {
            code: 500,
            message: error instanceof Error ? error.message : 'Failed to deactivate DKIM key'
          }
        };
      }
    })
    .withMetadata({
      category: ToolCategory.DOMAIN,
      version: '1.0.0',
      requiresAuth: true,
      rateLimited: true
    })
    .build();

  // Get DKIM Keys by Domain Tool
  const getDKIMKeysByDomainTool = toolBuilder
    .withName('get_dkim_keys_by_domain')
    .withDescription('Get all DKIM keys for a specific domain')
    .withInputSchema({
      type: 'object',
      properties: {
        domain: { type: 'string', description: 'Domain to get DKIM keys for' }
      },
      required: ['domain'],
      additionalProperties: false
    })
    .withHandler(async (input: ToolInput, _context: ToolContext): Promise<ToolHandlerResult> => {
      try {
        const domain = input.domain as string;
        const keys = await dkimAPI.getDKIMKeysByDomain(domain);
        
        return {
          success: true,
          result: {
            content: [{
              type: 'text',
              text: JSON.stringify({
                keys,
                domain,
                total: keys.length
              }, null, 2)
            }]
          }
        };
      } catch (error) {
        return {
          success: false,
          error: {
            code: 500,
            message: error instanceof Error ? error.message : 'Failed to get DKIM keys by domain'
          }
        };
      }
    })
    .withMetadata({
      category: ToolCategory.DOMAIN,
      version: '1.0.0',
      requiresAuth: true,
      rateLimited: true
    })
    .build();

  // Generate DNS Record Tool
  const generateDNSRecordTool = toolBuilder
    .withName('generate_dkim_dns_record')
    .withDescription('Generate DNS record for a DKIM key')
    .withInputSchema({
      type: 'object',
      properties: {
        domain: { type: 'string', description: 'Domain of the DKIM key' },
        selector: { type: 'string', description: 'Selector of the DKIM key' }
      },
      required: ['domain', 'selector'],
      additionalProperties: false
    })
    .withHandler(async (input: ToolInput, _context: ToolContext): Promise<ToolHandlerResult> => {
      try {
        const domain = input.domain as string;
        const selector = input.selector as string;
        const key = await dkimAPI.getDKIMKey(domain, selector);
        
        if (!key) {
          return {
            success: false,
            error: {
              code: 404,
              message: `DKIM key for domain '${domain}' with selector '${selector}' not found`
            }
          };
        }
        
        const dnsRecord = dkimAPI.generateDKIMDNSRecord(key);
        
        return {
          success: true,
          result: {
            content: [{
              type: 'text',
              text: JSON.stringify({
                dns_record: dnsRecord,
                key_info: {
                  domain: key.domain,
                  selector: key.selector,
                  algorithm: key.algorithm,
                  key_size: key.key_size
                }
              }, null, 2)
            }]
          }
        };
      } catch (error) {
        return {
          success: false,
          error: {
            code: 500,
            message: error instanceof Error ? error.message : 'Failed to generate DNS record'
          }
        };
      }
    })
    .withMetadata({
      category: ToolCategory.DOMAIN,
      version: '1.0.0',
      requiresAuth: true,
      rateLimited: true
    })
    .build();

  return [
    listDKIMKeysTool,
    getDKIMKeyTool,
    createDKIMKeyTool,
    updateDKIMKeyTool,
    deleteDKIMKeyTool,
    activateDKIMKeyTool,
    deactivateDKIMKeyTool,
    getDKIMKeysByDomainTool,
    generateDNSRecordTool
  ];
} 