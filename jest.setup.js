import '@testing-library/jest-dom'

// Fix setImmediate not defined error
global.setImmediate = global.setImmediate || ((fn, ...args) => global.setTimeout(fn, 0, ...args))
global.clearImmediate = global.clearImmediate || ((id) => global.clearTimeout(id))

// Mock environment variables for testing
process.env.NODE_ENV = 'test'

// Set component-based test database configuration to use existing database
process.env.TEST_DB_HOST = 'localhost'
process.env.TEST_DB_PORT = '5432'  // Changed from 5433 to match your PostgreSQL
process.env.TEST_DB_USER = 'efaroni'  // Changed from test_user to match your user
process.env.TEST_DB_PASSWORD = ''  // Empty password like your main database
process.env.TEST_DB_NAME = 'saas_template_test'

// Also set TEST_DATABASE_URL for backwards compatibility
process.env.TEST_DATABASE_URL = 'postgresql://efaroni@localhost:5432/saas_template_test'
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

// Mock next-auth to prevent ES module issues
jest.mock('next-auth', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    auth: jest.fn(),
    handlers: { GET: jest.fn(), POST: jest.fn() },
    signIn: jest.fn(),
    signOut: jest.fn(),
  })),
}))

// Mock next-auth config
jest.mock('@/lib/auth/auth', () => ({
  auth: jest.fn(),
  handlers: { GET: jest.fn(), POST: jest.fn() },
  signIn: jest.fn(),
  signOut: jest.fn(),
}))

// Global test setup and teardown
beforeAll(async () => {
  try {
    // Lazy import test database utilities to prevent early initialization
    const { initializeTestDatabase } = await import('./lib/db/test')
    
    console.log('Initializing test database...')
    await initializeTestDatabase()
    console.log('Test database initialization completed')
  } catch (error) {
    console.error('Test database initialization failed:', error)
    // Don't throw - let individual tests handle database issues
  }
}, 60000) // 60 second timeout for database initialization

afterAll(async () => {
  try {
    // Lazy import to avoid early initialization
    const { closeTestDatabase } = await import('./lib/db/test')
    
    console.log('Closing test database connections...')
    await closeTestDatabase()
    console.log('Test database cleanup completed')
  } catch (error) {
    console.error('Test database cleanup failed:', error)
  }
}, 10000) // 10 second timeout for cleanup