#!/usr/bin/env node

// Load test environment variables first
require('dotenv').config({ path: '.env.test' });

process.env.DB_ENV = 'test';
const { getDatabaseUrl } = require('../lib/db/config');
const postgres = require('postgres');

async function checkTestUsers() {
  const sql = postgres(getDatabaseUrl());

  try {
    const users = await sql`
      SELECT email, clerk_id, created_at 
      FROM users 
      WHERE email LIKE 'e2e-test-%' OR email LIKE 'manual-%'
      ORDER BY created_at DESC 
      LIMIT 10
    `;

    console.log('Recent test users in test database:');
    if (users.length === 0) {
      console.log('  No test users found');
    } else {
      users.forEach(u => {
        const created = new Date(u.created_at);
        const minutesAgo = Math.floor((Date.now() - created.getTime()) / 60000);
        console.log(`  - ${u.email}`);
        console.log(`    clerk_id: ${u.clerk_id || 'null'}`);
        console.log(`    created: ${minutesAgo} minutes ago`);
      });
    }
  } finally {
    await sql.end();
  }
}

checkTestUsers().catch(console.error);
