#!/usr/bin/env tsx
/**
 * Professional Database Migration Runner for CI/CD
 *
 * This script handles database migrations in GitHub Actions following
 * industry best practices for separation of concerns and error handling.
 *
 * Usage:
 *   tsx scripts/run-migrations.ts [options]
 *
 * Options:
 *   --dry-run     Show what would be migrated without executing
 *   --validate    Run post-migration validation checks
 *   --help        Show this help message
 *
 * Environment Variables Required:
 *   DATABASE_URL  - Full PostgreSQL connection string (from GitHub Secrets)
 *   NODE_ENV      - Environment (should be 'production' for staging/prod)
 */

import { config } from 'dotenv';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import { eq } from 'drizzle-orm';
import { readdir, readFile } from 'fs/promises';
import { join } from 'path';

// Import schema for validation
import { users } from '@/lib/db/schema';

// Load environment variables
config();

// Configuration
const MIGRATIONS_DIR = './lib/db/migrations';
const MAX_RETRIES = 3;
const RETRY_DELAY = 2000; // 2 seconds

interface MigrationResult {
  success: boolean;
  migrationsApplied: number;
  errors: string[];
  validationPassed?: boolean;
}

/**
 * Parse command line arguments
 */
function parseArgs(): {
  dryRun: boolean;
  validate: boolean;
  comprehensive: boolean;
  help: boolean;
} {
  const args = process.argv.slice(2);
  return {
    dryRun: args.includes('--dry-run'),
    validate: args.includes('--validate'),
    comprehensive: args.includes('--comprehensive'),
    help: args.includes('--help') || args.includes('-h'),
  };
}

/**
 * Show help message
 */
function showHelp(): void {
  console.log(`
🔄 Database Migration Runner

Usage: tsx scripts/run-migrations.ts [options]

Options:
  --dry-run        Show what would be migrated without executing
  --validate       Run post-migration validation checks  
  --comprehensive  Run extended validation with performance checks
  --help           Show this help message

Environment Variables Required:
  DATABASE_URL  - Full PostgreSQL connection string
  NODE_ENV      - Environment (staging/production)

Examples:
  tsx scripts/run-migrations.ts              # Run migrations
  tsx scripts/run-migrations.ts --dry-run    # Preview migrations
  tsx scripts/run-migrations.ts --validate   # Run with validation

This script is designed for CI/CD environments and follows
industry best practices for database migrations.
`);
}

/**
 * Validate environment and configuration
 */
function validateEnvironment(): void {
  console.log('🔍 Validating environment configuration...');

  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is required');
  }

  if (!process.env.NODE_ENV) {
    throw new Error('NODE_ENV environment variable is required');
  }

  // Validate DATABASE_URL format
  try {
    new URL(process.env.DATABASE_URL);
  } catch (error) {
    throw new Error(`Invalid DATABASE_URL format: ${error}`);
  }

  // Ensure we're not running against test database by accident
  const dbUrl = process.env.DATABASE_URL.toLowerCase();
  if (dbUrl.includes('test') && process.env.NODE_ENV !== 'test') {
    throw new Error('Detected test database URL in non-test environment');
  }

  console.log('✅ Environment validation passed');
  console.log(`   Environment: ${process.env.NODE_ENV}`);
  console.log(
    `   Database: ${process.env.DATABASE_URL.split('@')[1]?.split('/')[0] || 'Unknown'}`,
  );
}

/**
 * Get list of pending migrations by reading the migrations directory
 */
async function getPendingMigrations(): Promise<string[]> {
  try {
    const files = await readdir(MIGRATIONS_DIR);
    const sqlFiles = files.filter(file => file.endsWith('.sql')).sort(); // Ensure migrations run in order

    console.log(`📋 Found ${sqlFiles.length} migration files:`);
    sqlFiles.forEach(file => console.log(`   - ${file}`));

    return sqlFiles;
  } catch (error) {
    throw new Error(`Failed to read migrations directory: ${error}`);
  }
}

/**
 * Test database connection with retry logic
 */
async function testConnection(client: postgres.Sql): Promise<void> {
  console.log('🔌 Testing database connection...');

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      await client`SELECT 1 as test`;
      console.log('✅ Database connection successful');
      return;
    } catch (error) {
      console.warn(
        `⚠️  Connection attempt ${attempt}/${MAX_RETRIES} failed:`,
        error,
      );

      if (attempt === MAX_RETRIES) {
        throw new Error(
          `Failed to connect to database after ${MAX_RETRIES} attempts`,
        );
      }

      console.log(`   Retrying in ${RETRY_DELAY}ms...`);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
    }
  }
}

/**
 * Run post-migration validation checks
 */
