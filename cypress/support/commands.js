/**
 * Custom Cypress commands
 * 
 * This file defines custom commands that can be used across all E2E tests
 * to simplify common operations.
 */

// Authentication commands
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

// Navigation commands
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

// Form helper commands
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

// Data verification commands
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

// API commands - for direct API testing or setup
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

Cypress.Commands.add('apiCreateIngreso', (data) => {
  cy.request({
    method: 'POST',
    url: `${Cypress.env('apiUrl')}/ingresos`,
    headers: {
      Authorization: `Bearer ${Cypress.env('token')}`
    },
    body: data
  }).then((response) => {
    expect(response.status).to.eq(201);
    expect(response.body.success).to.eq(true);
    return response.body.data;
  });
});

Cypress.Commands.add('apiCreateEgreso', (data) => {
  cy.request({
    method: 'POST',
    url: `${Cypress.env('apiUrl')}/egresos`,
    headers: {
      Authorization: `Bearer ${Cypress.env('token')}`
    },
    body: data
  }).then((response) => {
    expect(response.status).to.eq(201);
    expect(response.body.success).to.eq(true);
    return response.body.data;
  });
});

