# ⚙️ Configuration Guide

Complete guide to configuring the Mailcow MCP Server for your environment.

## 🔑 Environment Variables

### Required Configuration

```bash
# Mailcow Server Configuration
MAILCOW_API_URL=https://your-mailcow-server.com    # Your Mailcow server URL
MAILCOW_API_KEY=your-32-character-api-key-here     # API key from Mailcow admin
MAILCOW_API_ACCESS_TYPE=read-write                 # read-only | read-write
```

### Optional Configuration

```bash
# Security Settings
MAILCOW_VERIFY_SSL=true                            # SSL certificate verification
MAILCOW_TIMEOUT=30000                              # Request timeout (milliseconds)

# MCP Server Settings  
MCP_SERVER_PORT=3000                               # MCP server port
MCP_LOG_LEVEL=info                                 # debug | info | warn | error

# Performance Settings
MCP_RATE_LIMIT=100                                 # Requests per minute
MCP_SESSION_TIMEOUT=3600                           # Session timeout (seconds)

# Development Settings
NODE_ENV=production                                # development | production
DEBUG=mailcow-mcp:*                               # Debug logging
```

## 🗝️ Mailcow API Key Setup

### Step 1: Access Mailcow Admin Panel
1. Navigate to your Mailcow admin interface: `https://your-server.com/admin`
2. Log in with your admin credentials

### Step 2: Generate API Key  
1. Go to **Configuration & Details** → **Access**
2. Click **Add API Key** 
3. Configure the API key:
   - **Description**: "MCP Server Access"
   - **Access Rights**: Choose based on your needs:
     - **Read-only**: For monitoring and reporting only
     - **Read-write**: For full MCP functionality (recommended)
4. **IP Restrictions** (optional): Limit access to specific IPs
5. Click **Add** to generate the key

### Step 3: Copy API Key
1. Copy the generated 32-character API key
2. Add it to your `.env` file as `MAILCOW_API_KEY`

⚠️ **Security Note**: Store API keys securely and never commit them to version control.

## 📁 Configuration Files

### Environment File (.env)

Create a `.env` file in your project root:

```bash
# Copy from .env.example
cp .env.example .env

# Edit with your settings
nano .env
```

Example `.env` file:
```bash
# Mailcow Configuration
MAILCOW_API_URL=https://mail.company.com
MAILCOW_API_KEY=abcd1234efgh5678ijkl9012mnop3456
MAILCOW_API_ACCESS_TYPE=read-write
MAILCOW_VERIFY_SSL=true
MAILCOW_TIMEOUT=30000

# MCP Server Configuration
MCP_SERVER_PORT=3000
MCP_LOG_LEVEL=info
MCP_RATE_LIMIT=100
MCP_SESSION_TIMEOUT=3600

# Production Settings
NODE_ENV=production
```

### TypeScript Configuration (tsconfig.json)

The project includes a pre-configured `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs", 
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

## 🏗️ Configuration Validation

The server performs automatic configuration validation on startup:

### Required Settings Check
- Validates `MAILCOW_API_URL` format
- Checks `MAILCOW_API_KEY` length and format
- Verifies access type is valid

### API Connectivity Test
```bash
# Test API connection
npm run test:api

# Manual connection test
curl -H "X-API-Key: YOUR_KEY" https://your-server.com/api/v1/get/domain/all
```

### Configuration Debugging
```bash
# View current configuration (sanitized)
npm start # Then call the get_config tool

# Debug mode with detailed logging
DEBUG=mailcow-mcp:* MCP_LOG_LEVEL=debug npm start
```

## 🌍 Environment-Specific Configuration

### Development Environment

```bash
# .env.development
MAILCOW_API_URL=https://mailcow-dev.company.com
MAILCOW_API_KEY=dev-api-key-32-characters-here
MAILCOW_API_ACCESS_TYPE=read-only
MAILCOW_VERIFY_SSL=false
MCP_LOG_LEVEL=debug
NODE_ENV=development
DEBUG=mailcow-mcp:*
```

### Staging Environment  

```bash  
# .env.staging
MAILCOW_API_URL=https://mailcow-staging.company.com
MAILCOW_API_KEY=staging-api-key-32-characters-here
MAILCOW_API_ACCESS_TYPE=read-write
MAILCOW_VERIFY_SSL=true
MCP_LOG_LEVEL=info
NODE_ENV=staging
```

### Production Environment

```bash
# .env.production  
MAILCOW_API_URL=https://mail.company.com
MAILCOW_API_KEY=prod-api-key-32-characters-here
MAILCOW_API_ACCESS_TYPE=read-write
MAILCOW_VERIFY_SSL=true
MCP_LOG_LEVEL=warn
NODE_ENV=production
MCP_RATE_LIMIT=200
```

## 🔒 Security Configuration

### SSL/TLS Settings

```bash
# Strict SSL verification (production)
MAILCOW_VERIFY_SSL=true

