/**
 * Users Tools
 * MCP tools for Mailcow user management operations
 */

import { 
  ToolInput, 
  ToolContext,
  ToolHandlerResult,
  ToolCategory
} from '../../types';
import { ToolBuilder } from '../base';
import { Logger } from '../../utils';
import { UsersAPI } from '../../api';
import { 
  CreateUserRequest, 
  UpdateUserRequest,
  ListUsersParams 
} from '../../types/mailcow';

/**
 * Create user management tools using the FunctionTool pattern
 */
export function createUsersTools(usersAPI: UsersAPI, logger: Logger) {
  const toolBuilder = new ToolBuilder(logger);

  // List Users Tool
  const listUsersTool = toolBuilder
    .withName('list_users')
    .withDescription('List all users with optional filtering by domain, status, or date range')
    .withInputSchema({
      type: 'object',
      properties: {
        domain: { type: 'string', description: 'Filter by domain' },
        active: { type: 'boolean', description: 'Filter by active status' },
        username: { type: 'string', description: 'Filter by username' },
        created_after: { type: 'string', format: 'date-time', description: 'Filter by creation date (after)' },
        created_before: { type: 'string', format: 'date-time', description: 'Filter by creation date (before)' },
        limit: { type: 'number', description: 'Maximum number of results' },
        offset: { type: 'number', description: 'Number of results to skip' }
      },
      additionalProperties: false
    })
         .withHandler(async (input: ToolInput, _context: ToolContext): Promise<ToolHandlerResult> => {
       try {
         const params: ListUsersParams = {};
         if (input.domain) params.domain = input.domain as string;
         if (input.active !== undefined) params.active = input.active as boolean;
         if (input.username) params.username = input.username as string;
         if (input.created_after) params.created_after = new Date(input.created_after as string);
         if (input.created_before) params.created_before = new Date(input.created_before as string);
         if (input.limit) params.limit = input.limit as number;
         if (input.offset) params.offset = input.offset as number;

         const users = await usersAPI.listUsers(params);
         
         return {
           success: true,
           result: {
             content: [{
               type: 'text',
               text: JSON.stringify({ users, total: users.length, filters: params }, null, 2)
             }]
           }
         };
       } catch (error) {
         return {
           success: false,
           error: {
             code: 500,
             message: error instanceof Error ? error.message : 'Failed to list users'
           }
         };
       }
     })
    .withMetadata({
      category: ToolCategory.MAILBOX,
      version: '1.0.0',
      requiresAuth: true,
      rateLimited: true
    })
    .build();

  // Get User Tool
  const getUserTool = toolBuilder
    .withName('get_user')
    .withDescription('Get a specific user by username')
    .withInputSchema({
      type: 'object',
      properties: {
        username: { type: 'string', description: 'Username to retrieve' }
      },
      required: ['username'],
      additionalProperties: false
    })
         .withHandler(async (input: ToolInput, _context: ToolContext): Promise<ToolHandlerResult> => {
       try {
         const username = input.username as string;
         const user = await usersAPI.getUser(username);
         
         if (!user) {
           return {
             success: false,
             error: {
               code: 404,
               message: `User '${username}' not found`
             }
           };
         }
         
         return {
           success: true,
           result: {
             content: [{
               type: 'text',
               text: JSON.stringify({ user }, null, 2)
             }]
           }
         };
       } catch (error) {
         return {
           success: false,
           error: {
             code: 500,
             message: error instanceof Error ? error.message : 'Failed to get user'
           }
         };
       }
     })
    .withMetadata({
      category: ToolCategory.MAILBOX,
      version: '1.0.0',
      requiresAuth: true,
      rateLimited: true
    })
    .build();

  // Create User Tool
  const createUserTool = toolBuilder
    .withName('create_user')
    .withDescription('Create a new user with specified domain, quota, and password')
    .withInputSchema({
      type: 'object',
      properties: {
        local_part: { type: 'string', description: 'Local part of the email address' },
        domain: { type: 'string', description: 'Domain for the user' },
        quota: { type: 'number', description: 'Mailbox quota in MB' },
        password: { type: 'string', description: 'User password' },
        name: { type: 'string', description: 'Display name for the user' },
        active: { type: 'boolean', description: 'Whether the user is active (defaults to true)' }
      },
      required: ['local_part', 'domain', 'quota', 'password'],
      additionalProperties: false
    })
    .withHandler(async (input: ToolInput, _context: ToolContext): Promise<ToolHandlerResult> => {
      try {
        const userData: CreateUserRequest = {
          local_part: input.local_part as string,
          domain: input.domain as string,
          quota: input.quota as number,
          password: input.password as string,
          name: input.name as string,
          active: input.active as boolean ?? true
        };

        const user = await usersAPI.createUser(userData);
        
        return {
          success: true,
          result: {
            content: [{
              type: 'text',
              text: JSON.stringify({
                message: `User '${user.username}' created successfully`,
                user
              }, null, 2)
            }]
          }
        };
      } catch (error) {
        return {
          success: false,
          error: {
            code: 500,
            message: error instanceof Error ? error.message : 'Failed to create user'
          }
        };
      }
    })
    .withMetadata({
      category: ToolCategory.MAILBOX,
      version: '1.0.0',
      requiresAuth: true,
      rateLimited: true
    })
    .build();

  // Update User Tool
  const updateUserTool = toolBuilder
    .withName('update_user')
    .withDescription('Update an existing user\'s properties')
    .withInputSchema({
      type: 'object',
      properties: {
        username: { type: 'string', description: 'Username to update' },
        quota: { type: 'number', description: 'New mailbox quota in MB' },
        password: { type: 'string', description: 'New password' },
        name: { type: 'string', description: 'New display name' },
        active: { type: 'boolean', description: 'Whether the user is active' }
      },
      required: ['username'],
      additionalProperties: false
    })
    .withHandler(async (input: ToolInput, _context: ToolContext): Promise<ToolHandlerResult> => {
      try {
        const username = input.username as string;
        const updateData: UpdateUserRequest = {};
        
        if (input.quota !== undefined) updateData.quota = input.quota as number;
        if (input.password !== undefined) updateData.password = input.password as string;
        if (input.name !== undefined) updateData.name = input.name as string;
        if (input.active !== undefined) updateData.active = input.active as boolean;

        const user = await usersAPI.updateUser(username, updateData);
        
        return {
          success: true,
          result: {
            content: [{
              type: 'text',
              text: JSON.stringify({
                message: `User '${username}' updated successfully`,
                user
              }, null, 2)
            }]
          }
        };
      } catch (error) {
        return {
          success: false,
          error: {
            code: 500,
            message: error instanceof Error ? error.message : 'Failed to update user'
          }
        };
      }
    })
    .withMetadata({
      category: ToolCategory.MAILBOX,
      version: '1.0.0',
      requiresAuth: true,
      rateLimited: true
    })
    .build();

  // Delete User Tool
  const deleteUserTool = toolBuilder
    .withName('delete_user')
    .withDescription('Delete a user by username')
    .withInputSchema({
      type: 'object',
      properties: {
        username: { type: 'string', description: 'Username to delete' }
      },
      required: ['username'],
      additionalProperties: false
    })
    .withHandler(async (input: ToolInput, _context: ToolContext): Promise<ToolHandlerResult> => {
      try {
        const username = input.username as string;
        const success = await usersAPI.deleteUser(username);
        
        if (!success) {
          return {
            success: false,
            error: {
              code: 500,
              message: `Failed to delete user '${username}'`
            }
          };
        }
        
        return {
          success: true,
          result: {
            content: [{
              type: 'text',
              text: JSON.stringify({
                message: `User '${username}' deleted successfully`
              }, null, 2)
            }]
          }
        };
      } catch (error) {
        return {
          success: false,
          error: {
            code: 500,
            message: error instanceof Error ? error.message : 'Failed to delete user'
          }
        };
      }
    })
    .withMetadata({
      category: ToolCategory.MAILBOX,
      version: '1.0.0',
      requiresAuth: true,
      rateLimited: true
    })
    .build();

  // Activate User Tool
  const activateUserTool = toolBuilder
    .withName('activate_user')
    .withDescription('Activate a user account')
    .withInputSchema({
      type: 'object',
      properties: {
        username: { type: 'string', description: 'Username to activate' }
      },
      required: ['username'],
      additionalProperties: false
    })
    .withHandler(async (input: ToolInput, _context: ToolContext): Promise<ToolHandlerResult> => {
      try {
        const username = input.username as string;
        const user = await usersAPI.activateUser(username);
        
        return {
          success: true,
          result: {
            content: [{
              type: 'text',
              text: JSON.stringify({
                message: `User '${username}' activated successfully`,
                user
              }, null, 2)
            }]
          }
        };
      } catch (error) {
        return {
          success: false,
          error: {
            code: 500,
            message: error instanceof Error ? error.message : 'Failed to activate user'
          }
        };
      }
    })
    .withMetadata({
      category: ToolCategory.MAILBOX,
      version: '1.0.0',
      requiresAuth: true,
      rateLimited: true
    })
    .build();

  // Deactivate User Tool
  const deactivateUserTool = toolBuilder
    .withName('deactivate_user')
    .withDescription('Deactivate a user account')
    .withInputSchema({
      type: 'object',
      properties: {
        username: { type: 'string', description: 'Username to deactivate' }
      },
      required: ['username'],
      additionalProperties: false
    })
    .withHandler(async (input: ToolInput, _context: ToolContext): Promise<ToolHandlerResult> => {
      try {
        const username = input.username as string;
        const user = await usersAPI.deactivateUser(username);
        
        return {
          success: true,
          result: {
            content: [{
              type: 'text',
              text: JSON.stringify({
                message: `User '${username}' deactivated successfully`,
                user
              }, null, 2)
            }]
          }
        };
      } catch (error) {
        return {
          success: false,
          error: {
            code: 500,
            message: error instanceof Error ? error.message : 'Failed to deactivate user'
          }
        };
      }
    })
    .withMetadata({
      category: ToolCategory.MAILBOX,
      version: '1.0.0',
      requiresAuth: true,
      rateLimited: true
    })
    .build();

  // Get Users by Domain Tool
  const getUsersByDomainTool = toolBuilder
    .withName('get_users_by_domain')
    .withDescription('Get all users for a specific domain')
    .withInputSchema({
      type: 'object',
      properties: {
        domain: { type: 'string', description: 'Domain to get users for' }
      },
      required: ['domain'],
      additionalProperties: false
    })
    .withHandler(async (input: ToolInput, _context: ToolContext): Promise<ToolHandlerResult> => {
      try {
        const domain = input.domain as string;
        const users = await usersAPI.getUsersByDomain(domain);
        
        return {
          success: true,
          result: {
            content: [{
              type: 'text',
              text: JSON.stringify({
                users,
                domain,
                total: users.length
              }, null, 2)
            }]
          }
        };
      } catch (error) {
        return {
          success: false,
          error: {
            code: 500,
            message: error instanceof Error ? error.message : 'Failed to get users by domain'
          }
        };
      }
    })
    .withMetadata({
      category: ToolCategory.MAILBOX,
      version: '1.0.0',
      requiresAuth: true,
      rateLimited: true
    })
    .build();

  return [
    listUsersTool,
    getUserTool,
    createUserTool,
    updateUserTool,
    deleteUserTool,
    activateUserTool,
    deactivateUserTool,
    getUsersByDomainTool
  ];
} 