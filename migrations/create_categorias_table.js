/**
 * Migration: Create Categories Table
 * 
 * This migration creates the 'categorias' table for storing income and expense categories.
 * It includes system default categories and user-defined custom categories.
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
    console.log('Starting migration: create_categorias_table');
    
    // Begin transaction
    await client.query('BEGIN');
    
    // Create the categories table
    await client.query(`
      CREATE TABLE IF NOT EXISTS categorias (
        id SERIAL PRIMARY KEY,
        nombre VARCHAR(50) NOT NULL,
        tipo VARCHAR(10) NOT NULL CHECK (tipo IN ('ingreso', 'egreso', 'ambos')),
        descripcion TEXT,
        color VARCHAR(20),
        icono VARCHAR(50),
        user_id UUID,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES usuarios(id) ON DELETE CASCADE
      );
    `);
    
    // Create indexes for performance
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_categorias_user_id ON categorias(user_id);
      CREATE INDEX IF NOT EXISTS idx_categorias_tipo ON categorias(tipo);
      CREATE UNIQUE INDEX IF NOT EXISTS idx_categorias_nombre_user_id 
        ON categorias(nombre, COALESCE(user_id, '00000000-0000-0000-0000-000000000000'::UUID));
    `);
    
    // Add a trigger for updated_at
    await client.query(`
      CREATE OR REPLACE FUNCTION update_modified_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
      
      DROP TRIGGER IF EXISTS set_timestamp ON categorias;
      
      CREATE TRIGGER set_timestamp
      BEFORE UPDATE ON categorias
      FOR EACH ROW
      EXECUTE FUNCTION update_modified_column();
    `);
    
    // Commit transaction
    await client.query('COMMIT');
    
    console.log('Migration completed successfully: create_categorias_table');
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

