#!/usr/bin/env node

/**
 * Database Initialization Script
 * 
 * This script initializes the database by:
 * 1. Creating the database if it doesn't exist
 * 2. Running all migrations in order
 * 3. Seeding the database with initial data
 * 
 * Usage: 
 *   node scripts/init-db.js [options]
 * 
 * Options:
 *   --reset  Drop and recreate the database
 *   --seed   Include seed data
 *   --dev    Include development sample data
 *   --force  Force operations without confirmation
 */

const { Pool } = require('pg');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { seed } = require('./seed');
const { migrate: createCategoriasTable } = require('../migrations/create_categorias_table');

// Load environment variables
dotenv.config();

// Parse command line arguments
const args = process.argv.slice(2);
const shouldReset = args.includes('--reset');
const shouldSeed = args.includes('--seed');
const includeDev = args.includes('--dev');
const forceOperations = args.includes('--force');

// Extract database name from DATABASE_URL
function getDatabaseInfo() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL environment variable not found');
  }
  
  // Parse the URL - this is a simple implementation and may need enhancements
  // for complex connection strings
  let dbName, connString;
  
  try {
    const match = url.match(/\/([^?]+)(\?.*)?$/);
    dbName = match ? match[1] : null;
    
    // Connection string for postgres without specific database
    connString = url.replace(/\/([^?]+)(\?.*)?$/, '/postgres');
  } catch (error) {
    throw new Error(`Failed to parse DATABASE_URL: ${error.message}`);
  }
  
  return { dbName, connString };
}

/**
 * Create a readline interface for user input
 */
function createInterface() {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
}

/**
 * Prompt user for confirmation
 */
async function confirm(message) {
  if (forceOperations) return true;
  
  const rl = createInterface();
  
  return new Promise(resolve => {
    rl.question(`${message} (y/N): `, answer => {
      rl.close();
      resolve(answer.toLowerCase() === 'y');
    });
  });
}

/**
 * Create database if it doesn't exist
 */
async function createDatabase(dbInfo) {
  console.log('🔍 Checking database...');
  
  const { dbName, connString } = dbInfo;
  
  // Connect to postgres database to check/create our database
  const pool = new Pool({
    connectionString: connString,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });
  
  try {
    // Check if database exists
    const result = await pool.query(
      "SELECT 1 FROM pg_database WHERE datname = $1",
      [dbName]
    );
    
    if (result.rows.length === 0) {
      console.log(`📁 Database '${dbName}' does not exist. Creating...`);
      await pool.query(`CREATE DATABASE ${dbName}`);
      console.log(`✅ Database '${dbName}' created successfully`);
      return true;
    } else if (shouldReset) {
      if (!await confirm(`⚠️ WARNING: You are about to drop the '${dbName}' database. All data will be lost! Are you sure?`)) {
        console.log('❌ Database reset cancelled');
        process.exit(0);
      }
      
      // Terminate active connections first
      console.log(`🔄 Dropping database '${dbName}'...`);
      await pool.query(`
        SELECT pg_terminate_backend(pg_stat_activity.pid)
        FROM pg_stat_activity
        WHERE pg_stat_activity.datname = '${dbName}'
          AND pid <> pg_backend_pid();
      `);
      
      await pool.query(`DROP DATABASE ${dbName}`);
      await pool.query(`CREATE DATABASE ${dbName}`);
      console.log(`✅ Database '${dbName}' recreated successfully`);
      return true;
    } else {
      console.log(`✅ Database '${dbName}' already exists`);
      return false;
    }
  } finally {
    await pool.end();
  }
}

/**
 * Run migrations
 */
async function runMigrations() {
  console.log('\n🔄 Running migrations...');
  
  // For now, we only have one migration
  try {
    await createCategoriasTable();
    console.log('✅ Migrations completed successfully');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

/**
 * Seed the database
 */
async function seedDatabase() {
  if (!shouldSeed) {
    console.log('\n🌱 Skipping database seeding (use --seed to include)');
    return;
  }
  
  console.log('\n🌱 Seeding database...');
  
  try {
    const seedArgs = [];
    if (includeDev) seedArgs.push('--dev');
    if (forceOperations) seedArgs.push('--force');
    
    // Call the seed function directly rather than as a child process
    await seed();
    console.log('✅ Database seeded successfully');
  } catch (error) {
    console.error('❌ Database seeding failed:', error);
    throw error;
  }
}

/**
 * Main initialization function
 */
async function initializeDatabase() {
  try {
    console.log('\n🚀 Starting database initialization process\n');
    
    // Get database info
    const dbInfo = getDatabaseInfo();
    
    // Create database if necessary
    const dbCreated = await createDatabase(dbInfo);
    
    // Run migrations
    await runMigrations();
    
    // Seed database
    await seedDatabase();
    
    console.log('\n🎉 Database initialization completed successfully!\n');
    
    if (shouldSeed && includeDev) {
      console.log('📝 Demo user credentials:');
      console.log('   Email: demo@example.com');
      console.log('   Password: password123\n');
    }
    
    return dbCreated;
  } catch (error) {
    console.error('\n❌ Database initialization failed:', error);
    throw error;
  }
}

// Run the initialization if executed directly
if (require.main === module) {
  initializeDatabase()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = { initializeDatabase };

