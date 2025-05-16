/**
 * Jest Configuration
 * 
 * This file configures Jest for testing the API endpoints.
 */

module.exports = {
  // Automatically clear mock calls and instances between every test
  clearMocks: true,

  // The directory where Jest should output its coverage files
  coverageDirectory: 'coverage',

  // A list of paths to directories that Jest should use to search for files in
  roots: ['<rootDir>'],

  // The test environment that will be used for testing
  testEnvironment: 'node',

  // The glob patterns Jest uses to detect test files
  testMatch: [
    '**/__tests__/**/*.test.js',
  ],

  // An array of regexp pattern strings that are matched against all test paths
  // matched tests are skipped
  testPathIgnorePatterns: [
    '/node_modules/',
    '/.next/',
  ],

  // Setup files that run before each test
  setupFilesAfterEnv: ['<rootDir>/__tests__/setup.js'],

  // A map from regular expressions to module names that allow to stub out resources
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },

  // The maximum amount of workers used to run your tests
  maxWorkers: '50%',

  // Timeout for each test in milliseconds
  testTimeout: 10000,

  // Mock environment variables
  // This will be overridden by setup.js
  testEnvironment: 'node',
};

