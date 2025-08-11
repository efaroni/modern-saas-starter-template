import { eq } from 'drizzle-orm';

import { getDatabaseConfig } from './config';
import { db } from './connection-pool';
import { users } from './schema';

export interface QueryOptimizationConfig {
  // Cache settings
  enableQueryCache: boolean;
  cacheTimeout: number; // in milliseconds

  // Pagination settings
  defaultPageSize: number;
  maxPageSize: number;

  // Performance settings
  enableQueryLogging: boolean;
  slowQueryThreshold: number; // in milliseconds

  // Batch processing
  defaultBatchSize: number;
  maxBatchSize: number;
}

// Get database configuration dynamically
const getDefaultQueryConfig = (): QueryOptimizationConfig => {
  const dbConfig = getDatabaseConfig();

  return {
    enableQueryCache: process.env.NODE_ENV === 'production',
    cacheTimeout: dbConfig.cacheTtl * 1000, // Convert to milliseconds
    defaultPageSize: 20,
    maxPageSize: 100,
    enableQueryLogging: process.env.NODE_ENV === 'development',
    slowQueryThreshold: dbConfig.slowQueryThreshold,
    defaultBatchSize: 100,
    maxBatchSize: dbConfig.cacheMaxSize * 10, // 10x cache size for batch operations
  };
};

export const DEFAULT_QUERY_CONFIG: QueryOptimizationConfig =
  getDefaultQueryConfig();

// Query cache for frequently accessed data
class QueryCache {
  private cache = new Map<string, { data: unknown; timestamp: number }>();
  private config: QueryOptimizationConfig;

  constructor(config: QueryOptimizationConfig) {
    this.config = config;
  }

  set(key: string, data: unknown): void {
    if (!this.config.enableQueryCache) return;

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  get(key: string): unknown | null {
    if (!this.config.enableQueryCache) return null;

    const cached = this.cache.get(key);
    if (!cached) return null;

    const age = Date.now() - cached.timestamp;
    if (age > this.config.cacheTimeout) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  clear(): void {
    this.cache.clear();
  }

  // Cleanup expired entries
  cleanup(): void {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > this.config.cacheTimeout) {
        this.cache.delete(key);
      }
    }
  }
}

export class QueryOptimizer {
  private cache: QueryCache;
  private config: QueryOptimizationConfig;
  private queryMetrics: Map<
    string,
    { count: number; totalTime: number; avgTime: number }
  >;

  constructor(config?: Partial<QueryOptimizationConfig>) {
    this.config = { ...DEFAULT_QUERY_CONFIG, ...config };
    this.cache = new QueryCache(this.config);
    this.queryMetrics = new Map();

    // Setup periodic cache cleanup
    if (this.config.enableQueryCache) {
      setInterval(() => {
        this.cache.cleanup();
      }, this.config.cacheTimeout);
    }
  }

  // Execute query with performance monitoring
  async executeQuery<T>(
    queryName: string,
    queryFn: () => Promise<T>,
    cacheKey?: string,
  ): Promise<T> {
    // Check cache first
    if (cacheKey) {
      const cached = this.cache.get(cacheKey);
      if (cached) {
        return cached as T;
      }
    }

    const startTime = Date.now();

    try {
      const result = await queryFn();
      const queryTime = Date.now() - startTime;

      // Update metrics
      this.updateMetrics(queryName, queryTime);

      // Log slow queries
      if (
        this.config.enableQueryLogging &&
        queryTime > this.config.slowQueryThreshold
      ) {
        console.warn(`Slow query detected: ${queryName} took ${queryTime}ms`);
      }

      // Cache result if requested
      if (cacheKey) {
        this.cache.set(cacheKey, result);
      }

      return result;
    } catch (error) {
      const queryTime = Date.now() - startTime;
      this.updateMetrics(queryName, queryTime, true);

      if (this.config.enableQueryLogging) {
        console.error(`Query failed: ${queryName} after ${queryTime}ms`, error);
      }

      throw error;
    }
  }

  private updateMetrics(
    queryName: string,
    queryTime: number,
    _failed: boolean = false,
  ): void {
    const existing = this.queryMetrics.get(queryName) || {
      count: 0,
      totalTime: 0,
      avgTime: 0,
    };

    existing.count++;
    existing.totalTime += queryTime;
    existing.avgTime = existing.totalTime / existing.count;

    this.queryMetrics.set(queryName, existing);
  }

  // Optimized user queries
  findUserByEmail(
    email: string,
    useCache = true,
  ): Promise<typeof users.$inferSelect | null> {
    const cacheKey = useCache ? `user:email:${email}` : undefined;

    return this.executeQuery(
      'findUserByEmail',
      async () => {
        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.email, email))
          .limit(1);

        return user || null;
      },
      cacheKey,
    );
  }

  findUserById(
    id: string,
    useCache = true,
  ): Promise<typeof users.$inferSelect | null> {
    const cacheKey = useCache ? `user:id:${id}` : undefined;

    return this.executeQuery(
      'findUserById',
      async () => {
        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.id, id))
          .limit(1);

        return user || null;
      },
      cacheKey,
    );
  }

  // Performance monitoring
  getQueryMetrics(): Array<{
    queryName: string;
    count: number;
    totalTime: number;
    avgTime: number;
  }> {
    return Array.from(this.queryMetrics.entries()).map(
      ([queryName, metrics]) => ({
        queryName,
        ...metrics,
      }),
    );
  }

  // Cache management
  invalidateCache(pattern?: string): void {
    if (pattern) {
      // If pattern is provided, remove matching cache entries
      for (const key of this.cache['cache'].keys()) {
        if (key.includes(pattern)) {
          this.cache['cache'].delete(key);
        }
      }
    } else {
      // Clear all cache
      this.cache.clear();
    }
  }
}

// Export singleton instance
export const queryOptimizer = new QueryOptimizer();

// Export optimized query functions
export const optimizedQueries = {
  findUserByEmail: (email: string, useCache = true) =>
    queryOptimizer.findUserByEmail(email, useCache),
  findUserById: (id: string, useCache = true) =>
    queryOptimizer.findUserById(id, useCache),
};