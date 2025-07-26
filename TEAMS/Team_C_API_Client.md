# Team C: API Client and HTTP Layer

## 🎯 Mission
You are Team C, responsible for implementing the HTTP client and API endpoint handlers for communicating with the Mailcow API. Your work provides the foundation for all domain-specific API operations.

## 📋 Your Responsibilities

### Core Files to Implement:
- `src/api/index.ts` - Main API client exports
- `src/api/client.ts` - Core HTTP client implementation
- `src/api/endpoints.ts` - API endpoint definitions
- `src/api/errors.ts` - API error handling
- `src/api/utils.ts` - API utility functions
> **IMPORTANT:** All type definitions must be imported from `src/types/index.ts`. Do **not** create new type files in the `src/api/` folder. If you need a new type, add it to the appropriate file in `src/types/` and export it via `src/types/index.ts`.
- `src/api/domains/index.ts` - Domain API endpoints
- `src/api/mailboxes/index.ts` - Mailbox API endpoints
- `src/api/aliases/index.ts` - Alias API endpoints
- `src/api/resources/index.ts` - Resource API endpoints
- `src/api/spam/index.ts` - Spam API endpoints
- `src/api/logs/index.ts` - Log API endpoints
- `src/api/system/index.ts` - System API endpoints

## 📚 Required Reading
1. **Read `src/api/README.md`** - Complete implementation guidelines for API client
2. **Read `src/types/README.md`** - Type definitions you'll use
3. **Read `src/auth/README.md`** - Authentication patterns you'll integrate
4. **Read `PLAN.md`** - Overall project plan and API requirements
5. **Read `IMPLEMENTATION_GUIDE.md`** - Your team assignment details

## 🎯 Key Deliverables

### 1. HTTP Client Implementation
- Axios-based HTTP client with proper configuration
- Request/response interceptors for authentication
- Automatic retry with exponential backoff
- Rate limiting implementation
- Error handling and logging

### 2. API Endpoint Handlers
- Domain management endpoints (CRUD operations)
- Mailbox management endpoints (CRUD operations)
- Alias management endpoints (CRUD operations)
- Resource management endpoints
- Spam management endpoints
- System management endpoints
- Log management endpoints

### 3. Error Handling
- API error types and mapping
- Network error handling
- Authentication error handling
- Rate limit handling
- Retry logic for transient failures

### 4. Request/Response Processing
- Request parameter validation
- Response data validation
- Pagination handling
- Filtering and sorting support
- Data transformation utilities

## 🔗 Dependencies
- **Team A** - You depend on their types and configuration
- **Team B** - You depend on their authentication system
- **Dependents:** Teams I-P (domain implementations)

## 🚀 Implementation Guidelines

> **Type Usage:** All types must be imported from `src/types/index.ts`. Do not define or use types from `src/api/types.ts` or any other local type file.

### 1. HTTP Client
Implement the core HTTP client:

```typescript
// src/api/client.ts
export class APIClient {
  constructor(
    private config: APIConfig,
    private auth: AuthManager
  ) {
    this.setupInterceptors();
  }
  
  private setupInterceptors(): void {
    // Add authentication headers
    this.client.interceptors.request.use(async (config) => {
      const session = await this.auth.getCurrentSession();
      config.headers.Authorization = `Bearer ${session.apiKey}`;
      return config;
    });
    
    // Handle responses and errors
    this.client.interceptors.response.use(
      (response) => response,
      (error) => this.handleError(error)
    );
  }
  
  async get<T>(url: string, params?: Record<string, unknown>): Promise<T> {
    const response = await this.client.get(url, { params });
    return response.data;
  }
  
  async post<T>(url: string, data?: unknown): Promise<T> {
    const response = await this.client.post(url, data);
    return response.data;
  }
  
  // Add PUT, DELETE methods...
}
```

### 2. Domain API Endpoints
Implement domain management endpoints:

```typescript
// src/api/domains/index.ts
export class DomainAPI {
  constructor(private client: APIClient) {}
  
  async listDomains(params?: ListDomainsParams): Promise<MailcowDomain[]> {
    return this.client.get('/api/v1/domains', params);
  }
  
  async createDomain(domain: CreateDomainRequest): Promise<MailcowDomain> {
    return this.client.post('/api/v1/domains', domain);
  }
  
  async updateDomain(domainId: string, updates: UpdateDomainRequest): Promise<MailcowDomain> {
    return this.client.put(`/api/v1/domains/${domainId}`, updates);
  }
  
  async deleteDomain(domainId: string): Promise<void> {
    return this.client.delete(`/api/v1/domains/${domainId}`);
  }
  
  async getDomainDetails(domainId: string): Promise<MailcowDomain> {
    return this.client.get(`/api/v1/domains/${domainId}`);
  }
}
```

