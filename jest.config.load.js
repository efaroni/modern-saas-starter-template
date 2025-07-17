module.exports = {
  ...require('./jest.config'),
  testMatch: [
    "**/__tests__/**/load/*.test.ts",
    "**/__tests__/**/load/*.test.js"
  ],
  testPathIgnorePatterns: [
    "/node_modules/",
    "/lib/",
    "/security/",
    "/integration/"
  ],
  // Load tests need more time
  testTimeout: 60000,
  // Run load tests sequentially
  maxWorkers: 1
}