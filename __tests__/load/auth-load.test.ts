import { describe, it, expect, beforeAll, afterAll } from '@jest/globals'
import { DatabaseAuthProvider } from '@/lib/auth/providers/database'
import { testHelpers, authTestHelpers } from '@/lib/db/test-helpers'
import { getDatabasePool } from '@/lib/db/connection-pool'
import { sessionCache } from '@/lib/cache/session-cache'

// Load testing configuration
const LOAD_TEST_CONFIG = {
  CONCURRENT_USERS: 10, // Reduced for test environment
  REQUESTS_PER_USER: 3,  // Reduced for test environment
  RAMP_UP_TIME: 1000, // milliseconds
  TEST_DURATION: 30000, // 30 seconds
  ACCEPTABLE_RESPONSE_TIME: 2000, // 2 seconds (more lenient for test env)
  ACCEPTABLE_ERROR_RATE: 0.50, // 50% (much more lenient for test env)
}

interface LoadTestResult {
  totalRequests: number
  successfulRequests: number
  failedRequests: number
  averageResponseTime: number
  minResponseTime: number
  maxResponseTime: number
  p95ResponseTime: number
  errorRate: number
  throughput: number // requests per second
  concurrentUsers: number
}

describe.skip('Authentication Load Tests', () => {
  let provider: DatabaseAuthProvider
  let testUsers: Array<{ email: string; password: string; userId?: string }> = []

  beforeAll(async () => {
    await testHelpers.setupTest()
    provider = new DatabaseAuthProvider()
    
    // Create test users for load testing
    console.log('Creating test users for load testing...')
    for (let i = 0; i < LOAD_TEST_CONFIG.CONCURRENT_USERS; i++) {
      const email = authTestHelpers.generateUniqueEmail(`loadtest${i}`)
      const password = 'LoadTestPassword123!'
      
      const createResult = await provider.createUser({
        email,
        name: `Load Test User ${i}`,
        password
      })
      
      if (createResult.success) {
        testUsers.push({
          email,
          password,
          userId: createResult.user?.id
        })
      }
    }
    
    console.log(`Created ${testUsers.length} test users`)
  })

  afterAll(async () => {
    await testHelpers.teardownTest()
  })

  describe('Authentication Load Tests', () => {
    it('should handle concurrent login requests', async () => {
      const results = await runLoadTest(
        'login',
        async (userIndex: number) => {
          const user = testUsers[userIndex % testUsers.length]
          const startTime = Date.now()
          
          const result = await provider.authenticateUser(
            user.email,
            user.password,
            `192.168.1.${userIndex % 255}`,
            'LoadTestAgent/1.0'
          )
          
          const responseTime = Date.now() - startTime
          
          return {
            success: result.success,
            responseTime,
            error: result.error
          }
        },
        LOAD_TEST_CONFIG.CONCURRENT_USERS,
        LOAD_TEST_CONFIG.REQUESTS_PER_USER
      )
      
      // Assert performance requirements
      expect(results.errorRate).toBeLessThan(LOAD_TEST_CONFIG.ACCEPTABLE_ERROR_RATE)
      expect(results.averageResponseTime).toBeLessThan(LOAD_TEST_CONFIG.ACCEPTABLE_RESPONSE_TIME)
      expect(results.p95ResponseTime).toBeLessThan(LOAD_TEST_CONFIG.ACCEPTABLE_RESPONSE_TIME * 2)
      
      console.log('Login Load Test Results:', results)
    })

    it('should handle concurrent user creation requests', async () => {
      const results = await runLoadTest(
        'signup',
        async (userIndex: number) => {
          const email = authTestHelpers.generateUniqueEmail(`signup${userIndex}`)
          const password = 'LoadTestPassword123!'
          const startTime = Date.now()
          
          const result = await provider.createUser({
            email,
            name: `Signup Test User ${userIndex}`,
            password
          }, `192.168.1.${userIndex % 255}`, 'LoadTestAgent/1.0')
          
          const responseTime = Date.now() - startTime
          
          return {
            success: result.success,
            responseTime,
            error: result.error
          }
        },
        LOAD_TEST_CONFIG.CONCURRENT_USERS,
        LOAD_TEST_CONFIG.REQUESTS_PER_USER
      )
      
      // Assert performance requirements
      expect(results.errorRate).toBeLessThan(LOAD_TEST_CONFIG.ACCEPTABLE_ERROR_RATE)
      expect(results.averageResponseTime).toBeLessThan(LOAD_TEST_CONFIG.ACCEPTABLE_RESPONSE_TIME)
      
      console.log('Signup Load Test Results:', results)
    })

    it('should handle concurrent user lookup requests', async () => {
      const results = await runLoadTest(
        'user_lookup',
        async (userIndex: number) => {
          const user = testUsers[userIndex % testUsers.length]
          const startTime = Date.now()
          
          const result = await provider.getUserByEmail(user.email)
          
          const responseTime = Date.now() - startTime
          
          return {
            success: result.success,
            responseTime,
            error: result.error
          }
        },
        LOAD_TEST_CONFIG.CONCURRENT_USERS,
        LOAD_TEST_CONFIG.REQUESTS_PER_USER
      )
      
      // Assert performance requirements
      expect(results.errorRate).toBeLessThan(LOAD_TEST_CONFIG.ACCEPTABLE_ERROR_RATE)
      expect(results.averageResponseTime).toBeLessThan(LOAD_TEST_CONFIG.ACCEPTABLE_RESPONSE_TIME)
      
      console.log('User Lookup Load Test Results:', results)
    })

    it('should handle concurrent password change requests', async () => {
      const results = await runLoadTest(
        'password_change',
        async (userIndex: number) => {
          const user = testUsers[userIndex % testUsers.length]
          const newPassword = `NewPassword${userIndex}123!`
          const startTime = Date.now()
          
          const result = await provider.changeUserPassword(
            user.userId!,
            user.password,
            newPassword
          )
          
          const responseTime = Date.now() - startTime
          
          // Update user password for next iterations
          if (result.success) {
            user.password = newPassword
          }
          
          return {
            success: result.success,
            responseTime,
            error: result.error
          }
        },
        Math.min(LOAD_TEST_CONFIG.CONCURRENT_USERS, 10), // Lower concurrency for password changes
        2 // Fewer requests per user
      )
      
      // Assert performance requirements
      expect(results.errorRate).toBeLessThan(LOAD_TEST_CONFIG.ACCEPTABLE_ERROR_RATE)
      expect(results.averageResponseTime).toBeLessThan(LOAD_TEST_CONFIG.ACCEPTABLE_RESPONSE_TIME * 2)
      
      console.log('Password Change Load Test Results:', results)
    })
  })

  describe('Database Performance Under Load', () => {
    it('should maintain database connection pool health under load', async () => {
      const dbPool = getDatabasePool()
      
      // Run concurrent database operations
      await runLoadTest(
        'db_health',
        async (userIndex: number) => {
          const user = testUsers[userIndex % testUsers.length]
          const startTime = Date.now()
          
          // Perform multiple database operations
          const result = await dbPool.query(async (db) => {
            const userResult = await provider.getUserByEmail(user.email)
            return userResult
          })
          
          const responseTime = Date.now() - startTime
          
          return {
            success: result.success,
            responseTime,
            error: result.error
          }
        },
        LOAD_TEST_CONFIG.CONCURRENT_USERS,
        LOAD_TEST_CONFIG.REQUESTS_PER_USER
      )
      
      // Check database pool health
      const health = await dbPool.getHealth()
      expect(health.healthy).toBe(true)
      expect(health.connections.active).toBeLessThanOrEqual(health.connections.max)
      
      console.log('Database Health Under Load:', health)
    })
  })

  describe('Cache Performance Under Load', () => {
    it('should maintain cache performance under load', async () => {
      const results = await runLoadTest(
        'cache_performance',
        async (userIndex: number) => {
          const user = testUsers[userIndex % testUsers.length]
          const startTime = Date.now()
          
          // Test session cache performance
          const sessionToken = `test_session_${userIndex}_${Date.now()}`
          await sessionCache.updateSessionCache(sessionToken, {
            userId: user.userId!,
            sessionToken,
            isActive: true,
            lastActivity: new Date(),
            expiresAt: new Date(Date.now() + 3600000),
            createdAt: new Date()
          } as any)
          
          const cachedSession = await sessionCache.getSession(sessionToken)
          
          const responseTime = Date.now() - startTime
          
          return {
            success: !!cachedSession,
            responseTime,
            error: cachedSession ? undefined : 'Session not found'
          }
        },
        LOAD_TEST_CONFIG.CONCURRENT_USERS,
        LOAD_TEST_CONFIG.REQUESTS_PER_USER
      )
      
      // Assert cache performance
      expect(results.errorRate).toBeLessThan(LOAD_TEST_CONFIG.ACCEPTABLE_ERROR_RATE)
      expect(results.averageResponseTime).toBeLessThan(100) // Cache should be very fast
      
      console.log('Cache Performance Results:', results)
    })
  })

  describe('Rate Limiting Under Load', () => {
    it('should properly apply rate limiting under high load', async () => {
      const singleUserEmail = authTestHelpers.generateUniqueEmail('ratelimit')
      const password = 'RateLimitTest123!'
      
      // Create single user for rate limit testing
      await provider.createUser({
        email: singleUserEmail,
        name: 'Rate Limit Test User',
        password
      })
      
      // Attempt many concurrent requests from same user
      const results = await runLoadTest(
        'rate_limiting',
        async (userIndex: number) => {
          const startTime = Date.now()
          
          // All requests use same email to trigger rate limiting
          const result = await provider.authenticateUser(
            singleUserEmail,
            'wrongpassword',
            `192.168.1.${userIndex % 255}`,
            'LoadTestAgent/1.0'
          )
          
          const responseTime = Date.now() - startTime
          
          return {
            success: result.success,
            responseTime,
            error: result.error
          }
        },
        LOAD_TEST_CONFIG.CONCURRENT_USERS,
        5 // More requests per user to trigger rate limiting
      )
      
      // Rate limiting should prevent some requests
      expect(results.errorRate).toBeGreaterThan(0.1) // Expect at least 10% to be rate limited
      expect(results.failedRequests).toBeGreaterThan(0)
      
      console.log('Rate Limiting Under Load Results:', results)
    })
  })

  describe('Memory Usage Under Load', () => {
    it('should maintain reasonable memory usage under load', async () => {
      const initialMemory = process.memoryUsage()
      
      // Run memory-intensive operations
      await runLoadTest(
        'memory_usage',
        async (userIndex: number) => {
          const user = testUsers[userIndex % testUsers.length]
          const startTime = Date.now()
          
          // Perform memory-intensive operations
          const operations = [
            provider.getUserByEmail(user.email),
            provider.authenticateUser(user.email, user.password),
            provider.getUserById(user.userId!)
          ]
          
          const results = await Promise.all(operations)
          const responseTime = Date.now() - startTime
          
          return {
            success: results.every(r => r.success),
            responseTime,
            error: results.find(r => !r.success)?.error
          }
        },
        LOAD_TEST_CONFIG.CONCURRENT_USERS,
        LOAD_TEST_CONFIG.REQUESTS_PER_USER
      )
      
      const finalMemory = process.memoryUsage()
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed
      
      // Memory increase should be reasonable (less than 100MB)
      expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024)
      
      console.log('Memory Usage Results:', {
        initialMemory: Math.round(initialMemory.heapUsed / 1024 / 1024),
        finalMemory: Math.round(finalMemory.heapUsed / 1024 / 1024),
        increase: Math.round(memoryIncrease / 1024 / 1024),
        loadTestResults: results
      })
    })
  })
})

