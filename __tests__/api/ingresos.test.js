/**
 * Income (Ingresos) API Tests
 * 
 * Tests for the income management endpoints, including CRUD operations,
 * authentication, validation, and filtering.
 */

const { getTestRequest, createTestUser, randomString } = require('../setup');

describe('Income API', () => {
  let request;
  let authUser;
  let authToken;
  let testIngresoId;
  
  const testIngreso = {
    monto: 1000.50,
    descripcion: 'Test income entry',
    fecha: new Date().toISOString().split('T')[0], // Today in YYYY-MM-DD format
    categoria: null // Will be set after creating test categories
  };
  
  beforeAll(async () => {
    request = getTestRequest();
    
    // Create a test user and get auth token
    const { user, token } = await createTestUser();
    authUser = user;
    authToken = token;
    
    // First create a test category to use
    const categoryResponse = await request
      .post('/api/categorias')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        nombre: `Test Income Category ${randomString()}`,
        tipo: 'ingreso',
        color: '#4CAF50',
        icono: 'attach_money'
      })
      .expect(201);
    
    // Set the category for our test income
    testIngreso.categoria = categoryResponse.body.data.id;
  });
  
  describe('Authentication Requirements', () => {
    it('should require authentication for all endpoints', async () => {
      // Test each endpoint without auth token
      await request.get('/api/ingresos').expect(401);
      await request.post('/api/ingresos').expect(401);
      await request.get('/api/ingresos/1').expect(401);
      await request.put('/api/ingresos/1').expect(401);
      await request.delete('/api/ingresos/1').expect(401);
    });
  });
  
  describe('Create Income', () => {
    it('should create a new income entry with valid data', async () => {
      const response = await request
        .post('/api/ingresos')
        .set('Authorization', `Bearer ${authToken}`)
        .send(testIngreso)
        .expect(201);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      
      // Save the ID for later tests
      testIngresoId = response.body.data.id;
    });
    
    it('should reject creation with missing required fields', async () => {
      const response = await request
        .post('/api/ingresos')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          // Missing monto and fecha
          descripcion: 'Incomplete income entry'
        })
        .expect(400);
      
      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });
    
    it('should reject creation with invalid amount', async () => {
      const response = await request
        .post('/api/ingresos')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          ...testIngreso,
          monto: -100 // Negative amount should be rejected
        })
        .expect(400);
      
      expect(response.body.success).toBe(false);
      expect(response.body.errors).toHaveProperty('monto');
    });
    
    it('should reject creation with invalid date', async () => {
      const response = await request
        .post('/api/ingresos')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          ...testIngreso,
          fecha: 'not-a-date'
        })
        .expect(400);
      
      expect(response.body.success).toBe(false);
      expect(response.body.errors).toHaveProperty('fecha');
    });
    
    it('should reject creation with invalid category', async () => {
      const response = await request
        .post('/api/ingresos')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          ...testIngreso,
          categoria: 999999 // Non-existent category
        })
        .expect(400);
      
      expect(response.body.success).toBe(false);
    });
  });
  
  describe('Get Income', () => {
    it('should get a specific income entry by ID', async () => {
      const response = await request
        .get(`/api/ingresos/${testIngresoId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id', testIngresoId);
      expect(response.body.data).toHaveProperty('monto', testIngreso.monto);
      expect(response.body.data).toHaveProperty('descripcion', testIngreso.descripcion);
      expect(response.body.data).toHaveProperty('fecha');
      expect(response.body.data).toHaveProperty('categoria');
    });
    
    it('should return 404 for non-existent income entry', async () => {
      await request
        .get('/api/ingresos/999999')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
    
    it('should return 404 for income entry belonging to another user', async () => {
      // Create another user
      const { token: otherToken } = await createTestUser({
        email: `other-${Date.now()}@example.com`
      });
      
      // Try to access the first user's income entry
      await request
        .get(`/api/ingresos/${testIngresoId}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .expect(404);
    });
  });
  
  describe('Update Income', () => {
    it('should update an existing income entry', async () => {
      const updatedData = {
        monto: 1200.75,
        descripcion: 'Updated income entry'
      };
      
      const response = await request
        .put(`/api/ingresos/${testIngresoId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updatedData)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('monto', updatedData.monto);
      expect(response.body.data).toHaveProperty('descripcion', updatedData.descripcion);
      
      // Verify changes in the database
      const getResponse = await request
        .get(`/api/ingresos/${testIngresoId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      
      expect(getResponse.body.data).toHaveProperty('monto', updatedData.monto);
      expect(getResponse.body.data).toHaveProperty('descripcion', updatedData.descripcion);
    });
    
    it('should reject update with invalid data', async () => {
      const response = await request
        .put(`/api/ingresos/${testIngresoId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          monto: -500 // Negative amount should be rejected
        })
        .expect(400);
      
      expect(response.body.success).toBe(false);
      expect(response.body.errors).toHaveProperty('monto');
    });
    
    it('should return 404 when updating non-existent income entry', async () => {
      await request
        .put('/api/ingresos/999999')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ monto: 500 })
        .expect(404);
    });
  });
  
  describe('List and Filter Income', () => {
    // Create several income entries for testing pagination and filtering
    beforeAll(async () => {
      // Create income entries with different dates and amounts
      const incomesToCreate = [
        { monto: 2000, descripcion: 'Salary', fecha: '2025-01-15', categoria: testIngreso.categoria },
        { monto: 500, descripcion: 'Bonus', fecha: '2025-01-20', categoria: testIngreso.categoria },
        { monto: 1000, descripcion: 'Freelance work', fecha: '2025-02-05', categoria: testIngreso.categoria },
        { monto: 300, descripcion: 'Interest', fecha: '2025-02-10', categoria: testIngreso.categoria },
        { monto: 1500, descripcion: 'Consulting', fecha: '2025-03-01', categoria: testIngreso.categoria }
      ];
      
      // Create all income entries
      for (const income of incomesToCreate) {
        await request
          .post('/api/ingresos')
          .set('Authorization', `Bearer ${authToken}`)
          .send(income)
          .expect(201);
      }
    });
    
    it('should list income entries with pagination', async () => {
      const response = await request
        .get('/api/ingresos?page=1&limit=2')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBeLessThanOrEqual(2);
      expect(response.body).toHaveProperty('pagination');
      expect(response.body.pagination).toHaveProperty('page', 1);
      expect(response.body.pagination).toHaveProperty('limit', 2);
      expect(response.body.pagination).toHaveProperty('totalItems');
      expect(response.body.pagination).toHaveProperty('totalPages');
    });
    
    it('should filter income entries by date range', async () => {
      const response = await request
        .get('/api/ingresos?startDate=2025-01-01&endDate=2025-01-31')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      
      // All entries should be within January 2025
      response.body.data.forEach(income => {
        const date = new Date(income.fecha);
        expect(date.getMonth()).toBe(0); // January is 0
        expect(date.getFullYear()).toBe(2025);
      });
    });
    
    it('should filter income entries by month and year', async () => {
      const response = await request
        .get('/api/ingresos?month=2&year=2025')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      
      // All entries should be from February 2025
      response.body.data.forEach(income => {
        const date = new Date(income.fecha);
        expect(date.getMonth()).toBe(1); // February is 1
        expect(date.getFullYear()).toBe(2025);
      });
    });
    
    it('should filter income entries by amount range', async () => {
      const response = await request
        .get('/api/ingresos?minAmount=1000&maxAmount=2000')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      
      // All entries should have amounts between 1000 and 2000
      response.body.data.forEach(income => {
        expect(income.monto).toBeGreaterThanOrEqual(1000);
        expect(income.monto).toBeLessThanOrEqual(2000);
      });
    });
    
    it('should sort income entries', async () => {
      const response = await request
        .get('/api/ingresos?sortBy=monto&sortDir=asc')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      
      // Entries should be sorted by amount in ascending order
      const amounts = response.body.data.map(income => income.monto);
      const sortedAmounts = [...amounts].sort((a, b) => a - b);
      expect(amounts).toEqual(sortedAmounts);
    });
  });
  
  describe('Delete Income', () => {
    it('should delete an income entry', async () => {
      await request
        .delete(`/api/ingresos/${testIngresoId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      
      // Verify it's deleted
      await request
        .get(`/api/ingresos/${testIngresoId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
    
    it('should return 404 when deleting non-existent income entry', async () => {
      await request
        .delete('/api/ingresos/999999')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
    
    it('should not allow deleting another user\'s income entry', async () => {
      // Create a new income entry
      const createResponse = await request
        .post('/api/ingresos')
        .set('Authorization', `Bearer ${authToken}`)
        .send(testIngreso)
        .expect(201);
      
      const newIngresoId = createResponse.body.data.id;
      
      // Create another user
      const { token: otherToken } = await createTestUser({
        email: `other-delete-${Date.now()}@example.com`
      });
      
      // Try to delete with the other user
      await request
        .delete(`/api/ingresos/${newIngresoId}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .expect(404);
      
      // Original user should still be able to get it
      await request
        .get(`/api/ingresos/${newIngresoId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
    });
  });
});

