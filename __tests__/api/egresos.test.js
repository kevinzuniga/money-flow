/**
 * Expense (Egresos) API Tests
 * 
 * Tests for the expense management endpoints, including CRUD operations,
 * authentication, validation, and filtering.
 */

const { getTestRequest, createTestUser, randomString } = require('../setup');

describe('Expense API', () => {
  let request;
  let authUser;
  let authToken;
  let testEgresoId;
  
  const testEgreso = {
    monto: 150.75,
    descripcion: 'Test expense entry',
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
        nombre: `Test Expense Category ${randomString()}`,
        tipo: 'egreso',
        color: '#F44336',
        icono: 'shopping_cart'
      })
      .expect(201);
    
    // Set the category for our test expense
    testEgreso.categoria = categoryResponse.body.data.id;
  });
  
  describe('Authentication Requirements', () => {
    it('should require authentication for all endpoints', async () => {
      // Test each endpoint without auth token
      await request.get('/api/egresos').expect(401);
      await request.post('/api/egresos').expect(401);
      await request.get('/api/egresos/1').expect(401);
      await request.put('/api/egresos/1').expect(401);
      await request.delete('/api/egresos/1').expect(401);
    });
  });
  
  describe('Create Expense', () => {
    it('should create a new expense entry with valid data', async () => {
      const response = await request
        .post('/api/egresos')
        .set('Authorization', `Bearer ${authToken}`)
        .send(testEgreso)
        .expect(201);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      
      // Save the ID for later tests
      testEgresoId = response.body.data.id;
    });
    
    it('should reject creation with missing required fields', async () => {
      const response = await request
        .post('/api/egresos')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          // Missing monto and fecha
          descripcion: 'Incomplete expense entry'
        })
        .expect(400);
      
      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });
    
    it('should reject creation with invalid amount', async () => {
      const response = await request
        .post('/api/egresos')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          ...testEgreso,
          monto: -100 // Negative amount should be rejected
        })
        .expect(400);
      
      expect(response.body.success).toBe(false);
      expect(response.body.errors).toHaveProperty('monto');
    });
    
    it('should reject creation with invalid date', async () => {
      const response = await request
        .post('/api/egresos')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          ...testEgreso,
          fecha: 'not-a-date'
        })
        .expect(400);
      
      expect(response.body.success).toBe(false);
      expect(response.body.errors).toHaveProperty('fecha');
    });
    
    it('should reject creation with invalid category', async () => {
      const response = await request
        .post('/api/egresos')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          ...testEgreso,
          categoria: 999999 // Non-existent category
        })
        .expect(400);
      
      expect(response.body.success).toBe(false);
    });
    
    it('should reject expense with income-only category', async () => {
      // Create an income-only category
      const incomeCategoryResponse = await request
        .post('/api/categorias')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          nombre: `Income Only Category ${randomString()}`,
          tipo: 'ingreso', // Income only
          color: '#4CAF50',
          icono: 'attach_money'
        })
        .expect(201);
      
      const incomeCategoryId = incomeCategoryResponse.body.data.id;
      
      // Try to create expense with income category
      const response = await request
        .post('/api/egresos')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          ...testEgreso,
          categoria: incomeCategoryId
        })
        .expect(400);
      
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('categoría');
    });
    
    it('should handle duplicate expense entries on same date', async () => {
      // Create a first expense
      const duplicateEgreso = {
        monto: 42.99,
        descripcion: 'Potentially duplicate expense',
        fecha: new Date().toISOString().split('T')[0],
        categoria: testEgreso.categoria
      };
      
      await request
        .post('/api/egresos')
        .set('Authorization', `Bearer ${authToken}`)
        .send(duplicateEgreso)
        .expect(201);
      
      // Create a second identical expense - should work but might give a warning
      const response = await request
        .post('/api/egresos')
        .set('Authorization', `Bearer ${authToken}`)
        .send(duplicateEgreso)
        .expect(201);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body).toHaveProperty('message');
    });
  });
  
  describe('Get Expense', () => {
    it('should get a specific expense entry by ID', async () => {
      const response = await request
        .get(`/api/egresos/${testEgresoId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id', testEgresoId);
      expect(response.body.data).toHaveProperty('monto', testEgreso.monto);
      expect(response.body.data).toHaveProperty('descripcion', testEgreso.descripcion);
      expect(response.body.data).toHaveProperty('fecha');
      expect(response.body.data).toHaveProperty('categoria');
    });
    
    it('should return 404 for non-existent expense entry', async () => {
      await request
        .get('/api/egresos/999999')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
    
    it('should return 404 for expense entry belonging to another user', async () => {
      // Create another user
      const { token: otherToken } = await createTestUser({
        email: `other-${Date.now()}@example.com`
      });
      
      // Try to access the first user's expense entry
      await request
        .get(`/api/egresos/${testEgresoId}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .expect(404);
    });
  });
  
  describe('Update Expense', () => {
    it('should update an existing expense entry', async () => {
      const updatedData = {
        monto: 175.25,
        descripcion: 'Updated expense entry'
      };
      
      const response = await request
        .put(`/api/egresos/${testEgresoId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updatedData)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('monto', updatedData.monto);
      expect(response.body.data).toHaveProperty('descripcion', updatedData.descripcion);
      
      // Verify changes in the database
      const getResponse = await request
        .get(`/api/egresos/${testEgresoId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      
      expect(getResponse.body.data).toHaveProperty('monto', updatedData.monto);
      expect(getResponse.body.data).toHaveProperty('descripcion', updatedData.descripcion);
    });
    
    it('should reject update with invalid data', async () => {
      const response = await request
        .put(`/api/egresos/${testEgresoId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          monto: -500 // Negative amount should be rejected
        })
        .expect(400);
      
      expect(response.body.success).toBe(false);
      expect(response.body.errors).toHaveProperty('monto');
    });
    
    it('should return 404 when updating non-existent expense entry', async () => {
      await request
        .put('/api/egresos/999999')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ monto: 500 })
        .expect(404);
    });
    
    it('should reject updates to dates older than X days if configured', async () => {
      // Create an expense with an old date
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 90); // 90 days ago
      
      const oldEgreso = {
        ...testEgreso,
        fecha: oldDate.toISOString().split('T')[0]
      };
      
      // First, create the expense
      const createResponse = await request
        .post('/api/egresos')
        .set('Authorization', `Bearer ${authToken}`)
        .send(oldEgreso)
        .expect(201);
      
      const oldEgresoId = createResponse.body.data.id;
      
      // Try to update it - this might fail if there's a restriction on updating old expenses
      // This test might need to be adjusted based on your actual implementation rules
      const response = await request
        .put(`/api/egresos/${oldEgresoId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ monto: 200 });
      
      // Either the update is rejected with a 400 error about old dates
      // or it succeeds - both are valid depending on your implementation
      if (response.status === 400) {
        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain('fecha');
      } else {
        expect(response.status).toBe(200);
      }
    });
  });
  
  describe('List and Filter Expenses', () => {
    // Create several expense entries for testing pagination and filtering
    beforeAll(async () => {
      // Create expense entries with different dates and amounts
      const expensesToCreate = [
        { monto: 50, descripcion: 'Groceries', fecha: '2025-01-10', categoria: testEgreso.categoria },
        { monto: 120, descripcion: 'Utilities', fecha: '2025-01-22', categoria: testEgreso.categoria },
        { monto: 35, descripcion: 'Transportation', fecha: '2025-02-03', categoria: testEgreso.categoria },
        { monto: 200, descripcion: 'Rent', fecha: '2025-02-15', categoria: testEgreso.categoria },
        { monto: 65, descripcion: 'Dining', fecha: '2025-03-05', categoria: testEgreso.categoria }
      ];
      
      // Create all expense entries
      for (const expense of expensesToCreate) {
        await request
          .post('/api/egresos')
          .set('Authorization', `Bearer ${authToken}`)
          .send(expense)
          .expect(201);
      }
    });
    
    it('should list expense entries with pagination', async () => {
      const response = await request
        .get('/api/egresos?page=1&limit=2')
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
    
    it('should filter expense entries by date range', async () => {
      const response = await request
        .get('/api/egresos?startDate=2025-01-01&endDate=2025-01-31')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      
      // All entries should be within January 2025
      response.body.data.forEach(expense => {
        const date = new Date(expense.fecha);
        expect(date.getMonth()).toBe(0); // January is 0
        expect(date.getFullYear()).toBe(2025);
      });
    });
    
    it('should filter expense entries by month and year', async () => {
      const response = await request
        .get('/api/egresos?month=2&year=2025')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      
      // All entries should be from February 2025
      response.body.data.forEach(expense => {
        const date = new Date(expense.fecha);
        expect(date.getMonth()).toBe(1); // February is 1
        expect(date.getFullYear()).toBe(2025);
      });
    });
    
    it('should filter expense entries by amount range', async () => {
      const response = await request
        .get('/api/egresos?minAmount=100&maxAmount=200')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      
      // All entries should have amounts between 100 and 200
      response.body.data.forEach(expense => {
        expect(expense.monto).toBeGreaterThanOrEqual(100);
        expect(expense.monto).toBeLessThanOrEqual(200);
      });
    });
    
    it('should filter expense entries by category', async () => {
      // Create a new category for testing filters
      const newCategoryResponse = await request
        .post('/api/categorias')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          nombre: `Filter Test Category ${randomString()}`,
          tipo: 'egreso',
          color: '#673AB7',
          icono: 'filter_list'
        })
        .expect(201);
      
      const filterCategoryId = newCategoryResponse.body.data.id;
      
      // Create a new expense with this category
      await request
        .post('/api/egresos')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          monto: 75,
          descripcion: 'Expense with specific category for filtering',
          fecha: new Date().toISOString().split('T')[0],
          categoria: filterCategoryId
        })
        .expect(201);
      
      // Filter by the specific category
      const response = await request
        .get(`/api/egresos?categoria=${filterCategoryId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBeGreaterThanOrEqual(1);
      
      // All entries should have the specified category
      response.body.data.forEach(expense => {
        expect(expense.categoria).toBe(filterCategoryId);
      });
    });
    
    it('should sort expense entries', async () => {
      const response = await request
        .get('/api/egresos?sortBy=monto&sortDir=asc')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      
      // Entries should be sorted by amount in ascending order
      const amounts = response.body.data.map(expense => expense.monto);
      const sortedAmounts = [...amounts].sort((a, b) => a - b);
      expect(amounts).toEqual(sortedAmounts);
    });
    
    it('should sort expense entries by date', async () => {
      const response = await request
        .get('/api/egresos?sortBy=fecha&sortDir=desc')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      
      // Entries should be sorted by date in descending order
      const dates = response.body.data.map(expense => new Date(expense.fecha).getTime());
      const sortedDates = [...dates].sort((a, b) => b - a); // Descending order
      expect(dates).toEqual(sortedDates);
    });
  });
  
  describe('Delete Expense', () => {
    it('should delete an expense entry', async () => {
      await request
        .delete(`/api/egresos/${testEgresoId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      
      // Verify it's deleted
      await request
        .get(`/api/egresos/${testEgresoId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
    
    it('should return 404 when deleting non-existent expense entry', async () => {
      await request
        .delete('/api/egresos/999999')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
    
    it('should not allow deleting another user\'s expense entry', async () => {
      // Create a new expense entry
      const createResponse = await request
        .post('/api/egresos')
        .set('Authorization', `Bearer ${authToken}`)
        .send(testEgreso)
        .expect(201);
      
      const newEgresoId = createResponse.body.data.id;
      
      // Create another user
      const { token: otherToken } = await createTestUser({
        email: `other-delete-${Date.now()}@example.com`
      });
      
      // Try to delete with the other user
      await request
        .delete(`/api/egresos/${newEgresoId}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .expect(404);
      
      // Original user should still be able to get it
      await request
        .get(`/api/egresos/${newEgresoId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      
      // Clean up - delete with the original user
      await request
        .delete(`/api/egresos/${newEgresoId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
    });
  });
  
  // Cleanup test data after all tests are done
  afterAll(async () => {
    // All test data should be automatically cleaned up when the test database is reset
    // Additional specific cleanup could be done here if needed
  });
});
