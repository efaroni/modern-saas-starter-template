#!/usr/bin/env tsx
/**
 * Database Health Check and Validation Script
 *
 * Comprehensive validation suite for database schema and data integrity
 * after migrations. Designed for use in CI/CD pipelines.
 *
 * Usage:
 *   tsx scripts/validate-database.ts [options]
 *
 * Options:
 *   --comprehensive  Run extended validation checks
 *   --performance    Include performance checks
 *   --help          Show this help message
 *
 * Environment Variables Required:
 *   DATABASE_URL    - Full PostgreSQL connection string
 */

import { config } from 'dotenv';
import { drizzle } from 'drizzle-orm/postgres-js';
import { eq, sql, count } from 'drizzle-orm';
import postgres from 'postgres';

// Import schema tables for validation
import { users, userApiKeys, webhookEvents } from '@/lib/db/schema';

// Load environment variables
config();

interface ValidationResult {
  category: string;
  checks: {
    name: string;
    status: 'passed' | 'failed' | 'warning';
    details?: string;
    duration?: number;
  }[];
}

interface HealthCheckSummary {
  overall: 'healthy' | 'warning' | 'critical';
  totalChecks: number;
  passed: number;
  failed: number;
  warnings: number;
  duration: number;
  results: ValidationResult[];
}

/**
 * Parse command line arguments
 */
function parseArgs(): {
  comprehensive: boolean;
  performance: boolean;
  help: boolean;
} {
  const args = process.argv.slice(2);
  return {
    comprehensive: args.includes('--comprehensive'),
    performance: args.includes('--performance'),
    help: args.includes('--help') || args.includes('-h'),
  };
}

/**
 * Show help message
 */
function showHelp(): void {
  console.log(`
🔍 Database Health Check and Validation

Usage: tsx scripts/validate-database.ts [options]

Options:
  --comprehensive  Run extended validation checks
  --performance    Include performance benchmark tests
  --help          Show this help message

Environment Variables Required:
  DATABASE_URL    - Full PostgreSQL connection string

This script validates:
  ✅ Database connectivity
  ✅ Schema structure integrity  
  ✅ Table constraints and indexes
  ✅ Data consistency checks
  ✅ Performance benchmarks (optional)

Designed for post-migration validation in CI/CD pipelines.
`);
}

/**
 * Validate database connectivity
 */
async function validateConnectivity(
  db: ReturnType<typeof drizzle>,
): Promise<ValidationResult> {
  const result: ValidationResult = {
    category: 'Database Connectivity',
    checks: [],
  };

  try {
    // Basic connection test
    const start = Date.now();
    await db.execute(sql`SELECT 1 as test`);
    const duration = Date.now() - start;

    result.checks.push({
      name: 'Basic Connection',
      status: 'passed',
      details: `Connected successfully`,
      duration,
    });

    // Check database version
    const versionResult = await db.execute(sql`SELECT version() as version`);
    const version = versionResult[0]?.version as string;

    result.checks.push({
      name: 'PostgreSQL Version',
      status: 'passed',
      details: version?.split(' ')[0] || 'Unknown',
    });

    // Check database encoding
    const encodingResult = await db.execute(sql`SHOW server_encoding`);
    const encoding = encodingResult[0]?.server_encoding as string;

    result.checks.push({
      name: 'Database Encoding',
      status: encoding === 'UTF8' ? 'passed' : 'warning',
      details: encoding,
    });
  } catch (error) {
    result.checks.push({
      name: 'Database Connection',
      status: 'failed',
      details: error instanceof Error ? error.message : String(error),
    });
  }

  return result;
}

/**
 * Validate schema structure
 */
