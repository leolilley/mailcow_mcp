/**
 * Queue Management Tools
 * MCP tools for managing Mailcow mail queues
 */

import { BaseTool, ToolUtils } from '../base';
import { QueuesAPI } from '../../api/queues';
import {
  ToolInput,
  ToolContext,
  ToolHandlerResult,
  ToolCategory,
  MCPErrorCode,
} from '../../types';
import { Logger } from '../../utils';

/**
 * List all queue items
 */
export class ListQueueItemsTool extends BaseTool {
  readonly name = 'list_queue_items';
  readonly description = 'List all mail queue items in the Mailcow server with optional filtering';
  readonly inputSchema = {
    type: 'object' as const,
    properties: {
      sender: {
        type: 'string' as const,
        description: 'Filter by sender email address',
        pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$',
      },
      recipient: {
        type: 'string' as const,
        description: 'Filter by recipient email address',
        pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$',
      },
      status: {
        type: 'string' as const,
        description: 'Filter by queue item status',
        enum: ['active', 'deferred', 'hold'],
      },
      start_time: {
        type: 'string' as const,
        description: 'Filter by creation date (after this date)',
        format: 'date-time',
      },
      end_time: {
        type: 'string' as const,
        description: 'Filter by creation date (before this date)', 
        format: 'date-time',
      },
      limit: {
        type: 'number' as const,
        description: 'Maximum number of queue items to return',
        minimum: 1,
        maximum: 1000,
      },
      offset: {
        type: 'number' as const,
        description: 'Number of queue items to skip for pagination',
        minimum: 0,
      },
    },
    additionalProperties: false,
  };

  constructor(logger: Logger, private queuesAPI: QueuesAPI) {
    super(logger, {
      category: ToolCategory.SYSTEM,
      version: '1.0.0',
      requiresAuth: true,
      rateLimited: true,
    });
  }

