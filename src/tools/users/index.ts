/**
 * User Management Tools
 * MCP tools for managing Mailcow users
 */

import { BaseTool, ToolUtils } from '../base';
import { UsersAPI } from '../../api/users';
import {
  ToolInput,
  ToolContext,
  ToolHandlerResult,
  CreateUserRequest,
  UpdateUserRequest,
  ToolCategory,
  MCPErrorCode,
} from '../../types';
import { Logger } from '../../utils';

/**
 * List all users
 */
export class ListUsersTool extends BaseTool {
  readonly name = 'list_users';
  readonly description = 'List all users in the Mailcow server with optional filtering';
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
        description: 'Only return active users',
      },
      username: {
        type: 'string' as const,
        description: 'Filter by username (partial match)',
        pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\\\.[a-zA-Z]{2,}$',
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
        description: 'Maximum number of users to return',
        minimum: 1,
        maximum: 1000,
      },
      offset: {
        type: 'number' as const,
        description: 'Number of users to skip for pagination',
        minimum: 0,
      },
    },
    additionalProperties: false,
  };

  constructor(logger: Logger, private usersAPI: UsersAPI) {
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
      if (!this.validatePermissions(context, ['users:read', 'mailboxes:read', 'read'])) {
        return {
          success: false,
          error: {
            code: MCPErrorCode.AUTHORIZATION_ERROR,
            message: 'Permission denied: requires users:read permission',
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
        username,
        created_after,
        created_before,
        limit = 100,
        offset = 0,
      } = input;

      // Build API parameters
      const params: any = {};
      if (typeof domain === 'string') params.domain = domain;
      if (active_only) params.active = true;
      if (typeof username === 'string') params.username = username;
      if (typeof created_after === 'string') params.created_after = new Date(created_after);
      if (typeof created_before === 'string') params.created_before = new Date(created_before);
      if (typeof limit === 'number' && limit > 0) params.limit = limit;
      if (typeof offset === 'number' && offset >= 0) params.offset = offset;

      // Fetch users from API
      const users = await this.usersAPI.listUsers(params);

      // Apply client-side filtering and pagination if needed
      let filteredUsers = users;
      
      if (active_only && !params.active) {
        filteredUsers = filteredUsers.filter(user => user.active);
      }

      if (typeof limit === 'number' && limit > 0) {
        const startIndex = typeof offset === 'number' ? offset : 0;
        filteredUsers = filteredUsers.slice(startIndex, startIndex + limit);
      }

      // Format results
      const summary = {
        total_users: users.length,
        filtered_users: filteredUsers.length,
        active_users: users.filter(u => u.active).length,
        inactive_users: users.filter(u => !u.active).length,
        filters_applied: params,
        users: filteredUsers.map(user => ({
          username: user.username,
          domain: user.domain,
          local_part: user.local_part,
          name: user.name || 'No name set',
          active: user.active,
          quota: user.quota,
          quota_used: user.quota_used,
          quota_percent: user.quota > 0 ? Math.round((user.quota_used / user.quota) * 100) : 0,
          created: user.created,
          modified: user.modified,
          attributes: user.attributes || {},
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
 * Get detailed information about a specific user
 */
export class GetUserTool extends BaseTool {
  readonly name = 'get_user';
  readonly description = 'Get detailed information about a specific user';
  readonly inputSchema = {
    type: 'object' as const,
    properties: {
      username: {
        type: 'string' as const,
        description: 'Full username (email address) of the user to retrieve',
        pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\\\.[a-zA-Z]{2,}$',
      },
    },
    required: ['username'],
    additionalProperties: false,
  };

  constructor(logger: Logger, private usersAPI: UsersAPI) {
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
      if (!this.validatePermissions(context, ['users:read', 'mailboxes:read', 'read'])) {
        return {
          success: false,
          error: {
            code: MCPErrorCode.AUTHORIZATION_ERROR,
            message: 'Permission denied: requires users:read permission',
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

      // Fetch user details
      const userDetails = await this.usersAPI.getUser(username);

      if (!userDetails) {
        return {
          success: false,
          error: {
            code: MCPErrorCode.RESOURCE_NOT_FOUND,
            message: `User '${username}' not found`,
          },
        };
      }

      const formattedUser = {
        username: userDetails.username,
        domain: userDetails.domain,
        local_part: userDetails.local_part,
        name: userDetails.name || 'No name set',
        active: userDetails.active,
        status: userDetails.active ? 'Active' : 'Inactive',
        quota_details: {
          quota: userDetails.quota,
          quota_used: userDetails.quota_used,
          quota_available: Math.max(0, userDetails.quota - userDetails.quota_used),
          usage_percent: userDetails.quota > 0 
            ? Math.round((userDetails.quota_used / userDetails.quota) * 100) 
            : 0,
          quota_status: userDetails.quota > 0 && userDetails.quota_used >= userDetails.quota 
            ? 'Full' 
            : userDetails.quota > 0 && (userDetails.quota_used / userDetails.quota) > 0.9 
            ? 'Nearly Full' 
            : 'Available',
        },
        timestamps: {
          created: userDetails.created,
          last_modified: userDetails.modified,
        },
        attributes: userDetails.attributes || {},
        user_id: userDetails.id,
      };

      return {
        success: true,
        result: ToolUtils.createJsonResult(formattedUser),
      };
    } catch (error) {
      return this.handleError(error as Error, context);
    }
  }
}

/**
 * Create a new user
 */
export class CreateUserTool extends BaseTool {
  readonly name = 'create_user';
  readonly description = 'Create a new user in the Mailcow server';
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
        description: 'Domain for the user',
        pattern: '^[a-zA-Z0-9][a-zA-Z0-9\\\\\\\\-]{0,61}[a-zA-Z0-9](?:\\\\\\\\.[a-zA-Z0-9][a-zA-Z0-9\\\\\\\\-]{0,61}[a-zA-Z0-9])*$',
      },
      password: {
        type: 'string' as const,
        description: 'Password for the user',
        minLength: 8,
        maxLength: 128,
      },
      quota: {
        type: 'number' as const,
        description: 'User quota in MB',
        minimum: 0,
        maximum: 100000,
      },
      name: {
        type: 'string' as const,
        description: 'Full name for the user',
        maxLength: 255,
      },
      active: {
        type: 'boolean' as const,
        description: 'Whether the user should be active',
      },
    },
    required: ['local_part', 'domain', 'password', 'quota'],
    additionalProperties: false,
  };

  constructor(logger: Logger, private usersAPI: UsersAPI) {
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
      if (!this.validatePermissions(context, ['users:write', 'mailboxes:write', 'write'])) {
        return {
          success: false,
          error: {
            code: MCPErrorCode.AUTHORIZATION_ERROR,
            message: 'Permission denied: requires users:write permission',
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
        quota,
        name,
        active = true
      } = input;

      // Validate required string/number fields
      if (typeof local_part !== 'string' || typeof domain !== 'string' || 
          typeof password !== 'string' || typeof quota !== 'number') {
        return {
          success: false,
          error: {
            code: MCPErrorCode.INVALID_PARAMS,
            message: 'local_part, domain, and password must be strings, quota must be a number',
          },
        };
      }

      // Create user request
      const userRequest: CreateUserRequest = {
        local_part,
        domain,
        password,
        quota,
        name: typeof name === 'string' ? name : undefined,
        active: typeof active === 'boolean' ? active : true,
      };

      // Create user
      const createdUser = await this.usersAPI.createUser(userRequest);

      const result = {
        message: `User '${createdUser.username}' created successfully`,
        user: {
          username: createdUser.username,
          domain: createdUser.domain,
          local_part: createdUser.local_part,
          name: createdUser.name || 'No name set',
          active: createdUser.active,
          quota: createdUser.quota,
          quota_used: createdUser.quota_used,
          created: createdUser.created,
          user_id: createdUser.id,
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
 * Update an existing user
 */
export class UpdateUserTool extends BaseTool {
  readonly name = 'update_user';
  readonly description = 'Update settings for an existing user';
  readonly inputSchema = {
    type: 'object' as const,
    properties: {
      username: {
        type: 'string' as const,
        description: 'Full username (email address) of the user to update',
        pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\\\.[a-zA-Z]{2,}$',
      },
      quota: {
        type: 'number' as const,
        description: 'Updated user quota in MB',
        minimum: 0,
        maximum: 100000,
      },
      password: {
        type: 'string' as const,
        description: 'Updated password for the user',
        minLength: 8,
        maxLength: 128,
      },
      name: {
        type: 'string' as const,
        description: 'Updated full name for the user',
        maxLength: 255,
      },
      active: {
        type: 'boolean' as const,
        description: 'Whether the user should be active',
      },
    },
    required: ['username'],
    additionalProperties: false,
  };

  constructor(logger: Logger, private usersAPI: UsersAPI) {
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
      if (!this.validatePermissions(context, ['users:write', 'mailboxes:write', 'write'])) {
        return {
          success: false,
          error: {
            code: MCPErrorCode.AUTHORIZATION_ERROR,
            message: 'Permission denied: requires users:write permission',
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

      // Check if user exists
      const existingUser = await this.usersAPI.getUser(username);
      if (!existingUser) {
        return {
          success: false,
          error: {
            code: MCPErrorCode.RESOURCE_NOT_FOUND,
            message: `User '${username}' not found`,
          },
        };
      }

      // Build update request (only include provided fields)
      const updateRequest: UpdateUserRequest = {};
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

      // Update user
      const updatedUser = await this.usersAPI.updateUser(username, updateRequest);

      const result = {
        message: `User '${updatedUser.username}' updated successfully`,
        user: {
          username: updatedUser.username,
          domain: updatedUser.domain,
          local_part: updatedUser.local_part,
          name: updatedUser.name || 'No name set',
          active: updatedUser.active,
          status: updatedUser.active ? 'Active' : 'Inactive',
          quota: updatedUser.quota,
          quota_used: updatedUser.quota_used,
          last_modified: updatedUser.modified,
          user_id: updatedUser.id,
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
 * Delete a user
 */
export class DeleteUserTool extends BaseTool {
  readonly name = 'delete_user';
  readonly description = 'Delete a user from the Mailcow server (WARNING: This will permanently delete all emails!)';
  readonly inputSchema = {
    type: 'object' as const,
    properties: {
      username: {
        type: 'string' as const,
        description: 'Full username (email address) of the user to delete',
        pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\\\.[a-zA-Z]{2,}$',
      },
      confirm: {
        type: 'boolean' as const,
        description: 'Confirmation that you want to delete the user and ALL associated emails',
      },
    },
    required: ['username', 'confirm'],
    additionalProperties: false,
  };

  constructor(logger: Logger, private usersAPI: UsersAPI) {
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
      if (!this.validatePermissions(context, ['users:delete', 'mailboxes:delete', 'write'])) {
        return {
          success: false,
          error: {
            code: MCPErrorCode.AUTHORIZATION_ERROR,
            message: 'Permission denied: requires users:delete permission',
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
            message: 'User deletion requires explicit confirmation (confirm: true)',
          },
        };
      }

      // Check if user exists and get details first
      const userDetails = await this.usersAPI.getUser(username);
      if (!userDetails) {
        return {
          success: false,
          error: {
            code: MCPErrorCode.RESOURCE_NOT_FOUND,
            message: `User '${username}' not found`,
          },
        };
      }

      // Delete user
      const success = await this.usersAPI.deleteUser(username);

      if (!success) {
        return {
          success: false,
          error: {
            code: MCPErrorCode.INTERNAL_ERROR,
            message: `Failed to delete user '${username}'`,
          },
        };
      }

      const result = {
        message: `User '${username}' deleted successfully`,
        deleted_user: {
          username: userDetails.username,
          domain: userDetails.domain,
          local_part: userDetails.local_part,
          name: userDetails.name || 'No name set',
          was_active: userDetails.active,
          quota: userDetails.quota,
          quota_used: userDetails.quota_used,
          deleted_at: new Date().toISOString(),
          user_id: userDetails.id,
        },
        warning: 'All emails for this user have been permanently deleted and cannot be recovered',
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

// Export all user tools
export const UserTools = {
  ListUsersTool,
  GetUserTool,
  CreateUserTool,
  UpdateUserTool,
  DeleteUserTool,
};