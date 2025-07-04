import { describe, it, expect, beforeEach } from '@jest/globals'
import { config } from '@/lib/config'

describe('Configuration', () => {
  it('should load configuration properly', () => {
    expect(config).toBeDefined()
    expect(config.database).toBeDefined()
    expect(typeof config.database.enabled).toBe('boolean')
  })

  it('should have database configuration', () => {
    expect(config.database.url).toBeDefined()
    expect(config.database.url).toContain('postgresql')
  })

  it('should have encryption configuration', () => {
    expect(config.encryption).toBeDefined()
    expect(config.encryption.key).toBeDefined()
    expect(config.encryption.key.length).toBeGreaterThan(0)
  })
})