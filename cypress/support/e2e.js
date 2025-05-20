/**
 * Cypress support file for E2E tests
 * 
 * This file runs before every Cypress test and sets up the global configuration
 * and behaviors for all tests, including global error handling and custom commands.
 */

// Import commands.js using ES2015 syntax:
import './commands';

// Prevent uncaught exception warnings from polluting test logs
Cypress.on('uncaught:exception', (err, runnable) => {
  // returning false here prevents Cypress from failing the test
  console.error('Uncaught exception:', err.message);
  return false;
});

// Set up snapshot configuration for better failure tracking
Cypress.Screenshot.defaults({
  screenshotOnRunFailure: true,
});

// Add better logging for test errors
Cypress.on('fail', (error, runnable) => {
  // Log additional context about the failure
  console.error(`Test failed: ${runnable.title}`);
  console.error(`Error: ${error.message}`);
  console.error(`Location: ${error.stack}`);
  
  // Capture a screenshot with additional context
  cy.screenshot(`failure-${runnable.title.replace(/\s+/g, '-')}`);
  
  // Re-throw the error to fail the test
  throw error;
});

// Before each test
beforeEach(() => {
  // Log the start of each test for better debugging
  cy.log(`Starting test: ${Cypress.currentTest.title}`);
  
  // Preserve cookies between tests for efficiency
  Cypress.Cookies.preserveOnce('token', 'session');
});

// After each test
afterEach(() => {
  // Log the end of each test
  cy.log(`Completed test: ${Cypress.currentTest.title}`);
});

// Add custom commands for authentication
Cypress.Commands.add('loginByUI', (email = Cypress.env('testUserEmail'), password = Cypress.env('testUserPassword')) => {
  cy.visit('/');
  cy.get('input[name="email"]').type(email);
  cy.get('input[name="password"]').type(password);
  cy.get('button[type="submit"]').click();
  cy.url().should('not.include', '/login');
});

Cypress.Commands.add('loginByAPI', (email = Cypress.env('testUserEmail'), password = Cypress.env('testUserPassword')) => {
  cy.request('POST', `${Cypress.env('API_URL')}/auth/login`, {
    email,
    password,
  }).then((response) => {
    expect(response.status).to.eq(200);
    window.localStorage.setItem('token', response.body.token);
  });
});

// Database commands
Cypress.Commands.add('resetDatabase', () => {
  cy.task('resetDatabase');
});

Cypress.Commands.add('seedTestData', () => {
  cy.task('createTestData');
});

// Financial transaction commands
Cypress.Commands.add('createIncome', (amount, category = 'Test Income', description = 'Test income') => {
  cy.visit('/ingresos');
  cy.get('[data-testid="add-transaction-button"]').click();
  cy.get('input[name="monto"]').type(amount);
  cy.get('select[name="categoria"]').select(category);
  cy.get('input[name="descripcion"]').type(description);
  cy.get('button[type="submit"]').click();
});

Cypress.Commands.add('createExpense', (amount, category = 'Test Expense', description = 'Test expense') => {
  cy.visit('/egresos');
  cy.get('[data-testid="add-transaction-button"]').click();
  cy.get('input[name="monto"]').type(amount);
  cy.get('select[name="categoria"]').select(category);
  cy.get('input[name="descripcion"]').type(description);
  cy.get('button[type="submit"]').click();
});

// API request interceptor
Cypress.Commands.add('waitForAPI', () => {
  cy.intercept('**').as('apiRequest');
  cy.wait('@apiRequest');
});

// Utility commands
Cypress.Commands.add('log', (message) => {
  cy.task('log', message);
});

Cypress.Commands.add('table', (data) => {
  cy.task('table', data);
});

// TypeScript type definitions will be added in separate file

