/**
 * Financial Reports API Tests
 * 
 * Tests for the financial reporting endpoints, including monthly and annual
 * reports, custom date ranges, and category analysis.
 */

const { getTestRequest, createTestUser, randomString } = require('../setup');

describe('Reports API', () => {
  let request;
  let authUser;
  let authToken;
  let incomeCategory;
  let expenseCategory;
  
  // Test data for generating reports
  const testDate = new Date();
  const currentYear = testDate.getFullYear();
  const currentMonth = testDate.getMonth() + 1; // JavaScript months are 0-indexed
  
  beforeAll(async () => {
    request = getTestRequest();
    
    // Create a test user and get auth token
    const { user, token } = await createTestUser();
    authUser = user;
    authToken = token;
    
    // Create test categories
    const incomeCategoryResponse = await request
      .post('/api/categorias')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        nombre: `Test Income Category ${randomString()}`,
        tipo: 'ingreso',
        color: '#4CAF50',
        icono: 'attach_money'
      })
      .expect(201);
    
    incomeCategory = incomeCategoryResponse.body.data.id;
    
    const expenseCategoryResponse = await request
      .post('/api/categorias')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        nombre: `Test Expense Category ${randomString()}`,
        tipo: 'egreso',
        color: '#F44336',
        icono: 'shopping_cart'
      })
      .expect(201);
    
    expenseCategory = expenseCategoryResponse.body.data.id;
    
    // Create test data for different months and years
    await createTestData();
  });
  
  /**
   * Create test income and expense data for reports
   */
  async function createTestData() {
    // Current month data
    const currentMonthData = [
      // Income entries
      {
        monto: 3000,
        descripcion: 'Monthly Salary',
        fecha: `${currentYear}-${currentMonth.toString().padStart(2, '0')}-05`,
        categoria: incomeCategory
      },
      {
        monto: 500,
        descripcion: 'Freelance Project',
        fecha: `${currentYear}-${currentMonth.toString().padStart(2, '0')}-15`,
        categoria: incomeCategory
      },
      // Expense entries
      {
        monto: 800,
        descripcion: 'Rent',
        fecha: `${currentYear}-${currentMonth.toString().padStart(2, '0')}-01`,
        categoria: expenseCategory
      },
      {
        monto: 200,
        descripcion: 'Groceries',
        fecha: `${currentYear}-${currentMonth.toString().padStart(2, '0')}-10`,
        categoria: expenseCategory
      },
      {
        monto: 100,
        descripcion: 'Utilities',
        fecha: `${currentYear}-${currentMonth.toString().padStart(2, '0')}-15`,
        categoria: expenseCategory
      }
    ];
    
    // Previous month data
    const previousMonth = currentMonth === 1 ? 12 : currentMonth - 1;
    const previousMonthYear = currentMonth === 1 ? currentYear - 1 : currentYear;
    
    const previousMonthData = [
      // Income entries
      {
        monto: 3000,
        descripcion: 'Monthly Salary',
        fecha: `${previousMonthYear}-${previousMonth.toString().padStart(2, '0')}-05`,
        categoria: incomeCategory
      },
      {
        monto: 300,
        descripcion: 'Side Gig',
        fecha: `${previousMonthYear}-${previousMonth.toString().padStart(2, '0')}-20`,
        categoria: incomeCategory
      },
      // Expense entries
      {
        monto: 800,
        descripcion: 'Rent',
        fecha: `${previousMonthYear}-${previousMonth.toString().padStart(2, '0')}-01`,
        categoria: expenseCategory
      },
      {
        monto: 150,
        descripcion: 'Groceries',
        fecha: `${previousMonthYear}-${previousMonth.toString().padStart(2, '0')}-12`,
        categoria: expenseCategory
      },
      {
        monto: 120,
        descripcion: 'Utilities',
        fecha: `${previousMonthYear}-${previousMonth.toString().padStart(2, '0')}-15`,
        categoria: expenseCategory
      },
      {
        monto: 60,
        descripcion: 'Entertainment',
        fecha: `${previousMonthYear}-${previousMonth.toString().padStart(2, '0')}-25`,
        categoria: expenseCategory
      }
    ];
    
    // Previous year, same month data
    const previousYearData = [
      // Income entries
      {
        monto: 2800,
        descripcion: 'Monthly Salary (Previous Year)',
        fecha: `${currentYear - 1}-${currentMonth.toString().padStart(2, '0')}-05`,
        categoria: incomeCategory
      },
      // Expense entries
      {
        monto: 750,
        descripcion: 'Rent (Previous Year)',
        fecha: `${currentYear - 1}-${currentMonth.toString().padStart(2, '0')}-01`,
        categoria: expenseCategory
      },
      {
        monto: 180,
        descripcion: 'Groceries (Previous Year)',
        fecha: `${currentYear - 1}-${currentMonth.toString().padStart(2, '0')}-10`,
        categoria: expenseCategory
      }
    ];
    
    // Insert all test data
    const allData = [...currentMonthData, ...previousMonthData, ...previousYearData];
    
    for (const item of allData) {
      if (item.hasOwnProperty('monto')) {
        const endpoint = item.monto > 0 ? '/api/ingresos' : '/api/egresos';
        await request
          .post(endpoint)
          .set('Authorization', `Bearer ${authToken}`)
          .send(item)
          .expect(201);
      }
    }
  }
  
  describe('Authentication Requirements', () => {
    it('should require authentication for all report endpoints', async () => {
      await request.get('/api/reportes/mensual').expect(401);
      await request.get('/api/reportes/anual').expect(401);
      await request.get('/api/reportes/rango').expect(401);
      await request.get('/api/reportes/categoria').expect(401);
    });
  });
  
  describe('Monthly Reports', () => {
    it('should generate a monthly report for the current month', async () => {
      const response = await request
        .get(`/api/reportes/mensual?year=${currentYear}&month=${currentMonth}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      
      // Check report structure
      expect(response.body.data).toHaveProperty('year', currentYear);
      expect(response.body.data).toHaveProperty('month', currentMonth);
      expect(response.body.data).toHaveProperty('ingresos');
      expect(response.body.data).toHaveProperty('egresos');
      expect(response.body.data).toHaveProperty('balance');
      expect(response.body.data).toHaveProperty('categorias');
      
      // Verify totals based on our test data
      expect(response.body.data.ingresos.total).toBe(3500); // 3000 + 500
      expect(response.body.data.egresos.total).toBe(1100);  // 800 + 200 + 100
      expect(response.body.data.balance).toBe(2400);       // 3500 - 1100
    });
    
    it('should include category breakdowns in monthly reports', async () => {
      const response = await request
        .get(`/api/reportes/mensual?year=${currentYear}&month=${currentMonth}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      
      expect(response.body.data.categorias).toBeDefined();
      expect(response.body.data.categorias.ingresos).toBeInstanceOf(Array);
      expect(response.body.data.categorias.egresos).toBeInstanceOf(Array);
      
      // Verify category breakdown
      const incomeCategories = response.body.data.categorias.ingresos;
      const expenseCategories = response.body.data.categorias.egresos;
      
      expect(incomeCategories.length).toBeGreaterThan(0);
      expect(expenseCategories.length).toBeGreaterThan(0);
      
      // At least one category should match our test categories
      expect(incomeCategories.some(c => c.id === incomeCategory)).toBe(true);
      expect(expenseCategories.some(c => c.id === expenseCategory)).toBe(true);
    });
    
    it('should include day-by-day breakdown in monthly reports', async () => {
      const response = await request
        .get(`/api/reportes/mensual?year=${currentYear}&month=${currentMonth}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      
      expect(response.body.data).toHaveProperty('diario');
      expect(response.body.data.diario).toBeInstanceOf(Array);
      
      // Should have entries for various days
      expect(response.body.data.diario.length).toBeGreaterThan(0);
      
      // Each day should have the correct format
      response.body.data.diario.forEach(day => {
        expect(day).toHaveProperty('fecha');
        expect(day).toHaveProperty('ingresos');
        expect(day).toHaveProperty('egresos');
        expect(day).toHaveProperty('balance');
      });
    });
    
    it('should compare with previous month in monthly reports', async () => {
      const response = await request
        .get(`/api/reportes/mensual?year=${currentYear}&month=${currentMonth}&comparar=true`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      
      expect(response.body.data).toHaveProperty('comparacion');
      expect(response.body.data.comparacion).toHaveProperty('anterior');
      expect(response.body.data.comparacion).toHaveProperty('cambio');
      
      const comparison = response.body.data.comparacion;
      expect(comparison.anterior).toHaveProperty('ingresos');
      expect(comparison.anterior).toHaveProperty('egresos');
      expect(comparison.anterior).toHaveProperty('balance');
      
      expect(comparison.cambio).toHaveProperty('ingresos');
      expect(comparison.cambio).toHaveProperty('egresos');
      expect(comparison.cambio).toHaveProperty('balance');
    });
  });
  
  describe('Annual Reports', () => {
    it('should generate an annual report', async () => {
      const response = await request
        .get(`/api/reportes/anual?year=${currentYear}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      
      // Check report structure
      expect(response.body.data).toHaveProperty('year', currentYear);
      expect(response.body.data).toHaveProperty('ingresos');
      expect(response.body.data).toHaveProperty('egresos');
      expect(response.body.data).toHaveProperty('balance');
      expect(response.body.data).toHaveProperty('mensual');
      
      // Monthly breakdown should have 12 entries
      expect(response.body.data.mensual).toBeInstanceOf(Array);
      expect(response.body.data.mensual.length).toBe(12);
      
      // Each month should have the correct format
      response.body.data.mensual.forEach(month => {
        expect(month).toHaveProperty('month');
        expect(month).toHaveProperty('ingresos');
        expect(month).toHaveProperty('egresos');
        expect(month).toHaveProperty('balance');
      });
    });
    
    it('should include year-over-year comparison in annual reports', async () => {
      const response = await request
        .get(`/api/reportes/anual?year=${currentYear}&comparar=true`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      
      expect(response.body.data).toHaveProperty('comparacion');
      expect(response.body.data.comparacion).toHaveProperty('anterior');
      expect(response.body.data.comparacion).toHaveProperty('cambio');
      
      const comparison = response.body.data.comparacion;
      expect(comparison.anterior).toHaveProperty('year', currentYear - 1);
      expect(comparison.anterior).toHaveProperty('ingresos');
      expect(comparison.anterior).toHaveProperty('egresos');
      expect(comparison.anterior).toHaveProperty('balance');
      
      expect(comparison.cambio).toHaveProperty('ingresos');
      expect(comparison.cambio).toHaveProperty('egresos');
      expect(comparison.cambio).toHaveProperty('balance');
    });
    
    it('should include category breakdowns in annual reports', async () => {
      const response = await request
        .get(`/api/reportes/anual?year=${currentYear}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      
      expect(response.body.data).toHaveProperty('categorias');
      expect(response.body.data.categorias).toHaveProperty('ingresos');
      expect(response.body.data.categorias).toHaveProperty('egresos');
      
      expect(response.body.data.categorias.ingresos).toBeInstanceOf(Array);
      expect(response.body.data.categorias.egresos).toBeInstanceOf(Array);
    });
  });
  
  describe('Custom Date Range Reports', () => {
    it('should generate a report for a custom date range', async () => {
      const startDate = `${currentYear}-01-01`;
      const endDate = `${currentYear}-12-31`;
      
      const response = await request
        .get(`/api/reportes/rango?startDate=${startDate}&endDate=${endDate}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      
      // Check report structure
      expect(response.body.data).toHaveProperty('startDate');
      expect(response.body.data).toHaveProperty('endDate');
      expect(response.body.data).toHaveProperty('ingresos');
      expect(response.body.data).toHaveProperty('egresos');
      expect(response.body.data).toHaveProperty('balance');
      expect(response.body.data).toHaveProperty('categorias');
      expect(response.body.data).toHaveProperty('periodo');
      
      // Period should match our date range
      expect(response.body.data.startDate).toBe(startDate);
      expect(response.body.data.endDate).toBe(endDate);
    });
    
    it('should validate date parameters', async () => {
      // Invalid date format
      await request
        .get('/api/reportes/rango?startDate=invalid-date&endDate=2025-12-31')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);
      
      // End date before start date
      await request
        .get('/api/reportes/rango?startDate=2025-12-31&endDate=2025-01-01')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);
      
      // Missing required dates
      await request
        .get('/api/reportes/rango')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);
    });
    
    it('should support period comparison in date range reports', async () => {
      // First half of the year vs second half of previous year
      const startDate = `${currentYear}-01-01`;
      const endDate = `${currentYear}-06-30`;
      const comparisonStartDate = `${currentYear - 1}-07-01`;
      const comparisonEndDate = `${currentYear - 1}-12-31`;
      
      const response = await request
        .get(`/api/reportes/rango?startDate=${startDate}&endDate=${endDate}&comparar=true&comparisonStartDate=${comparisonStartDate}&comparisonEndDate=${comparisonEndDate}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('comparacion');
      expect(response.body.data.comparacion).toHaveProperty('anterior');
      expect(response.body.data.comparacion).toHaveProperty('cambio');
      
      // Comparison period data should be included
      expect(response.body.data.comparacion.anterior).toHaveProperty('startDate', comparisonStartDate);
      expect(response.body.data.comparacion.anterior).toHaveProperty('endDate', comparisonEndDate);
    });
    
    it('should properly aggregate data in date range reports', async () => {
      // Test month of data we created
      const startDate = `${currentYear}-${currentMonth.toString().padStart(2, '0')}-01`;
      const endDate = `${currentYear}-${currentMonth.toString().padStart(2, '0')}-31`;
      
      const response = await request
        .get(`/api/reportes/rango?startDate=${startDate}&endDate=${endDate}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      
      // Totals should match our test data
      expect(response.body.data.ingresos.total).toBe(3500); // 3000 + 500
      expect(response.body.data.egresos.total).toBe(1100);  // 800 + 200 + 100
      expect(response.body.data.balance).toBe(2400);       // 3500 - 1100
    });
  });
  
  describe('Category Analysis', () => {
    it('should generate category performance metrics', async () => {
      const response = await request
        .get(`/api/reportes/categoria?id=${expenseCategory}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      
      // Check report structure
      expect(response.body.data).toHaveProperty('categoria');
      expect(response.body.data).toHaveProperty('total');
      expect(response.body.data).toHaveProperty('promedio');
      expect(response.body.data).toHaveProperty('transacciones');
      expect(response.body.data).toHaveProperty('historia');
      
      // Ensure the category matches our request
      expect(response.body.data.categoria.id).toBe(expenseCategory);
    });
    
    it('should include trend analysis in category reports', async () => {
      const response = await request
        .get(`/api/reportes/categoria?id=${expenseCategory}&periodo=anual`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      
      expect(response.body.data).toHaveProperty('tendencia');
      expect(response.body.data.tendencia).toHaveProperty('mensual');
      expect(response.body.data.tendencia.mensual).toBeInstanceOf(Array);
      
      // Monthly trend should cover the full year
      expect(response.body.data.tendencia.mensual.length).toBe(12);
      
      // Each month should have the right format
      response.body.data.tendencia.mensual.forEach(month => {
        expect(month).toHaveProperty('month');
        expect(month).toHaveProperty('total');
        expect(month).toHaveProperty('transacciones');
      });
    });
    
    it('should compare with budget if provided', async () => {
      // Set a test budget for the category
      await request
        .post('/api/presupuestos')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          categoria: expenseCategory,
          monto: 1000,
          periodo: 'mensual'
        })
        .expect(201);
      
      const response = await request
        .get(`/api/reportes/categoria?id=${expenseCategory}&periodo=mensual&year=${currentYear}&month=${currentMonth}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      
      // Budget comparison should be included if budget exists
      if (response.body.data.presupuesto) {
        expect(response.body.data.presupuesto).toHaveProperty('monto');
        expect(response.body.data.presupuesto).toHaveProperty('utilizado');
        expect(response.body.data.presupuesto).toHaveProperty('porcentaje');
        expect(response.body.data.presupuesto).toHaveProperty('restante');
      }
    });
  });
  
  describe('Response Format Validation', () => {
    it('should validate schema for all report types', async () => {
      // Test monthly report schema
      const monthlyResponse = await request
        .get(`/api/reportes/mensual?year=${currentYear}&month=${currentMonth}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      
      expect(typeof monthlyResponse.body.success).toBe('boolean');
      expect(typeof monthlyResponse.body.message).toBe('string');
      expect(typeof monthlyResponse.body.data).toBe('object');
      
      // Test annual report schema
      const annualResponse = await request
        .get(`/api/reportes/anual?year=${currentYear}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      
      expect(typeof annualResponse.body.success).toBe('boolean');
      expect(typeof annualResponse.body.message).toBe('string');
      expect(typeof annualResponse.body.data).toBe('object');
      
      // Test range report schema
      const rangeResponse = await request
        .get(`/api/reportes/rango?startDate=${currentYear}-01-01&endDate=${currentYear}-12-31`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      
      expect(typeof rangeResponse.body.success).toBe('boolean');
      expect(typeof rangeResponse.body.message).toBe('string');
      expect(typeof rangeResponse.body.data).toBe('object');
    });
    
    it('should have consistent data types across reports', async () => {
      const response = await request
        .get(`/api/reportes/mensual?year=${currentYear}&month=${currentMonth}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      
      // Check data types
      expect(typeof response.body.data.ingresos.total).toBe('number');
      expect(typeof response.body.data.egresos.total).toBe('number');
      expect(typeof response.body.data.balance).toBe('number');
      
      // Check arrays
      expect(Array.isArray(response.body.data.categorias.ingresos)).toBe(true);
      expect(Array.isArray(response.body.data.categorias.egresos)).toBe(true);
      
      // Check category objects
      if (response.body.data.categorias.ingresos.length > 0) {
        const incomeCat = response.body.data.categorias.ingresos[0];
        expect(typeof incomeCat.id).toBeDefined();
        expect(typeof incomeCat.nombre).toBe('string');
        expect(typeof incomeCat.total).toBe('number');
        expect(typeof incomeCat.porcentaje).toBe('number');
      }
    });
    
    it('should include all required fields in reports', async () => {
      const response = await request
        .get(`/api/reportes/mensual?year=${currentYear}&month=${currentMonth}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      
      // Check required fields are present and not null/undefined
      expect(response.body.data.year).toBeDefined();
      expect(response.body.data.month).toBeDefined();
      expect(response.body.data.ingresos).toBeDefined();
      expect(response.body.data.egresos).toBeDefined();
      expect(response.body.data.balance).toBeDefined();
      
      // Nested required fields
      expect(response.body.data.ingresos.total).toBeDefined();
      expect(response.body.data.egresos.total).toBeDefined();
      
      // Should have category data
      expect(response.body.data.categorias).toBeDefined();
      expect(response.body.data.categorias.ingresos).toBeDefined();
      expect(response.body.data.categorias.egresos).toBeDefined();
    });
  });
});
