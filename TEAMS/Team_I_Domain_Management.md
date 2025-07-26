# Team I: Domain Management

## 🎯 Mission
You are Team I, responsible for implementing domain management tools and resources for the Mailcow MCP server. Your work provides comprehensive domain management capabilities through MCP tools and resources.

## 📋 Your Responsibilities

### Core Files to Implement:
- `src/tools/domains/index.ts` - Domain tools exports
- `src/tools/domains/list-domains.ts` - List domains tool
- `src/tools/domains/create-domain.ts` - Create domain tool
- `src/tools/domains/update-domain.ts` - Update domain tool
- `src/tools/domains/delete-domain.ts` - Delete domain tool
- `src/tools/domains/get-domain-info.ts` - Get domain info tool
- `src/resources/domains/index.ts` - Domain resources exports
- `src/resources/domains/domains-list.ts` - Domains list resource
- `src/resources/domains/domain-details.ts` - Domain details resource
- `src/api/domains/domains.ts` - Domain API endpoints

> **IMPORTANT:** All type definitions must be imported from `src/types/index.ts`. Do **not** create new type files in the `src/tools/domains/` or `src/resources/domains/` folders. If you need a new type, add it to the appropriate file in `src/types/` and export it via `src/types/index.ts`.

## 📚 Required Reading
1. **Read `src/tools/README.md`** - Tool implementation guidelines
2. **Read `src/resources/README.md`** - Resource implementation guidelines
3. **Read `src/api/README.md`** - API client patterns
4. **Read `src/types/README.md`** - Type definitions you'll use
5. **Read `PLAN.md`** - Overall project plan and domain requirements
6. **Read `IMPLEMENTATION_GUIDE.md`** - Your team assignment details

## 🎯 Key Deliverables

### 1. Domain Management Tools
- `list_domains` - List all domains with filtering and pagination
- `create_domain` - Create new domain with validation
- `update_domain` - Update domain settings
- `delete_domain` - Delete domain with confirmation
- `get_domain_info` - Get detailed domain information

### 2. Domain Resources
- `domains` - List of all domains (JSON resource)
- `domain_details` - Detailed domain information (JSON resource)

### 3. Domain API Endpoints
- Domain CRUD operations
- Domain validation
- Domain error handling
- Domain response formatting

## 🔗 Dependencies
- **Team A** - You depend on their types and configuration
- **Team C** - You depend on their API client
- **Team E** - You depend on their tool registry and base classes
- **Team F** - You depend on their resource registry and base classes
- **Dependents:** None

## 🚀 Implementation Guidelines

> **Type Usage:** All types must be imported from `src/types/index.ts`. Do not define or use types from any local type file in your feature folders.

### 1. Domain Tools
Implement domain management tools:

```typescript
// src/tools/domains/list-domains.ts
export class ListDomainsTool extends BaseTool {
  readonly name = 'list_domains';
  readonly description = 'List all domains in the Mailcow system';
  readonly inputSchema = {
    type: 'object',
    properties: {
      includeInactive: {
        type: 'boolean',
        description: 'Include inactive domains in the results',
        default: false,
      },
      limit: {
        type: 'number',
        description: 'Maximum number of domains to return',
        minimum: 1,
        maximum: 100,
        default: 50,
      },
      offset: {
        type: 'number',
        description: 'Number of domains to skip',
        minimum: 0,
        default: 0,
      },
    },
    required: [],
  };

  async execute(params: ListDomainsInput, context: ToolContext): Promise<ToolResult> {
    try {
      // Validate permissions
      if (!this.validatePermissions(context, ['domains:read'])) {
        throw new ToolPermissionError(this.name, ['domains:read']);
      }

      // Get domains from API
      const domains = await context.apiClient.domains.listDomains(params);
      
      return {
        success: true,
        data: {
          domains,
          total: domains.length,
          limit: params.limit || 50,
          offset: params.offset || 0,
        },
      };
    } catch (error) {
      return this.handleError(error as Error);
    }
  }
}
```

