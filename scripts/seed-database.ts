#!/usr/bin/env tsx

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { config } from 'dotenv';
import { users, apiKeys, userSessions, sessionActivity } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { getDatabaseUrl } from '../lib/db/config';

// Load environment variables
config({ path: '.env.local' });

// Handle command line arguments first
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
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
  console.error('❌ Database configuration error:', error.message);
  console.log('Please ensure DATABASE_URL is set in your .env.local file');
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
  console.log('🌱 Starting database seed...');

  try {
    // Check if database already has data
    const existingUsers = await db.select().from(users).limit(1);
    if (existingUsers.length > 0) {
      console.log('⚠️  Database already has data. Use --force to reseed.');
      const forceFlag = process.argv.includes('--force');
      if (!forceFlag) {
        console.log('Run with --force to clear existing data and reseed');
        process.exit(0);
      }

      // Clear existing data
      console.log('🧹 Clearing existing data...');
      await db.delete(sessionActivity);
      await db.delete(userSessions);
      await db.delete(apiKeys);
      await db.delete(users);
      console.log('✅ Existing data cleared');
    }

    // Create auth service for user creation (lazy import to avoid early DB connection)
    const { createAuthService } = await import('@/lib/auth/factory');
    const authService = createAuthService();

    // Seed users
    console.log('👥 Creating users...');
    const createdUsers = [];

    for (const userData of seedUsers) {
      const result = await authService.signUp(
        userData.email,
        userData.password,
        userData.name,
      );
      if (result.success && result.user) {
        console.log(`✅ Created user: ${userData.email}`);
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
      console.log('🔑 Creating API keys...');
      const adminUser = createdUsers[0];

      for (const keyData of seedApiKeys) {
        const apiKey = await db
          .insert(apiKeys)
          .values({
            userId: adminUser.id,
            name: keyData.name,
            description: keyData.description,
            keyHash: `test_${keyData.keyType}_${Date.now()}`, // Mock hash for development
            keyPreview: `${keyData.keyType}_****`,
            expiresAt: new Date(Date.now() + (365 * 24 * 60 * 60 * 1000)), // 1 year from now
          })
          .returning();

        console.log(`✅ Created API key: ${keyData.name}`);
      }
    }

    // Create some sample sessions for testing
    console.log('🔐 Creating sample sessions...');
    for (const user of createdUsers.slice(0, 2)) {
      // Only for first 2 users
      try {
        const sessionManager = (authService as any).sessionManager;
        if (sessionManager) {
          await sessionManager.createSession(
            user.id,
            '127.0.0.1',
            'Seed Script User Agent',
          );
          console.log(`✅ Created session for user: ${user.email}`);
        }
      } catch (error) {
        console.log(`⚠️  Could not create session for ${user.email}:`, error);
      }
    }

    console.log('🎉 Database seeding completed successfully!');
    console.log(`\n📊 Summary:`);
    console.log(`- Created ${createdUsers.length} users`);
    console.log(`- Created ${seedApiKeys.length} API keys`);
    console.log(`- Created sample sessions`);

    console.log(`\n🔐 Test Credentials:`);
    seedUsers.forEach(user => {
      console.log(
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
