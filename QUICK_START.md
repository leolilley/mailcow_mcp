# 🚀 Quick Start Guide

Essential commands to get up and running with the Mailcow MCP Server.

## 📦 Installation
```bash
npm install
```

## 🏗️ Development
```bash
# Build the project
npm run build

# Start the server
npm start

# Development mode with auto-restart
npm run dev
```

## 🧪 Testing
```bash
# Run unit tests
npm test

# Generate coverage report and open in browser
npm run test:coverage:open

# Run integration tests
npm run test:integration

# Run everything (unit + build + integration)
npm run test:all
```

## 📊 Coverage Dashboard
- **Current Coverage**: 18.55% overall
- **Green modules**: Auth (70%), Utils (77%)
- **Red modules**: API (0%), Tools (0%) - needs work!

**Quick view**: `npm run coverage:open`

## 🔧 Code Quality
```bash
# Lint code
npm run lint

# Format code
npm run format

# Clean build artifacts
npm run clean
```

## 🌐 MCP Server
```bash
# Set environment variables
export MAILCOW_API_URL=https://your-mailcow-server.com
export MAILCOW_API_KEY=your-api-key-32-chars-minimum
export MAILCOW_API_ACCESS_TYPE=read-only

# Start server
npm start
```

## 📋 Available MCP Tools
- `health_check` - Server health status
- `get_config` - Current configuration (sanitized)
- `test_api_connection` - Test Mailcow API connectivity

**More tools coming soon!** 🛠️

---

For detailed documentation, see:
- [TESTING.md](docs/TESTING.md) - Testing guide
- [CLAUDE.md](CLAUDE.md) - Full development guide