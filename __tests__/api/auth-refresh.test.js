/**
 * Authentication Token Refresh API Tests
 * 
 * Tests for the token refresh functionality, including successful refresh,
 * expired tokens, invalid tokens, and token reuse prevention.
 */

const { getTestRequest, randomString } = require('../setup');
const jwt = require('jsonwebtoken');

describe('Token Refresh API', () => {
  let request;
  
  beforeAll(() => {
    request = getTestRequest();
  });

  // Test user data
  const testUser = {
    email: `refresh-test-${Date.now()}@example.com`,
    password: 'Password123!',
    nombre: 'Refresh Test User'
  };

  let accessToken;
  let refreshToken;

