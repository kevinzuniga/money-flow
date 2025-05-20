/**
 * Custom Cypress Commands
 * 
 * This file contains all custom commands used across the test suite.
 * Commands are organized by feature area for better maintainability.
 */

// Authentication Commands
Cypress.Commands.add('login', (email, password) => {
  cy.visit('/login');
  cy.get('[data-testid=email-input]').type(email);
  cy.get('[data-testid=password-input]').type(password);
  cy.get('[data-testid=login-button]').click();
  
  // Wait for login to complete and dashboard to load
  cy.url().should('not.include', '/login');
  cy.getCookie('token').should('exist');
});

Cypress.Commands.add('logout', () => {
  cy.get('[data-testid=user-menu]').click();
  cy.contains('Cerrar sesión').click();
  
  // Wait for logout to complete
  cy.url().should('include', '/login');
  cy.getCookie('token').should('not.exist');
});

Cypress.Commands.add('getAuthToken', () => {
  return window.localStorage.getItem('token');
});

Cypress.Commands.add('setAuthToken', (token) => {
  window.localStorage.setItem('token', token);
});

Cypress.Commands.add('clearAuth', () => {
  window.localStorage.removeItem('token');
  cy.clearCookies();
});

Cypress.Commands.add('apiLogin', (email, password) => {
  cy.request({
    method: 'POST',
    url: `${Cypress.env('apiUrl')}/auth/login`,
    body: { email, password }
  }).then((response) => {
    expect(response.status).to.eq(200);
    expect(response.body.success).to.eq(true);
    expect(response.body.data).to.have.property('token');
    
    // Store the token for future API requests
    Cypress.env('token', response.body.data.token);
    
    // Set the cookie for frontend authentication
    cy.setCookie('token', response.body.data.token);
  });
});

// Navigation Commands
Cypress.Commands.add('navigateTo', (route) => {
  const routes = {
    'dashboard': '/',
    'ingresos': '/ingresos',
    'egresos': '/egresos',
    'reportes': '/reportes',
    'categorias': '/categorias',
    'configuracion': '/configuracion',
  };
  
  const path = routes[route] || route;
  cy.visit(path);
  
  // Wait for navigation to complete
  cy.url().should('include', path);
});

Cypress.Commands.add('navigateToIngresos', () => {
  cy.visit('/ingresos');
  cy.url().should('include', '/ingresos');
});

Cypress.Commands.add('navigateToEgresos', () => {
  cy.visit('/egresos');
  cy.url().should('include', '/egresos');
});

Cypress.Commands.add('navigateToReportes', () => {
  cy.visit('/reportes');
  cy.url().should('include', '/reportes');
});

// Form Interaction Commands
Cypress.Commands.add('fillIngresoForm', (data) => {
  cy.get('[data-testid=monto-input]').type(data.monto.toString());
  
  if (data.descripcion) {
    cy.get('[data-testid=descripcion-input]').type(data.descripcion);
  }
  
  if (data.fecha) {
    cy.get('[data-testid=fecha-input]').type(data.fecha);
  } else {
    // Use current date if not specified
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    cy.get('[data-testid=fecha-input]').type(`${year}-${month}-${day}`);
  }
  
  if (data.categoria) {
    cy.get('[data-testid=categoria-select]').click();
    cy.contains(data.categoria).click();
  }
});

Cypress.Commands.add('fillEgresoForm', (data) => {
  cy.get('[data-testid=monto-input]').type(data.monto.toString());
  
  if (data.descripcion) {
    cy.get('[data-testid=descripcion-input]').type(data.descripcion);
  }
  
  if (data.fecha) {
    cy.get('[data-testid=fecha-input]').type(data.fecha);
  } else {
    // Use current date if not specified
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    cy.get('[data-testid=fecha-input]').type(`${year}-${month}-${day}`);
  }
  
  if (data.categoria) {
    cy.get('[data-testid=categoria-select]').click();
    cy.contains(data.categoria).click();
  }
});

Cypress.Commands.add('fillCategoriaForm', (data) => {
  cy.get('[data-testid=nombre-input]').type(data.nombre);
  
  cy.get('[data-testid=tipo-select]').click();
  cy.contains(data.tipo || 'Egreso').click();
  
  if (data.color) {
    cy.get('[data-testid=color-input]').type(data.color);
  }
  
  if (data.icono) {
    cy.get('[data-testid=icono-select]').click();
    cy.contains(data.icono).click();
  }
  
  if (data.descripcion) {
    cy.get('[data-testid=descripcion-input]').type(data.descripcion);
  }
});

Cypress.Commands.add('fillTransactionForm', ({ amount, category, description, date }) => {
  if (amount) cy.get('input[name="monto"]').type(amount);
  if (category) cy.get('select[name="categoria"]').select(category);
  if (description) cy.get('input[name="descripcion"]').type(description);
  if (date) cy.get('input[name="fecha"]').type(date);
});