async function validateSchema(
  db: ReturnType<typeof drizzle>,
): Promise<ValidationResult> {
  const result: ValidationResult = {
    category: 'Schema Structure',
    checks: [],
  };

  try {
    // Check if required tables exist
    const tables = ['users', 'user_api_keys', 'webhook_events'];

    for (const tableName of tables) {
      try {
        const tableExists = await db.execute(sql`
          SELECT EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_name = ${tableName}
          ) as exists
        `);

        const exists = tableExists[0]?.exists as boolean;

        result.checks.push({
          name: `Table: ${tableName}`,
          status: exists ? 'passed' : 'failed',
          details: exists ? 'Table exists' : 'Table missing',
        });
      } catch (error) {
        result.checks.push({
          name: `Table: ${tableName}`,
          status: 'failed',
          details: error instanceof Error ? error.message : String(error),
        });
      }
    }

    // Check critical indexes
    const indexChecks = [
      { table: 'users', column: 'email', type: 'unique' },
      { table: 'users', column: 'clerk_id', type: 'unique' },
      { table: 'user_api_keys', column: 'user_id', type: 'foreign_key' },
    ];

    for (const indexCheck of indexChecks) {
      try {
        const indexResult = await db.execute(sql`
          SELECT EXISTS (
            SELECT 1 FROM pg_indexes 
            WHERE tablename = ${indexCheck.table} 
            AND indexname LIKE '%' || ${indexCheck.column} || '%'
          ) as exists
        `);

        const exists = indexResult[0]?.exists as boolean;

        result.checks.push({
          name: `Index: ${indexCheck.table}.${indexCheck.column}`,
          status: exists ? 'passed' : 'warning',
          details: exists
            ? 'Index exists'
            : 'Index missing - may impact performance',
        });
      } catch (error) {
        result.checks.push({
          name: `Index: ${indexCheck.table}.${indexCheck.column}`,
          status: 'failed',
          details: error instanceof Error ? error.message : String(error),
        });
      }
    }
  } catch (error) {
    result.checks.push({
      name: 'Schema Validation',
      status: 'failed',
      details: error instanceof Error ? error.message : String(error),
    });
  }

  return result;
}

/**
 * Validate data integrity
 */
async function validateDataIntegrity(
  db: ReturnType<typeof drizzle>,
): Promise<ValidationResult> {
  const result: ValidationResult = {
    category: 'Data Integrity',
    checks: [],
  };

  try {
    // Check for orphaned records
    const orphanedApiKeys = await db.execute(sql`
      SELECT COUNT(*) as count
      FROM user_api_keys uak
      LEFT JOIN users u ON uak.user_id = u.id
      WHERE u.id IS NULL
    `);

    const orphanCount = Number(orphanedApiKeys[0]?.count || 0);

    result.checks.push({
      name: 'Orphaned API Keys',
      status: orphanCount === 0 ? 'passed' : 'warning',
      details:
        orphanCount === 0
          ? 'No orphaned records'
          : `${orphanCount} orphaned API keys found`,
    });

    // Check email uniqueness
    const duplicateEmails = await db.execute(sql`
      SELECT email, COUNT(*) as count
      FROM users
      GROUP BY email
      HAVING COUNT(*) > 1
      LIMIT 5
    `);

    result.checks.push({
      name: 'Email Uniqueness',
      status: duplicateEmails.length === 0 ? 'passed' : 'failed',
      details:
        duplicateEmails.length === 0
          ? 'All emails unique'
          : `${duplicateEmails.length} duplicate emails found`,
    });

    // Check for null required fields
    const nullEmailUsers = await db.execute(sql`
      SELECT COUNT(*) as count
      FROM users
      WHERE email IS NULL
    `);

    const nullEmails = Number(nullEmailUsers[0]?.count || 0);

    result.checks.push({
      name: 'Required Fields',
      status: nullEmails === 0 ? 'passed' : 'failed',
      details:
        nullEmails === 0
          ? 'All required fields populated'
          : `${nullEmails} users with null email`,
    });
  } catch (error) {
    result.checks.push({
      name: 'Data Integrity Check',
      status: 'failed',
      details: error instanceof Error ? error.message : String(error),
    });
  }

  return result;
}

