/**
 * End-to-end tests for financial management flow
 * 
 * Tests the core functionality of the application:
 * - User authentication
 * - Income management
 * - Expense management
 * - Reports viewing
 * - Category management
 */

describe('Financial Management Flow', () => {
  beforeEach(() => {
    // Reset the database before each test
    cy.task('resetDatabase');
    cy.task('createTestData');
    cy.visit('/');
  });
  
  it('should allow a user to perform the complete financial management flow', () => {
    // Login flow
    cy.login(Cypress.env('testUserEmail'), Cypress.env('testUserPassword'));
    
    // Verify dashboard is visible
    cy.contains('Dashboard').should('be.visible');
    cy.contains('Resumen financiero').should('be.visible');
    
    // ===== Income Management =====
    // Navigate to income page
    cy.contains('Ingresos').click();
    cy.url().should('include', '/ingresos');
    
    // Add a new income
    cy.contains('Nuevo ingreso').click();
    cy.get('[data-testid=monto-input]').type('1500.75');
    cy.get('[data-testid=descripcion-input]').type('Test salary payment');
    cy.get('[data-testid=fecha-input]').type(getCurrentDate());
    cy.get('[data-testid=categoria-select]').click();
    cy.contains('Test Income').click();
    cy.contains('button', 'Guardar').click();
    
    // Verify income was added
    cy.contains('Ingreso registrado correctamente').should('be.visible');
    cy.contains('Test salary payment').should('be.visible');
    cy.contains('1,500.75').should('be.visible');
    
    // ===== Expense Management =====
    // Navigate to expenses page
    cy.contains('Egresos').click();
    cy.url().should('include', '/egresos');
    
    // Add a new expense
    cy.contains('Nuevo egreso').click();
    cy.get('[data-testid=monto-input]').type('500.25');
    cy.get('[data-testid=descripcion-input]').type('Test rent payment');
    cy.get('[data-testid=fecha-input]').type(getCurrentDate());
    cy.get('[data-testid=categoria-select]').click();
    cy.contains('Test Expense').click();
    cy.contains('button', 'Guardar').click();
    
    // Verify expense was added
    cy.contains('Egreso registrado correctamente').should('be.visible');
    cy.contains('Test rent payment').should('be.visible');
    cy.contains('500.25').should('be.visible');
    
    // ===== Reports Viewing =====
    // Navigate to reports page
    cy.contains('Reportes').click();
    cy.url().should('include', '/reportes');
    
    // View monthly report
    cy.contains('Reporte mensual').click();
    
    // Check report content
    cy.contains('Ingresos').should('be.visible');
    cy.contains('Egresos').should('be.visible');
    cy.contains('Balance').should('be.visible');
    
    // Verify the totals in the report
    cy.get('[data-testid=ingresos-total]').should('contain', '1,500.75');
    cy.get('[data-testid=egresos-total]').should('contain', '500.25');
    cy.get('[data-testid=balance-total]').should('contain', '1,000.50');
    
    // ===== Category Management =====
    // Navigate to categories page
    cy.contains('Categorías').click();
    cy.url().should('include', '/categorias');
    
    // Add a new category
    cy.contains('Nueva categoría').click();
    cy.get('[data-testid=nombre-input]').type('Entertainment');
    cy.get('[data-testid=tipo-select]').click();
    cy.contains('Egreso').click();
    cy.get('[data-testid=color-input]').type('#9C27B0');
    cy.get('[data-testid=icono-select]').click();
    cy.contains('movie').click();
    cy.contains('button', 'Guardar').click();
    
    // Verify category was added
    cy.contains('Categoría creada correctamente').should('be.visible');
    cy.contains('Entertainment').should('be.visible');
    
    // Use the new category to create an expense
    cy.contains('Egresos').click();
    cy.contains('Nuevo egreso').click();
    cy.get('[data-testid=monto-input]').type('75.50');
    cy.get('[data-testid=descripcion-input]').type('Movie night');
    cy.get('[data-testid=fecha-input]').type(getCurrentDate());
    cy.get('[data-testid=categoria-select]').click();
    cy.contains('Entertainment').click();
    cy.contains('button', 'Guardar').click();
    
    // Verify the expense with the new category
    cy.contains('Egreso registrado correctamente').should('be.visible');
    cy.contains('Movie night').should('be.visible');
    cy.contains('75.50').should('be.visible');
    cy.contains('Entertainment').should('be.visible');
    
    // Check if the reports are updated
    cy.contains('Reportes').click();
    cy.contains('Reporte mensual').click();
    
    // Verify updated totals
    cy.get('[data-testid=ingresos-total]').should('contain', '1,500.75');
    cy.get('[data-testid=egresos-total]').should('contain', '575.75');
    cy.get('[data-testid=balance-total]').should('contain', '925.00');
    
    // Logout
    cy.get('[data-testid=user-menu]').click();
    cy.contains('Cerrar sesión').click();
    
    // Verify we're back at the login page
    cy.url().should('include', '/login');
  });
  
  it('should handle editing and deleting transactions', () => {
    // Login
    cy.login(Cypress.env('testUserEmail'), Cypress.env('testUserPassword'));
    
    // Add an income to edit later
    cy.contains('Ingresos').click();
    cy.contains('Nuevo ingreso').click();
    cy.get('[data-testid=monto-input]').type('2000');
    cy.get('[data-testid=descripcion-input]').type('Initial income');
    cy.get('[data-testid=fecha-input]').type(getCurrentDate());
    cy.get('[data-testid=categoria-select]').click();
    cy.contains('Test Income').click();
    cy.contains('button', 'Guardar').click();
    
    // Edit the income
    cy.contains('Initial income').parent().find('[data-testid=edit-button]').click();
    cy.get('[data-testid=monto-input]').clear().type('2500');
    cy.get('[data-testid=descripcion-input]').clear().type('Updated income');
    cy.contains('button', 'Guardar').click();
    
    // Verify the update
    cy.contains('Ingreso actualizado correctamente').should('be.visible');
    cy.contains('Updated income').should('be.visible');
    cy.contains('2,500.00').should('be.visible');
    
    // Delete the income
    cy.contains('Updated income').parent().find('[data-testid=delete-button]').click();
    cy.contains('button', 'Confirmar').click();
    
    // Verify deletion
    cy.contains('Ingreso eliminado correctamente').should('be.visible');
    cy.contains('Updated income').should('not.exist');
  });
});

/**
 * Helper function to get current date in YYYY-MM-DD format
 */
function getCurrentDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

