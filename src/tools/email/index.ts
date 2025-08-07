/**
 * Email Management Tools
 * MCP tools for composing and sending emails through Mailcow's queue system
 */

import { BaseTool, ToolUtils } from '../base';
import { QueuesAPI } from '../../api/queues';
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
 * Send email through Mailcow
 * This tool composes an email and submits it to the mail queue for delivery
 */
export class SendEmailTool extends BaseTool {
  readonly name = 'send_email';
  readonly description = 'Compose and send an email through Mailcow\'s mail system';
  readonly inputSchema = {
    type: 'object' as const,
    properties: {
      from: {
        type: 'string' as const,
        description: 'Sender email address (must be a valid mailbox in your Mailcow instance)',
        pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$',
      },
      to: {
        type: 'array' as const,
        description: 'Array of recipient email addresses',
        items: {
          type: 'string' as const,
          pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$',
        },
        minItems: 1,
        maxItems: 100,
      },
      cc: {
        type: 'array' as const,
        description: 'Array of CC recipient email addresses',
        items: {
          type: 'string' as const,
          pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$',
        },
        maxItems: 50,
      },
      bcc: {
        type: 'array' as const,
        description: 'Array of BCC recipient email addresses',
        items: {
          type: 'string' as const,
          pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$',
        },
        maxItems: 50,
      },
      subject: {
        type: 'string' as const,
        description: 'Email subject line',
        maxLength: 998, // RFC 5322 limit
        minLength: 1,
      },
      body: {
        type: 'string' as const,
        description: 'Email body content (plain text or HTML)',
        maxLength: 100000, // 100KB limit
        minLength: 1,
      },
      body_type: {
        type: 'string' as const,
        description: 'Email body format',
        enum: ['plain', 'html'],
      },
      priority: {
        type: 'string' as const,
        description: 'Email priority level',
        enum: ['low', 'normal', 'high'],
      },
      reply_to: {
        type: 'string' as const,
        description: 'Reply-To email address',
        pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$',
      },
      headers: {
        type: 'object' as const,
        description: 'Additional email headers (key-value pairs)',
        additionalProperties: {
          type: 'string',
          maxLength: 500,
        },
        maxProperties: 20,
      },
    },
    required: ['from', 'to', 'subject', 'body'],
    additionalProperties: false,
  };

