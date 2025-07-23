#!/usr/bin/env tsx

import { config } from 'dotenv';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import {
  users,
  userApiKeys,
  userSessions,
  sessionActivity,
} from '@/lib/db/schema';

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

// Seed data
const seedUsers = [
  {
    email: 'admin@example.com',
    password: 'admin123',
    name: 'Admin User',
    role: 'admin',
    emailVerified: true,
  },
  {
    email: 'user@example.com',
    password: 'user123',
    name: 'Regular User',
    role: 'user',
    emailVerified: true,
  },
  {
    email: 'test@example.com',
    password: 'test123',
    name: 'Test User',
    role: 'user',
    emailVerified: false,
  },
  {
    email: 'premium@example.com',
    password: 'premium123',
    name: 'Premium User',
    role: 'user',
    emailVerified: true,
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
      await db.delete(sessionActivity);
      await db.delete(userSessions);
      await db.delete(userApiKeys);
      await db.delete(users);
      console.warn('✅ Existing data cleared');
    }

    // Create auth service for user creation (lazy import to avoid early DB connection)
    const { createAuthService } = await import('@/lib/auth/factory');
    const authService = await createAuthService();

    // Seed users
    console.warn('👥 Creating users...');
    const createdUsers = [];

    for (const userData of seedUsers) {
      const result = await authService.signUp(userData);
      if (result.success && result.user) {
        console.warn(`✅ Created user: ${userData.email}`);
        createdUsers.push(result.user);

        // Update email verification status if needed
        if (userData.emailVerified) {
          await db
            .update(users)
            .set({ emailVerified: new Date() })
            .where(eq(users.id, result.user.id));
        }
      } else {
        console.error(
          `❌ Failed to create user ${userData.email}:`,
          result.error,
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

    // Create some sample sessions for testing
    console.warn('🔐 Creating sample sessions...');
    for (const user of createdUsers.slice(0, 2)) {
      // Only for first 2 users
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const sessionManager = (authService as any).sessionManager;
        if (sessionManager) {
          await sessionManager.createSession(
            user.id,
            '127.0.0.1',
            'Seed Script User Agent',
          );
          console.warn(`✅ Created session for user: ${user.email}`);
        }
      } catch (error) {
        console.warn(`⚠️  Could not create session for ${user.email}:`, error);
      }
    }

    console.warn('🎉 Database seeding completed successfully!');
    console.warn(`\n📊 Summary:`);
    console.warn(`- Created ${createdUsers.length} users`);
    console.warn(`- Created ${seedApiKeys.length} API keys`);
    console.warn(`- Created sample sessions`);

    console.warn(`\n🔐 Test Credentials:`);
    seedUsers.forEach(user => {
      console.warn(
        `- ${user.email} / ${user.password} (${user.role}${user.emailVerified ? ', verified' : ', unverified'})`,
      );
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
