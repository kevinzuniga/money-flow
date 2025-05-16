/**
 * Cypress support file for E2E tests
 * 
 * This file runs before every Cypress test and sets up the global configuration
 * and behaviors for all tests, including global error handling and custom commands.
 */

// Import commands.js using ES2015 syntax:
import './commands';

// Configure Cypress behavior
Cypress.on('uncaught:exception', (err, runnable) => {
  // Returning false here prevents Cypress from failing the test when
  // an uncaught exception occurs in the application
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

