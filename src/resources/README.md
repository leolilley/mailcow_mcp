# Resources Directory

This directory contains MCP resource implementations for the Mailcow MCP server.

## Current Structure

```
resources/
├── README.md             # This documentation
├── aliases/             # Placeholder: Alias resources
├── domains/             # Placeholder: Domain resources
├── mailboxes/           # Placeholder: Mailbox resources
└── system/              # Placeholder: System resources
```

**Note:** This directory is currently a placeholder structure. Resource types are defined in `src/types/resources.ts`.

## Planned Implementation Structure

When implemented, the structure will be:

```
resources/
├── index.ts              # Main resources exports
├── registry.ts           # Resource registry and management
├── base.ts               # Base resource classes and interfaces
├── domains/             # Domain resources
│   ├── domain-list.ts
│   ├── domain-details.ts
│   └── domain-config.ts
├── mailboxes/           # Mailbox resources
│   ├── mailbox-list.ts
│   ├── mailbox-details.ts
│   └── mailbox-quota.ts
├── aliases/             # Alias resources
│   ├── alias-list.ts
│   └── alias-details.ts
├── system/              # System resources
│   ├── system-status.ts
│   ├── service-status.ts
│   ├── system-logs.ts
│   └── system-config.ts
├── validation.ts        # Resource validation
└── errors.ts            # Resource error handling
```

## Planned Resource Categories

### 1. Domain Resources
- **domain-list**: List of all domains with basic information
- **domain-details**: Detailed information for specific domains
- **domain-config**: Domain configuration and settings
- **domain-stats**: Domain usage statistics and metrics

### 2. Mailbox Resources
- **mailbox-list**: List of mailboxes with filtering options
- **mailbox-details**: Detailed mailbox information and settings
- **mailbox-quota**: Quota usage and limits for mailboxes
- **mailbox-stats**: Mailbox usage statistics

### 3. Alias Resources
- **alias-list**: List of email aliases with targets
- **alias-details**: Detailed alias configuration
- **alias-groups**: Grouped aliases by domain or function

### 4. System Resources
- **system-status**: Overall system health and status
- **service-status**: Individual service status and health
- **system-logs**: Access to system logs and events
- **system-config**: System configuration information

## Planned Resource Interface

Each resource will implement the standard MCP resource interface:

```typescript
interface MailcowResource {
  uri: string;
  name: string;
  description: string;
  mimeType: string;
  handler: ResourceHandler;
}

interface ResourceHandler {
  (uri: string, context: ResourceContext): Promise<ResourceContent>;
}

interface ResourceContext {
  apiClient: APIClient;
  authManager: AuthManager;
  logger: Logger;
  config: MailcowConfig;
}
```

## Planned Implementation Features

### 1. Resource Registry
- Automatic resource discovery and registration
- URI pattern matching and routing
- Permission checking for resource access
- Content caching and invalidation

### 2. Base Resource Class
```typescript
abstract class BaseResource implements MailcowResource {
  abstract uri: string;
  abstract name: string;
  abstract description: string;
  abstract mimeType: string;
  
  abstract fetch(uri: string, context: ResourceContext): Promise<ResourceContent>;
  
  protected validateAccess(context: ResourceContext): void {
    // Permission checking logic
  }
  
  protected parseURI(uri: string): ResourceParams {
    // URI parsing logic
  }
}
```

### 3. Resource Templates
- URI templates for dynamic resource paths
- Parameter extraction and validation
- Flexible resource addressing scheme

### 4. Content Types
- JSON data resources for structured information
- Text resources for logs and configuration
- Binary resources for exports and backups

## Resource URI Patterns

### Domain Resources
- `mailcow://domains/` - List all domains
- `mailcow://domains/{domain}` - Specific domain details
- `mailcow://domains/{domain}/config` - Domain configuration
- `mailcow://domains/{domain}/stats` - Domain statistics

### Mailbox Resources
- `mailcow://mailboxes/` - List all mailboxes
- `mailcow://mailboxes/{email}` - Specific mailbox details
- `mailcow://mailboxes/{email}/quota` - Mailbox quota information
- `mailcow://domains/{domain}/mailboxes` - Mailboxes for a domain

