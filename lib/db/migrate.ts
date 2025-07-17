import 'dotenv/config'
import { drizzle } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import postgres from 'postgres'
import fs from 'fs'
import path from 'path'

export interface MigrationStatus {
  name: string
  applied: boolean
  appliedAt?: Date
  checksum?: string
}

export interface MigrationResult {
  success: boolean
  migrationsApplied: string[]
  errors: string[]
  totalTime: number
}

export class DatabaseMigrator {
  private sql: postgres.Sql
  private db: ReturnType<typeof drizzle>
  private migrationsPath: string

  constructor(connectionString: string, migrationsPath?: string) {
    this.sql = postgres(connectionString, {
      max: 1, // Only one connection needed for migrations
      idle_timeout: 30000,
      connect_timeout: 30000,
    })
    
    this.db = drizzle(this.sql)
    this.migrationsPath = migrationsPath || path.join(process.cwd(), 'lib/db/migrations')
  }

  // Run all pending migrations
  async runMigrations(): Promise<MigrationResult> {
    const startTime = Date.now()
    const result: MigrationResult = {
      success: true,
      migrationsApplied: [],
      errors: [],
      totalTime: 0
    }

    try {
      console.log('Starting database migrations...')
      
      // Ensure migrations table exists
      await this.ensureMigrationsTable()
      
      // Get pending migrations
      const pendingMigrations = await this.getPendingMigrations()
      
      if (pendingMigrations.length === 0) {
        console.log('No pending migrations found')
        result.totalTime = Date.now() - startTime
        return result
      }

      console.log(`Found ${pendingMigrations.length} pending migrations`)
      
      // Apply migrations using Drizzle's migrate function
      await migrate(this.db, { migrationsFolder: this.migrationsPath })
      
      // Record applied migrations
      for (const migration of pendingMigrations) {
        await this.recordMigration(migration)
        result.migrationsApplied.push(migration)
        console.log(`Applied migration: ${migration}`)
      }
      
      result.totalTime = Date.now() - startTime
      console.log(`All migrations completed successfully in ${result.totalTime}ms`)
      
      return result
    } catch (error) {
      result.success = false
      result.errors.push(error instanceof Error ? error.message : 'Unknown error')
      result.totalTime = Date.now() - startTime
      
      console.error('Migration failed:', error)
      throw error
    }
  }

  // Get migration status
  async getMigrationStatus(): Promise<MigrationStatus[]> {
    try {
      await this.ensureMigrationsTable()
      
      const availableMigrations = await this.getAvailableMigrations()
      const appliedMigrations = await this.getAppliedMigrations()
      
      return availableMigrations.map(migration => {
        const applied = appliedMigrations.find(m => m.name === migration)
        return {
          name: migration,
          applied: !!applied,
          appliedAt: applied?.appliedAt,
          checksum: applied?.checksum
        }
      })
    } catch (error) {
      console.error('Error getting migration status:', error)
      throw error
    }
  }

  // Validate database schema
  async validateSchema(): Promise<{ valid: boolean; issues: string[] }> {
    const issues: string[] = []
    
    try {
      // Check if all expected tables exist
      const expectedTables = [
        'users', 'accounts', 'sessions', 'verification_tokens',
        'user_api_keys', 'password_history', 'auth_attempts', 
        'user_sessions', 'session_activity'
      ]
      
      for (const table of expectedTables) {
        const exists = await this.sql`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_name = ${table}
          )
        `
        
        if (!exists[0]?.exists) {
          issues.push(`Missing table: ${table}`)
        }
      }
      
      // Check if critical indexes exist
      const criticalIndexes = [
        'users_email_unique',
        'idx_users_email_lookup',
        'idx_auth_attempts_identifier',
        'idx_auth_attempts_rate_limit',
        'idx_password_history_user_date'
      ]
      
      for (const index of criticalIndexes) {
        const exists = await this.sql`
          SELECT EXISTS (
            SELECT FROM pg_indexes 
            WHERE indexname = ${index}
          )
        `
        
        if (!exists[0]?.exists) {
          issues.push(`Missing index: ${index}`)
        }
      }
      
      return {
        valid: issues.length === 0,
        issues
      }
    } catch (error) {
      issues.push(`Schema validation error: ${error instanceof Error ? error.message : 'Unknown error'}`)
      return {
        valid: false,
        issues
      }
    }
  }

