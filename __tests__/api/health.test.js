/**
 * Health Check API Tests
 * 
 * Tests for the health check endpoint that verifies system status
 */

const { getTestRequest } = require('../setup');

describe('Health Check API', () => {
  let request;
  
  beforeAll(() => {
    request = getTestRequest();
  });

  describe('GET /api/health', () => {
    it('should return 200 status code', async () => {
      const response = await request.get('/api/health');
      expect(response.status).toBe(200);
    });
    
    it('should return a success response', async () => {
      const response = await request.get('/api/health');
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBeTruthy();
      expect(response.body.data).toBeDefined();
    });
    
    it('should have the expected response format', async () => {
      const response = await request.get('/api/health');
      
      expect(response.body.data).toHaveProperty('status');
      expect(response.body.data).toHaveProperty('timestamp');
      expect(response.body.data).toHaveProperty('version');
      expect(response.body.data).toHaveProperty('environment');
      expect(response.body.data).toHaveProperty('database');
      expect(response.body.data).toHaveProperty('system');
      expect(response.body.data).toHaveProperty('performance');
    });
    
    it('should report database status', async () => {
      const response = await request.get('/api/health');
      
      expect(response.body.data.database).toHaveProperty('status');
      expect(response.body.data.database).toHaveProperty('responseTime');
      
      // Database should be connected in a properly set up test environment
      expect(response.body.data.database.status).toBe('ok');
    });
    
    it('should include system metrics', async () => {
      const response = await request.get('/api/health');
      
      const { system } = response.body.data;
      expect(system).toHaveProperty('cpu');
      expect(system).toHaveProperty('memory');
      expect(system).toHaveProperty('uptime');
      expect(system).toHaveProperty('platform');
      expect(system).toHaveProperty('hostname');
      expect(system).toHaveProperty('nodeVersion');
      
      // CPU should have information about cores and load
      expect(system.cpu).toHaveProperty('cores');
      expect(system.cpu).toHaveProperty('model');
      expect(system.cpu).toHaveProperty('load');
      
      // Memory should have usage information
      expect(system.memory).toHaveProperty('total');
      expect(system.memory).toHaveProperty('free');
      expect(system.memory).toHaveProperty('used');
      expect(system.memory).toHaveProperty('usagePercentage');
    });
    
    it('should report performance metrics', async () => {
      const response = await request.get('/api/health');
      
      expect(response.body.data.performance).toHaveProperty('responseTime');
      
      // Response time should be a string ending in 'ms'
      expect(response.body.data.performance.responseTime).toMatch(/ms$/);
    });
    
    it('should have the correct environment', async () => {
      const response = await request.get('/api/health');
      
      // In test environment, this should be 'test'
      expect(response.body.data.environment).toBe('test');
    });
  });
});

