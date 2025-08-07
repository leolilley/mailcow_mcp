# 🚀 Quick Start Guide

Get the Mailcow MCP Server running in 5 minutes.

## 📦 Prerequisites

- Node.js 18+ 
- npm or yarn
- Access to a Mailcow server
- Mailcow API key

## 🏗️ Installation & Setup

```bash
# 1. Clone and install
git clone https://github.com/your-repo/mailcow-mcp
cd mailcow-mcp
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env with your Mailcow details

# 3. Build and test
npm run build
npm test
```

## 🔑 Environment Configuration

Create a `.env` file with your Mailcow configuration:

```bash
# Mailcow Server Configuration
MAILCOW_API_URL=https://your-mailcow-server.com
MAILCOW_API_KEY=your-32-character-api-key-here
MAILCOW_API_ACCESS_TYPE=read-write
MAILCOW_VERIFY_SSL=true

# MCP Server Configuration
MCP_SERVER_PORT=3000
MCP_LOG_LEVEL=info
```

### Getting Your API Key

1. Go to your Mailcow admin panel: `https://your-server.com/admin`
2. Navigate to **Configuration & Details** → **Access**  
3. Click **Add API Key**
4. Select **read-write** access for full functionality
5. Copy the generated key to your `.env` file

## 🚀 Running the Server

```bash
# Development mode (auto-restart)
npm run dev

# Production mode  
npm start

# With custom config
MAILCOW_API_URL=https://mail.example.com npm start
```

## ✅ Verify Installation

The server should start and show:
```
[INFO] Mailcow MCP Server initialized successfully
[INFO] Registered 20 tools
[INFO] MCP Server started successfully
```

Test connectivity:
```bash
# Test API connection
curl -X POST http://localhost:3000 \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

## 🛠️ Available Tools

Once running, you'll have access to **20 MCP tools**:

### Core System (3 tools)
- `health_check` - Server health status
- `get_config` - Configuration info  
- `test_api_connection` - Test Mailcow API

### Email Management (18 tools)
- **Domains**: list, get, create, update, delete
- **Mailboxes**: list, get, create, update, delete  
- **Queues**: list, get, flush, delete, hold, release
- **Sync Jobs**: list, get, create, update, delete, activate, deactivate
- **Logs**: get logs, errors, performance, access
- **Email**: send, check status, get templates

## 📊 Testing Your Setup

```bash
# Run full test suite
npm run test:all

# Check test coverage  
npm run test:coverage

# Integration tests (requires live Mailcow)
npm run test:integration
```

## 🐛 Troubleshooting

### Connection Issues
```bash
# Test Mailcow API directly
curl -H "X-API-Key: YOUR_KEY" https://your-server.com/api/v1/get/domain/all

# Check MCP server logs
npm run dev | grep ERROR
```

### Common Fixes
- **"Invalid API key"**: Check your key in Mailcow admin panel
- **"Connection refused"**: Verify `MAILCOW_API_URL` is correct
- **"Permission denied"**: Use `read-write` API key for full functionality  
- **"SSL verification failed"**: Set `MAILCOW_VERIFY_SSL=false` for self-signed certs

## 🔗 Next Steps

- **[Configuration Guide](CONFIGURATION.md)** - Detailed configuration options
- **[API Reference](API_REFERENCE.md)** - Complete tool documentation  
- **[Architecture](ARCHITECTURE.md)** - Understanding the system design
- **[Testing Guide](TESTING.md)** - Advanced testing and development

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/your-repo/mailcow-mcp/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-repo/mailcow-mcp/discussions)  
- **Documentation**: [Full Documentation](README.md)