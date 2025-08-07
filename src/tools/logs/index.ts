/**
 * Log Management Tools
 * MCP tools for retrieving and filtering Mailcow logs
 */

import { BaseTool, ToolUtils } from '../base';
import { LogsAPI } from '../../api/logs';
import {
  ToolInput,
  ToolContext,
  ToolHandlerResult,
  ToolCategory,
  MCPErrorCode,
} from '../../types';
import { Logger } from '../../utils';

/**
 * Get system logs
 */
export class GetLogsTool extends BaseTool {
  readonly name = 'get_logs';
  readonly description = 'Retrieve system logs from Mailcow with optional filtering';
  readonly inputSchema = {
    type: 'object' as const,
    properties: {
      level: {
        type: 'string' as const,
        description: 'Filter by log level',
        enum: ['debug', 'info', 'warn', 'error'],
      },
      service: {
        type: 'string' as const,
        description: 'Filter by service name (e.g., postfix, dovecot, rspamd)',
        pattern: '^[a-zA-Z0-9._-]+$',
        maxLength: 50,
      },
      start_time: {
        type: 'string' as const,
        description: 'Start time for log retrieval',
        format: 'date-time',
      },
      end_time: {
        type: 'string' as const,
        description: 'End time for log retrieval',
        format: 'date-time',
      },
      limit: {
        type: 'number' as const,
        description: 'Maximum number of log entries to return',
        minimum: 1,
        maximum: 10000,
      },
      offset: {
        type: 'number' as const,
        description: 'Number of log entries to skip for pagination',
        minimum: 0,
      },
    },
    additionalProperties: false,
  };

