const { defineConfig } = require('cypress');
const { Pool } = require('pg');

module.exports = defineConfig({
  e2e: {
    baseUrl: 'http://localhost:3000',
    supportFile: 'cypress/support/e2e.js',
    defaultCommandTimeout: 10000,
    viewportWidth: 1280,
    viewportHeight: 720,
    video: false,
    screenshotOnRunFailure: true,
    
    setupNodeEvents(on, config) {
      // Database connection pool
      const pool = new Pool({
        connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/money_flow_test',
      });

      // Register custom tasks
      on('task', {
        // Reset the database to a clean state
        async resetDatabase() {
          try {
            const client = await pool.connect();
            try {
              // Truncate all tables except migrations
              await client.query(`
                DO $$ 
                DECLARE
                  r RECORD;
                BEGIN
                  -- Disable triggers
                  EXECUTE 'SET session_replication_role = replica';
                  
                  -- Truncate tables
                  FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename != 'migrations') LOOP
                    EXECUTE 'TRUNCATE TABLE ' || quote_ident(r.tablename) || ' CASCADE';
                  END LOOP;
                  
                  -- Re-enable triggers
                  EXECUTE 'SET session_replication_role = DEFAULT';
                END $$;
              `);
              
              // Create a test user
              await client.query(`
                INSERT INTO usuarios (id, nombre, email, password_hash, is_active, created_at, updated_at)
                VALUES (
                  '00000000-0000-0000-0000-000000000001',
                  'E2E Test User',
                  'e2e-test@example.com',
                  '$2a$10$JlChI8NWV8yKUCVU1uMRX.ztpT7iSn.LjfXv1j7xEQOeK8NcZYMxG', -- 'password123'
                  true,
                  NOW(),
                  NOW()
                )
                ON CONFLICT (email) DO NOTHING
              `);
              
              return true;
            } finally {
              client.release();
            }
          } catch (err) {
            console.error('Database reset failed:', err);
            return false;
          }
        },
        
        // Create test data for e2e tests
        async createTestData() {
          try {
            const client = await pool.connect();
            try {
              // Create test categories
              await client.query(`
                INSERT INTO categorias (nombre, tipo, color, icono, descripcion, user_id)
                VALUES 
                  ('Test Income', 'ingreso', '#4CAF50', 'attach_money', 'Test income category', '00000000-0000-0000-0000-000000000001'),
                  ('Test Expense', 'egreso', '#F44336', 'shopping_cart', 'Test expense category', '00000000-0000-0000-0000-000000000001')
                ON CONFLICT (nombre, COALESCE(user_id, '00000000-0000-0000-0000-000000000000'::UUID)) DO NOTHING
                RETURNING id
              `);
              
              return true;
            } finally {
              client.release();
            }
          } catch (err) {
            console.error('Creating test data failed:', err);
            return false;
          }
        },
        
        // Log a message to the console
        log(message) {
          console.log(message);
          return null;
        }
      });
      
      // Set up environment variables
      config.env = {
        ...config.env,
        apiUrl: process.env.API_URL || 'http://localhost:3000/api',
        testUserEmail: 'e2e-test@example.com',
        testUserPassword: 'password123',
      };
      
      return config;
    }
  },
});

