#!/usr/bin/env node

/**
 * Integration Test: Domain Tools End-to-End
 * Verifies domain tools can be executed via MCP protocol
 */

const { spawn } = require('child_process');
const path = require('path');

// Set environment variables for testing
process.env.MAILCOW_API_URL = 'https://test.example.com';
process.env.MAILCOW_API_KEY = 'test-api-key-with-enough-characters-to-pass-validation';
process.env.MAILCOW_API_ACCESS_TYPE = 'read-only';

console.log('🧪 Integration Test: Testing Domain Tools end-to-end...');

const serverPath = path.join(__dirname, '../../dist/src/index.js');
const serverProcess = spawn('node', [serverPath], {
  stdio: ['pipe', 'pipe', 'pipe'],
  env: process.env
});

let serverOutput = '';
let serverError = '';
const responses = [];

serverProcess.stdout.on('data', (data) => {
  const output = data.toString();
  serverOutput += output;
  
  // Collect JSON-RPC responses
  const lines = output.split('\n');
  for (const line of lines) {
    if (line.trim() && line.startsWith('{') && line.includes('"jsonrpc"')) {
      try {
        const response = JSON.parse(line);
        responses.push(response);
      } catch (e) {
        // Ignore malformed JSON
      }
    }
  }
});

serverProcess.stderr.on('data', (data) => {
  serverError += data.toString();
});

let testsPassed = 0;
let testsFailed = 0;

function runTest(testName, testFn) {
  try {
    testFn();
    console.log(`✅ ${testName}`);
    testsPassed++;
  } catch (error) {
    console.log(`❌ ${testName}: ${error.message}`);
    testsFailed++;
  }
}

// Give the server time to start
setTimeout(() => {
  console.log('\n📋 Running domain tools tests...');
  
  // Test 1: List tools to verify our domain tools are available
  const listToolsMessage = JSON.stringify({
    jsonrpc: '2.0',
    id: 'test-1',
    method: 'tools/list',
    params: {}
  }) + '\n';
  
  serverProcess.stdin.write(listToolsMessage);
  
  // Test 2: Test list_domains tool execution
  setTimeout(() => {
    const listDomainsMessage = JSON.stringify({
      jsonrpc: '2.0', 
      id: 'test-2',
      method: 'tools/call',
      params: {
        name: 'list_domains',
        arguments: {}
      }
    }) + '\n';
    
    serverProcess.stdin.write(listDomainsMessage);
    
    // Test 3: Test health_check tool (should work)
    setTimeout(() => {
      const healthCheckMessage = JSON.stringify({
        jsonrpc: '2.0',
        id: 'test-3', 
        method: 'tools/call',
        params: {
          name: 'health_check',
          arguments: {}
        }
      }) + '\n';
      
      serverProcess.stdin.write(healthCheckMessage);
      
      // Give time for responses and then analyze results
      setTimeout(() => {
        console.log('\n📊 Test Results:');
        
        // Test if we got responses
        runTest('Server responded to MCP requests', () => {
          if (responses.length === 0) {
            throw new Error('No JSON-RPC responses received');
          }
        });
        
        // Test tools list response
        const toolsListResponse = responses.find(r => r.id === 'test-1');
        runTest('Tools list contains domain tools', () => {
          if (!toolsListResponse || !toolsListResponse.result || !toolsListResponse.result.tools) {
            throw new Error('No tools list response');
          }
          
          const toolNames = toolsListResponse.result.tools.map(t => t.name);
          const domainTools = ['list_domains', 'get_domain', 'create_domain', 'update_domain', 'delete_domain'];
          
          for (const tool of domainTools) {
            if (!toolNames.includes(tool)) {
              throw new Error(`Missing domain tool: ${tool}`);
            }
          }
        });
        
        // Test list_domains response (might fail due to no real API, but should get a response)
        const listDomainsResponse = responses.find(r => r.id === 'test-2');
        runTest('List domains tool executed', () => {
          if (!listDomainsResponse) {
            throw new Error('No response to list_domains call');
          }
          
          // We expect either a success result or an error (if API is not reachable)
          if (!listDomainsResponse.result && !listDomainsResponse.error) {
            throw new Error('Response missing both result and error');
          }
        });
        
        // Test health check response (should always work)
        const healthResponse = responses.find(r => r.id === 'test-3');
        runTest('Health check tool works', () => {
          if (!healthResponse || !healthResponse.result) {
            throw new Error('Health check failed or no response');
          }
        });
        
        // Test domain tool schema validation
        runTest('Domain tool schemas are valid', () => {
          if (!toolsListResponse || !toolsListResponse.result || !toolsListResponse.result.tools) {
            throw new Error('No tools to validate');
          }
          
          const domainTool = toolsListResponse.result.tools.find(t => t.name === 'list_domains');
          if (!domainTool) {
            throw new Error('list_domains tool not found');
          }
          
          if (!domainTool.inputSchema || domainTool.inputSchema.type !== 'object') {
            throw new Error('Invalid input schema');
          }
          
          const props = domainTool.inputSchema.properties;
          if (!props.active_only || !props.search || !props.limit) {
            throw new Error('Missing expected input properties');
          }
        });
        
        console.log(`\n🎯 Results: ${testsPassed} passed, ${testsFailed} failed`);
        
        if (testsFailed === 0) {
          console.log('\n✅ All domain tools integration tests passed!');
          serverProcess.kill('SIGINT');
          process.exit(0);
        } else {
          console.log('\n❌ Some domain tools integration tests failed!');
          console.log('\n=== Debug Info ===');
          console.log('Responses received:', responses.length);
          responses.forEach((r, i) => {
            console.log(`Response ${i + 1} (id: ${r.id}):`, JSON.stringify(r, null, 2));
          });
          
          serverProcess.kill('SIGINT');
          process.exit(1);
        }
      }, 2000);
    }, 500);
  }, 500);
}, 2000);

serverProcess.on('exit', (code) => {
  if (code !== 0 && code !== null) {
    console.log(`\n❌ Server exited with code ${code}`);
    if (serverError) {
      console.log('\n=== Server Errors ===');
      console.log(serverError);
    }
    process.exit(1);
  }
});

// Timeout after 10 seconds
setTimeout(() => {
  console.log('\n⏰ Test timeout - killing server');
  serverProcess.kill('SIGKILL');
  process.exit(1);
}, 10000);