/**
 * Run performance benchmarks
 */
async function validatePerformance(
  db: ReturnType<typeof drizzle>,
): Promise<ValidationResult> {
  const result: ValidationResult = {
    category: 'Performance Benchmarks',
    checks: [],
  };

  try {
    // Test basic query performance
    const start = Date.now();
    await db.select().from(users).limit(10);
    const queryDuration = Date.now() - start;

    result.checks.push({
      name: 'Basic Query Performance',
      status:
        queryDuration < 100
          ? 'passed'
          : queryDuration < 500
            ? 'warning'
            : 'failed',
      details: `Query took ${queryDuration}ms`,
      duration: queryDuration,
    });

    // Test join performance
    const joinStart = Date.now();
    await db
      .select()
      .from(users)
      .leftJoin(userApiKeys, eq(users.id, userApiKeys.userId))
      .limit(5);
    const joinDuration = Date.now() - joinStart;

    result.checks.push({
      name: 'Join Query Performance',
      status:
        joinDuration < 200
          ? 'passed'
          : joinDuration < 1000
            ? 'warning'
            : 'failed',
      details: `Join query took ${joinDuration}ms`,
      duration: joinDuration,
    });

    // Test count query performance
    const countStart = Date.now();
    await db.select({ count: count() }).from(users);
    const countDuration = Date.now() - countStart;

    result.checks.push({
      name: 'Count Query Performance',
      status:
        countDuration < 50
          ? 'passed'
          : countDuration < 200
            ? 'warning'
            : 'failed',
      details: `Count query took ${countDuration}ms`,
      duration: countDuration,
    });
  } catch (error) {
    result.checks.push({
      name: 'Performance Test',
      status: 'failed',
      details: error instanceof Error ? error.message : String(error),
    });
  }

  return result;
}

/**
 * Run comprehensive validation checks
 */
async function runComprehensiveChecks(
  db: ReturnType<typeof drizzle>,
): Promise<ValidationResult> {
  const result: ValidationResult = {
    category: 'Comprehensive Checks',
    checks: [],
  };

  try {
    // Check table sizes
    const tableSizes = await db.execute(sql`
      SELECT 
        schemaname,
        tablename,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
      FROM pg_tables 
      WHERE schemaname = 'public'
      ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
    `);

    result.checks.push({
      name: 'Table Sizes',
      status: 'passed',
      details: `${tableSizes.length} tables analyzed`,
    });

    // Check for unused indexes
    const unusedIndexes = await db.execute(sql`
      SELECT 
        schemaname,
        tablename,
        indexname,
        idx_tup_read,
        idx_tup_fetch
      FROM pg_stat_user_indexes 
      WHERE idx_tup_read = 0 
      AND idx_tup_fetch = 0
      AND NOT indexname LIKE '%_pkey'
    `);

    result.checks.push({
      name: 'Unused Indexes',
      status: unusedIndexes.length === 0 ? 'passed' : 'warning',
      details:
        unusedIndexes.length === 0
          ? 'No unused indexes'
          : `${unusedIndexes.length} potentially unused indexes`,
    });

    // Check connection limits
    const connections = await db.execute(sql`
      SELECT 
        count(*) as active_connections,
        setting as max_connections
      FROM pg_stat_activity, pg_settings 
      WHERE name = 'max_connections'
      GROUP BY setting
    `);

    const activeConn = Number(connections[0]?.active_connections || 0);
    const maxConn = Number(connections[0]?.max_connections || 100);
    const connPercentage = (activeConn / maxConn) * 100;

    result.checks.push({
      name: 'Connection Usage',
      status:
        connPercentage < 70
          ? 'passed'
          : connPercentage < 90
            ? 'warning'
            : 'failed',
      details: `${activeConn}/${maxConn} connections (${connPercentage.toFixed(1)}%)`,
    });
  } catch (error) {
    result.checks.push({
      name: 'Comprehensive Check',
      status: 'failed',
      details: error instanceof Error ? error.message : String(error),
    });
  }

  return result;
}