### 3. Error Handling
Implement comprehensive error handling:

```typescript
// src/api/errors.ts
export class APIError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public response?: any
  ) {
    super(message);
    this.name = 'APIError';
  }
}

export class AuthenticationError extends APIError {
  constructor(message: string) {
    super(message, 401);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends APIError {
  constructor(message: string) {
    super(message, 403);
    this.name = 'AuthorizationError';
  }
}

export function handleAPIError(error: any): never {
  if (error.response) {
    const { status, data } = error.response;
    switch (status) {
      case 401:
        throw new AuthenticationError('Invalid API key');
      case 403:
        throw new AuthorizationError('Insufficient permissions');
      case 404:
        throw new NotFoundError('Resource not found');
      default:
        throw new APIError(`Request failed: ${data?.message || error.message}`, status);
    }
  }
  throw new NetworkError('Network error occurred');
}
```

### 4. Rate Limiting
Implement rate limiting and retry logic:

```typescript
// src/api/utils.ts
export class RateLimiter {
  private requests: number[] = [];
  
  async checkRateLimit(): Promise<boolean> {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    
    // Remove old requests
    this.requests = this.requests.filter(time => time > oneMinuteAgo);
    
    if (this.requests.length >= 60) { // 60 requests per minute
      return false;
    }
    
    this.requests.push(now);
    return true;
  }
}

export async function withRetry<T>(
  operation: () => Promise<T>,
  maxAttempts: number = 3
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt === maxAttempts || !isRetryableError(error)) {
        throw lastError;
      }
      
      const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError!;
}
```

## 🧪 Testing Requirements
- Unit tests for all API endpoints
- Unit tests for error handling
- Unit tests for rate limiting
- Unit tests for retry logic
- Integration tests with mock Mailcow API
- Performance tests for rate limiting

## 📝 Documentation Requirements
- JSDoc comments for all public methods
- API endpoint documentation
- Error handling documentation
- Rate limiting documentation

## 🔄 Communication with Other Teams
- Provide clear API interfaces for Teams I-P
- Document authentication integration for Team B
- Share error handling patterns with other teams
- Communicate API changes clearly

## ✅ Success Criteria
- [ ] HTTP client handles all request types correctly
- [ ] All API endpoints are implemented
- [ ] Error handling is comprehensive
- [ ] Rate limiting works correctly
- [ ] Retry logic handles transient failures
- [ ] All tests pass
- [ ] Documentation is complete

## 🚨 Important Considerations

### 1. Authentication Integration
- Integrate with Team B's authentication system
- Handle authentication errors gracefully
- Refresh sessions when needed
- Log authentication events

### 2. Error Handling
- Map HTTP status codes to appropriate errors
- Handle network errors separately
- Provide meaningful error messages
- Log errors for debugging

### 3. Rate Limiting
- Respect Mailcow API rate limits
- Implement exponential backoff
- Handle rate limit errors gracefully
- Monitor rate limit usage

### 4. Performance
- Optimize request/response handling
- Implement connection pooling
- Cache responses when appropriate
- Monitor API performance

## 🔧 Mock Implementations for Testing
Create mock implementations for Teams I-P to use:

```typescript
// src/api/mocks.ts
export class MockAPIClient {
  async get<T>(url: string): Promise<T> {
    // Return mock data based on URL
    if (url.includes('/domains')) {
      return mockDomains as T;
    }
    if (url.includes('/mailboxes')) {
      return mockMailboxes as T;
    }
    throw new NotFoundError('Mock endpoint not found');
  }
  
  async post<T>(url: string, data: unknown): Promise<T> {
    // Return mock created data
    return { id: 'mock-id', ...data } as T;
  }
}
```

## 📞 Team Communication
- Provide clear API interfaces for Teams I-P
- Document authentication integration for Team B
- Share error handling patterns with other teams
- Communicate API changes clearly

## 🎯 Next Steps
1. Read the README files thoroughly
2. Implement the HTTP client
3. Implement API endpoint handlers
4. Implement error handling
5. Implement rate limiting and retry logic
6. Write comprehensive tests
7. Update documentation
8. Share interfaces with dependent teams

**Remember:** Your API client is the foundation for all domain-specific operations. Focus on reliability, error handling, and clear interfaces for other teams to use. 