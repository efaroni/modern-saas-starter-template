import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

export interface ConnectionPoolConfig {
  // Connection pool settings
  max: number              // Maximum number of connections in pool
  idle_timeout: number     // Milliseconds before closing idle connections
  connect_timeout: number  // Milliseconds before connection timeout
  
  // Query settings
  prepare: boolean         // Use prepared statements
  transform: object        // Transform settings
  
  // SSL settings
  ssl?: boolean | 'require' | 'prefer'
  
  // Connection retry settings
  max_lifetime: number     // Maximum lifetime of a connection in seconds
  max_uses: number        // Maximum uses of a connection before recycling
}

export const DEFAULT_POOL_CONFIG: ConnectionPoolConfig = {
  max: 20,                    // Maximum 20 connections
  idle_timeout: 30000,        // 30 seconds idle timeout
  connect_timeout: 10000,     // 10 seconds connection timeout
  prepare: true,              // Use prepared statements for performance
  transform: {
    undefined: null,          // Transform undefined to null for PostgreSQL
  },
  ssl: process.env.NODE_ENV === 'production' ? 'require' : false,
  max_lifetime: 3600,         // 1 hour connection lifetime
  max_uses: 7500,            // Recycle after 7500 uses
}

export interface DatabaseHealth {
  healthy: boolean
  connections: {
    active: number
    idle: number
    waiting: number
    max: number
  }
  performance: {
    avgQueryTime: number
    slowQueries: number
    totalQueries: number
  }
  errors: {
    connectionErrors: number
    queryErrors: number
    timeouts: number
  }
}

export class DatabaseConnectionPool {
  private sql: postgres.Sql
  private db: ReturnType<typeof drizzle>
  private config: ConnectionPoolConfig
  private healthStats: DatabaseHealth
  private queryMetrics: {
    totalQueries: number
    totalTime: number
    slowQueries: number
    errors: number
  }

  constructor(connectionString: string, config?: Partial<ConnectionPoolConfig>) {
    this.config = { ...DEFAULT_POOL_CONFIG, ...config }
    this.queryMetrics = {
      totalQueries: 0,
      totalTime: 0,
      slowQueries: 0,
      errors: 0
    }
    
    this.sql = postgres(connectionString, {
      max: this.config.max,
      idle_timeout: this.config.idle_timeout,
      connect_timeout: this.config.connect_timeout,
      prepare: this.config.prepare,
      transform: this.config.transform,
      ssl: this.config.ssl,
      max_lifetime: this.config.max_lifetime,
      max_uses: this.config.max_uses,
      
      // Connection event handlers
      onnotice: (notice) => {
        console.log('PostgreSQL notice:', notice)
      },
      
      // Error handling
      onclose: (connectionId) => {
        console.log(`PostgreSQL connection ${connectionId} closed`)
      },
      
      // Query transformation for metrics
      transform: {
        ...this.config.transform,
        // Add query timing
        column: {
          to: (column: any) => column,
          from: (column: any) => column,
        },
      },
    })

    this.db = drizzle(this.sql, { schema })
    this.initializeHealthStats()
  }

  private initializeHealthStats(): void {
    this.healthStats = {
      healthy: true,
      connections: {
        active: 0,
        idle: 0,
        waiting: 0,
        max: this.config.max
      },
      performance: {
        avgQueryTime: 0,
        slowQueries: 0,
        totalQueries: 0
      },
      errors: {
        connectionErrors: 0,
        queryErrors: 0,
        timeouts: 0
      }
    }
  }

  // Wrapper for database operations with metrics
  async query<T>(queryFn: (db: typeof this.db) => Promise<T>): Promise<T> {
    const startTime = Date.now()
    
    try {
      const result = await queryFn(this.db)
      
      const queryTime = Date.now() - startTime
      this.updateQueryMetrics(queryTime, true)
      
      return result
    } catch (error) {
      const queryTime = Date.now() - startTime
      this.updateQueryMetrics(queryTime, false)
      
      if (error instanceof Error) {
        if (error.message.includes('timeout')) {
          this.healthStats.errors.timeouts++
        } else if (error.message.includes('connection')) {
          this.healthStats.errors.connectionErrors++
        } else {
          this.healthStats.errors.queryErrors++
        }
      }
      
      throw error
    }
  }