/**
 * Generate summary from validation results
 */
function generateSummary(
  results: ValidationResult[],
  duration: number,
): HealthCheckSummary {
  let totalChecks = 0;
  let passed = 0;
  let failed = 0;
  let warnings = 0;

  results.forEach(category => {
    category.checks.forEach(check => {
      totalChecks++;
      switch (check.status) {
        case 'passed':
          passed++;
          break;
        case 'failed':
          failed++;
          break;
        case 'warning':
          warnings++;
          break;
      }
    });
  });

  const overall: 'healthy' | 'warning' | 'critical' =
    failed > 0 ? 'critical' : warnings > 0 ? 'warning' : 'healthy';

  return {
    overall,
    totalChecks,
    passed,
    failed,
    warnings,
    duration,
    results,
  };
}

/**
 * Print validation results
 */
function printResults(summary: HealthCheckSummary): void {
  console.log('\n🔍 Database Health Check Results');
  console.log('=====================================');

  // Overall status
  const statusEmoji =
    summary.overall === 'healthy'
      ? '✅'
      : summary.overall === 'warning'
        ? '⚠️'
        : '❌';
  console.log(
    `\n${statusEmoji} Overall Status: ${summary.overall.toUpperCase()}`,
  );
  console.log(
    `📊 Summary: ${summary.passed} passed, ${summary.warnings} warnings, ${summary.failed} failed`,
  );
  console.log(`⏱️  Duration: ${summary.duration}ms\n`);

  // Detailed results by category
  summary.results.forEach(category => {
    console.log(`📋 ${category.category}`);
    console.log('─'.repeat(category.category.length + 2));

    category.checks.forEach(check => {
      const emoji =
        check.status === 'passed'
          ? '✅'
          : check.status === 'warning'
            ? '⚠️'
            : '❌';
      const duration = check.duration ? ` (${check.duration}ms)` : '';
      console.log(`${emoji} ${check.name}${duration}`);
      if (check.details) {
        console.log(`   ${check.details}`);
      }
    });
    console.log('');
  });
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

  console.log('🔍 Starting Database Health Check...');
  console.log(`   Comprehensive: ${args.comprehensive ? 'Yes' : 'No'}`);
  console.log(`   Performance: ${args.performance ? 'Yes' : 'No'}`);

  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL environment variable is required');
    process.exit(1);
  }

  let client: postgres.Sql | null = null;

  try {
    const startTime = Date.now();

    // Create database connection
    client = postgres(process.env.DATABASE_URL, {
      max: 1,
      ssl: process.env.NODE_ENV === 'production' ? 'require' : false,
    });

    const db = drizzle(client);

    // Run validation checks
    const results: ValidationResult[] = [];

    // Always run basic checks
    results.push(await validateConnectivity(db));
    results.push(await validateSchema(db));
    results.push(await validateDataIntegrity(db));

    // Optional checks
    if (args.performance) {
      results.push(await validatePerformance(db));
    }

    if (args.comprehensive) {
      results.push(await runComprehensiveChecks(db));
    }

    const duration = Date.now() - startTime;
    const summary = generateSummary(results, duration);

    // Print results
    printResults(summary);

    // Exit with appropriate code
    if (summary.overall === 'critical') {
      console.error('❌ Critical issues found - validation failed');
      process.exit(1);
    } else if (summary.overall === 'warning') {
      console.warn('⚠️  Warnings found - please review');
      process.exit(0);
    } else {
      console.log('✅ All validation checks passed');
      process.exit(0);
    }
  } catch (error) {
    console.error('❌ Validation failed:', error);
    process.exit(1);
  } finally {
    if (client) {
      await client.end();
    }
  }
}

// Handle unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Run if called directly
if (require.main === module) {
  main();
}
