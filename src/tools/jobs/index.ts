/**
 * Sync Job Management Tools
 * MCP tools for managing Mailcow sync jobs for email migration and synchronization
 */

import { BaseTool, ToolUtils } from '../base';
import { JobsAPI } from '../../api/syncjobs';
import {
  ToolInput,
  ToolContext,
  ToolHandlerResult,
  CreateSyncJobRequest,
  UpdateSyncJobRequest,
  ToolCategory,
  MCPErrorCode,
} from '../../types';
import { Logger } from '../../utils';

/**
 * List all sync jobs
 */
export class ListSyncJobsTool extends BaseTool {
  readonly name = 'list_sync_jobs';
  readonly description = 'List all sync jobs in the Mailcow server with optional filtering';
  readonly inputSchema = {
    type: 'object' as const,
    properties: {
      username: {
        type: 'string' as const,
        description: 'Filter by mailbox username',
        pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$',
      },
      host: {
        type: 'string' as const,
        description: 'Filter by remote host',
        pattern: '^[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$',
      },
      active_only: {
        type: 'boolean' as const,
        description: 'Only return active sync jobs',
      },
      encryption: {
        type: 'string' as const,
        description: 'Filter by encryption type',
        enum: ['tls', 'ssl', 'plain'],
      },
      limit: {
        type: 'number' as const,
        description: 'Maximum number of sync jobs to return',
        minimum: 1,
        maximum: 1000,
      },
      offset: {
        type: 'number' as const,
        description: 'Number of sync jobs to skip for pagination',
        minimum: 0,
      },
    },
    additionalProperties: false,
  };

