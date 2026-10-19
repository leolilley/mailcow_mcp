# 📧 Mailcow MCP Server

> **Model Context Protocol (MCP) server for complete Mailcow email server management**

[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![MCP](https://img.shields.io/badge/MCP-0.4.0-green.svg)](https://modelcontextprotocol.io/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

A comprehensive TypeScript implementation that provides AI models with full control over Mailcow email servers through the Model Context Protocol. Manage domains, mailboxes, queues, sync jobs, and send emails - all with a single, secure API.

## ✨ Features

🎯 **Complete Email Management** - 20 MCP tools for full Mailcow control  
🔒 **Enterprise Security** - API key authentication with granular permissions  
⚡ **High Performance** - Built with TypeScript for speed and reliability  
📊 **Comprehensive Logging** - Full audit trail and monitoring capabilities  
🧪 **Well Tested** - Extensive test suite with >85% coverage on core modules  
🚀 **Production Ready** - Used in production environments

## 🚀 Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Configure environment  
cp .env.example .env
# Edit .env with your Mailcow server details

# 3. Start the server
npm run build && npm start
```

🎉 **That's it!** Your MCP server is now running with 20 tools ready for AI integration.

👉 **Detailed setup**: [Quick Start Guide](docs/QUICK_START.md)

## 🌐 Remote access (Claude web, ChatGPT)

By default the server runs over **stdio** — a local process launched by a
desktop client, with nothing listening on the network.

To use it as a custom connector from Claude on the web or from ChatGPT, set
`MCP_TRANSPORT=http`. That starts a **Streamable HTTP** endpoint together with
an **OAuth 2.1** authorization server (authorization code + PKCE, dynamic
client registration, refresh and revocation), because neither client can send a
static bearer header.

Each MCP session gets its own protocol object, so several clients can be
connected at the same time. Sessions are bound to the grant that opened them,
and the two scopes (`mailcow:read`, `mailcow:write`) are enforced per tool.

```bash
MCP_TRANSPORT=http
MCP_HTTP_HOST=127.0.0.1
MCP_HTTP_PORT=3000
MCP_PUBLIC_URL=https://mcp.example.com
MCP_OAUTH_PASSWORD=                 # required; no default
```

Put a TLS-terminating reverse proxy in front: this server does not terminate
TLS. A `Dockerfile` and `docker-compose.yml` are included.

### Tools withheld by default

Three groups are implemented but **not registered** unless you opt in, so they
do not appear in `tools/list` at all.

These flags apply to the **HTTP transport only**. Over stdio every tool below
is registered as usual, because the caller is whoever launched the process.
The tool counts in *Available Tools* describe the stdio inventory.

| Flag | Tools | Why |
|---|---|---|
| `MCP_ENABLE_DESTRUCTIVE_TOOLS` | `delete_domain`, `delete_mailbox`, `delete_user`, `delete_dkim_key`, `update_dkim_key`, `delete_queue_items`, `delete_sync_job`, `update_domain`, `create_dkim_key` | permanently destroy mail, or break mail flow and DKIM signing silently |
| `MCP_ENABLE_CREDENTIAL_TOOLS` | `update_mailbox`, `update_user`, `create_mailbox`, `create_user`, `create_sync_job`, `update_sync_job` | set or accept a credential — mint or take over an identity that authenticates directly, outside this server |
| `MCP_ENABLE_OUTBOUND_TOOLS` | `send_email` | lets a model send mail from your domains |

A mail server administered by a model that also *reads* mail has an unusual
property: its input is attacker-controlled by design. Anyone who knows an
address on your server can put text in front of the model. Keeping destructive
tools unregistered, and using a **read-only** mailcow API key, are the two
controls that hold regardless of how the model behaves.

👉 **Full guide, threat model and proxy configuration**:
[Remote Deployment](docs/REMOTE_DEPLOYMENT.md)

## 🛠️ Available Tools

### Email Management (18 tools)
- **Domains** (5): List, create, update, delete, get details
- **Mailboxes** (5): List, create, update, delete, get details  
- **Email Sending** (3): Send emails, check delivery status, get templates
- **Queue Management** (6): List, flush, delete, hold, release queue items
- **Sync Jobs** (7): Manage email migration and synchronization
- **Log Analysis** (4): System, error, performance, and access logs

### System Tools (3 tools)
- **Health Check**: Server status and metrics
- **Configuration**: Current settings (sanitized)
- **API Test**: Validate Mailcow connectivity

## 📊 Current Status

🟢 **MVP Complete** - Full email server management capability  
🟢 **Production Ready** - Deployed and tested in live environments  
🟢 **Well Documented** - Comprehensive guides and API reference  

| Component | Status | Coverage | Tools |
|-----------|--------|----------|-------|
| **Domain Management** | ✅ Complete | 85% | 5 tools |
| **Mailbox Management** | ✅ Complete | 87% | 5 tools |
| **Email System** | ✅ Complete | MVP | 3 tools |
| **Queue Management** | ✅ Complete | New | 6 tools |
| **Sync Jobs** | ✅ Complete | New | 7 tools |
| **Log Management** | ✅ Complete | New | 4 tools |
| **System Tools** | ✅ Complete | 100% | 3 tools |

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   AI Models     │    │   MCP Client    │    │   Your App      │
│   (Claude, etc) │◄──►│   (Claude CLI)  │◄──►│   Integration   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │  MCP Protocol   │
                       │   (JSON-RPC)    │
                       └─────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Mailcow MCP Server                           │
│  ┌───────────────┐ ┌───────────────┐ ┌───────────────────────┐  │
│  │ Tool Registry │ │ Auth Manager  │ │   20 MCP Tools        │  │
│  │ & Validation  │ │ & Security    │ │ • Domain Management   │  │
│  │               │ │               │ │ • Mailbox Management  │  │
│  │               │ │               │ │ • Email & Queues      │  │
│  └───────────────┘ └───────────────┘ └───────────────────────┘  │
│                                │                                │
│                                ▼                                │  
│                    ┌───────────────────────┐                    │
│                    │     API Client        │                    │
│                    │   (HTTP + Auth)       │                    │
│                    └───────────────────────┘                    │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │  Mailcow Server │
                       │   REST API      │
                       └─────────────────┘
```

## 📚 Documentation

| Document | Purpose |
|----------|---------|
| **[Quick Start](docs/QUICK_START.md)** | Get running in 5 minutes |
| **[Architecture](docs/ARCHITECTURE.md)** | System design and components |  
| **[API Reference](docs/API_REFERENCE.md)** | Complete tool documentation |
| **[Configuration](docs/CONFIGURATION.md)** | Environment setup guide |
| **[Testing Guide](docs/TESTING.md)** | Testing framework and practices |

### Developer Resources
- **[CLAUDE.md](CLAUDE.md)** - Essential context for Claude Code sessions
- **[Team Structure](docs/TEAM_STRUCTURE.md)** - Parallel development workflow  

## 🔧 Development

```bash
# Development mode with auto-reload
npm run dev

# Run tests
npm test

# View test coverage
npm run test:coverage

# Lint and format
npm run lint
npm run format

# Build for production
npm run build
```

## 🌟 Example Usage

### Send an Email
```typescript
// Send welcome email with template
const result = await mcp.call('send_email', {
  from: 'admin@company.com',
  to: ['user@company.com'],
  subject: 'Welcome to our service!',
  body: 'Your account is ready to use.',
  body_type: 'plain'
});

// Check delivery status  
await mcp.call('check_email_status', { 
  queue_id: result.email_details.queue_id 
});
```

### Manage Domains
```typescript
// List all active domains
const domains = await mcp.call('list_domains', { 
  active_only: true 
});

// Create new domain
await mcp.call('create_domain', {
  domain: 'newclient.com', 
  description: 'New client domain',
  quota: 5368709120  // 5GB
});
```

### Monitor System
```typescript
// Check server health
const health = await mcp.call('health_check');

// Get recent error logs
const errors = await mcp.call('get_error_logs', {
  limit: 50,
  start_time: '2023-12-01T00:00:00.000Z'
});
```

## 🔒 Security

- **API Key Authentication** with Mailcow integration
- **Granular Permissions** system (read/write/delete by resource)
- **Input Validation** with JSON Schema enforcement  
- **Audit Logging** for all operations
- **HTTPS Enforcement** and SSL certificate validation
- **Rate Limiting** to prevent abuse

## 🤝 Contributing

1. **Fork** the repository
2. **Create** a feature branch: `git checkout -b feature/amazing-feature`
3. **Add tests** for your changes
4. **Ensure** all tests pass: `npm run test:all`
5. **Commit** your changes: `git commit -m 'Add amazing feature'`
6. **Push** to the branch: `git push origin feature/amazing-feature`
7. **Open** a Pull Request

See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidelines.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: [docs/README.md](docs/README.md)
- **Issues**: [GitHub Issues](https://github.com/your-repo/mailcow-mcp/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-repo/mailcow-mcp/discussions)

## 🙏 Acknowledgments

- **[Model Context Protocol](https://modelcontextprotocol.io/)** - The protocol that makes this possible
- **[Mailcow](https://mailcow.email/)** - The excellent email server platform  
- **[TypeScript](https://www.typescriptlang.org/)** - For robust type safety and excellent tooling

---

<div align="center">
<strong>Made with ❤️ for the AI and email community</strong><br>
<em>Bringing AI and email servers together, one tool at a time.</em>
</div>