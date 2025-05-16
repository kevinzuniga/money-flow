/**
 * Smoke Tests
 * 
 * Basic tests that run against a production or staging environment
 * to verify that critical functionality is working.
 * 
 * Usage:
 * API_URL=https://your-production-api.com npm run test:smoke
 */

const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

// Configuration
const API_URL = process.env.API_URL || 'http://localhost:3000';
const TIMEOUT = 10000; // 10 seconds
const MAX_RETRIES = 3;
const RETRY_DELAY = 2000; // 2 seconds

// Test user credentials
const TEST_USER = {
  email: `smoke-test-${uuidv4().substring(0, 8)}@example.com`,
  password: 'SmokeTest123!',
  nombre: 'Smoke Test User'
};

/**
 * Helper function to retry a function multiple times
 */
async function retry(fn, retries = MAX_RETRIES, delay = RETRY_DELAY) {
  try {
    return await fn();
  } catch (error) {
    if (retries <= 0) throw error;
    
    console.log(`Retrying after error: ${error.message}. Attempts left: ${retries}`);
    await new Promise(resolve => setTimeout(resolve, delay));
    return retry(fn, retries - 1, delay);
  }
}

// Axios instance with default config
const api = axios.create({
  baseURL: API_URL,
  timeout: TIMEOUT,
  validateStatus: status => status < 500 // Don't throw for 4xx responses
});

// Store the auth token for authenticated requests
let authToken;
let testCategoryId;
let testIngresoId;
let testEgresoId;

describe('Smoke Tests', () => {
  // Increase timeout for all tests
  jest.setTimeout(TIMEOUT * 2);
  
  describe('API Availability', () => {
    it('health endpoint should be accessible', async () => {
      const response = await retry(() => api.get('/api/health'));
      
      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data.status).toBe('ok');
    });
    
    it('database should be connected', async () => {
      const response = await retry(() => api.get('/api/health'));
      
      expect(response.status).toBe(200);
      expect(response.data.data.database.status).toBe('ok');
    });
  });
  
  describe('Authentication Flow', () => {
    it('should register a new user', async () => {
      const response = await retry(() => api.post('/api/auth/register', TEST_USER));
      
      // In production, we might prevent test registrations, so accept either success or 403
      if (response.status === 403) {
        console.log('Registration disabled in this environment - skipping this test');
        return;
      }
      
      expect(response.status).toBe(201);
      expect(response.data.success).toBe(true);
      expect(response.data.data).toHaveProperty('token');
      expect(response.data.data).toHaveProperty('user');
      
      authToken = response.data.data.token;
    });
    
    it('should login with created user', async () => {
      // Skip if previous test was skipped
      if (!authToken) {
        const response = await retry(() => api.post('/api/auth/login', {
          email: TEST_USER.email,
          password: TEST_USER.password
        }));
        
        expect(response.status).toBe(200);
        expect(response.data.success).toBe(true);
        expect(response.data.data).toHaveProperty('token');
        
        authToken = response.data.data.token;
      }
      
      // Verify the token works
      const meResponse = await retry(() => api.get('/api/auth/me', {
        headers: { Authorization: `Bearer ${authToken}` }
      }));
      
      expect(meResponse.status).toBe(200);
      expect(meResponse.data.success).toBe(true);
    });
  });
  
  describe('Basic CRUD Operations', () => {
    // Skip all tests in this describe block if authentication failed
    beforeAll(() => {
      if (!authToken) {
        console.log('Authentication failed - skipping CRUD tests');
        return;
      }
    });
    
    it('should create a category', async () => {
      if (!authToken) return;
      
      const category = {
        nombre: `Test Category ${uuidv4().substring(0, 8)}`,
        tipo: 'egreso',
        color: '#FF5722',
        icono: 'shopping_cart'
      };
      
      const response = await retry(() => api.post('/api/categorias', category, {
        headers: { Authorization: `Bearer ${authToken}` }
      }));
      
      expect(response.status).toBe(201);
      expect(response.data.success).toBe(true);
      expect(response.data.data).toHaveProperty('id');
      
      testCategoryId = response.data.data.id;
    });
    
    it('should create an income entry', async () => {
      if (!authToken) return;
      
      const ingreso = {
        monto: 500.75,
        descripcion: 'Test income entry',
        fecha: new Date().toISOString().split('T')[0],
        categoria: testCategoryId
      };
      
      const response = await retry(() => api.post('/api/ingresos', ingreso, {
        headers: { Authorization: `Bearer ${authToken}` }
      }));
      
      expect(response.status).toBe(201);
      expect(response.data.success).toBe(true);
      expect(response.data.data).toHaveProperty('id');
      
      testIngresoId = response.data.data.id;
    });
    
    it('should create an expense entry', async () => {
      if (!authToken) return;
      
      const egreso = {
        monto: 150.50,
        descripcion: 'Test expense entry',
        fecha: new Date().toISOString().split('T')[0],
        categoria: testCategoryId
      };
      
      const response = await retry(() => api.post('/api/egresos', egreso, {
        headers: { Authorization: `Bearer ${authToken}` }
      }));
      
      expect(response.status).toBe(201);
      expect(response.data.success).toBe(true);
      expect(response.data.data).toHaveProperty('id');
      
      testEgresoId = response.data.data.id;
    });
    
    it('should retrieve income entry', async () => {
      if (!authToken || !testIngresoId) return;
      
      const response = await retry(() => api.get(`/api/ingresos/${testIngresoId}`, {
        headers: { Authorization: `Bearer ${authToken}` }
      }));
      
      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data).toHaveProperty('id', testIngresoId);
    });
    
    it('should retrieve expense entry', async () => {
      if (!authToken || !testEgresoId) return;
      
      const response = await retry(() => api.get(`/api/egresos/${testEgresoId}`, {
        headers: { Authorization: `Bearer ${authToken}` }
      }));
      
      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data).toHaveProperty('id', testEgresoId);
    });
    
    it('should generate reports', async () => {
      if (!authToken) return;
      
      const today = new Date();
      const year = today.getFullYear();
      const month = today.getMonth() + 1;
      
      const response = await retry(() => api.get(`/api/reportes/mensual?year=${year}&month=${month}`, {
        headers: { Authorization: `Bearer ${authToken}` }
      }));
      
      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data).toHaveProperty('ingresos');
      expect(response.data.data).toHaveProperty('egresos');
    });
  });
  
  // Clean up created resources
  describe('Cleanup', () => {
    it('should clean up created resources', async () => {
      if (!authToken) return;
      
      // Delete expense
      if (testEgresoId) {
        const response = await retry(() => api.delete(`/api/egresos/${testEgresoId}`, {
          headers: { Authorization: `Bearer ${authToken}` }
        }));
        
        expect(response.status).toBe(200);
      }
      
      // Delete income
      if (testIngresoId) {
        const response = await retry(() => api.delete(`/api/ingresos/${testIngresoId}`, {
          headers: { Authorization: `Bearer ${authToken}` }
        }));
        
        expect(response.status).toBe(200);
      }
      
      // Category deletion might fail if it's used in other records, that's okay
      if (testCategoryId) {
        try {
          await api.delete(`/api/categorias/${testCategoryId}`, {
            headers: { Authorization: `Bearer ${authToken}` }
          });
        } catch (error) {
          console.log('Could not delete category, might be in use');
        }
      }
    });
  });
});

