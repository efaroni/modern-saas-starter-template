import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'
import { getDatabaseConfig } from './config'

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

// Create default pool config using centralized database configuration
function createDefaultPoolConfig(): ConnectionPoolConfig {
  const dbConfig = getDatabaseConfig()
  
  return {
    max: dbConfig.poolSize,
    idle_timeout: dbConfig.idleTimeout * 1000, // Convert seconds to ms
    connect_timeout: dbConfig.connectTimeout * 1000, // Convert seconds to ms
    prepare: true,              // Use prepared statements for performance
    transform: {
      undefined: null,          // Transform undefined to null for PostgreSQL
    },
    ssl: process.env.NODE_ENV === 'production' ? 'require' : false,
    max_lifetime: dbConfig.maxLifetime,
    max_uses: dbConfig.maxUses,
  }
}

export const DEFAULT_POOL_CONFIG: ConnectionPoolConfig = createDefaultPoolConfig()

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
  private dbConfig = getDatabaseConfig()
  private queryMetrics: {
    totalQueries: number
    totalTime: number
    slowQueries: number
    errors: number
    slowQueryDetails: Array<{
      query: string
      duration: number
      timestamp: Date
    }>
  }

  constructor(connectionString: string, config?: Partial<ConnectionPoolConfig>) {
    this.config = { ...DEFAULT_POOL_CONFIG, ...config }
    this.queryMetrics = {
      totalQueries: 0,
      totalTime: 0,
      slowQueries: 0,
      errors: 0,
      slowQueryDetails: []
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
          to: (column: unknown) => column,
          from: (column: unknown) => column,
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
    
    // Consider queries > threshold as slow
    if (queryTime > this.dbConfig.slowQueryThreshold) {
      this.queryMetrics.slowQueries++
      // Track slow query details
      this.queryMetrics.slowQueryDetails.push({
        query: 'Query details would be captured here', // TODO: Capture actual query
        duration: queryTime,
        timestamp: new Date()
      })
      
      // Limit stored slow queries to prevent memory growth
      if (this.queryMetrics.slowQueryDetails.length > 100) {
        this.queryMetrics.slowQueryDetails.shift() // Remove oldest
      }
      
      // Log slow query for monitoring
      console.warn(`[DB] Slow query detected: ${queryTime}ms (threshold: ${this.dbConfig.slowQueryThreshold}ms)`)
    }
    
    // Update health stats
    this.healthStats.performance.totalQueries = this.queryMetrics.totalQueries
    this.healthStats.performance.avgQueryTime = this.queryMetrics.totalTime / this.queryMetrics.totalQueries
    this.healthStats.performance.slowQueries = this.queryMetrics.slowQueries
    
    // Check for concerning patterns and alert
    this.checkPerformanceAlerts()
  }

  private checkPerformanceAlerts(): void {
    // Alert on high error rate
    const errorRate = this.queryMetrics.errors / this.queryMetrics.totalQueries
    if (errorRate > 0.1 && this.queryMetrics.totalQueries > 10) { // 10% error rate
      console.error(`[DB ALERT] High error rate: ${(errorRate * 100).toFixed(1)}% (${this.queryMetrics.errors}/${this.queryMetrics.totalQueries})`)
    }
    
    // Alert on high slow query rate
    const slowQueryRate = this.queryMetrics.slowQueries / this.queryMetrics.totalQueries
    if (slowQueryRate > 0.2 && this.queryMetrics.totalQueries > 5) { // 20% slow query rate
      console.warn(`[DB ALERT] High slow query rate: ${(slowQueryRate * 100).toFixed(1)}% (${this.queryMetrics.slowQueries}/${this.queryMetrics.totalQueries})`)
    }
    
    // Alert on very high average query time
    const avgQueryTime = this.queryMetrics.totalTime / this.queryMetrics.totalQueries
    if (avgQueryTime > this.dbConfig.slowQueryThreshold * 0.5) { // 50% of slow query threshold
      console.warn(`[DB ALERT] High average query time: ${avgQueryTime.toFixed(2)}ms`)
    }
  }

  // Get connection pool health
  async getHealth(): Promise<DatabaseHealth> {
    try {
      // Test database connectivity
      await this.sql`SELECT 1`
      
      // Get connection pool stats if available
      const poolStats = (this.sql as unknown as { options?: { active?: number; idle?: number; total?: number } }).options
      
      this.healthStats.healthy = true
      this.healthStats.connections = {
        active: poolStats?.active || 0,
        idle: poolStats?.idle || 0,
        waiting: poolStats?.waiting || 0,
        max: this.config.max
      }
      
      // Check for connection pool saturation
      this.checkConnectionPoolAlerts(this.healthStats.connections)
      
      return this.healthStats
    } catch {
      this.healthStats.healthy = false
      this.healthStats.errors.connectionErrors++
      return this.healthStats
    }
  }

  private checkConnectionPoolAlerts(connections: { active: number; idle: number; waiting: number; max: number }): void {
    // Alert on high connection pool utilization
    const utilization = connections.active / connections.max
    if (utilization > 0.8) { // 80% utilization
      console.warn(`[DB ALERT] Connection pool near saturation: ${(utilization * 100).toFixed(1)}% (${connections.active}/${connections.max})`)
    }
    
    // Alert on waiting connections
    if (connections.waiting > 0) {
      console.warn(`[DB ALERT] Connections waiting in queue: ${connections.waiting}`)
    }
    
    // Alert on very low idle connections
    if (connections.idle === 0 && connections.active > connections.max * 0.5) {
      console.warn(`[DB ALERT] No idle connections available (${connections.active} active)`)
    }
  }

  // Get query performance metrics
  getPerformanceMetrics(): {
    totalQueries: number
    averageQueryTime: number
    slowQueryCount: number
    errorRate: number
    topSlowQueries: Array<{ query: string; duration: number; timestamp: Date }>
  } {
    const avgQueryTime = this.queryMetrics.totalTime / this.queryMetrics.totalQueries || 0
    const errorRate = this.queryMetrics.errors / this.queryMetrics.totalQueries || 0
    
    // Get top 10 slowest queries
    const topSlowQueries = this.queryMetrics.slowQueryDetails
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 10)
    
    return {
      totalQueries: this.queryMetrics.totalQueries,
      averageQueryTime: avgQueryTime,
      slowQueryCount: this.queryMetrics.slowQueries,
      errorRate: errorRate,
      topSlowQueries
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
    // Import here to avoid circular dependency
    const { getDatabaseUrl } = require('./config')
    const connectionString = getDatabaseUrl()
    
    // Use the centralized default pool configuration
    dbPool = new DatabaseConnectionPool(connectionString, DEFAULT_POOL_CONFIG)
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