  // Private helper methods
  private async ensureMigrationsTable(): Promise<void> {
    await this.sql`
      CREATE TABLE IF NOT EXISTS __drizzle_migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        checksum VARCHAR(64)
      )
    `
  }

  private async getAvailableMigrations(): Promise<string[]> {
    const files = fs.readdirSync(this.migrationsPath)
    return files
      .filter(file => file.endsWith('.sql') && !file.includes('.rollback.'))
      .map(file => file.replace('.sql', ''))
      .sort()
  }

  private async getAppliedMigrations(): Promise<Array<{ name: string; appliedAt: Date; checksum?: string }>> {
    const result = await this.sql`
      SELECT name, applied_at, checksum 
      FROM __drizzle_migrations 
      ORDER BY applied_at
    `
    
    return result.map(row => ({
      name: row.name,
      appliedAt: row.applied_at,
      checksum: row.checksum
    }))
  }

  private async getPendingMigrations(): Promise<string[]> {
    const available = await this.getAvailableMigrations()
    const applied = await this.getAppliedMigrations()
    const appliedNames = applied.map(m => m.name)
    
    return available.filter(migration => !appliedNames.includes(migration))
  }

  private async recordMigration(migrationName: string): Promise<void> {
    const migrationPath = path.join(this.migrationsPath, `${migrationName}.sql`)
    let checksum: string | null = null
    
    if (fs.existsSync(migrationPath)) {
      const content = fs.readFileSync(migrationPath, 'utf8')
      checksum = this.calculateChecksum(content)
    }
    
    await this.sql`
      INSERT INTO __drizzle_migrations (name, checksum)
      VALUES (${migrationName}, ${checksum})
      ON CONFLICT (name) DO NOTHING
    `
  }

  private calculateChecksum(content: string): string {
    const crypto = require('crypto')
    return crypto.createHash('md5').update(content).digest('hex')
  }

  // Cleanup resources
  async close(): Promise<void> {
    await this.sql.end()
  }
}

// CLI utility functions
export async function runMigrations(connectionString?: string): Promise<void> {
  const connString = connectionString || process.env.DATABASE_URL
  if (!connString) {
    throw new Error('Database connection string is required')
  }

  const migrator = new DatabaseMigrator(connString)
  
  try {
    await migrator.runMigrations()
  } finally {
    await migrator.close()
  }
}

export async function getMigrationStatus(connectionString?: string): Promise<MigrationStatus[]> {
  const connString = connectionString || process.env.DATABASE_URL
  if (!connString) {
    throw new Error('Database connection string is required')
  }

  const migrator = new DatabaseMigrator(connString)
  
  try {
    return await migrator.getMigrationStatus()
  } finally {
    await migrator.close()
  }
}

export async function validateDatabaseSchema(connectionString?: string): Promise<{ valid: boolean; issues: string[] }> {
  const connString = connectionString || process.env.DATABASE_URL
  if (!connString) {
    throw new Error('Database connection string is required')
  }

  const migrator = new DatabaseMigrator(connString)
  
  try {
    return await migrator.validateSchema()
  } finally {
    await migrator.close()
  }
}

// Original simple migration runner for backward compatibility
const runMigrate = async () => {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not defined')
  }

  const connection = postgres(process.env.DATABASE_URL, { max: 1 })
  const db = drizzle(connection)

  console.log('Running migrations...')

  await migrate(db, { migrationsFolder: 'lib/db/migrations' })

  console.log('Migrations complete!')

  await connection.end()
}

// Export the migrator class for advanced usage
export default DatabaseMigrator

// Run migrations if this file is executed directly
if (require.main === module) {
  runMigrate().catch((err) => {
    console.error('Migration failed!')
    console.error(err)
    process.exit(1)
  })
}