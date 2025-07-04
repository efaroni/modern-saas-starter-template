// Optional: configure or set up a testing framework before each test.
// If you delete this file, remove `setupFilesAfterEnv` from `jest.config.js`

// Mock environment variables for testing
process.env.NODE_ENV = 'test'
process.env.DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/test_db'
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