async function validateMigrations(
  db: ReturnType<typeof drizzle>,
): Promise<boolean> {
  console.log('🔍 Running post-migration validation...');

  try {
    // Test basic schema access
    await db.select().from(users).limit(1);
    console.log('✅ Schema validation: Users table accessible');

    // Check for required indexes (example)
    // You can add more validation checks specific to your schema

    // Test database constraints
    // This is a basic validation - expand based on your needs

    console.log('✅ Post-migration validation passed');
    return true;
  } catch (error) {
    console.error('❌ Post-migration validation failed:', error);
    return false;
  }
}

/**
 * Run database migrations
 */
async function runMigrations(
  dryRun: boolean = false,
): Promise<MigrationResult> {
  const result: MigrationResult = {
    success: false,
    migrationsApplied: 0,
    errors: [],
  };

  let client: postgres.Sql | null = null;

  try {
    console.log('🚀 Starting database migration process...');

    // Validate environment first
    validateEnvironment();

    // Get pending migrations
    const pendingMigrations = await getPendingMigrations();

    if (dryRun) {
      console.log('🔍 DRY RUN MODE - No changes will be made');
      result.success = true;
      result.migrationsApplied = pendingMigrations.length;
      return result;
    }

    // Create database connection
    console.log('🔌 Establishing database connection...');
    client = postgres(process.env.DATABASE_URL!, {
      max: 1, // Single connection for migrations
      ssl: process.env.NODE_ENV === 'production' ? 'require' : false,
    });

    // Test connection
    await testConnection(client);

    // Create Drizzle instance
    const db = drizzle(client);

    // Run migrations
    console.log('📦 Applying database migrations...');
    const startTime = Date.now();

    await migrate(db, { migrationsFolder: MIGRATIONS_DIR });

    const duration = Date.now() - startTime;
    console.log(`✅ Migrations completed successfully in ${duration}ms`);

    result.success = true;
    result.migrationsApplied = pendingMigrations.length;

    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('❌ Migration failed:', errorMessage);
    result.errors.push(errorMessage);
    return result;
  } finally {
    // Always close the connection
    if (client) {
      try {
        await client.end();
        console.log('🔌 Database connection closed');
      } catch (error) {
        console.warn(
          '⚠️  Warning: Failed to close database connection:',
          error,
        );
      }
    }
  }
}

/**
 * Main execution function
 */
async function main(): Promise<void> {
  const args = parseArgs();

  if (args.help) {
    showHelp();
    process.exit(0);
  }

  console.log('🔄 Database Migration Runner Starting...');
  console.log(`   Dry Run: ${args.dryRun ? 'Yes' : 'No'}`);
  console.log(`   Validation: ${args.validate ? 'Yes' : 'No'}`);
  console.log(`   Comprehensive: ${args.comprehensive ? 'Yes' : 'No'}`);
  console.log('');

  try {
    // Run migrations
    const result = await runMigrations(args.dryRun);

    if (!result.success) {
      console.error('❌ Migration process failed:');
      result.errors.forEach(error => console.error(`   - ${error}`));
      process.exit(1);
    }

    // Run validation if requested and not in dry-run mode
    if ((args.validate || args.comprehensive) && !args.dryRun) {
      const client = postgres(process.env.DATABASE_URL!, {
        max: 1,
        ssl: process.env.NODE_ENV === 'production' ? 'require' : false,
      });

      try {
        const db = drizzle(client);

        // Basic validation
        const validationPassed = await validateMigrations(db);
        result.validationPassed = validationPassed;

        if (!validationPassed) {
          console.error('❌ Post-migration validation failed');
          process.exit(1);
        }

        // Comprehensive validation for production
        if (args.comprehensive) {
          console.log('🔍 Running comprehensive validation checks...');
          // Import and run the comprehensive validation script
          const { exec } = await import('child_process');
          const { promisify } = await import('util');
          const execAsync = promisify(exec);

          try {
            const { stdout, stderr } = await execAsync(
              'tsx scripts/validate-database.ts --comprehensive --performance',
            );
            console.log(stdout);
            if (stderr) console.warn(stderr);
            console.log('✅ Comprehensive validation completed');
          } catch (error) {
            console.error('❌ Comprehensive validation failed:', error);
            process.exit(1);
          }
        }
      } finally {
        await client.end();
      }
    }

    // Success summary
    console.log('');
    console.log('🎉 Migration process completed successfully!');
    console.log('📊 Summary:');
    console.log(`   - Mode: ${args.dryRun ? 'Dry Run' : 'Live Migration'}`);
    console.log(`   - Migrations processed: ${result.migrationsApplied}`);
    if (result.validationPassed !== undefined) {
      console.log(
        `   - Validation: ${result.validationPassed ? 'Passed' : 'Failed'}`,
      );
    }
    console.log(`   - Environment: ${process.env.NODE_ENV}`);
    console.log('');
  } catch (error) {
    console.error('❌ Unexpected error during migration process:', error);
    process.exit(1);
  }
}

// Handle unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', error => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

// Run if called directly
if (require.main === module) {
  main();
}

export { runMigrations, validateMigrations };