  constructor(logger: Logger, private jobsAPI: JobsAPI) {
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
      if (!this.validatePermissions(context, ['syncjobs:read', 'mailboxes:read', 'read'])) {
        return {
          success: false,
          error: {
            code: MCPErrorCode.AUTHORIZATION_ERROR,
            message: 'Permission denied: requires syncjobs:read permission',
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
        username,
        host,
        active_only = false,
        encryption,
        limit = 100,
        offset = 0,
      } = input;

      // Build API parameters
      const params: any = {};
      if (typeof username === 'string') params.username = username;
      if (typeof host === 'string') params.host = host;
      if (typeof encryption === 'string') params.encryption = encryption;
      if (typeof limit === 'number' && limit > 0) params.limit = limit;
      if (typeof offset === 'number' && offset >= 0) params.offset = offset;

      // Fetch sync jobs from API
      const syncJobs = await this.jobsAPI.listSyncJobs(params);

      // Apply client-side filtering if needed
      let filteredJobs = syncJobs;
      if (active_only) {
        filteredJobs = filteredJobs.filter(job => job.active);
      }

      // Calculate statistics
      const encryptionCounts = {
        tls: filteredJobs.filter(job => job.encryption === 'tls').length,
        ssl: filteredJobs.filter(job => job.encryption === 'ssl').length,
        plain: filteredJobs.filter(job => job.encryption === 'plain').length,
      };

      // Format results
      const summary = {
        total_jobs: syncJobs.length,
        filtered_jobs: filteredJobs.length,
        active_jobs: syncJobs.filter(j => j.active).length,
        inactive_jobs: syncJobs.filter(j => !j.active).length,
        encryption_breakdown: encryptionCounts,
        filters_applied: params,
        sync_jobs: filteredJobs.map(job => ({
          id: job.id,
          username: job.username,
          host: job.host,
          port: job.port,
          user: job.user,
          encryption: job.encryption,
          active: job.active,
          status: job.active ? 'Active' : 'Inactive',
          max_age_days: job.maxage,
          max_bytes_per_second: job.maxbytespersecond,
          timeout_seconds: job.timeout,
          created: job.created,
          modified: job.modified,
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
 * Get detailed information about a specific sync job
 */
export class GetSyncJobTool extends BaseTool {
  readonly name = 'get_sync_job';
  readonly description = 'Get detailed information about a specific sync job';
  readonly inputSchema = {
    type: 'object' as const,
    properties: {
      job_id: {
        type: 'number' as const,
        description: 'ID of the sync job to retrieve',
        minimum: 1,
      },
    },
    required: ['job_id'],
    additionalProperties: false,
  };

  constructor(logger: Logger, private jobsAPI: JobsAPI) {
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
      if (!this.validatePermissions(context, ['syncjobs:read', 'mailboxes:read', 'read'])) {
        return {
          success: false,
          error: {
            code: MCPErrorCode.AUTHORIZATION_ERROR,
            message: 'Permission denied: requires syncjobs:read permission',
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

      const { job_id } = input;

      if (typeof job_id !== 'number') {
        return {
          success: false,
          error: {
            code: MCPErrorCode.INVALID_PARAMS,
            message: 'Job ID must be a number',
          },
        };
      }

      // Fetch sync job details
      const syncJob = await this.jobsAPI.getSyncJobDetails(job_id);

      if (!syncJob) {
        return {
          success: false,
          error: {
            code: MCPErrorCode.RESOURCE_NOT_FOUND,
            message: `Sync job '${job_id}' not found`,
          },
        };
      }

      const formattedJob = {
        id: syncJob.id,
        username: syncJob.username,
        connection: {
          host: syncJob.host,
          port: syncJob.port,
          user: syncJob.user,
          encryption: syncJob.encryption,
        },
        settings: {
          max_age_days: syncJob.maxage,
          max_bytes_per_second: syncJob.maxbytespersecond,
          timeout_seconds: syncJob.timeout,
        },
        status: {
          active: syncJob.active,
          status: syncJob.active ? 'Active' : 'Inactive',
        },
        timestamps: {
          created: syncJob.created,
          last_modified: syncJob.modified,
        },
        security: {
          connection_secure: syncJob.encryption !== 'plain',
          encryption_type: syncJob.encryption,
        },
        sync_job_id: syncJob.id,
      };

      return {
        success: true,
        result: ToolUtils.createJsonResult(formattedJob),
      };
    } catch (error) {
      return this.handleError(error as Error, context);
    }
  }
}

/**
 * Create a new sync job
 */
export class CreateSyncJobTool extends BaseTool {
  readonly name = 'create_sync_job';
  readonly description = 'Create a new sync job for email migration or synchronization';
  readonly inputSchema = {
    type: 'object' as const,
    properties: {
      username: {
        type: 'string' as const,
        description: 'Target mailbox username (email address)',
        pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$',
      },
      host: {
        type: 'string' as const,
        description: 'Remote IMAP host to sync from',
        pattern: '^[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$',
      },
      port: {
        type: 'number' as const,
        description: 'Remote IMAP port',
        minimum: 1,
        maximum: 65535,
      },
      user: {
        type: 'string' as const,
        description: 'Remote IMAP username',
        minLength: 1,
        maxLength: 255,
      },
      password: {
        type: 'string' as const,
        description: 'Remote IMAP password',
        minLength: 1,
        maxLength: 255,
      },
      encryption: {
        type: 'string' as const,
        description: 'Connection encryption type',
        enum: ['tls', 'ssl', 'plain'],
      },
      maxage: {
        type: 'number' as const,
        description: 'Maximum age of messages to sync (in days, 0 = all)',
        minimum: 0,
        maximum: 3650,
      },
      maxbytespersecond: {
        type: 'number' as const,
        description: 'Maximum transfer rate (bytes per second, 0 = unlimited)',
        minimum: 0,
        maximum: 1000000000,
      },
      timeout: {
        type: 'number' as const,
        description: 'Connection timeout in seconds',
        minimum: 10,
        maximum: 3600,
      },
      active: {
        type: 'boolean' as const,
        description: 'Whether the sync job should be active',
      },
    },
    required: ['username', 'host', 'port', 'user', 'password', 'encryption'],
    additionalProperties: false,
  };

  constructor(logger: Logger, private jobsAPI: JobsAPI) {
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
      if (!this.validatePermissions(context, ['syncjobs:write', 'mailboxes:write', 'write'])) {
        return {
          success: false,
          error: {
            code: MCPErrorCode.AUTHORIZATION_ERROR,
            message: 'Permission denied: requires syncjobs:write permission',
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
        username,
        host,
        port,
        user,
        password,
        encryption,
        maxage = 0,
        maxbytespersecond = 0,
        timeout = 120,
        active = true
      } = input;

      // Validate required string/number fields
      if (typeof username !== 'string' || typeof host !== 'string' ||
          typeof user !== 'string' || typeof password !== 'string' ||
          typeof port !== 'number' || typeof encryption !== 'string') {
        return {
          success: false,
          error: {
            code: MCPErrorCode.INVALID_PARAMS,
            message: 'Username, host, user, and password must be strings; port must be a number',
          },
        };
      }

      // Create sync job request
      const jobRequest: CreateSyncJobRequest = {
        username,
        host,
        port,
        user,
        password,
        encryption: encryption as 'tls' | 'ssl' | 'plain',
        maxage: typeof maxage === 'number' ? maxage : 0,
        maxbytespersecond: typeof maxbytespersecond === 'number' ? maxbytespersecond : 0,
        timeout: typeof timeout === 'number' ? timeout : 120,
        active: typeof active === 'boolean' ? active : true,
      };

      // Create sync job
      const createdJob = await this.jobsAPI.createSyncJob(jobRequest);

      const result = {
        message: `Sync job for '${createdJob.username}' created successfully`,
        sync_job: {
          id: createdJob.id,
          username: createdJob.username,
          host: createdJob.host,
          port: createdJob.port,
          user: createdJob.user,
          encryption: createdJob.encryption,
          active: createdJob.active,
          status: createdJob.active ? 'Active' : 'Inactive',
          max_age_days: createdJob.maxage,
          max_bytes_per_second: createdJob.maxbytespersecond,
          timeout_seconds: createdJob.timeout,
          created: createdJob.created,
        },
        security_note: encryption === 'plain' ? 
          'WARNING: Using plain text connection - consider using TLS or SSL for security' :
          `Secure connection using ${encryption.toUpperCase()}`,
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
 * Update an existing sync job
 */
export class UpdateSyncJobTool extends BaseTool {
  readonly name = 'update_sync_job';
  readonly description = 'Update settings for an existing sync job';
  readonly inputSchema = {
    type: 'object' as const,
    properties: {
      job_id: {
        type: 'number' as const,
        description: 'ID of the sync job to update',
        minimum: 1,
      },
      host: {
        type: 'string' as const,
        description: 'Updated remote IMAP host',
        pattern: '^[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$',
      },
      port: {
        type: 'number' as const,
        description: 'Updated remote IMAP port',
        minimum: 1,
        maximum: 65535,
      },
      user: {
        type: 'string' as const,
        description: 'Updated remote IMAP username',
        minLength: 1,
        maxLength: 255,
      },
      password: {
        type: 'string' as const,
        description: 'Updated remote IMAP password',
        minLength: 1,
        maxLength: 255,
      },
      encryption: {
        type: 'string' as const,
        description: 'Updated connection encryption type',
        enum: ['tls', 'ssl', 'plain'],
      },
      maxage: {
        type: 'number' as const,
        description: 'Updated maximum age of messages to sync (in days)',
        minimum: 0,
        maximum: 3650,
      },
      maxbytespersecond: {
        type: 'number' as const,
        description: 'Updated maximum transfer rate (bytes per second)',
        minimum: 0,
        maximum: 1000000000,
      },
      timeout: {
        type: 'number' as const,
        description: 'Updated connection timeout in seconds',
        minimum: 10,
        maximum: 3600,
      },
      active: {
        type: 'boolean' as const,
        description: 'Whether the sync job should be active',
      },
    },
    required: ['job_id'],
    additionalProperties: false,
  };

  constructor(logger: Logger, private jobsAPI: JobsAPI) {
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
      if (!this.validatePermissions(context, ['syncjobs:write', 'mailboxes:write', 'write'])) {
        return {
          success: false,
          error: {
            code: MCPErrorCode.AUTHORIZATION_ERROR,
            message: 'Permission denied: requires syncjobs:write permission',
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

      const { job_id, host, port, user, password, encryption, maxage, maxbytespersecond, timeout, active } = input;

      if (typeof job_id !== 'number') {
        return {
          success: false,
          error: {
            code: MCPErrorCode.INVALID_PARAMS,
            message: 'Job ID must be a number',
          },
        };
      }

      // Check if sync job exists
      const existingJob = await this.jobsAPI.getSyncJobDetails(job_id);
      if (!existingJob) {
        return {
          success: false,
          error: {
            code: MCPErrorCode.RESOURCE_NOT_FOUND,
            message: `Sync job '${job_id}' not found`,
          },
        };
      }

      // Build update request (only include provided fields)
      const updateRequest: UpdateSyncJobRequest = {};
      if (host !== undefined && typeof host === 'string') updateRequest.host = host;
      if (port !== undefined && typeof port === 'number') updateRequest.port = port;
      if (user !== undefined && typeof user === 'string') updateRequest.user = user;
      if (password !== undefined && typeof password === 'string') updateRequest.password = password;
      if (encryption !== undefined && typeof encryption === 'string') updateRequest.encryption = encryption as 'tls' | 'ssl' | 'plain';
      if (maxage !== undefined && typeof maxage === 'number') updateRequest.maxage = maxage;
      if (maxbytespersecond !== undefined && typeof maxbytespersecond === 'number') updateRequest.maxbytespersecond = maxbytespersecond;
      if (timeout !== undefined && typeof timeout === 'number') updateRequest.timeout = timeout;
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

      // Update sync job
      const updatedJob = await this.jobsAPI.updateSyncJob(job_id, updateRequest);

      const result = {
        message: `Sync job '${job_id}' for '${updatedJob.username}' updated successfully`,
        sync_job: {
          id: updatedJob.id,
          username: updatedJob.username,
          host: updatedJob.host,
          port: updatedJob.port,
          user: updatedJob.user,
          encryption: updatedJob.encryption,
          active: updatedJob.active,
          status: updatedJob.active ? 'Active' : 'Inactive',
          max_age_days: updatedJob.maxage,
          max_bytes_per_second: updatedJob.maxbytespersecond,
          timeout_seconds: updatedJob.timeout,
          last_modified: updatedJob.modified,
        },
        updated_fields: Object.keys(updateRequest),
        security_note: updateRequest.encryption === 'plain' ? 
          'WARNING: Using plain text connection - consider using TLS or SSL for security' :
          updateRequest.encryption ? `Secure connection using ${updateRequest.encryption.toUpperCase()}` : undefined,
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
 * Delete a sync job
 */
export class DeleteSyncJobTool extends BaseTool {
  readonly name = 'delete_sync_job';
  readonly description = 'Delete a sync job from the Mailcow server (WARNING: This will stop email synchronization!)';
  readonly inputSchema = {
    type: 'object' as const,
    properties: {
      job_id: {
        type: 'number' as const,
        description: 'ID of the sync job to delete',
        minimum: 1,
      },
      confirm: {
        type: 'boolean' as const,
        description: 'Confirmation that you want to delete the sync job',
      },
    },
    required: ['job_id', 'confirm'],
    additionalProperties: false,
  };

  constructor(logger: Logger, private jobsAPI: JobsAPI) {
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
      if (!this.validatePermissions(context, ['syncjobs:delete', 'mailboxes:write', 'write'])) {
        return {
          success: false,
          error: {
            code: MCPErrorCode.AUTHORIZATION_ERROR,
            message: 'Permission denied: requires syncjobs:delete permission',
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

      const { job_id, confirm } = input;

      if (typeof job_id !== 'number' || typeof confirm !== 'boolean') {
        return {
          success: false,
          error: {
            code: MCPErrorCode.INVALID_PARAMS,
            message: 'Job ID must be a number and confirm must be a boolean',
          },
        };
      }

      // Check confirmation
      if (!confirm) {
        return {
          success: false,
          error: {
            code: MCPErrorCode.INVALID_PARAMS,
            message: 'Sync job deletion requires explicit confirmation (confirm: true)',
          },
        };
      }

      // Check if sync job exists and get details first
      const jobDetails = await this.jobsAPI.getSyncJobDetails(job_id);
      if (!jobDetails) {
        return {
          success: false,
          error: {
            code: MCPErrorCode.RESOURCE_NOT_FOUND,
            message: `Sync job '${job_id}' not found`,
          },
        };
      }

      // Delete sync job
      await this.jobsAPI.deleteSyncJob(job_id);

      const result = {
        message: `Sync job '${job_id}' for '${jobDetails.username}' deleted successfully`,
        deleted_job: {
          id: jobDetails.id,
          username: jobDetails.username,
          host: jobDetails.host,
          port: jobDetails.port,
          user: jobDetails.user,
          encryption: jobDetails.encryption,
          was_active: jobDetails.active,
          deleted_at: new Date().toISOString(),
        },
        warning: 'Email synchronization for this mailbox has been permanently stopped',
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
 * Activate a sync job
 */
export class ActivateSyncJobTool extends BaseTool {
  readonly name = 'activate_sync_job';
  readonly description = 'Activate a sync job to start email synchronization';
  readonly inputSchema = {
    type: 'object' as const,
    properties: {
      job_id: {
        type: 'number' as const,
        description: 'ID of the sync job to activate',
        minimum: 1,
      },
    },
    required: ['job_id'],
    additionalProperties: false,
  };

  constructor(logger: Logger, private jobsAPI: JobsAPI) {
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
      if (!this.validatePermissions(context, ['syncjobs:write', 'mailboxes:write', 'write'])) {
        return {
          success: false,
          error: {
            code: MCPErrorCode.AUTHORIZATION_ERROR,
            message: 'Permission denied: requires syncjobs:write permission',
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

      const { job_id } = input;

      if (typeof job_id !== 'number') {
        return {
          success: false,
          error: {
            code: MCPErrorCode.INVALID_PARAMS,
            message: 'Job ID must be a number',
          },
        };
      }

      // Activate sync job
      const activatedJob = await this.jobsAPI.activateSyncJob(job_id);

      const result = {
        message: `Sync job '${job_id}' for '${activatedJob.username}' activated successfully`,
        sync_job: {
          id: activatedJob.id,
          username: activatedJob.username,
          host: activatedJob.host,
          active: activatedJob.active,
          status: 'Active',
          activated_at: new Date().toISOString(),
        },
        note: 'Email synchronization will begin according to the configured schedule',
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
 * Deactivate a sync job
 */
export class DeactivateSyncJobTool extends BaseTool {
  readonly name = 'deactivate_sync_job';
  readonly description = 'Deactivate a sync job to stop email synchronization';
  readonly inputSchema = {
    type: 'object' as const,
    properties: {
      job_id: {
        type: 'number' as const,
        description: 'ID of the sync job to deactivate',
        minimum: 1,
      },
    },
    required: ['job_id'],
    additionalProperties: false,
  };

  constructor(logger: Logger, private jobsAPI: JobsAPI) {
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
      if (!this.validatePermissions(context, ['syncjobs:write', 'mailboxes:write', 'write'])) {
        return {
          success: false,
          error: {
            code: MCPErrorCode.AUTHORIZATION_ERROR,
            message: 'Permission denied: requires syncjobs:write permission',
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

      const { job_id } = input;

      if (typeof job_id !== 'number') {
        return {
          success: false,
          error: {
            code: MCPErrorCode.INVALID_PARAMS,
            message: 'Job ID must be a number',
          },
        };
      }

      // Deactivate sync job
      const deactivatedJob = await this.jobsAPI.deactivateSyncJob(job_id);

      const result = {
        message: `Sync job '${job_id}' for '${deactivatedJob.username}' deactivated successfully`,
        sync_job: {
          id: deactivatedJob.id,
          username: deactivatedJob.username,
          host: deactivatedJob.host,
          active: deactivatedJob.active,
          status: 'Inactive',
          deactivated_at: new Date().toISOString(),
        },
        note: 'Email synchronization has been stopped and will not resume until reactivated',
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

// Export all sync job tools
export const SyncJobTools = {
  ListSyncJobsTool,
  GetSyncJobTool,
  CreateSyncJobTool,
  UpdateSyncJobTool,
  DeleteSyncJobTool,
  ActivateSyncJobTool,
  DeactivateSyncJobTool,
};