Cypress.Commands.add('submitForm', () => {
  cy.get('button[type="submit"]').click();
  cy.waitForAPI();
});

// Data Verification Commands
Cypress.Commands.add('verifyIngreso', (data) => {
  cy.contains(data.descripcion).should('be.visible');
  
  // Format the amount with thousands separator
  const formattedAmount = new Intl.NumberFormat('es-MX', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(data.monto);
  
  cy.contains(formattedAmount).should('be.visible');
  
  if (data.categoria) {
    cy.contains(data.categoria).should('be.visible');
  }
});

Cypress.Commands.add('verifyEgreso', (data) => {
  cy.contains(data.descripcion).should('be.visible');
  
  // Format the amount with thousands separator
  const formattedAmount = new Intl.NumberFormat('es-MX', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(data.monto);
  
  cy.contains(formattedAmount).should('be.visible');
  
  if (data.categoria) {
    cy.contains(data.categoria).should('be.visible');
  }
});

Cypress.Commands.add('verifyTransactionExists', (description, amount) => {
  cy.contains('tr', description)
    .should('exist')
    .and('contain', amount);
});

Cypress.Commands.add('verifyTotalAmount', (selector, expectedAmount) => {
  cy.get(selector)
    .invoke('text')
    .then((text) => {
      const amount = parseFloat(text.replace(/[^0-9.-]+/g, ''));
      expect(amount).to.equal(expectedAmount);
    });
});

// Chart Testing Commands
Cypress.Commands.add('verifyChartExists', () => {
  cy.get('[data-testid="financial-chart"]')
    .should('exist')
    .and('be.visible');
});

// Date Selection Commands
Cypress.Commands.add('selectMonth', (month) => {
  cy.get('[data-testid="month-selector"]').select(month);
});

Cypress.Commands.add('selectYear', (year) => {
  cy.get('[data-testid="year-selector"]').select(year);
});

// Data Management Commands
Cypress.Commands.add('resetTestData', () => {
  cy.task('resetDatabase');
  cy.task('createTestData');
});

// API Testing Commands
Cypress.Commands.add('apiCreateIncome', (data) => {
  return cy.request({
    method: 'POST',
    url: `${Cypress.env('apiUrl')}/ingresos`,
    headers: {
      Authorization: `Bearer ${window.localStorage.getItem('token')}`,
    },
    body: data,
  });
});

Cypress.Commands.add('apiCreateExpense', (data) => {
  return cy.request({
    method: 'POST',
    url: `${Cypress.env('apiUrl')}/egresos`,
    headers: {
      Authorization: `Bearer ${window.localStorage.getItem('token')}`,
    },
    body: data,
  });
});

Cypress.Commands.add('apiRequest', (method, endpoint, data = null) => {
  return cy.request({
    method,
    url: `${Cypress.env('apiUrl')}${endpoint}`,
    headers: {
      'Authorization': `Bearer ${Cypress.env('token')}`,
      'Content-Type': 'application/json',
    },
    body: data,
    failOnStatusCode: false
  });
});

// UI Component Testing Commands
Cypress.Commands.add('getDataTestId', (testId) => {
  return cy.get(`[data-testid="${testId}"]`);
});

Cypress.Commands.add('shouldBeVisible', { prevSubject: true }, (subject) => {
  return cy.wrap(subject).should('be.visible');
});

Cypress.Commands.add('shouldNotExist', { prevSubject: true }, (subject) => {
  return cy.wrap(subject).should('not.exist');
});

// Error Handling Commands
Cypress.Commands.add('checkForErrors', () => {
  cy.get('[data-testid="error-message"]').should('not.exist');
  cy.get('[data-testid="alert-error"]').should('not.exist');
});

// Wait Commands
Cypress.Commands.add('waitForAPI', () => {
  cy.intercept('**').as('apiRequest');
  cy.wait('@apiRequest');
});

Cypress.Commands.add('waitForLoading', () => {
  cy.get('[data-testid="loading-spinner"]').should('not.exist');
});

// Utility Commands
Cypress.Commands.add('formatCurrency', (amount) => {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 2
  }).format(amount);
});

// Custom Assertions
Cypress.Commands.add('shouldHaveError', (message) => {
  cy.get('[data-testid="error-message"]')
    .should('be.visible')
    .and('contain', message);
});

Cypress.Commands.add('shouldHaveSuccess', (message) => {
  cy.get('[data-testid="success-message"]')
    .should('be.visible')
    .and('contain', message);
});

// Data operations
Cypress.Commands.add('deleteAllTransactions', () => {
  cy.request({
    method: 'POST',
    url: `${Cypress.env('apiUrl')}/test/cleanup`,
    headers: {
      Authorization: `Bearer ${window.localStorage.getItem('token')}`,
    },
  });
});
