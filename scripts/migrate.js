/**
 * Database Migration Script
 * 
 * This script handles database migrations using node-pg-migrate
 */

require('dotenv').config();
const { Pool } = require('pg');
const path = require('path');
const fs = require('fs').promises;

// Database configuration
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? {
        rejectUnauthorized: false
    } : false
});

// Migration table name
const MIGRATION_TABLE = 'migrations';

// Create migrations table if it doesn't exist
async function ensureMigrationTable() {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS ${MIGRATION_TABLE} (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
    `);
}

// Get list of applied migrations
async function getAppliedMigrations() {
    const result = await pool.query(`
        SELECT name FROM ${MIGRATION_TABLE} ORDER BY id;
    `);
    return result.rows.map(row => row.name);
}

// Apply a single migration
async function applyMigration(migrationPath, name) {
    console.log(`Applying migration: ${name}`);
    const sql = await fs.readFile(migrationPath, 'utf8');
    
    // Start transaction
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        await client.query(sql);
        await client.query(`
            INSERT INTO ${MIGRATION_TABLE} (name) VALUES ($1);
        `, [name]);
        await client.query('COMMIT');
        console.log(`Migration ${name} applied successfully`);
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}

// Main migration function
async function migrate() {
    console.log('Connecting to database...');
    
    try {
        // Ensure migrations table exists
        await ensureMigrationTable();
        console.log('Connected to database.');
        
        // Get applied migrations
        const appliedMigrations = await getAppliedMigrations();
        
        // Get all migration files
        const migrationsDir = path.join(__dirname, '..', 'migrations');
        const files = await fs.readdir(migrationsDir);
        const pendingMigrations = files
            .filter(f => f.endsWith('.sql'))
            .filter(f => !appliedMigrations.includes(f))
            .sort();
        
        console.log('Applying migrations...');
        
        // Apply pending migrations
        for (const migration of pendingMigrations) {
            await applyMigration(path.join(migrationsDir, migration), migration);
        }
        
        console.log('Migration completed successfully.');
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

// Run migrations
migrate();