### Alias Resources
- `mailcow://aliases/` - List all aliases
- `mailcow://aliases/{alias}` - Specific alias details
- `mailcow://domains/{domain}/aliases` - Aliases for a domain

### System Resources
- `mailcow://system/status` - System status
- `mailcow://system/services` - Service status
- `mailcow://system/logs` - System logs
- `mailcow://system/config` - System configuration

## Resource Content Examples

### Domain List Resource
```json
{
  "uri": "mailcow://domains/",
  "content": {
    "domains": [
      {
        "domain": "example.com",
        "description": "Main company domain",
        "active": true,
        "mailboxes": 15,
        "aliases": 8,
        "quota_used": "2.1 GB",
        "quota_total": "10 GB"
      }
    ],
    "total": 1,
    "filters": {
      "active": true,
      "search": null
    }
  }
}
```

### Mailbox Details Resource
```json
{
  "uri": "mailcow://mailboxes/user@example.com",
  "content": {
    "email": "user@example.com",
    "name": "John Doe",
    "domain": "example.com",
    "active": true,
    "quota": {
      "used": "1.2 GB",
      "total": "5 GB",
      "percentage": 24
    },
    "last_login": "2024-01-15T10:30:00Z",
    "created": "2023-12-01T09:00:00Z",
    "forwarding": null,
    "spam_settings": {
      "enabled": true,
      "threshold": 5.0
    }
  }
}
```

### System Status Resource
```json
{
  "uri": "mailcow://system/status",
  "content": {
    "status": "healthy",
    "uptime": "15 days, 6 hours",
    "version": "mailcow: 2024-01",
    "services": {
      "postfix": "running",
      "dovecot": "running",
      "nginx": "running",
      "mysql": "running",
      "redis": "running"
    },
    "resources": {
      "cpu": "12%",
      "memory": "68%",
      "disk": "45%"
    },
    "last_updated": "2024-01-15T10:35:00Z"
  }
}
```

## Integration with MCP Protocol

### Resource Templates
```json
{
  "name": "Domain Details",
  "uriTemplate": "mailcow://domains/{domain}",
  "description": "Detailed information about a specific domain",
  "mimeType": "application/json"
}
```

### Resource Fetching
1. **URI Parsing**: Extract parameters from resource URI
2. **Permission Check**: Verify user has access to resource
3. **Data Fetching**: Retrieve data from Mailcow API
4. **Content Formatting**: Format response for MCP client
5. **Caching**: Cache frequently accessed resources

## Security Considerations

### 1. Access Control
- Resources check user permissions before returning data
- Read-only access by default
- Resource-specific permissions (domain, mailbox, etc.)

### 2. Data Filtering
- Sensitive information filtered based on permissions
- Personal data protection for mailbox resources
- Admin-only system information

### 3. URI Validation
- All URI parameters validated and sanitized
- Protection against path traversal attacks
- Rate limiting for resource access

## Caching Strategy

### 1. Cache Levels
- **Static Resources**: Long-term caching for configuration
- **Dynamic Resources**: Short-term caching for lists and status
- **Real-time Resources**: No caching for logs and live data

### 2. Cache Invalidation
- Automatic invalidation on data changes
- TTL-based expiration for time-sensitive data
- Manual cache clearing for admin operations

## Future Implementation Plan

### Phase 1: Core Infrastructure
1. Implement resource registry and base classes
2. Create URI routing and parameter extraction
3. Set up permission checking framework

### Phase 2: Domain Resources
1. Implement domain list and details resources
2. Add domain configuration resources
3. Create domain statistics resources

### Phase 3: Mailbox Resources
1. Implement mailbox list and details resources
2. Add quota and usage information resources
3. Create mailbox search and filtering

### Phase 4: System Resources
1. Implement system status resources
2. Add service monitoring resources
3. Create log access resources

### Phase 5: Advanced Features
1. Add real-time status updates
2. Implement resource subscriptions
3. Create export and backup resources

## Development Guidelines

When implementing resources:

1. **Follow Interface**: Implement the standard resource interface
2. **URI Design**: Use consistent and intuitive URI patterns
3. **Permission Aware**: Always check permissions before data access
4. **Content Type**: Use appropriate MIME types for content
5. **Caching**: Implement appropriate caching strategies
6. **Testing**: Write comprehensive unit tests
7. **Documentation**: Document all resources and URI patterns 