  private updateQueryMetrics(queryTime: number, success: boolean): void {
    this.queryMetrics.totalQueries++
    this.queryMetrics.totalTime += queryTime
    
    if (!success) {
      this.queryMetrics.errors++
    }
    
    // Consider queries > 1 second as slow
    if (queryTime > 1000) {
      this.queryMetrics.slowQueries++
    }
    
    // Update health stats
    this.healthStats.performance.totalQueries = this.queryMetrics.totalQueries
    this.healthStats.performance.avgQueryTime = this.queryMetrics.totalTime / this.queryMetrics.totalQueries
    this.healthStats.performance.slowQueries = this.queryMetrics.slowQueries
  }

  // Get connection pool health
  async getHealth(): Promise<DatabaseHealth> {
    try {
      // Test database connectivity
      await this.sql`SELECT 1`
      
      // Get connection pool stats if available
      const poolStats = (this.sql as any).options
      
      this.healthStats.healthy = true
      this.healthStats.connections = {
        active: poolStats?.active || 0,
        idle: poolStats?.idle || 0,
        waiting: poolStats?.waiting || 0,
        max: this.config.max
      }
      
      return this.healthStats
    } catch (error) {
      this.healthStats.healthy = false
      this.healthStats.errors.connectionErrors++
      return this.healthStats
    }
  }

  // Get the Drizzle database instance
  get database() {
    return this.db
  }

  // Get the postgres.js instance
  get client() {
    return this.sql
  }

  // Graceful shutdown
  async close(): Promise<void> {
    try {
      await this.sql.end()
      console.log('Database connection pool closed gracefully')
    } catch (error) {
      console.error('Error closing database connection pool:', error)
    }
  }

  // Connection pool management
  async warmup(): Promise<void> {
    try {
      // Pre-warm the connection pool by creating some connections
      const warmupPromises = []
      const warmupCount = Math.min(5, this.config.max)
      
      for (let i = 0; i < warmupCount; i++) {
        warmupPromises.push(this.sql`SELECT 1`)
      }
      
      await Promise.all(warmupPromises)
      console.log(`Database connection pool warmed up with ${warmupCount} connections`)
    } catch (error) {
      console.error('Error warming up database connection pool:', error)
    }
  }

  // Performance monitoring
  getPerformanceMetrics() {
    return {
      ...this.queryMetrics,
      avgQueryTime: this.queryMetrics.totalTime / this.queryMetrics.totalQueries,
      errorRate: this.queryMetrics.errors / this.queryMetrics.totalQueries,
      slowQueryRate: this.queryMetrics.slowQueries / this.queryMetrics.totalQueries
    }
  }

  // Reset metrics (useful for testing)
  resetMetrics(): void {
    this.queryMetrics = {
      totalQueries: 0,
      totalTime: 0,
      slowQueries: 0,
      errors: 0
    }
    this.initializeHealthStats()
  }
}

// Create and export the singleton database connection pool
let dbPool: DatabaseConnectionPool | null = null

export function getDatabasePool(): DatabaseConnectionPool {
  if (!dbPool) {
    const connectionString = process.env.DATABASE_URL
    if (!connectionString) {
      throw new Error('DATABASE_URL environment variable is not set')
    }
    
    // Configuration based on environment
    const config: Partial<ConnectionPoolConfig> = {
      max: process.env.DB_POOL_MAX ? parseInt(process.env.DB_POOL_MAX) : 20,
      idle_timeout: process.env.DB_POOL_IDLE_TIMEOUT ? parseInt(process.env.DB_POOL_IDLE_TIMEOUT) : 30000,
      connect_timeout: process.env.DB_POOL_CONNECT_TIMEOUT ? parseInt(process.env.DB_POOL_CONNECT_TIMEOUT) : 10000,
      ssl: process.env.NODE_ENV === 'production' ? 'require' : false,
    }
    
    dbPool = new DatabaseConnectionPool(connectionString, config)
  }
  
  return dbPool
}

// Export the database instance (backward compatibility)
export const db = getDatabasePool().database

// Graceful shutdown handler
if (typeof process !== 'undefined') {
  process.on('SIGTERM', async () => {
    console.log('Received SIGTERM, closing database connection pool...')
    if (dbPool) {
      await dbPool.close()
    }
    process.exit(0)
  })
  
  process.on('SIGINT', async () => {
    console.log('Received SIGINT, closing database connection pool...')
    if (dbPool) {
      await dbPool.close()
    }
    process.exit(0)
  })
}