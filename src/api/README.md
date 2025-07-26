# API Client Directory

This directory contains the HTTP client and API endpoint handlers for communicating with the Mailcow API.

## Mailcow API Alignment Analysis

### ✅ **Correctly Implemented:**

1. **API Endpoint Structure**: Our implementation correctly uses the action-based pattern that Mailcow uses:
   - `/api/v1/get/domain` ✅
   - `/api/v1/add/domain` ✅  
   - `/api/v1/edit/domain` ✅
   - `/api/v1/delete/domain` ✅

2. **Authentication**: We correctly implement API key authentication as mentioned in the docs

3. **Basic CRUD Operations**: Our domain, mailbox, and alias operations align with the documented patterns

### ❌ **Missing API Endpoints:**

Based on Mailcow documentation analysis, we need to implement:

1. **User Management**:
   - `/api/v1/get/user` - List users
   - `/api/v1/add/user` - Create user
   - `/api/v1/edit/user` - Update user
   - `/api/v1/delete/user` - Delete user

2. **Quarantine Management**:
   - `/api/v1/get/quarantine` - List quarantined items
   - `/api/v1/edit/quarantine` - Release/delete quarantined items

3. **DKIM Management**:
   - `/api/v1/get/dkim` - Get DKIM keys
   - `/api/v1/add/dkim` - Add DKIM key
   - `/api/v1/edit/dkim` - Update DKIM key
   - `/api/v1/delete/dkim` - Delete DKIM key

4. **TLS Policy Management**:
   - `/api/v1/get/tls-policy` - Get TLS policies
   - `/api/v1/add/tls-policy` - Add TLS policy
   - `/api/v1/edit/tls-policy` - Update TLS policy
   - `/api/v1/delete/tls-policy` - Delete TLS policy

5. **OAuth2 Management**:
   - `/api/v1/get/oauth2` - Get OAuth2 clients
   - `/api/v1/add/oauth2` - Add OAuth2 client
   - `/api/v1/edit/oauth2` - Update OAuth2 client
   - `/api/v1/delete/oauth2` - Delete OAuth2 client

6. **App Passwords**:
   - `/api/v1/get/app-passwd` - Get app passwords
   - `/api/v1/add/app-passwd` - Add app password
   - `/api/v1/delete/app-passwd` - Delete app password

7. **Rspamd Management**:
   - `/api/v1/get/rspamd` - Get Rspamd settings
   - `/api/v1/edit/rspamd` - Update Rspamd settings

8. **Backup Management**:
   - `/api/v1/get/backup` - Get backup status
   - `/api/v1/add/backup` - Create backup
   - `/api/v1/edit/backup` - Update backup settings

### 🔄 **Implementation Status:**

- **Domains**: ✅ Complete
- **Mailboxes**: ✅ Complete  
- **Aliases**: ✅ Complete
- **Users**: ✅ Complete
- **DKIM**: ✅ Complete
- **Quarantine**: ✅ Complete
- **TLS Policy**: ✅ Complete
- **OAuth2**: ✅ Complete
- **App Passwords**: ✅ Complete
- **Rspamd**: ✅ Complete
- **Resources**: ✅ Complete
- **Spam**: ✅ Complete
- **System**: ✅ Complete
- **Logs**: ✅ Complete
- **Backup**: ❌ Missing (partially implemented in System API)

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

### 7. User Management (`users/`)
- `UsersAPI` class with CRUD operations
- List users: `GET /api/v1/get/user`
- Create user: `POST /api/v1/add/user`
- Update user: `POST /api/v1/edit/user`
- Delete user: `POST /api/v1/delete/user`
- User activation/deactivation and quota management

### 8. DKIM Management (`dkim/`)
- `DKIMAPI` class with CRUD operations
- List DKIM keys: `GET /api/v1/get/dkim`
- Create DKIM key: `POST /api/v1/add/dkim`
- Update DKIM key: `POST /api/v1/edit/dkim`
- Delete DKIM key: `POST /api/v1/delete/dkim`
- DNS record generation and validation

### 9. Quarantine Management (`quarantine/`)
- `QuarantineAPI` class for quarantined email management
- List quarantined items: `GET /api/v1/get/quarantine`
- Release/delete items: `POST /api/v1/edit/quarantine`
- Whitelist/blacklist management
- Statistics and filtering capabilities

### 10. TLS Policy Management (`tls-policy/`)
- `TLSPolicyAPI` class with CRUD operations
- List TLS policies: `GET /api/v1/get/tls-policy`
- Create TLS policy: `POST /api/v1/add/tls-policy`
- Update TLS policy: `POST /api/v1/edit/tls-policy`
- Delete TLS policy: `POST /api/v1/delete/tls-policy`
- Policy validation and security assessment

### 11. OAuth2 Management (`oauth2/`)
- `OAuth2API` class with CRUD operations
- List OAuth2 clients: `GET /api/v1/get/oauth2`
- Create OAuth2 client: `POST /api/v1/add/oauth2`
- Update OAuth2 client: `POST /api/v1/edit/oauth2`
- Delete OAuth2 client: `POST /api/v1/delete/oauth2`
- Authorization URL generation and scope management

### 12. App Passwords Management (`app-passwords/`)
- `AppPasswordsAPI` class for application password management
- List app passwords: `GET /api/v1/get/app-passwd`
- Create app password: `POST /api/v1/add/app-passwd`
- Delete app password: `POST /api/v1/delete/app-passwd`
- Password expiration and usage tracking

### 13. Rspamd Management (`rspamd/`)
- `RspamdAPI` class for Rspamd settings management
- Get Rspamd settings: `GET /api/v1/get/rspamd`
- Update Rspamd settings: `POST /api/v1/edit/rspamd`
- Whitelist/blacklist management
- Score threshold and feature configuration

### 14. Resource Management (`resources/`)
- `ResourcesAPI` class for service management
- List services: `GET /api/v1/get/services`
- Get service details: Filter from list results
- Get services by category: Client-side filtering

### 15. Spam Management (`spam/`)
- `SpamAPI` class for spam settings
- Get spam settings: `GET /api/v1/get/spam/settings`
- Update spam settings: `POST /api/v1/edit/spam/settings`
- Whitelist/blacklist management through settings updates

### 16. System Management (`system/`)
- `SystemAPI` class for system operations
- Get system status: `GET /api/v1/get/system/status`
- Get service status: `GET /api/v1/get/system/services`
- Restart service: `POST /api/v1/edit/system/service`
- Backup management: `GET/POST /api/v1/get|add/system/backup`

### 17. Log Management (`logs/`)
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