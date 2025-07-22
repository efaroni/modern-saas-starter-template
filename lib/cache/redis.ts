import { Redis } from 'ioredis';

export interface CacheConfig {
  host: string;
  port: number;
  password?: string;
  db?: number;
  keyPrefix?: string;
  connectTimeout?: number;
  commandTimeout?: number;
  retryDelayOnFailover?: number;
  maxRetriesPerRequest?: number;
  lazyConnect?: boolean;
  keepAlive?: number;
  enableReadyCheck?: boolean;
  maxLoadingTimeout?: number;
}

export interface CacheItem<T = any> {
  data: T;
  timestamp: number;
  ttl: number;
}

export interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  errors: number;
  hitRate: number;
  totalOperations: number;
}

export class RedisCache {
  private redis: Redis;
  private fallbackMap: Map<string, CacheItem>;
  private config: CacheConfig;
  private stats: CacheStats;
  private connected: boolean = false;
  private useRedis: boolean = true;

  constructor(config: CacheConfig) {
    this.config = config;
    this.fallbackMap = new Map();
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      errors: 0,
      hitRate: 0,
      totalOperations: 0,
    };

    try {
      this.redis = new Redis({
        host: config.host,
        port: config.port,
        password: config.password,
        db: config.db || 0,
        keyPrefix: config.keyPrefix || 'saas:',
        connectTimeout: config.connectTimeout || 10000,
        commandTimeout: config.commandTimeout || 5000,
        retryDelayOnFailover: config.retryDelayOnFailover || 100,
        maxRetriesPerRequest: config.maxRetriesPerRequest || 3,
        lazyConnect: config.lazyConnect || true,
        keepAlive: config.keepAlive || 30000,
        enableReadyCheck: config.enableReadyCheck || true,
        maxLoadingTimeout: config.maxLoadingTimeout || 5000,

        // Retry strategy
        retryStrategy: times => {
          const delay = Math.min(times * 50, 2000);
          return delay;
        },

        // Connection events
        onFailover: () => {
          console.log('Redis failover detected');
        },
      });

      this.redis.on('connect', () => {
        console.log('Connected to Redis');
        this.connected = true;
      });

      this.redis.on('ready', () => {
        console.log('Redis connection ready');
        this.connected = true;
      });

      this.redis.on('error', err => {
        console.error('Redis connection error:', err);
        this.connected = false;
        this.stats.errors++;

        // Fallback to in-memory cache
        if (this.useRedis) {
          console.log('Falling back to in-memory cache due to Redis error');
          this.useRedis = false;

          // Auto-retry Redis connection after 30 seconds
          setTimeout(() => {
            this.useRedis = true;
            console.log('Retrying Redis connection...');
          }, 30000);
        }
      });

      this.redis.on('close', () => {
        console.log('Redis connection closed');
        this.connected = false;
      });

      this.redis.on('reconnecting', () => {
        console.log('Reconnecting to Redis...');
      });
    } catch (error) {
      console.error('Failed to initialize Redis:', error);
      this.useRedis = false;
    }
  }

  // Set cache item with TTL
  async set<T>(
    key: string,
    value: T,
    ttlSeconds: number = 300,
  ): Promise<boolean> {
    try {
      this.stats.sets++;
      this.updateStats();

      const item: CacheItem<T> = {
        data: value,
        timestamp: Date.now(),
        ttl: ttlSeconds,
      };

      if (this.useRedis && this.connected) {
        try {
          await this.redis.setex(key, ttlSeconds, JSON.stringify(item));
          return true;
        } catch (error) {
          console.error('Redis set error:', error);
          this.stats.errors++;
          // Fallback to in-memory
          this.fallbackMap.set(key, item);
          return true;
        }
      } else {
        // In-memory fallback
        this.fallbackMap.set(key, item);

        // Setup expiration for in-memory cache
        setTimeout(() => {
          this.fallbackMap.delete(key);
        }, ttlSeconds * 1000);

        return true;
      }
    } catch (error) {
      console.error('Cache set error:', error);
      this.stats.errors++;
      return false;
    }
  }

  // Get cache item
  async get<T>(key: string): Promise<T | null> {
    try {
      this.updateStats();

      if (this.useRedis && this.connected) {
        try {
          const result = await this.redis.get(key);
          if (result) {
            const item: CacheItem<T> = JSON.parse(result);

            // Check if expired (additional safety check)
            const age = (Date.now() - item.timestamp) / 1000;
            if (age > item.ttl) {
              await this.delete(key);
              this.stats.misses++;
              return null;
            }

            this.stats.hits++;
            return item.data;
          }
        } catch (error) {
          console.error('Redis get error:', error);
          this.stats.errors++;
          // Fallback to in-memory
        }
      }

      // In-memory fallback
      const item = this.fallbackMap.get(key);
      if (item) {
        // Check if expired
        const age = (Date.now() - item.timestamp) / 1000;
        if (age > item.ttl) {
          this.fallbackMap.delete(key);
          this.stats.misses++;
          return null;
        }

        this.stats.hits++;
        return item.data;
      }

      this.stats.misses++;
      return null;
    } catch (error) {
      console.error('Cache get error:', error);
      this.stats.errors++;
      this.stats.misses++;
      return null;
    }
  }

  // Delete cache item
  async delete(key: string): Promise<boolean> {
    try {
      this.stats.deletes++;
      this.updateStats();

      if (this.useRedis && this.connected) {
        try {
          await this.redis.del(key);
        } catch (error) {
          console.error('Redis delete error:', error);
          this.stats.errors++;
        }
      }

      // Also delete from fallback
      this.fallbackMap.delete(key);
      return true;
    } catch (error) {
      console.error('Cache delete error:', error);
      this.stats.errors++;
      return false;
    }
  }

  // Delete multiple keys by pattern
  async deletePattern(pattern: string): Promise<number> {
    let deletedCount = 0;

    try {
      if (this.useRedis && this.connected) {
        try {
          const keys = await this.redis.keys(pattern);
          if (keys.length > 0) {
            deletedCount = await this.redis.del(...keys);
          }
        } catch (error) {
          console.error('Redis delete pattern error:', error);
          this.stats.errors++;
        }
      }

      // Also delete from fallback
      for (const key of this.fallbackMap.keys()) {
        if (this.matchesPattern(key, pattern)) {
          this.fallbackMap.delete(key);
          deletedCount++;
        }
      }

      this.stats.deletes += deletedCount;
      this.updateStats();
      return deletedCount;
    } catch (error) {
      console.error('Cache delete pattern error:', error);
      this.stats.errors++;
      return 0;
    }
  }

  // Check if key exists
  async exists(key: string): Promise<boolean> {
    try {
      if (this.useRedis && this.connected) {
        try {
          const result = await this.redis.exists(key);
          return result === 1;
        } catch (error) {
          console.error('Redis exists error:', error);
          this.stats.errors++;
        }
      }

      // Fallback to in-memory
      const item = this.fallbackMap.get(key);
      if (item) {
        // Check if expired
        const age = (Date.now() - item.timestamp) / 1000;
        if (age > item.ttl) {
          this.fallbackMap.delete(key);
          return false;
        }
        return true;
      }

      return false;
    } catch (error) {
      console.error('Cache exists error:', error);
      this.stats.errors++;
      return false;
    }
  }

  // Set TTL for existing key
  async expire(key: string, ttlSeconds: number): Promise<boolean> {
    try {
      if (this.useRedis && this.connected) {
        try {
          const result = await this.redis.expire(key, ttlSeconds);
          return result === 1;
        } catch (error) {
          console.error('Redis expire error:', error);
          this.stats.errors++;
        }
      }

      // For in-memory, we need to update the TTL
      const item = this.fallbackMap.get(key);
      if (item) {
        item.ttl = ttlSeconds;
        item.timestamp = Date.now();
        this.fallbackMap.set(key, item);
        return true;
      }

      return false;
    } catch (error) {
      console.error('Cache expire error:', error);
      this.stats.errors++;
      return false;
    }
  }

  // Get TTL for key
  async getTTL(key: string): Promise<number> {
    try {
      if (this.useRedis && this.connected) {
        try {
          return await this.redis.ttl(key);
        } catch (error) {
          console.error('Redis TTL error:', error);
          this.stats.errors++;
        }
      }

      // For in-memory
      const item = this.fallbackMap.get(key);
      if (item) {
        const age = (Date.now() - item.timestamp) / 1000;
        return Math.max(0, item.ttl - age);
      }

      return -1;
    } catch (error) {
      console.error('Cache TTL error:', error);
      this.stats.errors++;
      return -1;
    }
  }

  // Clear all cache
  async clear(): Promise<boolean> {
    try {
      if (this.useRedis && this.connected) {
        try {
          await this.redis.flushdb();
        } catch (error) {
          console.error('Redis clear error:', error);
          this.stats.errors++;
        }
      }

      this.fallbackMap.clear();
      return true;
    } catch (error) {
      console.error('Cache clear error:', error);
      this.stats.errors++;
      return false;
    }
  }

  // Get cache statistics
  getStats(): CacheStats {
    return { ...this.stats };
  }

  // Reset statistics
  resetStats(): void {
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      errors: 0,
      hitRate: 0,
      totalOperations: 0,
    };
  }

  // Check connection health
  async isHealthy(): Promise<boolean> {
    try {
      if (this.useRedis && this.connected) {
        await this.redis.ping();
        return true;
      }

      // In-memory is always "healthy"
      return true;
    } catch (error) {
      console.error('Redis health check failed:', error);
      return false;
    }
  }

  // Get Redis info
  async getInfo(): Promise<any> {
    try {
      if (this.useRedis && this.connected) {
        const info = await this.redis.info();
        return this.parseRedisInfo(info);
      }

      return {
        mode: 'in-memory',
        memory: {
          used: this.fallbackMap.size,
          keys: this.fallbackMap.size,
        },
      };
    } catch (error) {
      console.error('Redis info error:', error);
      return { error: error.message };
    }
  }

  // Close connection
  async close(): Promise<void> {
    try {
      if (this.redis) {
        await this.redis.quit();
      }
      this.fallbackMap.clear();
      this.connected = false;
    } catch (error) {
      console.error('Error closing Redis connection:', error);
    }
  }

  // Private helper methods
  private updateStats(): void {
    this.stats.totalOperations =
      this.stats.hits +
      this.stats.misses +
      this.stats.sets +
      this.stats.deletes;
    this.stats.hitRate =
      this.stats.totalOperations > 0
        ? this.stats.hits / this.stats.totalOperations
        : 0;
  }

  private matchesPattern(key: string, pattern: string): boolean {
    // Simple pattern matching for fallback (supports * wildcard)
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    return regex.test(key);
  }

  private parseRedisInfo(info: string): any {
    const lines = info.split('\r\n');
    const result: any = {};
    let currentSection = 'general';

    for (const line of lines) {
      if (line.startsWith('#')) {
        currentSection = line.substring(2).toLowerCase();
        result[currentSection] = {};
      } else if (line.includes(':')) {
        const [key, value] = line.split(':');
        if (!result[currentSection]) {
          result[currentSection] = {};
        }
        result[currentSection][key] = isNaN(Number(value))
          ? value
          : Number(value);
      }
    }

    return result;
  }
}

// Create and export Redis cache instance
export function createRedisCache(config?: Partial<CacheConfig>): RedisCache {
  const defaultConfig: CacheConfig = {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB || '0'),
    keyPrefix: process.env.REDIS_KEY_PREFIX || 'saas:',
    connectTimeout: 10000,
    commandTimeout: 5000,
    retryDelayOnFailover: 100,
    maxRetriesPerRequest: 3,
    lazyConnect: true,
    keepAlive: 30000,
    enableReadyCheck: true,
    maxLoadingTimeout: 5000,
  };

  const finalConfig = { ...defaultConfig, ...config };
  return new RedisCache(finalConfig);
}

// Export default instance
export const redisCache = createRedisCache();