# Disable for self-signed certificates (development only)
MAILCOW_VERIFY_SSL=false
```

### Rate Limiting

```bash
# Conservative rate limiting
MCP_RATE_LIMIT=50         # 50 requests per minute

# Moderate rate limiting  
MCP_RATE_LIMIT=100        # 100 requests per minute (default)

# Aggressive rate limiting
MCP_RATE_LIMIT=200        # 200 requests per minute
```

### API Access Control

```bash
# Read-only access (monitoring only)
MAILCOW_API_ACCESS_TYPE=read-only

# Full access (create, update, delete)
MAILCOW_API_ACCESS_TYPE=read-write
```

## 📊 Logging Configuration

### Log Levels

```bash
# Minimal logging (production)
MCP_LOG_LEVEL=error

# Standard logging  
MCP_LOG_LEVEL=info        # Default

# Detailed logging (development)
MCP_LOG_LEVEL=debug

# All logging (troubleshooting)
MCP_LOG_LEVEL=debug
DEBUG=mailcow-mcp:*
```

### Log Formats

The server uses structured JSON logging:

```json
{
  "timestamp": "2023-12-07T10:30:00.000Z",
  "level": "info", 
  "message": "Tool executed successfully",
  "tool": "list_domains",
  "duration": 245,
  "user": "system"
}
```

## 🐳 Docker Configuration

### Docker Environment

```bash
# docker-compose.yml environment section
environment:
  - MAILCOW_API_URL=https://mail.company.com
  - MAILCOW_API_KEY_FILE=/run/secrets/mailcow_api_key
  - MAILCOW_API_ACCESS_TYPE=read-write
  - MCP_LOG_LEVEL=info
```

### Docker Secrets

```yaml
# docker-compose.yml
services:
  mailcow-mcp:
    secrets:
      - mailcow_api_key
    environment:
      - MAILCOW_API_KEY_FILE=/run/secrets/mailcow_api_key

secrets:
  mailcow_api_key:
    external: true
```

## 🔧 Advanced Configuration

### Custom Configuration Loading

The server supports custom configuration sources:

```typescript
// Custom config loader
import { configManager } from './src/config';

// Load from custom source
const customConfig = {
  mailcow: {
    apiUrl: process.env.CUSTOM_MAILCOW_URL,
    // ...other settings
  }
};

await configManager.loadConfig(customConfig);
```

### Runtime Configuration Updates

```bash  
# Hot reload configuration (development)
SIGHUP process_id   # Reloads configuration without restart

# API endpoint for config updates (if enabled)
POST /api/config/reload
```

## 🚨 Troubleshooting Configuration

### Common Issues

#### Invalid API Key
```bash
# Symptoms: "Authentication failed" errors
# Solution: Check API key in Mailcow admin panel

# Test API key directly
curl -H "X-API-Key: YOUR_KEY" https://your-server.com/api/v1/get/domain/all
```

#### SSL Certificate Issues  
```bash
# Symptoms: "SSL verification failed"
# Temporary fix: MAILCOW_VERIFY_SSL=false
# Proper fix: Update SSL certificates on Mailcow server
```

#### Connection Timeouts
```bash
# Symptoms: Request timeout errors
# Solution: Increase timeout value
MAILCOW_TIMEOUT=60000  # 60 seconds
```

#### Port Conflicts
```bash
# Symptoms: "Port already in use"
# Solution: Change MCP server port
MCP_SERVER_PORT=3001
```

### Configuration Validation

```bash
# Validate configuration before starting
npm run config:validate

# Test all configuration settings
npm run config:test

# View parsed configuration (sanitized)
npm run config:show
```

### Health Checks

```bash
# Basic health check
curl http://localhost:3000/health

# Detailed health check with configuration
curl http://localhost:3000/health/detailed

# MCP protocol health check  
curl -X POST http://localhost:3000 \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"health_check"}'
```

## 📚 Configuration Examples

### Minimal Configuration
```bash
# Absolute minimum for testing
MAILCOW_API_URL=https://mail.example.com
MAILCOW_API_KEY=your32characterapikeyhere12345
```

### Development Configuration
```bash
MAILCOW_API_URL=https://mailcow-dev.local
MAILCOW_API_KEY=dev12345678901234567890123456789012
MAILCOW_API_ACCESS_TYPE=read-only
MAILCOW_VERIFY_SSL=false
MCP_LOG_LEVEL=debug
NODE_ENV=development
DEBUG=mailcow-mcp:*
```

### Production Configuration
```bash
MAILCOW_API_URL=https://mail.company.com
MAILCOW_API_KEY=prod1234567890123456789012345678901
MAILCOW_API_ACCESS_TYPE=read-write
MAILCOW_VERIFY_SSL=true
MAILCOW_TIMEOUT=30000
MCP_SERVER_PORT=3000
MCP_LOG_LEVEL=warn
MCP_RATE_LIMIT=200
MCP_SESSION_TIMEOUT=3600
NODE_ENV=production
```

For more configuration options and advanced use cases, see the [API Reference](API_REFERENCE.md) and [Architecture](ARCHITECTURE.md) documentation.