/**
 * Migration: Create Indices for Categories Table
 * 
 * This migration adds indices to the 'categorias' table for better performance.
 * It assumes the table was already created in the initial schema.
 */

const { Pool } = require('pg');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Create database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function migrate() {
  const client = await pool.connect();
  
  try {
    console.log('Starting migration: create_categorias_indices');
    
    // Begin transaction
    await client.query('BEGIN');
    
    // Create indexes for performance
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_categorias_user_id ON categorias(user_id);
      CREATE INDEX IF NOT EXISTS idx_categorias_tipo ON categorias(tipo);
      CREATE UNIQUE INDEX IF NOT EXISTS idx_categorias_nombre_user_id 
        ON categorias(nombre, COALESCE(user_id, 0));
    `);
    
    // Create or replace the trigger function
    await client.query(`
      CREATE OR REPLACE FUNCTION update_modified_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);
    
    // Drop the trigger if it exists and create it again
    await client.query(`
      DROP TRIGGER IF EXISTS set_timestamp ON categorias;
      CREATE TRIGGER set_timestamp
        BEFORE UPDATE ON categorias
        FOR EACH ROW
        EXECUTE FUNCTION update_modified_column();
    `);
    
    // Commit transaction
    await client.query('COMMIT');
    
    console.log('Migration completed successfully: create_categorias_indices');
  } catch (error) {
    // Rollback transaction on error
    await client.query('ROLLBACK');
    console.error('Migration failed:', error);
    throw error;
  } finally {
    // Release client
    client.release();
  }
}

// Run migration if executed directly
if (require.main === module) {
  migrate()
    .then(() => {
      console.log('Migration script completed');
      process.exit(0);
    })
    .catch(error => {
      console.error('Migration script failed:', error);
      process.exit(1);
    });
}

module.exports = { migrate };

