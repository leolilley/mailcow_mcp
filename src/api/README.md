# API Client Directory

This directory contains the HTTP client and API endpoint handlers for communicating with the Mailcow API.

## File Structure

```
api/
├── index.ts              # Main API client exports
├── client.ts             # Core HTTP client implementation
├── endpoints.ts          # API endpoint definitions
├── domains/             # Domain management endpoints
├── mailboxes/           # Mailbox management endpoints
├── aliases/             # Alias management endpoints
├── resources/           # Resource management endpoints
├── spam/                # Spam management endpoints
├── logs/                # Log management endpoints
├── system/              # System management endpoints
└── errors.ts            # API error handling
```

## Implementation Guidelines

### 1. `index.ts`
- Export all API module classes
- Provide API client exports
- Include endpoint helper exports
- Export API error types

### 2. `client.ts`
- Implement the core HTTP client using Axios
- Handle request/response processing with interceptors
- Integrate with AuthManager for authentication
- Provide comprehensive error handling

**Key Features:**
- Axios-based HTTP client with TypeScript generics
- Request/response interceptors for auth and error handling
- Authentication header management via X-API-Key
- Proper error handling and logging
- Uses `APIConfig` from `src/types/config.ts`
- Uses HTTP utilities from `src/utils/http.ts`

### 3. `endpoints.ts`
- Define Mailcow API endpoint constants
- Reflect actual Mailcow API patterns
- Document endpoint usage patterns

**Actual Mailcow API Patterns:**
```typescript
// Mailcow uses action-based endpoints, not RESTful:
GET  /api/v1/get/{resource}     // List/Get resources
POST /api/v1/add/{resource}     // Create resource
POST /api/v1/edit/{resource}    // Update resource  
POST /api/v1/delete/{resource}  // Delete resource
```

### 4. Domain Management (`domains/`)
- `DomainAPI` class with CRUD operations
- List domains: `GET /api/v1/get/domain`
- Create domain: `POST /api/v1/add/domain`
- Update domain: `POST /api/v1/edit/domain`
- Delete domain: `POST /api/v1/delete/domain`
- Get domain details: Filter from list results

### 5. Mailbox Management (`mailboxes/`)
- `MailboxAPI` class with CRUD operations
- List mailboxes: `GET /api/v1/get/mailbox`
- Create mailbox: `POST /api/v1/add/mailbox`
- Update mailbox: `POST /api/v1/edit/mailbox`
- Delete mailbox: `POST /api/v1/delete/mailbox`
- Set mailbox quota: Update with quota parameter

### 6. Alias Management (`aliases/`)
- `AliasAPI` class with CRUD operations
- List aliases: `GET /api/v1/get/alias`
- Create alias: `POST /api/v1/add/alias`
- Update alias: `POST /api/v1/edit/alias`
- Delete alias: `POST /api/v1/delete/alias`
- Get user aliases: Filter aliases by goto field

### 7. Resource Management (`resources/`)
- `ResourcesAPI` class for service management
- List services: `GET /api/v1/get/services`
- Get service details: Filter from list results
- Get services by category: Client-side filtering

### 8. Spam Management (`spam/`)
- `SpamAPI` class for spam settings
- Get spam settings: `GET /api/v1/get/spam/settings`
- Update spam settings: `POST /api/v1/edit/spam/settings`
- Whitelist/blacklist management through settings updates

### 9. System Management (`system/`)
- `SystemAPI` class for system operations
- Get system status: `GET /api/v1/get/system/status`
- Get service status: `GET /api/v1/get/system/services`
- Restart service: `POST /api/v1/edit/system/service`
- Backup management: `GET/POST /api/v1/get|add/system/backup`

### 10. Log Management (`logs/`)
- `LogsAPI` class for log retrieval
- Get logs: `GET /api/v1/get/logs`
- Filter by service type (access, error, performance)
- Client-side filtering for different log types

### 11. `errors.ts`
- Define API error classes extending base `APIError`
- Implement error handling utilities
- Include error categorization by HTTP status codes

## API Client Implementation

### Configuration Integration
```typescript
// Uses APIConfig from src/types/config.ts
import { APIConfig } from '../types';

const client = new APIClient(config);
```

### Authentication Integration
```typescript
// Integrates with AuthManager from src/auth
import { AuthManager } from '../auth';

// Auth header added via request interceptor
config.headers['X-API-Key'] = session.apiKey;
```

### Utilities Integration
```typescript
// Uses HTTP utilities from src/utils/http.ts
import { createHTTPClient, buildURL, validateResponse } from '../utils';
```

### Type Safety
```typescript
// All responses properly typed using src/types/mailcow.ts
async listDomains(): Promise<MailcowDomain[]> {
  return this.client.get<MailcowDomain[]>('/api/v1/get/domain');
}
```

## Error Handling

### API Error Classes
```typescript
export class APIError extends Error {
  constructor(message: string, public statusCode: number, public response?: any)
}

export class AuthenticationError extends APIError // 401
export class AuthorizationError extends APIError  // 403
export class NotFoundError extends APIError       // 404
export class NetworkError extends APIError        // Network issues
```

### Error Handling Pattern
```typescript
try {
  const result = await apiClient.get('/api/v1/get/domain');
  return result;
} catch (error) {
  throw handleAPIError(error); // Converts to appropriate APIError subclass
}
```

## Usage Examples

### Basic API Usage
```typescript
import { APIClient, DomainAPI } from './api';
import { config } from './config';

const apiClient = new APIClient(config.api);
const domainAPI = new DomainAPI(apiClient);

const domains = await domainAPI.listDomains();
const newDomain = await domainAPI.createDomain({
  domain: 'example.com',
  quota: 1000
});
```

### Error Handling
```typescript
try {
  const domain = await domainAPI.getDomainDetails('nonexistent.com');
} catch (error) {
  if (error instanceof NotFoundError) {
    console.log('Domain not found');
  } else if (error instanceof AuthenticationError) {
    console.log('Invalid API key');
  }
}
```

## Security Considerations

1. **API Key Security**: X-API-Key header, never logged
2. **HTTPS Only**: Always use HTTPS for API requests  
3. **Certificate Validation**: Configurable SSL verification
4. **Request Validation**: All parameters validated via TypeScript
5. **Response Validation**: Type-safe response handling
6. **Error Handling**: No sensitive information exposed in errors
7. **Rate Limiting**: Configurable via APIConfig
8. **Audit Logging**: Integrated with auth system 