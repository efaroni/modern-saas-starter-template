const nextJest = require('next/jest')

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files
  dir: './',
})

// Add any custom config to be passed to Jest
const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    '^@/components/(.*)$': '<rootDir>/components/$1',
    '^@/lib/(.*)$': '<rootDir>/lib/$1',
    '^@/app/(.*)$': '<rootDir>/app/$1',
  },
  testEnvironment: 'jsdom',
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  testMatch: ['**/__tests__/**/*.(ts|tsx|js)', '**/*.(test|spec).(ts|tsx|js)'],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/scripts/',
    'drizzle.config.test.ts',
    'drizzle.config.ts',
    '/e2e/',
    '/accessibility/',
    '/__tests__/load/', // Exclude load tests from regular test runs
  ],
  collectCoverageFrom: [
    'lib/**/*.{ts,tsx}',
    'app/**/*.{ts,tsx}',
    'components/**/*.{ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
  ],
  // Handle ES modules from next-auth and related packages
  transformIgnorePatterns: [
    'node_modules/(?!(next-auth|@auth|@node-rs|jose)/)',
  ],
  // Enable ES modules support
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
  globals: {
    'ts-jest': {
      useESM: true,
    },
  },
  // Configure parallel execution - use 2 workers for balance of speed and stability
  maxWorkers: 2,
  // Configure test timeout - longer for better stability
  testTimeout: 45000,
}

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(customJestConfig)