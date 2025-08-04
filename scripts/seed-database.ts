#!/usr/bin/env tsx

import { config } from 'dotenv';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import { users, userApiKeys } from '@/lib/db/schema';

import { getDatabaseUrl } from '../lib/db/config';

// Load environment variables
config({ path: '.env.local' });

// Handle command line arguments first
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.warn(`
Database Seed Script

Usage: npm run seed [options]

Options:
  --force    Clear existing data and reseed
  --help     Show this help message

Examples:
  npm run seed              # Seed database (skip if data exists)
  npm run seed -- --force   # Clear existing data and reseed
  `);
  process.exit(0);
}

// Get database URL from centralized configuration
let DATABASE_URL: string;
try {
  DATABASE_URL = getDatabaseUrl();
} catch (error) {
  console.error(
    '❌ Database configuration error:',
    error instanceof Error ? error.message : String(error),
  );
  console.warn('Please ensure DATABASE_URL is set in your .env.local file');
  process.exit(1);
}

// Create database connection
const client = postgres(DATABASE_URL);
const db = drizzle(client);

// Seed data - Note: These users must be created via Clerk first
// This seed script will only sync data that already exists in Clerk
const seedUsers = [
  {
    clerkId: 'user_clerk_admin_123', // Replace with actual Clerk user ID
    email: 'admin@example.com',
    name: 'Admin User',
  },
  {
    clerkId: 'user_clerk_user_456', // Replace with actual Clerk user ID
    email: 'user@example.com',
    name: 'Regular User',
  },
  {
    clerkId: 'user_clerk_test_789', // Replace with actual Clerk user ID
    email: 'test@example.com',
    name: 'Test User',
  },
  {
    clerkId: 'user_clerk_premium_012', // Replace with actual Clerk user ID
    email: 'premium@example.com',
    name: 'Premium User',
  },
];

const seedApiKeys = [
  {
    name: 'Development API Key',
    description: 'For local development and testing',
    keyType: 'development',
  },
  {
    name: 'Production API Key',
    description: 'For production use only',
    keyType: 'production',
  },
  {
    name: 'Analytics API Key',
    description: 'For analytics and reporting',
    keyType: 'analytics',
  },
];

async function seedDatabase() {
  console.warn('🌱 Starting database seed...');

  try {
    // Check if database already has data
    const existingUsers = await db.select().from(users).limit(1);
    if (existingUsers.length > 0) {
      console.warn('⚠️  Database already has data. Use --force to reseed.');
      const forceFlag = process.argv.includes('--force');
      if (!forceFlag) {
        console.warn('Run with --force to clear existing data and reseed');
        process.exit(0);
      }

      // Clear existing data
      console.warn('🧹 Clearing existing data...');
      await db.delete(userApiKeys);
      await db.delete(users);
      console.warn('✅ Existing data cleared');
    }

    // Seed users directly (they should already exist in Clerk)
    console.warn('👥 Creating users in database...');
    const createdUsers = [];

    for (const userData of seedUsers) {
      try {
        const result = await db
          .insert(users)
          .values({
            clerkId: userData.clerkId,
            email: userData.email,
            name: userData.name,
          })
          .returning();

        if (result.length > 0) {
          console.warn(`✅ Created user: ${userData.email}`);
          createdUsers.push(result[0]);
        }
      } catch (error) {
        console.error(
          `❌ Failed to create user ${userData.email}:`,
          error instanceof Error ? error.message : String(error),
        );
      }
    }

    // Seed API keys for the first user (admin)
    if (createdUsers.length > 0) {
      console.warn('🔑 Creating API keys...');
      const adminUser = createdUsers[0];

      for (const keyData of seedApiKeys) {
        const _apiKey = await db
          .insert(userApiKeys)
          .values({
            userId: adminUser.id,
            provider: keyData.keyType === 'production' ? 'openai' : 'stripe',
            privateKeyEncrypted: `test_${keyData.keyType}_${Date.now()}`, // Mock encrypted key for development
            publicKey: null,
            metadata: {
              name: keyData.name,
              description: keyData.description,
              keyType: keyData.keyType,
            },
          })
          .returning();

        console.warn(`✅ Created API key: ${keyData.name}`);
      }
    }

    // Note: Sessions are now managed by Clerk, no need to seed them

    console.warn('🎉 Database seeding completed successfully!');
    console.warn(`\n📊 Summary:`);
    console.warn(`- Created ${createdUsers.length} users`);
    console.warn(`- Created ${seedApiKeys.length} API keys`);
    console.warn(`- Sessions managed by Clerk`);

    console.warn(`\n🔐 Test Users (create these in Clerk first):`);
    seedUsers.forEach(user => {
      console.warn(`- ${user.email} (Clerk ID: ${user.clerkId})`);
    });
  } catch (error) {
    console.error('❌ Database seeding failed:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

// Run the seeding
seedDatabase();