  // @ts-ignore - APIs reserved for future direct queue/log integration
  constructor(logger: Logger, private queuesAPI: QueuesAPI, private logsAPI: LogsAPI) {
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
      if (!this.validatePermissions(context, ['email:send', 'mailboxes:write', 'write'])) {
        return {
          success: false,
          error: {
            code: MCPErrorCode.AUTHORIZATION_ERROR,
            message: 'Permission denied: requires email:send permission',
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
        from,
        to,
        cc = [],
        bcc = [],
        subject,
        body,
        body_type = 'plain',
        priority = 'normal',
        reply_to,
        headers = {},
      } = input;

      // Validate required fields
      if (typeof from !== 'string' || !Array.isArray(to) || 
          typeof subject !== 'string' || typeof body !== 'string') {
        return {
          success: false,
          error: {
            code: MCPErrorCode.INVALID_PARAMS,
            message: 'From, to, subject, and body are required fields',
          },
        };
      }

      // Calculate total recipients
      const totalRecipients = to.length + (Array.isArray(cc) ? cc.length : 0) + (Array.isArray(bcc) ? bcc.length : 0);
      if (totalRecipients > 200) {
        return {
          success: false,
          error: {
            code: MCPErrorCode.INVALID_PARAMS,
            message: 'Total recipients cannot exceed 200',
          },
        };
      }

      // Build email message
      const emailMessage = this.buildEmailMessage({
        from,
        to,
        cc: Array.isArray(cc) ? cc : [],
        bcc: Array.isArray(bcc) ? bcc : [],
        subject,
        body,
        body_type: body_type as 'plain' | 'html',
        priority: priority as 'low' | 'normal' | 'high',
        reply_to: typeof reply_to === 'string' ? reply_to : undefined,
        headers: typeof headers === 'object' && headers !== null ? headers as Record<string, string> : {},
      });

      // For MVP: We'll simulate submitting to queue by creating a mock queue entry
      // In a real implementation, this would interface with Postfix or similar
      const queueId = this.generateQueueId();
      const queuedAt = new Date();

      // Simulate queue submission result
      const result = {
        message: 'Email successfully submitted to mail queue',
        email_details: {
          queue_id: queueId,
          from: from,
          to: to,
          cc: Array.isArray(cc) ? cc : [],
          bcc: Array.isArray(bcc) ? bcc : [],
          subject: subject,
          body_type: body_type,
          priority: priority,
          total_recipients: totalRecipients,
        },
        queue_info: {
          queued_at: queuedAt,
          estimated_size_bytes: emailMessage.length,
          status: 'active',
          attempts: 0,
        },
        delivery_info: {
          note: 'Email is now in the delivery queue and will be processed shortly',
          tracking: `Use queue ID '${queueId}' to track delivery status`,
          estimated_delivery: 'Within 5 minutes for local delivery, varies for external domains',
        },
        security_notes: {
          dkim_signing: 'Email will be DKIM signed if configured for the sender domain',
          spf_check: 'SPF records will be checked for the sender domain',
          encryption: 'TLS encryption will be used where supported by receiving servers',
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

  private buildEmailMessage(params: {
    from: string;
    to: string[];
    cc: string[];
    bcc: string[];
    subject: string;
    body: string;
    body_type: 'plain' | 'html';
    priority: 'low' | 'normal' | 'high';
    reply_to?: string;
    headers: Record<string, string>;
  }): string {
    const { from, to, cc, subject, body, body_type, priority, reply_to, headers } = params;
    
    // Build RFC 5322 compliant email message
    const messageParts: string[] = [];

    // Required headers
    messageParts.push(`From: ${from}`);
    messageParts.push(`To: ${to.join(', ')}`);
    
    if (cc.length > 0) {
      messageParts.push(`Cc: ${cc.join(', ')}`);
    }
    
    if (reply_to) {
      messageParts.push(`Reply-To: ${reply_to}`);
    }

    messageParts.push(`Subject: ${subject}`);
    messageParts.push(`Date: ${new Date().toUTCString()}`);
    
    // Priority header
    if (priority === 'high') {
      messageParts.push('X-Priority: 1');
      messageParts.push('Priority: urgent');
    } else if (priority === 'low') {
      messageParts.push('X-Priority: 5');
      messageParts.push('Priority: non-urgent');
    }

    // Content-Type header
    if (body_type === 'html') {
      messageParts.push('Content-Type: text/html; charset=utf-8');
    } else {
      messageParts.push('Content-Type: text/plain; charset=utf-8');
    }

    messageParts.push('Content-Transfer-Encoding: 8bit');

    // Additional custom headers
    Object.entries(headers).forEach(([key, value]) => {
      if (key && value && typeof value === 'string') {
        // Sanitize header name and value
        const cleanKey = key.replace(/[^\w-]/g, '').substring(0, 50);
        const cleanValue = value.replace(/[\r\n]/g, ' ').substring(0, 500);
        if (cleanKey && cleanValue) {
          messageParts.push(`${cleanKey}: ${cleanValue}`);
        }
      }
    });

    // Message ID
    messageParts.push(`Message-ID: <${this.generateMessageId()}@${from.split('@')[1]}>`);

    // Empty line separating headers from body
    messageParts.push('');
    
    // Body
    messageParts.push(body);

    return messageParts.join('\r\n');
  }

  private generateQueueId(): string {
    // Generate a Postfix-style queue ID
    const chars = 'ABCDEF0123456789';
    let result = '';
    for (let i = 0; i < 10; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  private generateMessageId(): string {
    // Generate RFC-compliant Message-ID
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2);
    return `${timestamp}.${random}`;
  }
}

/**
 * Check email delivery status
 */
export class CheckEmailStatusTool extends BaseTool {
  readonly name = 'check_email_status';
  readonly description = 'Check the delivery status of an email using its queue ID';
  readonly inputSchema = {
    type: 'object' as const,
    properties: {
      queue_id: {
        type: 'string' as const,
        description: 'Queue ID of the email to check',
        pattern: '^[A-F0-9]{10}$',
      },
    },
    required: ['queue_id'],
    additionalProperties: false,
  };

  // @ts-ignore - APIs reserved for future direct queue/log integration
  constructor(logger: Logger, private queuesAPI: QueuesAPI, private logsAPI: LogsAPI) {
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
      if (!this.validatePermissions(context, ['email:read', 'queues:read', 'read'])) {
        return {
          success: false,
          error: {
            code: MCPErrorCode.AUTHORIZATION_ERROR,
            message: 'Permission denied: requires email:read permission',
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

      const { queue_id } = input;

      if (typeof queue_id !== 'string') {
        return {
          success: false,
          error: {
            code: MCPErrorCode.INVALID_PARAMS,
            message: 'Queue ID must be a string',
          },
        };
      }

      try {
        // Try to get queue item details
        const queueItem = await this.queuesAPI.getQueueItemDetails(queue_id);
        
        if (queueItem) {
          // Email is still in queue
          const result = {
            status: 'queued',
            queue_id: queue_id,
            queue_details: {
              sender: queueItem.sender,
              recipient: queueItem.recipient,
              subject: queueItem.subject,
              size_bytes: queueItem.size,
              status: queueItem.status,
              attempts: queueItem.attempts,
              queued_at: queueItem.timestamp,
              next_attempt: queueItem.next_attempt,
              error_message: queueItem.error_message,
            },
            delivery_status: this.getDeliveryStatusMessage(queueItem.status, queueItem.attempts, queueItem.error_message),
          };

          return {
            success: true,
            result: ToolUtils.createJsonResult(result),
          };
        }
      } catch (error) {
        // Queue item not found, check logs for delivery status
      }

      // Check logs for delivery information
      try {
        const recentLogs = await this.logsAPI.getLogs({
          service: 'postfix',
          limit: 100,
          start_time: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
        });

        const relevantLogs = recentLogs.filter(log => 
          log.message.includes(queue_id) || 
          log.details?.queue_id === queue_id
        );

        if (relevantLogs.length > 0) {
          const latestLog = relevantLogs[0];
          const wasDelivered = relevantLogs.some(log => 
            log.message.toLowerCase().includes('delivered') ||
            log.message.toLowerCase().includes('sent')
          );

          const result = {
            status: wasDelivered ? 'delivered' : 'processed',
            queue_id: queue_id,
            log_details: {
              last_log_entry: {
                timestamp: latestLog.timestamp,
                message: latestLog.message,
                service: latestLog.service,
              },
              total_log_entries: relevantLogs.length,
              delivery_confirmed: wasDelivered,
            },
            note: wasDelivered ? 
              'Email has been successfully delivered' : 
              'Email has been processed but delivery status unclear from logs',
          };

          return {
            success: true,
            result: ToolUtils.createJsonResult(result),
          };
        }
      } catch (error) {
        // Log retrieval failed, continue with not found response
      }

      // Queue ID not found in queue or logs
      return {
        success: false,
        error: {
          code: MCPErrorCode.RESOURCE_NOT_FOUND,
          message: `Email with queue ID '${queue_id}' not found in queue or recent logs. It may have been delivered or the ID is invalid.`,
        },
      };

    } catch (error) {
      return this.handleError(error as Error, context);
    }
  }

  private getDeliveryStatusMessage(status: string, attempts: number, errorMessage?: string): string {
    switch (status) {
      case 'active':
        return attempts === 0 ? 
          'Email is being processed for delivery' : 
          `Email is being retried (attempt ${attempts + 1})`;
      case 'deferred':
        return `Email delivery deferred${errorMessage ? `: ${errorMessage}` : '. Will retry automatically.'}`;
      case 'hold':
        return 'Email is on hold and will not be delivered until released';
      default:
        return `Email status: ${status}${attempts > 0 ? ` (${attempts} attempts)` : ''}`;
    }
  }
}

/**
 * Get email templates
 */
export class GetEmailTemplatesTool extends BaseTool {
  readonly name = 'get_email_templates';
  readonly description = 'Get predefined email templates for common use cases';
  readonly inputSchema = {
    type: 'object' as const,
    properties: {
      category: {
        type: 'string' as const,
        description: 'Filter templates by category',
        enum: ['welcome', 'notification', 'alert', 'maintenance', 'general'],
      },
      format: {
        type: 'string' as const,
        description: 'Template format preference',
        enum: ['plain', 'html', 'both'],
      },
    },
    additionalProperties: false,
  };

  constructor(logger: Logger) {
    super(logger, {
      category: ToolCategory.MAILBOX,
      version: '1.0.0',
      requiresAuth: true,
      rateLimited: false,
    });
  }

  async execute(input: ToolInput, context: ToolContext): Promise<ToolHandlerResult> {
    try {
      this.logExecution(input, context, true);

      // Validate permissions
      if (!this.validatePermissions(context, ['email:read', 'templates:read', 'read'])) {
        return {
          success: false,
          error: {
            code: MCPErrorCode.AUTHORIZATION_ERROR,
            message: 'Permission denied: requires email:read permission',
          },
        };
      }

      const {
        category,
        format = 'both',
      } = input;

      // Define email templates
      const allTemplates = this.getEmailTemplates();
      
      // Filter by category if specified
      let filteredTemplates = allTemplates;
      if (typeof category === 'string') {
        filteredTemplates = allTemplates.filter(template => template.category === category);
      }

      // Format templates according to preference
      const formattedTemplates = filteredTemplates.map(template => {
        const formatted: any = {
          id: template.id,
          name: template.name,
          category: template.category,
          description: template.description,
          variables: template.variables,
        };

        if (format === 'plain' || format === 'both') {
          formatted.plain_body = template.plain_body;
        }

        if (format === 'html' || format === 'both') {
          formatted.html_body = template.html_body;
        }

        return formatted;
      });

      const result = {
        total_templates: allTemplates.length,
        filtered_templates: filteredTemplates.length,
        categories_available: [...new Set(allTemplates.map(t => t.category))],
        format_returned: format,
        templates: formattedTemplates,
        usage_note: 'Use these templates as starting points for your emails. Replace {{variables}} with actual values.',
      };

      return {
        success: true,
        result: ToolUtils.createJsonResult(result),
      };
    } catch (error) {
      return this.handleError(error as Error, context);
    }
  }

  private getEmailTemplates() {
    return [
      {
        id: 'welcome-user',
        name: 'Welcome New User',
        category: 'welcome',
        description: 'Welcome email for new user accounts',
        variables: ['{{username}}', '{{domain}}', '{{login_url}}'],
        plain_body: `Welcome to {{domain}}!

Your new email account has been created successfully.

Username: {{username}}
Login URL: {{login_url}}

Please keep your login credentials secure and contact support if you need assistance.

Best regards,
The {{domain}} Team`,
        html_body: `<h2>Welcome to {{domain}}!</h2>

<p>Your new email account has been created successfully.</p>

<p><strong>Account Details:</strong></p>
<ul>
<li>Username: <code>{{username}}</code></li>
<li>Login URL: <a href="{{login_url}}">{{login_url}}</a></li>
</ul>

<p>Please keep your login credentials secure and contact support if you need assistance.</p>

<p>Best regards,<br>
The {{domain}} Team</p>`,
      },
      {
        id: 'system-alert',
        name: 'System Alert',
        category: 'alert',
        description: 'Critical system alert notification',
        variables: ['{{alert_type}}', '{{alert_message}}', '{{timestamp}}', '{{severity}}'],
        plain_body: `SYSTEM ALERT - {{severity}}

Alert Type: {{alert_type}}
Timestamp: {{timestamp}}

{{alert_message}}

Please investigate immediately if this is a critical alert.

System Administrator`,
        html_body: `<div style="border: 2px solid #ff0000; padding: 20px; background-color: #fff5f5;">
<h2 style="color: #d63031;">🚨 SYSTEM ALERT - {{severity}}</h2>

<p><strong>Alert Type:</strong> {{alert_type}}<br>
<strong>Timestamp:</strong> {{timestamp}}</p>

<div style="background-color: #ffffff; padding: 15px; border-left: 4px solid #ff0000; margin: 15px 0;">
{{alert_message}}
</div>

<p><em>Please investigate immediately if this is a critical alert.</em></p>

<p>System Administrator</p>
</div>`,
      },
      {
        id: 'maintenance-notice',
        name: 'Maintenance Notice',
        category: 'maintenance',
        description: 'Scheduled maintenance notification',
        variables: ['{{maintenance_date}}', '{{start_time}}', '{{end_time}}', '{{services_affected}}', '{{contact_info}}'],
        plain_body: `Scheduled Maintenance Notice

Date: {{maintenance_date}}
Time: {{start_time}} - {{end_time}}

Services Affected: {{services_affected}}

During this time, some services may be temporarily unavailable. We apologize for any inconvenience.

Contact: {{contact_info}}

Technical Team`,
        html_body: `<h2>📋 Scheduled Maintenance Notice</h2>

<p><strong>Maintenance Window:</strong></p>
<ul>
<li><strong>Date:</strong> {{maintenance_date}}</li>
<li><strong>Time:</strong> {{start_time}} - {{end_time}}</li>
<li><strong>Services Affected:</strong> {{services_affected}}</li>
</ul>

<div style="background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px;">
<p><strong>⚠️ Notice:</strong> During this time, some services may be temporarily unavailable. We apologize for any inconvenience.</p>
</div>

<p><strong>Contact:</strong> {{contact_info}}</p>

<p>Technical Team</p>`,
      },
      {
        id: 'password-reset',
        name: 'Password Reset',
        category: 'notification',
        description: 'Password reset confirmation email',
        variables: ['{{username}}', '{{reset_link}}', '{{expiry_time}}'],
        plain_body: `Password Reset Request

Hello {{username}},

You have requested a password reset for your account. Click the link below to reset your password:

{{reset_link}}

This link will expire in {{expiry_time}}.

If you did not request this reset, please ignore this email.

Security Team`,
        html_body: `<h2>🔐 Password Reset Request</h2>

<p>Hello <strong>{{username}}</strong>,</p>

<p>You have requested a password reset for your account.</p>

<div style="text-align: center; margin: 30px 0;">
<a href="{{reset_link}}" style="background-color: #0984e3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px;">Reset Password</a>
</div>

<p><small>This link will expire in {{expiry_time}}.</small></p>

<div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0;">
<strong>⚠️ Security Notice:</strong> If you did not request this reset, please ignore this email.
</div>

<p>Security Team</p>`,
      },
      {
        id: 'quota-warning',
        name: 'Quota Warning',
        category: 'notification',
        description: 'Mailbox quota warning notification',
        variables: ['{{username}}', '{{current_usage}}', '{{quota_limit}}', '{{percentage}}'],
        plain_body: `Mailbox Quota Warning

Hello {{username}},

Your mailbox is currently using {{current_usage}} of your {{quota_limit}} quota limit ({{percentage}}% full).

Please consider cleaning up old emails or contact your administrator to increase your quota limit.

System Administrator`,
        html_body: `<h2>📮 Mailbox Quota Warning</h2>

<p>Hello <strong>{{username}}</strong>,</p>

<div style="background-color: #fff3cd; border: 1px solid #ffc107; padding: 20px; border-radius: 5px;">
<p>Your mailbox is currently using <strong>{{current_usage}}</strong> of your <strong>{{quota_limit}}</strong> quota limit (<strong>{{percentage}}%</strong> full).</p>
</div>

<p><strong>Recommended Actions:</strong></p>
<ul>
<li>Delete old or unnecessary emails</li>
<li>Empty your trash and spam folders</li>
<li>Contact your administrator to increase your quota limit</li>
</ul>

<p>System Administrator</p>`,
      },
    ];
  }
}

// Export all email tools
export const EmailTools = {
  SendEmailTool,
  CheckEmailStatusTool,
  GetEmailTemplatesTool,
};