  constructor(logger: Logger, private logsAPI: LogsAPI) {
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
      if (!this.validatePermissions(context, ['logs:read', 'system:read', 'read'])) {
        return {
          success: false,
          error: {
            code: MCPErrorCode.AUTHORIZATION_ERROR,
            message: 'Permission denied: requires logs:read permission',
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
        level,
        service,
        start_time,
        end_time,
        limit = 1000,
        offset = 0,
      } = input;

      // Build API parameters
      const params: any = {};
      if (typeof level === 'string') params.level = level as 'debug' | 'info' | 'warn' | 'error';
      if (typeof service === 'string') params.service = service;
      if (typeof start_time === 'string') params.start_time = new Date(start_time);
      if (typeof end_time === 'string') params.end_time = new Date(end_time);
      if (typeof limit === 'number' && limit > 0) params.limit = limit;
      if (typeof offset === 'number' && offset >= 0) params.offset = offset;

      // Fetch logs from API
      const logs = await this.logsAPI.getLogs(params);

      // Calculate statistics
      const levelCounts = {
        debug: logs.filter(log => log.level === 'debug').length,
        info: logs.filter(log => log.level === 'info').length,
        warn: logs.filter(log => log.level === 'warn').length,
        error: logs.filter(log => log.level === 'error').length,
      };

      const serviceCounts: Record<string, number> = {};
      logs.forEach(log => {
        serviceCounts[log.service] = (serviceCounts[log.service] || 0) + 1;
      });

      // Format results
      const summary = {
        total_entries: logs.length,
        level_breakdown: levelCounts,
        service_breakdown: serviceCounts,
        time_range: {
          start: start_time || 'Not specified',
          end: end_time || 'Not specified',
        },
        filters_applied: params,
        log_entries: logs.map(log => ({
          id: log.id,
          timestamp: log.timestamp,
          level: log.level,
          service: log.service,
          message: log.message,
          details: log.details,
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
 * Get error logs specifically
 */
export class GetErrorLogsTool extends BaseTool {
  readonly name = 'get_error_logs';
  readonly description = 'Retrieve error logs from Mailcow for troubleshooting';
  readonly inputSchema = {
    type: 'object' as const,
    properties: {
      service: {
        type: 'string' as const,
        description: 'Filter by service name (e.g., postfix, dovecot, rspamd)',
        pattern: '^[a-zA-Z0-9._-]+$',
        maxLength: 50,
      },
      start_time: {
        type: 'string' as const,
        description: 'Start time for log retrieval',
        format: 'date-time',
      },
      end_time: {
        type: 'string' as const,
        description: 'End time for log retrieval',
        format: 'date-time',
      },
      limit: {
        type: 'number' as const,
        description: 'Maximum number of error entries to return',
        minimum: 1,
        maximum: 5000,
      },
      offset: {
        type: 'number' as const,
        description: 'Number of error entries to skip for pagination',
        minimum: 0,
      },
    },
    additionalProperties: false,
  };

  constructor(logger: Logger, private logsAPI: LogsAPI) {
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
      if (!this.validatePermissions(context, ['logs:read', 'system:read', 'read'])) {
        return {
          success: false,
          error: {
            code: MCPErrorCode.AUTHORIZATION_ERROR,
            message: 'Permission denied: requires logs:read permission',
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
        service,
        start_time,
        end_time,
        limit = 500,
        offset = 0,
      } = input;

      // Build API parameters
      const params: any = {};
      if (typeof service === 'string') params.service = service;
      if (typeof start_time === 'string') params.start_time = new Date(start_time);
      if (typeof end_time === 'string') params.end_time = new Date(end_time);
      if (typeof limit === 'number' && limit > 0) params.limit = limit;
      if (typeof offset === 'number' && offset >= 0) params.offset = offset;

      // Fetch error logs from API
      const errorLogs = await this.logsAPI.getErrorLogs(params);

      // Group errors by service for analysis
      const errorsByService: Record<string, number> = {};
      const recentErrors: any[] = [];
      const criticalErrors: any[] = [];

      errorLogs.forEach(log => {
        errorsByService[log.service] = (errorsByService[log.service] || 0) + 1;
        
        // Identify recent errors (last hour)
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        if (log.timestamp > oneHourAgo) {
          recentErrors.push(log);
        }

        // Identify potentially critical errors
        if (log.message.toLowerCase().includes('fail') || 
            log.message.toLowerCase().includes('critical') ||
            log.message.toLowerCase().includes('fatal')) {
          criticalErrors.push(log);
        }
      });

      // Format results
      const summary = {
        total_errors: errorLogs.length,
        recent_errors_count: recentErrors.length,
        critical_errors_count: criticalErrors.length,
        errors_by_service: errorsByService,
        time_range: {
          start: start_time || 'Not specified',
          end: end_time || 'Not specified',
        },
        filters_applied: params,
        recent_critical_errors: criticalErrors.slice(0, 10).map(log => ({
          timestamp: log.timestamp,
          service: log.service,
          message: log.message,
          details: log.details,
        })),
        error_entries: errorLogs.map(log => ({
          id: log.id,
          timestamp: log.timestamp,
          service: log.service,
          message: log.message,
          details: log.details,
          severity: log.message.toLowerCase().includes('critical') || 
                   log.message.toLowerCase().includes('fatal') ? 'critical' : 'error',
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
 * Get performance logs
 */
export class GetPerformanceLogsTool extends BaseTool {
  readonly name = 'get_performance_logs';
  readonly description = 'Retrieve performance-related logs from Mailcow for monitoring';
  readonly inputSchema = {
    type: 'object' as const,
    properties: {
      start_time: {
        type: 'string' as const,
        description: 'Start time for log retrieval',
        format: 'date-time',
      },
      end_time: {
        type: 'string' as const,
        description: 'End time for log retrieval',
        format: 'date-time',
      },
      limit: {
        type: 'number' as const,
        description: 'Maximum number of performance entries to return',
        minimum: 1,
        maximum: 5000,
      },
      offset: {
        type: 'number' as const,
        description: 'Number of performance entries to skip for pagination',
        minimum: 0,
      },
    },
    additionalProperties: false,
  };

  constructor(logger: Logger, private logsAPI: LogsAPI) {
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
      if (!this.validatePermissions(context, ['logs:read', 'system:read', 'read'])) {
        return {
          success: false,
          error: {
            code: MCPErrorCode.AUTHORIZATION_ERROR,
            message: 'Permission denied: requires logs:read permission',
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
        start_time,
        end_time,
        limit = 1000,
        offset = 0,
      } = input;

      // Build API parameters
      const params: any = {};
      if (typeof start_time === 'string') params.start_time = new Date(start_time);
      if (typeof end_time === 'string') params.end_time = new Date(end_time);
      if (typeof limit === 'number' && limit > 0) params.limit = limit;
      if (typeof offset === 'number' && offset >= 0) params.offset = offset;

      // Fetch performance logs from API
      const performanceLogs = await this.logsAPI.getPerformanceLogs(params);

      // Analyze performance metrics
      const performanceMetrics = {
        total_entries: performanceLogs.length,
        services_monitored: [...new Set(performanceLogs.map(log => log.service))],
        time_range: {
          start: start_time || 'Not specified',
          end: end_time || 'Not specified',
        },
      };

      // Format results
      const summary = {
        ...performanceMetrics,
        filters_applied: params,
        performance_entries: performanceLogs.map(log => ({
          id: log.id,
          timestamp: log.timestamp,
          service: log.service,
          message: log.message,
          details: log.details,
          level: log.level,
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
 * Get access logs
 */
export class GetAccessLogsTool extends BaseTool {
  readonly name = 'get_access_logs';
  readonly description = 'Retrieve access logs from Mailcow for security monitoring';
  readonly inputSchema = {
    type: 'object' as const,
    properties: {
      start_time: {
        type: 'string' as const,
        description: 'Start time for log retrieval',
        format: 'date-time',
      },
      end_time: {
        type: 'string' as const,
        description: 'End time for log retrieval',
        format: 'date-time',
      },
      limit: {
        type: 'number' as const,
        description: 'Maximum number of access entries to return',
        minimum: 1,
        maximum: 5000,
      },
      offset: {
        type: 'number' as const,
        description: 'Number of access entries to skip for pagination',
        minimum: 0,
      },
    },
    additionalProperties: false,
  };

  constructor(logger: Logger, private logsAPI: LogsAPI) {
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
      if (!this.validatePermissions(context, ['logs:read', 'system:read', 'read'])) {
        return {
          success: false,
          error: {
            code: MCPErrorCode.AUTHORIZATION_ERROR,
            message: 'Permission denied: requires logs:read permission',
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
        start_time,
        end_time,
        limit = 1000,
        offset = 0,
      } = input;

      // Build API parameters
      const params: any = {};
      if (typeof start_time === 'string') params.start_time = new Date(start_time);
      if (typeof end_time === 'string') params.end_time = new Date(end_time);
      if (typeof limit === 'number' && limit > 0) params.limit = limit;
      if (typeof offset === 'number' && offset >= 0) params.offset = offset;

      // Fetch access logs from API
      const accessLogs = await this.logsAPI.getAccessLogs(params);

      // Analyze access patterns
      const recentAccess: any[] = [];
      const failedAccess: any[] = [];
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

      accessLogs.forEach(log => {
        if (log.timestamp > oneHourAgo) {
          recentAccess.push(log);
        }
        
        if (log.message.toLowerCase().includes('fail') || 
            log.message.toLowerCase().includes('denied') ||
            log.message.toLowerCase().includes('unauthorized')) {
          failedAccess.push(log);
        }
      });

      // Format results
      const summary = {
        total_access_entries: accessLogs.length,
        recent_access_count: recentAccess.length,
        failed_access_count: failedAccess.length,
        time_range: {
          start: start_time || 'Not specified',
          end: end_time || 'Not specified',
        },
        security_summary: {
          recent_failures: failedAccess.slice(0, 10).map(log => ({
            timestamp: log.timestamp,
            message: log.message,
            details: log.details,
          })),
        },
        filters_applied: params,
        access_entries: accessLogs.map(log => ({
          id: log.id,
          timestamp: log.timestamp,
          service: log.service,
          message: log.message,
          details: log.details,
          level: log.level,
          access_type: log.message.toLowerCase().includes('fail') ? 'failed' : 'success',
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

// Export all log tools
export const LogTools = {
  GetLogsTool,
  GetErrorLogsTool,
  GetPerformanceLogsTool,
  GetAccessLogsTool,
};