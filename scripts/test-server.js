#!/usr/bin/env node

// Load test environment variables
require('dotenv').config({ path: '.env.test' });

// Set NODE_ENV to test (Note: Next.js will override this to 'development' in dev mode)
process.env.NODE_ENV = 'test';

// Set DB_ENV to test to ensure test database is used
process.env.DB_ENV = 'test';

// Verify test database is being used
console.log('🧪 Test server starting with:');
console.log(`   DB_ENV: ${process.env.DB_ENV}`);
console.log(`   TEST_DB_NAME: ${process.env.TEST_DB_NAME}`);
console.log(`   TEST_DB_PORT: ${process.env.TEST_DB_PORT}`);

// Start Next.js dev server
const { spawn } = require('child_process');
const next = spawn('npx', ['next', 'dev', '--port', '3000'], {
  stdio: 'inherit',
  env: process.env,
});

next.on('close', code => {
  process.exit(code);
});
