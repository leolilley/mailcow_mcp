# Testing Guide for Mailcow MCP Server

This guide explains the testing infrastructure and how to use code coverage effectively.

## 📁 Test Structure

```
tests/
├── unit/                        # Unit tests (fast, isolated)
│   ├── auth/                    # Auth system tests (4 files, 70% coverage)
│   └── utils/                   # Utility tests (8 files, 77% coverage)
└── integration/                 # Integration tests (slower, end-to-end)
    └── server-startup.test.js   # Full server startup test
```

## 🧪 Running Tests

### Basic Commands
```bash
# Run all unit tests
npm test
# or specifically
npm run test:unit

# Run integration tests
npm run test:integration

# Run both unit and integration tests
npm run test:all

# Generate coverage report
npm run test:coverage

# Generate coverage report AND open in browser 🌐
npm run test:coverage:open

# Just open existing coverage report
npm run coverage:open
```

### Test Types

**Unit Tests** (Fast, ~10s):
- ✅ **Auth module**: 70% coverage, 162 test cases
- ✅ **Utils module**: 77% coverage, comprehensive validation
- ❌ **API module**: 0% coverage (needs implementation)
- ❌ **Tools module**: 0% coverage (needs implementation)
- ❌ **Config module**: 0% coverage (needs implementation)

**Integration Tests** (Slower, ~3s):
- ✅ **Server startup**: Tests full MCP server initialization and protocol response
- ❌ **Tool execution**: Not implemented yet
- ❌ **API integration**: Not implemented yet

## 📊 Code Coverage System

### What is the `coverage/` folder?

The `coverage/` folder contains detailed reports about which parts of your code are tested:

```
coverage/
├── index.html              # 🌐 Main coverage dashboard (open in browser)
├── lcov.info              # 📄 Machine-readable coverage data  
├── lcov-report/            # 🌐 Detailed HTML reports by file
│   ├── auth/               # Auth module coverage breakdown
│   ├── utils/              # Utils module coverage breakdown
│   ├── api/                # API module coverage (0% - needs work!)
│   └── tools/              # Tools module coverage (0% - needs work!)
└── [other files]          # Supporting files (CSS, JS, etc.)
```

### 📈 How to Use Coverage Reports

#### 1. **View Overall Coverage** 
```bash
npm run test:coverage
```
**Current Status**: 18.55% overall
- **🟢 Auth**: 70.16% (excellent!)
- **🟢 Utils**: 77.16% (excellent!)  
- **🔴 API**: 0% (critical gap)
- **🔴 Tools**: 0% (critical gap)
- **🔴 Config**: 0% (needs basic tests)

#### 2. **Interactive HTML Reports**
**Quick Access**: `npm run coverage:open` 🚀

Open `coverage/index.html` in your browser for:
- **📊 Visual coverage dashboard** with sortable tables
- **🎯 File-by-file breakdown** - click any file to see detailed coverage
- **📍 Line-by-line analysis** - see exactly which lines are tested (green) vs untested (red)
- **🔍 Branch coverage** - see which code paths are exercised

#### 3. **Understanding Coverage Metrics**

**Statements**: % of executable code lines run during tests
**Branches**: % of if/else, switch, ternary conditions tested  
**Functions**: % of functions called during tests
**Lines**: % of code lines executed (excluding comments/whitespace)

### 🎯 Coverage Goals

**Target Coverage Levels**:
- **Critical modules** (auth, API client): >80%  
- **Utility modules**: >70%
- **Tool implementations**: >60%
- **Overall project**: >50%

**Current Priority**:
1. **🚨 API Client tests** (currently 0%) - critical for reliability
2. **🚨 Tool registry tests** (currently 0%) - core functionality  
3. **⚠️ Config validation tests** (currently 0%) - important for stability

### 🔍 Finding What to Test

**Use coverage reports to identify**:
1. **Red lines** in HTML reports = untested code paths
2. **Low function coverage** = functions never called in tests
3. **Low branch coverage** = missing error cases or edge conditions

**Example workflow**:
```bash
# 1. Run coverage
npm run test:coverage

# 2. Open coverage/index.html in browser

# 3. Navigate to src/api/client.ts.html  

# 4. Look for red highlighted lines

# 5. Write tests to cover those code paths

# 6. Re-run coverage to verify improvement
```

## 📝 Writing New Tests

### Unit Test Template
```typescript
// tests/unit/api/client.test.ts
import { APIClient } from '../../../src/api/client';

describe('APIClient', () => {
  let client: APIClient;
  
  beforeEach(() => {
    client = new APIClient({
      url: 'https://test.example.com',
      key: 'test-api-key-with-32-characters',
      accessType: 'read-only'
    });
  });

  it('should initialize with correct config', () => {
    expect(client).toBeDefined();
    // Add your assertions
  });

  it('should handle API errors gracefully', async () => {
    // Test error scenarios
  });
});
```

### Integration Test Template  
```javascript
// tests/integration/api-integration.test.js
const { spawn } = require('child_process');

// Set up test environment
process.env.MAILCOW_API_URL = 'https://test.example.com';
process.env.MAILCOW_API_KEY = 'test-key-32-characters-long';

// Test full end-to-end functionality
```

## 🎯 Testing Best Practices

### 1. **Test the Critical Path First**
- API client HTTP operations
- Authentication validation  
- Tool execution workflows
- Error handling

### 2. **Mock External Dependencies**
```typescript
// Use existing MockLogger for consistent testing
import { MockLogger } from '../../../src/utils/mocks';

const logger = new MockLogger();
// ... run code that logs
expect(logger.getLogs()).toHaveLength(2);
```

### 3. **Test Both Success and Failure Cases**
```typescript
it('should handle valid API key', async () => {
  const result = await auth.validateAPIKey('a'.repeat(32));
  expect(result.success).toBe(true);
});

it('should reject invalid API key', async () => {
  const result = await auth.validateAPIKey('short');
  expect(result.success).toBe(false);
  expect(result.error?.code).toBe('INVALID_API_KEY');
});
```

### 4. **Use Coverage to Guide Testing**
- Aim for >80% coverage on critical modules
- Focus on untested branches (error cases)
- Don't chase 100% coverage - focus on important code paths

## 📈 Current Test Status Summary

| Module | Coverage | Priority | Status |
|--------|----------|----------|--------|
| **Auth** | 70% | High | ✅ Well tested |
| **Utils** | 77% | High | ✅ Well tested |  
| **API Client** | 0% | Critical | 🚨 Needs immediate attention |
| **Tools** | 0% | Critical | 🚨 Needs immediate attention |
| **Config** | 0% | Medium | ⚠️ Needs basic tests |
| **Types** | 71% | Low | ✅ Adequate |

**Next Steps**:
1. Add API client tests with HTTP mocking
2. Add tool registry and execution tests  
3. Add configuration validation tests
4. Add end-to-end integration tests

The testing foundation is excellent - now we need to extend it to cover the core application logic!