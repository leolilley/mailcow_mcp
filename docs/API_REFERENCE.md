# 📚 API Reference

Complete reference for all MCP tools and their usage patterns.

## 🛠️ Available Tools (20 total)

### System Tools (3 tools)

#### `health_check`
Get server health status and basic metrics.

**Parameters:** None

**Returns:**
```json
{
  "status": "healthy",
  "timestamp": "2023-12-07T10:30:00.000Z",
  "server": {
    "name": "mailcow-mcp",
    "version": "0.1.0",
    "uptime": 3600
  },
  "api": {
    "configured": true,
    "url": "https://mail.example.com"
  },
  "tools": {
    "count": 20
  }
}
```

#### `get_config`
Get current server configuration (sanitized, no secrets).

**Parameters:** None

**Returns:**
```json
{
  "api": {
    "url": "https://mail.example.com", 
    "timeout": 30000,
    "hasKey": true
  },
  "server": {
    "port": 3000,
    "logLevel": "info"
  },
  "logging": {
    "level": "info",
    "destination": "console"
  }
}
```

#### `test_api_connection` 
Test connectivity to the Mailcow API server.

**Parameters:** None

**Returns:**
```json
{
  "status": "connected",
  "timestamp": "2023-12-07T10:30:00.000Z", 
  "response": "15 domains found"
}
```

---

### Domain Management Tools (5 tools)

#### `list_domains`
List all domains with optional filtering.

**Parameters:**
- `active_only` (boolean, optional): Only return active domains
- `search` (string, optional): Search term for domain names
- `limit` (number, optional): Maximum domains to return (default: 100)
- `offset` (number, optional): Pagination offset (default: 0)

**Example:**
```json
{
  "active_only": true,
  "search": "example",
  "limit": 10
}
```

**Returns:**
```json
{
  "total_domains": 15,
  "filtered_domains": 3,
  "domains": [
    {
      "domain": "example.com",
      "description": "Main company domain", 
      "active": true,
      "quota": 10737418240,
      "max_quota": 10737418240,
      "created": "2023-01-15T10:30:00.000Z"
    }
  ]
}
```

#### `get_domain`
Get detailed information about a specific domain.

**Parameters:**
- `domain` (string, required): Domain name to retrieve

**Example:**
```json
{
  "domain": "example.com"
}
```

#### `create_domain`  
Create a new domain in Mailcow.

**Parameters:**
- `domain` (string, required): Domain name
- `description` (string, optional): Domain description
- `quota` (number, optional): Domain quota in bytes
- `max_quota` (number, optional): Maximum quota limit
- `active` (boolean, optional): Whether domain is active (default: true)

**Example:**
```json
{
  "domain": "newdomain.com",
  "description": "New company domain",
  "quota": 5368709120,
  "active": true
}
```

#### `update_domain`
Update an existing domain's settings.

**Parameters:**
- `domain` (string, required): Domain name to update
- `description` (string, optional): New description
- `quota` (number, optional): New quota in bytes  
- `active` (boolean, optional): Active status

**Example:**
```json
{
  "domain": "example.com",
  "description": "Updated description",
  "quota": 10737418240
}
```

#### `delete_domain`
Delete a domain (⚠️ destructive operation).

**Parameters:**
- `domain` (string, required): Domain name to delete
- `confirm` (boolean, required): Must be `true` to confirm deletion

**Example:**
```json
{
  "domain": "olddomain.com", 
  "confirm": true
}
```

---

### Mailbox Management Tools (5 tools)

#### `list_mailboxes`
List all mailboxes with filtering and quota information.

**Parameters:**
- `domain` (string, optional): Filter by specific domain
- `active_only` (boolean, optional): Only active mailboxes
- `search` (string, optional): Search in username or name fields
- `include_quota` (boolean, optional): Include quota information (default: true)
- `limit` (number, optional): Maximum mailboxes to return (default: 100)

#### `get_mailbox`
Get detailed information about a specific mailbox.

**Parameters:**
- `username` (string, required): Full email address

#### `create_mailbox`
Create a new mailbox.

**Parameters:**
- `username` (string, required): Full email address
- `password` (string, required): Mailbox password (min 6 chars)
- `name` (string, optional): Display name
- `quota` (number, optional): Mailbox quota in bytes
- `active` (boolean, optional): Active status (default: true)

#### `update_mailbox`  
Update mailbox settings.

**Parameters:**
- `username` (string, required): Mailbox to update
- `password` (string, optional): New password
- `name` (string, optional): New display name
- `quota` (number, optional): New quota in bytes
- `active` (boolean, optional): Active status

#### `delete_mailbox`
Delete a mailbox (⚠️ destructive operation).

**Parameters:**
- `username` (string, required): Mailbox to delete
- `confirm` (boolean, required): Must be `true` to confirm

---

### Queue Management Tools (6 tools)

#### `list_queue_items`
List all mail queue items with filtering.

