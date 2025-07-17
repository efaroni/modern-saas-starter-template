import { describe, it, expect, beforeEach, afterEach } from '@jest/globals'
import { testHelpers } from '@/lib/db/test-helpers'
import { GET } from '@/app/api/auth/health/route'
import { GET as ReadyGET } from '@/app/api/auth/health/ready/route'
import { GET as LiveGET } from '@/app/api/auth/health/live/route'

// Mock Request for Jest environment
global.Request = class MockRequest {
  url: string
  method: string = 'GET'
  
  constructor(url: string, options?: any) {
    this.url = url
    if (options?.method) {
      this.method = options.method
    }
  }
} as any

describe.skip('Auth Health Check API', () => {
  beforeEach(async () => {
    await testHelpers.setupTest()
  })

  afterEach(async () => {
    await testHelpers.teardownTest()
  })

  describe('GET /api/auth/health', () => {
    it('should return overall health status', async () => {
      const request = new Request('http://localhost:3000/api/auth/health')
      const response = await GET(request)
      
      expect(response.status).toBe(200)
      
      const data = await response.json()
      expect(data).toHaveProperty('overall')
      expect(data).toHaveProperty('database')
      expect(data).toHaveProperty('sessionStorage')
      expect(data).toHaveProperty('emailService')
      expect(data).toHaveProperty('oauthProviders')
      
      expect(data.overall).toHaveProperty('status')
      expect(data.overall).toHaveProperty('timestamp')
      expect(data.database).toHaveProperty('status')
      expect(data.sessionStorage).toHaveProperty('status')
    })

    it('should return specific component health', async () => {
      const request = new Request('http://localhost:3000/api/auth/health?component=database')
      const response = await GET(request)
      
      expect(response.status).toBe(200)
      
      const data = await response.json()
      expect(data).toHaveProperty('status')
      expect(data).toHaveProperty('timestamp')
      expect(data.status).toBe('healthy')
    })

    it('should return 400 for invalid component', async () => {
      const request = new Request('http://localhost:3000/api/auth/health?component=invalid')
      const response = await GET(request)
      
      expect(response.status).toBe(400)
      
      const data = await response.json()
      expect(data).toHaveProperty('error')
      expect(data.error).toBe('Invalid component specified')
    })
  })

  describe('GET /api/auth/health/ready', () => {
    it('should return readiness status', async () => {
      const request = new Request('http://localhost:3000/api/auth/health/ready')
      const response = await ReadyGET(request)
      
      expect(response.status).toBe(200)
      
      const data = await response.json()
      expect(data).toHaveProperty('ready')
      expect(data).toHaveProperty('timestamp')
      expect(data).toHaveProperty('details')
      expect(data.ready).toBe(true)
    })
  })

  describe('GET /api/auth/health/live', () => {
    it('should return liveness status', async () => {
      const request = new Request('http://localhost:3000/api/auth/health/live')
      const response = await LiveGET(request)
      
      expect(response.status).toBe(200)
      
      const data = await response.json()
      expect(data).toHaveProperty('alive')
      expect(data).toHaveProperty('timestamp')
      expect(data).toHaveProperty('details')
      expect(data.alive).toBe(true)
      
      // Check that performance metrics are included
      expect(data.details).toHaveProperty('uptime')
      expect(data.details).toHaveProperty('memoryUsage')
      expect(data.details).toHaveProperty('nodeVersion')
      expect(data.details).toHaveProperty('platform')
      expect(data.details).toHaveProperty('pid')
    })
  })
})