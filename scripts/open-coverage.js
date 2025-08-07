#!/usr/bin/env node

/**
 * Cross-platform script to open coverage report in default browser
 */

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const coverageFile = path.join(__dirname, '..', 'coverage', 'index.html');

// Check if coverage report exists
if (!fs.existsSync(coverageFile)) {
  console.log('❌ Coverage report not found!');
  console.log('   Run: npm run test:coverage');
  console.log('   Then: npm run coverage:open');
  process.exit(1);
}

// Determine the correct command for each platform
const platform = process.platform;
let command;

switch (platform) {
  case 'darwin':   // macOS
    command = 'open';
    break;
  case 'win32':    // Windows
    command = 'start ""'; // Empty title for start command
    break;
  default:         // Linux and others
    command = 'xdg-open';
}

console.log('🌐 Opening coverage report in default browser...');
console.log(`📁 File: ${coverageFile}`);

exec(`${command} "${coverageFile}"`, (error) => {
  if (error) {
    console.log('⚠️  Could not auto-open browser. Please open manually:');
    console.log(`   File: coverage/index.html`);
    console.log(`   Full path: ${coverageFile}`);
  } else {
    console.log('✅ Coverage report opened successfully!');
  }
});