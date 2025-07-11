import '@testing-library/jest-dom'

// Fix setImmediate not defined error
global.setImmediate = global.setImmediate || ((fn, ...args) => global.setTimeout(fn, 0, ...args))
global.clearImmediate = global.clearImmediate || ((id) => global.clearTimeout(id))

// Mock environment variables for testing
process.env.NODE_ENV = 'test'
process.env.DATABASE_URL = 'postgresql://test_user:test_pass@localhost:5433/saas_template_test'
process.env.TEST_DATABASE_URL = 'postgresql://test_user:test_pass@localhost:5433/saas_template_test'
process.env.ENCRYPTION_KEY = 'test-encryption-key-32-characters!!'

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  }),
  usePathname: () => '/test',
  useSearchParams: () => new URLSearchParams(),
}))

// Mock server actions
jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}))

// Import test database utilities
import { resetTestDatabase, closeTestDatabase, initializeTestDatabase } from './lib/db/test'

// Global test setup and teardown
beforeAll(async () => {
  try {
    // Initialize test database before all tests
    await initializeTestDatabase()
    await resetTestDatabase()
  } catch (error) {
    console.log('Test database initialization failed:', error)
  }
})

afterAll(async () => {
  try {
    // Close database connection after all tests
    await closeTestDatabase()
  } catch (error) {
    console.log('Test database cleanup failed:', error)
  }
})