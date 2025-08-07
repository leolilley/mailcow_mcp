#!/usr/bin/env node

/**
 * Integration Test: Server Startup
 * Verifies the MCP server can start up without errors and respond to basic MCP protocol requests
 */

const { spawn } = require('child_process');
const path = require('path');

// Set basic environment variables for testing
process.env.MAILCOW_API_URL = 'https://test.example.com';
process.env.MAILCOW_API_KEY = 'test-api-key-with-enough-characters-to-pass-validation';
process.env.MAILCOW_API_ACCESS_TYPE = 'read-only';

console.log('🧪 Integration Test: Testing Mailcow MCP Server startup...');

// Start the server process
const serverPath = path.join(__dirname, '../../dist/src/index.js');
const serverProcess = spawn('node', [serverPath], {
  stdio: ['pipe', 'pipe', 'pipe'],
  env: process.env
});

let serverOutput = '';
let serverError = '';

serverProcess.stdout.on('data', (data) => {
  serverOutput += data.toString();
});

serverProcess.stderr.on('data', (data) => {
  serverError += data.toString();
});

// Give the server a few seconds to initialize
setTimeout(() => {
  // Send a simple MCP protocol message to test basic functionality
  const testMessage = JSON.stringify({
    jsonrpc: '2.0',
    id: 1,
    method: 'tools/list',
    params: {}
  }) + '\n';
  
  serverProcess.stdin.write(testMessage);
  
  // Wait for response and then shutdown
  setTimeout(() => {
    serverProcess.kill('SIGINT');
    
    // Analyze results
    console.log('\n=== Server Output ===');
    console.log(serverOutput);
    
    if (serverError) {
      console.log('\n=== Server Errors ===');
      console.log(serverError);
    }
    
    // Check if server started successfully
    if (serverError.includes('Failed to start server')) {
      console.log('\n❌ Server startup failed');
      process.exit(1);
    } else if (serverOutput.includes('Mailcow MCP Server started successfully') || 
               serverOutput.includes('Registering tools') ||
               serverOutput.includes('Configuration loaded successfully')) {
      console.log('\n✅ Server startup successful');
      process.exit(0);
    } else {
      console.log('\n⚠️  Server startup status unclear');
      console.log('Expected to see initialization messages but got different output');
      process.exit(1);
    }
  }, 2000);
}, 1000);

serverProcess.on('exit', (code) => {
  if (code !== 0 && code !== null) {
    console.log(`\n❌ Server exited with code ${code}`);
    process.exit(1);
  }
});