  async execute(input: ToolInput, context: ToolContext): Promise<ToolHandlerResult> {
    try {
      this.logExecution(input, context, true);

      // Validate permissions
      if (!this.validatePermissions(context, ['queues:read', 'system:read', 'read'])) {
        return {
          success: false,
          error: {
            code: MCPErrorCode.AUTHORIZATION_ERROR,
            message: 'Permission denied: requires queues:read permission',
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
        sender,
        recipient,
        status,
        start_time,
        end_time,
        limit = 100,
        offset = 0,
      } = input;

      // Build API parameters
      const params: any = {};
      if (typeof sender === 'string') params.sender = sender;
      if (typeof recipient === 'string') params.recipient = recipient;
      if (typeof status === 'string') params.status = status as 'active' | 'deferred' | 'hold';
      if (typeof start_time === 'string') params.start_time = new Date(start_time);
      if (typeof end_time === 'string') params.end_time = new Date(end_time);
      if (typeof limit === 'number' && limit > 0) params.limit = limit;
      if (typeof offset === 'number' && offset >= 0) params.offset = offset;

      // Fetch queue items from API
      const queueItems = await this.queuesAPI.listQueueItems(params);

      // Calculate statistics
      const statusCounts = {
        active: queueItems.filter(item => item.status === 'active').length,
        deferred: queueItems.filter(item => item.status === 'deferred').length,
        hold: queueItems.filter(item => item.status === 'hold').length,
      };

      const totalSize = queueItems.reduce((sum, item) => sum + item.size, 0);
      const averageAttempts = queueItems.length > 0 
        ? Math.round(queueItems.reduce((sum, item) => sum + item.attempts, 0) / queueItems.length)
        : 0;

      // Format results
      const summary = {
        total_items: queueItems.length,
        status_breakdown: statusCounts,
        total_size_bytes: totalSize,
        total_size_mb: Math.round(totalSize / (1024 * 1024) * 100) / 100,
        average_attempts: averageAttempts,
        filters_applied: params,
        queue_items: queueItems.map(item => ({
          id: item.id,
          sender: item.sender,
          recipient: item.recipient,
          subject: item.subject,
          size_bytes: item.size,
          size_kb: Math.round(item.size / 1024 * 100) / 100,
          status: item.status,
          attempts: item.attempts,
          queued_at: item.timestamp,
          next_attempt: item.next_attempt,
          error_message: item.error_message,
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
 * Get detailed information about a specific queue item
 */
export class GetQueueItemTool extends BaseTool {
  readonly name = 'get_queue_item';
  readonly description = 'Get detailed information about a specific mail queue item';
  readonly inputSchema = {
    type: 'object' as const,
    properties: {
      item_id: {
        type: 'string' as const,
        description: 'ID of the queue item to retrieve',
        minLength: 1,
      },
    },
    required: ['item_id'],
    additionalProperties: false,
  };

  constructor(logger: Logger, private queuesAPI: QueuesAPI) {
    super(logger, {
      category: ToolCategory.SYSTEM,
      version: '1.0.0',
      requiresAuth: true,
      rateLimited: true,
    });
  }

  async execute(input: ToolInput, context: ToolContext): Promise<ToolHandlerResult> {
    try {
      this.logExecution(input, context, true);

      // Validate permissions
      if (!this.validatePermissions(context, ['queues:read', 'system:read', 'read'])) {
        return {
          success: false,
          error: {
            code: MCPErrorCode.AUTHORIZATION_ERROR,
            message: 'Permission denied: requires queues:read permission',
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

      const { item_id } = input;

      if (typeof item_id !== 'string') {
        return {
          success: false,
          error: {
            code: MCPErrorCode.INVALID_PARAMS,
            message: 'Item ID must be a string',
          },
        };
      }

      // Fetch queue item details
      const queueItem = await this.queuesAPI.getQueueItemDetails(item_id);

      if (!queueItem) {
        return {
          success: false,
          error: {
            code: MCPErrorCode.RESOURCE_NOT_FOUND,
            message: `Queue item '${item_id}' not found`,
          },
        };
      }

      const formattedItem = {
        id: queueItem.id,
        sender: queueItem.sender,
        recipient: queueItem.recipient,
        subject: queueItem.subject,
        size: {
          bytes: queueItem.size,
          kb: Math.round(queueItem.size / 1024 * 100) / 100,
          mb: Math.round(queueItem.size / (1024 * 1024) * 100) / 100,
        },
        status: queueItem.status,
        attempts: queueItem.attempts,
        timestamps: {
          queued_at: queueItem.timestamp,
          next_attempt: queueItem.next_attempt,
        },
        error_message: queueItem.error_message,
        delivery_info: {
          is_deferred: queueItem.status === 'deferred',
          is_on_hold: queueItem.status === 'hold',
          has_failed: queueItem.attempts > 0 && !!queueItem.error_message,
          retry_count: queueItem.attempts,
        },
      };

      return {
        success: true,
        result: ToolUtils.createJsonResult(formattedItem),
      };
    } catch (error) {
      return this.handleError(error as Error, context);
    }
  }
}

/**
 * Flush the entire mail queue
 */
export class FlushQueueTool extends BaseTool {
  readonly name = 'flush_queue';
  readonly description = 'Flush the entire mail queue (attempt delivery of all queued messages)';
  readonly inputSchema = {
    type: 'object' as const,
    properties: {
      confirm: {
        type: 'boolean' as const,
        description: 'Confirmation that you want to flush the entire queue',
      },
    },
    required: ['confirm'],
    additionalProperties: false,
  };

  constructor(logger: Logger, private queuesAPI: QueuesAPI) {
    super(logger, {
      category: ToolCategory.SYSTEM,
      version: '1.0.0',
      requiresAuth: true,
      rateLimited: true,
    });
  }

  async execute(input: ToolInput, context: ToolContext): Promise<ToolHandlerResult> {
    try {
      this.logExecution(input, context, true);

      // Validate permissions
      if (!this.validatePermissions(context, ['queues:write', 'system:write', 'write'])) {
        return {
          success: false,
          error: {
            code: MCPErrorCode.AUTHORIZATION_ERROR,
            message: 'Permission denied: requires queues:write permission',
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

      const { confirm } = input;

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
            message: 'Queue flush requires explicit confirmation (confirm: true)',
          },
        };
      }

      // Get current queue stats before flushing
      const queueItems = await this.queuesAPI.listQueueItems();
      const queueStats = {
        total_items: queueItems.length,
        active_items: queueItems.filter(item => item.status === 'active').length,
        deferred_items: queueItems.filter(item => item.status === 'deferred').length,
        hold_items: queueItems.filter(item => item.status === 'hold').length,
      };

      // Flush queue
      await this.queuesAPI.flushQueue();

      const result = {
        message: 'Mail queue flushed successfully - attempting delivery of all queued messages',
        queue_stats_before_flush: queueStats,
        flushed_at: new Date().toISOString(),
        note: 'Messages will be processed by the mail system. Check queue status again in a few minutes.',
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
 * Delete specific queue items
 */
export class DeleteQueueItemsTool extends BaseTool {
  readonly name = 'delete_queue_items';
  readonly description = 'Delete specific items from the mail queue (WARNING: Messages will be permanently lost!)';
  readonly inputSchema = {
    type: 'object' as const,
    properties: {
      item_ids: {
        type: 'array' as const,
        description: 'Array of queue item IDs to delete',
        items: {
          type: 'string' as const,
          minLength: 1,
        },
        minItems: 1,
        maxItems: 100,
      },
      confirm: {
        type: 'boolean' as const,
        description: 'Confirmation that you want to permanently delete these queue items',
      },
    },
    required: ['item_ids', 'confirm'],
    additionalProperties: false,
  };

  constructor(logger: Logger, private queuesAPI: QueuesAPI) {
    super(logger, {
      category: ToolCategory.SYSTEM,
      version: '1.0.0',
      requiresAuth: true,
      rateLimited: true,
    });
  }

  async execute(input: ToolInput, context: ToolContext): Promise<ToolHandlerResult> {
    try {
      this.logExecution(input, context, true);

      // Validate permissions
      if (!this.validatePermissions(context, ['queues:delete', 'system:write', 'write'])) {
        return {
          success: false,
          error: {
            code: MCPErrorCode.AUTHORIZATION_ERROR,
            message: 'Permission denied: requires queues:delete permission',
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

      const { item_ids, confirm } = input;

      if (!Array.isArray(item_ids) || typeof confirm !== 'boolean') {
        return {
          success: false,
          error: {
            code: MCPErrorCode.INVALID_PARAMS,
            message: 'Item IDs must be an array and confirm must be a boolean',
          },
        };
      }

      // Check confirmation
      if (!confirm) {
        return {
          success: false,
          error: {
            code: MCPErrorCode.INVALID_PARAMS,
            message: 'Queue item deletion requires explicit confirmation (confirm: true)',
          },
        };
      }

      // Get details of items to be deleted for logging
      const itemDetails = [];
      for (const itemId of item_ids) {
        try {
          const item = await this.queuesAPI.getQueueItemDetails(itemId);
          itemDetails.push({
            id: item.id,
            sender: item.sender,
            recipient: item.recipient,
            subject: item.subject,
            status: item.status,
          });
        } catch (error) {
          // Item might not exist - continue with deletion attempt
          itemDetails.push({
            id: itemId,
            status: 'not_found',
          });
        }
      }

      // Delete queue items
      await this.queuesAPI.deleteQueueItems(item_ids);

      const result = {
        message: `Successfully deleted ${item_ids.length} queue items`,
        deleted_items: itemDetails,
        deleted_at: new Date().toISOString(),
        warning: 'These messages have been permanently removed and cannot be recovered',
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
 * Hold specific queue items
 */
export class HoldQueueItemTool extends BaseTool {
  readonly name = 'hold_queue_item';
  readonly description = 'Put a specific queue item on hold (prevent delivery attempts)';
  readonly inputSchema = {
    type: 'object' as const,
    properties: {
      item_id: {
        type: 'string' as const,
        description: 'ID of the queue item to hold',
        minLength: 1,
      },
    },
    required: ['item_id'],
    additionalProperties: false,
  };

  constructor(logger: Logger, private queuesAPI: QueuesAPI) {
    super(logger, {
      category: ToolCategory.SYSTEM,
      version: '1.0.0',
      requiresAuth: true,
      rateLimited: true,
    });
  }

  async execute(input: ToolInput, context: ToolContext): Promise<ToolHandlerResult> {
    try {
      this.logExecution(input, context, true);

      // Validate permissions
      if (!this.validatePermissions(context, ['queues:write', 'system:write', 'write'])) {
        return {
          success: false,
          error: {
            code: MCPErrorCode.AUTHORIZATION_ERROR,
            message: 'Permission denied: requires queues:write permission',
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

      const { item_id } = input;

      if (typeof item_id !== 'string') {
        return {
          success: false,
          error: {
            code: MCPErrorCode.INVALID_PARAMS,
            message: 'Item ID must be a string',
          },
        };
      }

      // Get item details before holding
      const itemDetails = await this.queuesAPI.getQueueItemDetails(item_id);
      
      // Hold queue item
      await this.queuesAPI.holdQueueItem(item_id);

      const result = {
        message: `Queue item '${item_id}' has been put on hold`,
        item_details: {
          id: itemDetails.id,
          sender: itemDetails.sender,
          recipient: itemDetails.recipient,
          subject: itemDetails.subject,
          previous_status: itemDetails.status,
          new_status: 'hold',
        },
        held_at: new Date().toISOString(),
        note: 'This message will not be delivered until released from hold',
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
 * Release specific queue items from hold
 */
export class ReleaseQueueItemTool extends BaseTool {
  readonly name = 'release_queue_item';
  readonly description = 'Release a specific queue item from hold (allow delivery attempts)';
  readonly inputSchema = {
    type: 'object' as const,
    properties: {
      item_id: {
        type: 'string' as const,
        description: 'ID of the queue item to release',
        minLength: 1,
      },
    },
    required: ['item_id'],
    additionalProperties: false,
  };

  constructor(logger: Logger, private queuesAPI: QueuesAPI) {
    super(logger, {
      category: ToolCategory.SYSTEM,
      version: '1.0.0',
      requiresAuth: true,
      rateLimited: true,
    });
  }

  async execute(input: ToolInput, context: ToolContext): Promise<ToolHandlerResult> {
    try {
      this.logExecution(input, context, true);

      // Validate permissions
      if (!this.validatePermissions(context, ['queues:write', 'system:write', 'write'])) {
        return {
          success: false,
          error: {
            code: MCPErrorCode.AUTHORIZATION_ERROR,
            message: 'Permission denied: requires queues:write permission',
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

      const { item_id } = input;

      if (typeof item_id !== 'string') {
        return {
          success: false,
          error: {
            code: MCPErrorCode.INVALID_PARAMS,
            message: 'Item ID must be a string',
          },
        };
      }

      // Get item details before releasing
      const itemDetails = await this.queuesAPI.getQueueItemDetails(item_id);
      
      // Release queue item
      await this.queuesAPI.releaseQueueItem(item_id);

      const result = {
        message: `Queue item '${item_id}' has been released from hold`,
        item_details: {
          id: itemDetails.id,
          sender: itemDetails.sender,
          recipient: itemDetails.recipient,
          subject: itemDetails.subject,
          previous_status: itemDetails.status,
          new_status: 'active',
        },
        released_at: new Date().toISOString(),
        note: 'This message is now available for delivery processing',
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

// Export all queue tools
export const QueueTools = {
  ListQueueItemsTool,
  GetQueueItemTool,
  FlushQueueTool,
  DeleteQueueItemsTool,
  HoldQueueItemTool,
  ReleaseQueueItemTool,
};