```typescript
// src/tools/domains/create-domain.ts
export class CreateDomainTool extends BaseTool {
  readonly name = 'create_domain';
  readonly description = 'Create a new domain in the Mailcow system';
  readonly inputSchema = {
    type: 'object',
    properties: {
      domain: {
        type: 'string',
        description: 'Domain name to create',
        pattern: '^[a-zA-Z0-9.-]+$',
        minLength: 1,
        maxLength: 253,
      },
      description: {
        type: 'string',
        description: 'Optional description for the domain',
        maxLength: 500,
      },
      quota: {
        type: 'number',
        description: 'Domain quota in bytes',
        minimum: 0,
        default: 0,
      },
      active: {
        type: 'boolean',
        description: 'Whether the domain is active',
        default: true,
      },
    },
    required: ['domain'],
  };

  async execute(params: CreateDomainInput, context: ToolContext): Promise<ToolResult> {
    try {
      // Validate permissions
      if (!this.validatePermissions(context, ['domains:write'])) {
        throw new ToolPermissionError(this.name, ['domains:write']);
      }

      // Validate domain format
      if (!validateDomain(params.domain)) {
        throw new ToolValidationError(this.name, [
          { message: 'Invalid domain format', path: 'domain' }
        ]);
      }

      // Create domain via API
      const domain = await context.apiClient.domains.createDomain(params);
      
      return {
        success: true,
        data: domain,
      };
    } catch (error) {
      return this.handleError(error as Error);
    }
  }
}
```

### 2. Domain Resources
Implement domain resources:

```typescript
// src/resources/domains/domains-list.ts
export class DomainsResource extends BaseResource {
  readonly uri = 'mailcow://domains';
  readonly name = 'Domains';
  readonly description = 'List of all domains in the Mailcow system';
  readonly mimeType = 'application/json';

  async getContent(context: ResourceContext): Promise<ResourceContent> {
    try {
      // Validate permissions
      if (!this.validatePermissions(context, ['domains:read'])) {
        throw new ResourceAccessError(this.uri, 'Insufficient permissions');
      }

      const domains = await context.apiClient.domains.listDomains();
      
      return {
        content: JSON.stringify(domains, null, 2),
        mimeType: this.mimeType,
        encoding: 'utf-8',
      };
    } catch (error) {
      return this.handleError(error as Error);
    }
  }
}
```

```typescript
// src/resources/domains/domain-details.ts
export class DomainDetailsResource extends BaseResource {
  readonly uri = 'mailcow://domains/{domainId}';
  readonly name = 'Domain Details';
  readonly description = 'Detailed information about a specific domain';
  readonly mimeType = 'application/json';

  async getContent(context: ResourceContext): Promise<ResourceContent> {
    try {
      const domainId = context.requestParams?.domainId as string;
      if (!domainId) {
        throw new Error('Domain ID is required');
      }

      // Validate permissions
      if (!this.validatePermissions(context, ['domains:read'])) {
        throw new ResourceAccessError(this.uri, 'Insufficient permissions');
      }

      const domain = await context.apiClient.domains.getDomainDetails(domainId);
      
      return {
        content: JSON.stringify(domain, null, 2),
        mimeType: this.mimeType,
        encoding: 'utf-8',
      };
    } catch (error) {
      return this.handleError(error as Error);
    }
  }
}
```

### 3. Domain API Endpoints
Implement domain API endpoints:

```typescript
// src/api/domains/domains.ts
export class DomainAPI {
  constructor(private client: APIClient) {}

  async listDomains(params?: ListDomainsParams): Promise<MailcowDomain[]> {
    const queryParams = new URLSearchParams();
    
    if (params?.includeInactive !== undefined) {
      queryParams.append('includeInactive', params.includeInactive.toString());
    }
    if (params?.limit) {
      queryParams.append('limit', params.limit.toString());
    }
    if (params?.offset) {
      queryParams.append('offset', params.offset.toString());
    }

    const url = `/api/v1/domains${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return this.client.get(url);
  }

  async createDomain(domain: CreateDomainRequest): Promise<MailcowDomain> {
    // Validate domain request
    this.validateCreateDomainRequest(domain);
    
    return this.client.post('/api/v1/domains', domain);
  }

  async updateDomain(domainId: string, updates: UpdateDomainRequest): Promise<MailcowDomain> {
    // Validate update request
    this.validateUpdateDomainRequest(updates);
    
    return this.client.put(`/api/v1/domains/${domainId}`, updates);
  }

  async deleteDomain(domainId: string): Promise<void> {
    return this.client.delete(`/api/v1/domains/${domainId}`);
  }

  async getDomainDetails(domainId: string): Promise<MailcowDomain> {
    return this.client.get(`/api/v1/domains/${domainId}`);
  }

  private validateCreateDomainRequest(request: CreateDomainRequest): void {
    if (!request.domain || !validateDomain(request.domain)) {
      throw new ValidationError('Invalid domain format');
    }
    
    if (request.quota && request.quota < 0) {
      throw new ValidationError('Quota must be non-negative');
    }
  }

  private validateUpdateDomainRequest(request: UpdateDomainRequest): void {
    if (request.domain && !validateDomain(request.domain)) {
      throw new ValidationError('Invalid domain format');
    }
    
    if (request.quota !== undefined && request.quota < 0) {
      throw new ValidationError('Quota must be non-negative');
    }
  }
}
```

## 🧪 Testing Requirements
- Unit tests for all domain tools
- Unit tests for all domain resources
- Unit tests for domain API endpoints
- Integration tests with mock Mailcow API
- Error handling tests
- Permission validation tests

## 📝 Documentation Requirements
- JSDoc comments for all public methods
- Domain management guide
- Tool usage examples
- Resource usage examples
- API endpoint documentation

## 🔄 Communication with Other Teams
- Use interfaces provided by Teams A, C, E, F
- Follow patterns established by other teams
- Document any domain-specific requirements
- Share domain management patterns with other teams

## ✅ Success Criteria
- [ ] All domain tools work correctly
- [ ] All domain resources work correctly
- [ ] Domain API endpoints are comprehensive
- [ ] Error handling is robust
- [ ] Permission validation works correctly
- [ ] All tests pass
- [ ] Documentation is complete

## 🚨 Important Considerations

### 1. Domain Validation
- Validate domain format (RFC 1123)
- Check for reserved domain names
- Validate domain length and characters
- Handle internationalized domain names

### 2. Permission Management
- Check domain read permissions
- Check domain write permissions
- Handle permission errors gracefully
- Log permission checks

### 3. Error Handling
- Handle domain not found errors
- Handle domain already exists errors
- Handle validation errors
- Provide meaningful error messages

### 4. Performance
- Implement efficient domain listing
- Support pagination for large domain lists
- Cache domain information when appropriate
- Monitor domain operation performance

## 🔧 Mock Implementations for Testing
Create mock implementations for testing:

```typescript
// src/tools/domains/mocks.ts
export const mockDomains: MailcowDomain[] = [
  {
    id: 'domain-1',
    domain: 'example.com',
    description: 'Example domain',
    active: true,
    quota: 1073741824, // 1GB
    created: new Date('2024-01-01T00:00:00Z'),
    modified: new Date('2024-01-01T00:00:00Z'),
  },
  {
    id: 'domain-2',
    domain: 'test.com',
    description: 'Test domain',
    active: false,
    quota: 536870912, // 512MB
    created: new Date('2024-01-02T00:00:00Z'),
    modified: new Date('2024-01-02T00:00:00Z'),
  },
];

export class MockDomainAPI {
  async listDomains(): Promise<MailcowDomain[]> {
    return mockDomains;
  }

  async createDomain(domain: CreateDomainRequest): Promise<MailcowDomain> {
    return {
      id: `domain-${Date.now()}`,
      domain: domain.domain,
      description: domain.description || '',
      active: domain.active ?? true,
      quota: domain.quota || 0,
      created: new Date(),
      modified: new Date(),
    };
  }
}
```

## 📞 Team Communication
- Use interfaces provided by Teams A, C, E, F
- Follow patterns established by other teams
- Document any domain-specific requirements
- Share domain management patterns with other teams

## 🎯 Next Steps
1. Read the README files thoroughly
2. Implement domain tools following Team E's patterns
3. Implement domain resources following Team F's patterns
4. Implement domain API endpoints following Team C's patterns
5. Write comprehensive tests
6. Update documentation
7. Share implementations with the main server

**Remember:** Your domain management tools and resources provide essential functionality for Mailcow administrators. Focus on reliability, security, and comprehensive domain management capabilities. 