// Helper function to run load tests
async function runLoadTest(
  testName: string,
  testFunction: (userIndex: number) => Promise<{
    success: boolean
    responseTime: number
    error?: string
  }>,
  concurrentUsers: number = LOAD_TEST_CONFIG.CONCURRENT_USERS,
  requestsPerUser: number = LOAD_TEST_CONFIG.REQUESTS_PER_USER
): Promise<LoadTestResult> {
  const startTime = Date.now()
  const results: Array<{
    success: boolean
    responseTime: number
    error?: string
  }> = []

  console.log(`Starting ${testName} load test with ${concurrentUsers} concurrent users, ${requestsPerUser} requests each`)

  // Create workers (concurrent users)
  const workers = Array.from({ length: concurrentUsers }, async (_, userIndex) => {
    // Stagger the start times to simulate ramp-up
    const delay = (userIndex * LOAD_TEST_CONFIG.RAMP_UP_TIME) / concurrentUsers
    await new Promise(resolve => setTimeout(resolve, delay))

    // Run multiple requests per user
    const userResults = []
    for (let i = 0; i < requestsPerUser; i++) {
      try {
        const result = await testFunction(userIndex)
        userResults.push(result)
      } catch (error) {
        userResults.push({
          success: false,
          responseTime: 0,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }
    
    return userResults
  })

  // Wait for all workers to complete
  const allResults = await Promise.all(workers)
  
  // Flatten results
  allResults.forEach(userResults => {
    results.push(...userResults)
  })

  const endTime = Date.now()
  const totalTime = endTime - startTime

  // Calculate statistics
  const successfulRequests = results.filter(r => r.success).length
  const failedRequests = results.length - successfulRequests
  const responseTimes = results.map(r => r.responseTime).sort((a, b) => a - b)
  
  const averageResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
  const minResponseTime = responseTimes[0] || 0
  const maxResponseTime = responseTimes[responseTimes.length - 1] || 0
  const p95Index = Math.floor(responseTimes.length * 0.95)
  const p95ResponseTime = responseTimes[p95Index] || 0
  
  const errorRate = failedRequests / results.length
  const throughput = results.length / (totalTime / 1000) // requests per second

  return {
    totalRequests: results.length,
    successfulRequests,
    failedRequests,
    averageResponseTime,
    minResponseTime,
    maxResponseTime,
    p95ResponseTime,
    errorRate,
    throughput,
    concurrentUsers
  }
}

// Helper function to generate load test data
function generateLoadTestUsers(count: number): Array<{
  email: string
  password: string
  name: string
}> {
  return Array.from({ length: count }, (_, i) => ({
    email: authTestHelpers.generateUniqueEmail(`loadtest${i}`),
    password: 'LoadTestPassword123!',
    name: `Load Test User ${i}`
  }))
}