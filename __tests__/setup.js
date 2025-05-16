/**
 * Test Setup and Teardown
 * 
 * This file provides setup and teardown functionality for tests,
 * including database configuration and test helpers.
 */

const { Pool } = require('pg');
const dotenv = require('dotenv');
const path = require('path');
const supertest = require('supertest');
const { createServer } = require('http');
const next = require('next');

// Load test environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env.test') });

// Create a test database connection
let pool;

// Set default test environment variables if not present
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/money_flow_test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret';
process.env.NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET || 'test-nextauth-secret';
process.env.PORT = process.env.PORT || 3000;

/**
 * Create a Next.js app instance for testing
 */
let app;
let server;
let request;

/**
 * Initialize the test app and server
 */
async function setupTestApp() {
  // Only set up the app once
  if (!app) {
    app = next({
      dev: false,
      dir: path.resolve('./'),
      quiet: true,
    });
    
    await app.prepare();
    const handler = app.getRequestHandler();
    server = createServer(handler);
    request = supertest(server);
  }
  
  return { app, server, request };
}

/**
 * Set up the test database
 */
async function setupTestDatabase() {
  // Create a connection pool
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });
  
  // Test the connection
  try {
    await pool.query('SELECT 1');
    console.log('Test database connection established');
  } catch (error) {
    console.error('Failed to connect to test database:', error);
    throw error;
  }
  
  // Truncate all tables before each test suite
  await pool.query(`
    DO $$ 
    DECLARE
      r RECORD;
    BEGIN
      -- Disable triggers
      EXECUTE 'SET session_replication_role = replica';
      
      -- Truncate all tables except migrations
      FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename != 'migrations') LOOP
        EXECUTE 'TRUNCATE TABLE ' || quote_ident(r.tablename) || ' CASCADE';
      END LOOP;
      
      -- Re-enable triggers
      EXECUTE 'SET session_replication_role = DEFAULT';
    END $$;
  `);
  
  return pool;
}

/**
 * Clean up the test database
 */
async function teardownTestDatabase() {
  if (pool) {
    await pool.end();
    console.log('Test database connection closed');
  }
}

/**
 * Global test setup
 */
beforeAll(async () => {
  await setupTestDatabase();
  await setupTestApp();
});

/**
 * Global test teardown
 */
afterAll(async () => {
  await teardownTestDatabase();
  if (server) server.close();
});

/**
 * Helper functions for tests
 */

/**
 * Create a test user and get an authentication token
 * 
 * @param {Object} userData - The user data (optional)
 * @returns {Promise<Object>} User and token information
 */
async function createTestUser(userData = {}) {
  const defaultUser = {
    nombre: 'Test User',
    email: `test-${Date.now()}@example.com`,
    password: 'password123',
  };
  
  const user = { ...defaultUser, ...userData };
  
  // Register user
  const response = await request
    .post('/api/auth/register')
    .send(user)
    .expect(201);
    
  return {
    user: response.body.data,
    token: response.body.data.token,
  };
}

/**
 * Generate a random test string
 * 
 * @param {string} prefix - Prefix for the random string
 * @returns {string} Random string
 */
function randomString(prefix = 'test') {
  return `${prefix}-${Math.random().toString(36).substring(2, 10)}`;
}

// Export test utilities
module.exports = {
  setupTestDatabase,
  teardownTestDatabase,
  setupTestApp,
  createTestUser,
  randomString,
  getTestRequest: () => request,
};