**Parameters:**
- `sender` (string, optional): Filter by sender email
- `recipient` (string, optional): Filter by recipient email  
- `status` (string, optional): Filter by status (`active`, `deferred`, `hold`)
- `start_time` (string, optional): Filter by creation date (ISO 8601)
- `end_time` (string, optional): Filter by creation date (ISO 8601)
- `limit` (number, optional): Maximum items to return (default: 100)

#### `get_queue_item`
Get detailed information about a specific queue item.

**Parameters:**
- `item_id` (string, required): Queue item ID

#### `flush_queue`
Attempt delivery of all queued messages.

**Parameters:**
- `confirm` (boolean, required): Must be `true` to confirm

#### `delete_queue_items`
Delete specific items from the queue (⚠️ messages will be lost).

**Parameters:**
- `item_ids` (array, required): Array of queue item IDs to delete
- `confirm` (boolean, required): Must be `true` to confirm

#### `hold_queue_item`
Put a queue item on hold (prevent delivery attempts).

**Parameters:**
- `item_id` (string, required): Queue item ID

#### `release_queue_item`
Release a queue item from hold (allow delivery attempts).

**Parameters:**
- `item_id` (string, required): Queue item ID

---

### Sync Job Management Tools (7 tools)

#### `list_sync_jobs`
List all email synchronization jobs.

**Parameters:**
- `username` (string, optional): Filter by mailbox username
- `host` (string, optional): Filter by remote host
- `active_only` (boolean, optional): Only active sync jobs
- `encryption` (string, optional): Filter by encryption type (`tls`, `ssl`, `plain`)
- `limit` (number, optional): Maximum jobs to return (default: 100)

#### `get_sync_job`  
Get detailed information about a specific sync job.

**Parameters:**
- `job_id` (number, required): Sync job ID

#### `create_sync_job`
Create a new sync job for email migration.

**Parameters:**
- `username` (string, required): Target mailbox email address
- `host` (string, required): Remote IMAP host
- `port` (number, required): Remote IMAP port
- `user` (string, required): Remote IMAP username
- `password` (string, required): Remote IMAP password
- `encryption` (string, required): Connection encryption (`tls`, `ssl`, `plain`)
- `maxage` (number, optional): Max age of messages to sync in days (default: 0 = all)
- `active` (boolean, optional): Whether job should be active (default: true)

#### `update_sync_job`
Update settings for an existing sync job.

**Parameters:**
- `job_id` (number, required): Job ID to update
- `host` (string, optional): Updated remote host
- `password` (string, optional): Updated password
- `active` (boolean, optional): Active status
- [other parameters same as create]

#### `delete_sync_job`
Delete a sync job (⚠️ stops email synchronization).

**Parameters:**
- `job_id` (number, required): Job ID to delete
- `confirm` (boolean, required): Must be `true` to confirm

#### `activate_sync_job`
Activate a sync job to start synchronization.

**Parameters:**
- `job_id` (number, required): Job ID to activate

#### `deactivate_sync_job`
Deactivate a sync job to stop synchronization.

**Parameters:**
- `job_id` (number, required): Job ID to deactivate

---

### Log Management Tools (4 tools)

#### `get_logs`
Retrieve system logs with optional filtering.

**Parameters:**
- `level` (string, optional): Filter by log level (`debug`, `info`, `warn`, `error`)
- `service` (string, optional): Filter by service name (e.g., `postfix`, `dovecot`)
- `start_time` (string, optional): Start time for log retrieval (ISO 8601)
- `end_time` (string, optional): End time for log retrieval (ISO 8601)  
- `limit` (number, optional): Maximum log entries (default: 1000)

#### `get_error_logs`
Retrieve error logs specifically for troubleshooting.

**Parameters:** 
- `service` (string, optional): Filter by service name
- `start_time` (string, optional): Start time (ISO 8601)
- `end_time` (string, optional): End time (ISO 8601)
- `limit` (number, optional): Maximum entries (default: 500)

#### `get_performance_logs`
Retrieve performance-related logs for monitoring.

**Parameters:**
- `start_time` (string, optional): Start time (ISO 8601)
- `end_time` (string, optional): End time (ISO 8601)
- `limit` (number, optional): Maximum entries (default: 1000)

#### `get_access_logs`  
Retrieve access logs for security monitoring.

**Parameters:**
- `start_time` (string, optional): Start time (ISO 8601)
- `end_time` (string, optional): End time (ISO 8601)
- `limit` (number, optional): Maximum entries (default: 1000)

---

### Email Tools (3 tools)

#### `send_email`
Compose and send an email through Mailcow's mail system.

**Parameters:**
- `from` (string, required): Sender email address (must be valid mailbox)
- `to` (array, required): Array of recipient email addresses (max 100)
- `cc` (array, optional): Array of CC recipients (max 50)
- `bcc` (array, optional): Array of BCC recipients (max 50)  
- `subject` (string, required): Email subject (max 998 chars)
- `body` (string, required): Email body content (max 100KB)
- `body_type` (string, optional): Body format (`plain` or `html`, default: `plain`)
- `priority` (string, optional): Priority level (`low`, `normal`, `high`, default: `normal`)
- `reply_to` (string, optional): Reply-To email address
- `headers` (object, optional): Additional email headers (max 20)

**Example:**
```json
{
  "from": "admin@example.com",
  "to": ["user@example.com"],
  "subject": "Welcome to our service",
  "body": "Welcome! Your account is ready.",
  "body_type": "plain",
  "priority": "normal"
}
```

**Returns:**
```json
{
  "message": "Email successfully submitted to mail queue",
  "email_details": {
    "queue_id": "A1B2C3D4E5",
    "from": "admin@example.com",
    "to": ["user@example.com"], 
    "subject": "Welcome to our service",
    "total_recipients": 1
  },
  "queue_info": {
    "queued_at": "2023-12-07T10:30:00.000Z",
    "status": "active",
    "estimated_delivery": "Within 5 minutes"
  }
}
```

#### `check_email_status`
Check delivery status of an email using its queue ID.

**Parameters:**
- `queue_id` (string, required): Queue ID from send_email response (format: `^[A-F0-9]{10}$`)

**Example:**
```json
{
  "queue_id": "A1B2C3D4E5"
}
```

**Returns:**
```json
{
  "status": "delivered",
  "queue_id": "A1B2C3D4E5", 
  "log_details": {
    "last_log_entry": {
      "timestamp": "2023-12-07T10:35:00.000Z",
      "message": "Message delivered successfully"
    },
    "delivery_confirmed": true
  }
}
```

#### `get_email_templates`
Get predefined email templates for common use cases.

**Parameters:**
- `category` (string, optional): Filter by category (`welcome`, `notification`, `alert`, `maintenance`, `general`)
- `format` (string, optional): Template format (`plain`, `html`, `both`, default: `both`)

**Returns:**
```json
{
  "total_templates": 5,
  "categories_available": ["welcome", "notification", "alert", "maintenance"],
  "templates": [
    {
      "id": "welcome-user",
      "name": "Welcome New User",
      "category": "welcome",
      "description": "Welcome email for new user accounts",
      "variables": ["{{username}}", "{{domain}}", "{{login_url}}"],
      "plain_body": "Welcome to {{domain}}!\n\nYour account: {{username}}",
      "html_body": "<h2>Welcome to {{domain}}!</h2><p>Your account: {{username}}</p>"
    }
  ]
}
```

---

## 🔐 Permission System

Tools require specific permissions for execution:

| Permission | Required For | Description |
|------------|--------------|-------------|
| `read` | All read operations | Basic read access |
| `write` | Create/update operations | Modify existing resources |  
| `delete` | Delete operations | Remove resources |
| `domains:read` | Domain queries | Read domain information |
| `domains:write` | Domain modifications | Create/update domains |
| `domains:delete` | Domain deletion | Delete domains |
| `mailboxes:read` | Mailbox queries | Read mailbox information |
| `mailboxes:write` | Mailbox modifications | Create/update mailboxes |
| `mailboxes:delete` | Mailbox deletion | Delete mailboxes |
| `queues:read` | Queue queries | Read queue information |
| `queues:write` | Queue operations | Manage queue items |
| `queues:delete` | Queue deletion | Delete queue items |
| `syncjobs:read` | Sync job queries | Read sync job information |
| `syncjobs:write` | Sync job operations | Create/update sync jobs |
| `syncjobs:delete` | Sync job deletion | Delete sync jobs |
| `logs:read` | Log access | Read system logs |
| `email:send` | Email sending | Send emails |
| `email:read` | Email status | Check email status |

## 🚫 Error Codes

Standard MCP error codes returned by tools:

| Code | Name | Description | Common Causes |
|------|------|-------------|---------------|
| `-32602` | `INVALID_PARAMS` | Invalid parameters | Missing required fields, invalid format |
| `-32603` | `INTERNAL_ERROR` | Internal server error | API client errors, network issues |
| `-32001` | `PARSE_ERROR` | JSON parsing error | Malformed request |
| `-32006` | `RESOURCE_NOT_FOUND` | Resource not found | Domain/mailbox doesn't exist |
| `-32000` | `AUTHORIZATION_ERROR` | Permission denied | Insufficient permissions |

## 📝 Usage Examples

### Basic Domain Management
```typescript
// List all active domains
await mcp.call('list_domains', { active_only: true });

// Create a new domain  
await mcp.call('create_domain', {
  domain: 'newdomain.com',
  description: 'New company domain',
  quota: 5368709120
});

// Get domain details
await mcp.call('get_domain', { domain: 'newdomain.com' });
```

### Email Management
```typescript
// Send an email
const result = await mcp.call('send_email', {
  from: 'admin@example.com',
  to: ['user@example.com'],
  subject: 'Welcome!',
  body: 'Your account is ready.',
  body_type: 'plain'
});

// Check delivery status
await mcp.call('check_email_status', { 
  queue_id: result.email_details.queue_id 
});
```

### Queue Management
```typescript
// List queued messages
await mcp.call('list_queue_items', { status: 'deferred' });

// Flush the queue
await mcp.call('flush_queue', { confirm: true });
```