#!/usr/bin/env node

/**
 * Database Seed Script
 * 
 * This script seeds the database with:
 * 1. Default system categories for income and expenses
 * 2. Sample data for development purposes
 * 
 * Usage: 
 *   node scripts/seed.js [--dev] [--force]
 * 
 * Options:
 *   --dev    Include development sample data
 *   --force  Drop existing data before seeding
 */

const { Pool } = require('pg');
const dotenv = require('dotenv');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');

// Load environment variables
dotenv.config();

// Parse command line arguments
const args = process.argv.slice(2);
const includeDev = args.includes('--dev');
const forceReset = args.includes('--force');

// Create database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Default system categories
const DEFAULT_CATEGORIES = {
  income: [
    { nombre: 'Salario', color: '#4CAF50', icono: 'work' },
    { nombre: 'Inversiones', color: '#2196F3', icono: 'trending_up' },
    { nombre: 'Freelance', color: '#9C27B0', icono: 'computer' },
    { nombre: 'Regalos', color: '#E91E63', icono: 'redeem' },
    { nombre: 'Reembolsos', color: '#FF9800', icono: 'sync' },
    { nombre: 'Otros ingresos', color: '#607D8B', icono: 'add_circle' }
  ],
  expense: [
    { nombre: 'Alimentación', color: '#F44336', icono: 'restaurant' },
    { nombre: 'Transporte', color: '#3F51B5', icono: 'directions_car' },
    { nombre: 'Vivienda', color: '#009688', icono: 'home' },
    { nombre: 'Servicios', color: '#FFC107', icono: 'power' },
    { nombre: 'Ocio', color: '#673AB7', icono: 'movie' },
    { nombre: 'Ropa', color: '#795548', icono: 'checkroom' },
    { nombre: 'Salud', color: '#8BC34A', icono: 'medical_services' },
    { nombre: 'Educación', color: '#03A9F4', icono: 'school' },
    { nombre: 'Impuestos', color: '#FF5722', icono: 'account_balance' },
    { nombre: 'Otros gastos', color: '#9E9E9E', icono: 'more_horiz' }
  ],
  common: [
    { nombre: 'Transferencias', color: '#00BCD4', icono: 'swap_horiz', tipo: 'ingreso' }
  ]
};

// Sample data for development
const SAMPLE_DATA = {
  users: [
    {
      nombre: 'Usuario Demo',
      email: 'demo@example.com',
      password: 'password123',  // This will be hashed before insertion
    }
  ],
  ingresos: [
    { categoria: 'Salario', monto: 2500, descripcion: 'Salario mensual', fecha: '2025-05-01' },
    { categoria: 'Inversiones', monto: 150, descripcion: 'Dividendos', fecha: '2025-05-10' },
    { categoria: 'Freelance', monto: 350, descripcion: 'Proyecto web', fecha: '2025-05-15' },
    { categoria: 'Salario', monto: 2500, descripcion: 'Salario mensual', fecha: '2025-04-01' },
    { categoria: 'Inversiones', monto: 120, descripcion: 'Dividendos', fecha: '2025-04-10' }
  ],
  egresos: [
    { categoria: 'Alimentación', monto: 350, descripcion: 'Supermercado', fecha: '2025-05-05' },
    { categoria: 'Transporte', monto: 120, descripcion: 'Gasolina', fecha: '2025-05-08' },
    { categoria: 'Vivienda', monto: 800, descripcion: 'Alquiler', fecha: '2025-05-01' },
    { categoria: 'Servicios', monto: 150, descripcion: 'Electricidad y agua', fecha: '2025-05-12' },
    { categoria: 'Ocio', monto: 80, descripcion: 'Cine', fecha: '2025-05-20' },
    { categoria: 'Alimentación', monto: 120, descripcion: 'Restaurante', fecha: '2025-05-18' },
    { categoria: 'Alimentación', monto: 330, descripcion: 'Supermercado', fecha: '2025-04-03' },
    { categoria: 'Transporte', monto: 100, descripcion: 'Gasolina', fecha: '2025-04-10' },
    { categoria: 'Vivienda', monto: 800, descripcion: 'Alquiler', fecha: '2025-04-01' },
    { categoria: 'Servicios', monto: 145, descripcion: 'Electricidad y agua', fecha: '2025-04-12' }
  ]
};

/**
 * Wraps process in a try-catch with formatting
 */
async function performStep(name, fn) {
  process.stdout.write(`${name}... `);
  try {
    await fn();
    process.stdout.write('✅\n');
  } catch (error) {
    process.stdout.write('❌\n');
    console.error(`Error in ${name}:`, error);
    throw error;
  }
}

/**
 * Main seed function
 */
async function seed() {
  const client = await pool.connect();
  
  try {
    console.log('\n📋 Starting database seeding process');
    
    // Begin transaction
    await client.query('BEGIN');
    
    // Reset data if --force flag is used
    if (forceReset) {
      await performStep('Cleaning existing data', async () => {
        await client.query('TRUNCATE TABLE ingresos CASCADE');
        await client.query('TRUNCATE TABLE egresos CASCADE');
        await client.query('TRUNCATE TABLE categorias CASCADE');
        if (includeDev) {
          await client.query('TRUNCATE TABLE users CASCADE');
        }
      });
    }
    
    // Seed default categories
    let categoryMap = {};
    
    await performStep('Creating default income categories', async () => {
      for (const cat of DEFAULT_CATEGORIES.income) {
        const result = await client.query(
          `INSERT INTO categorias 
           (nombre, color, icono, tipo, user_id)
           VALUES ($1, $2, $3, $4, NULL)
           ON CONFLICT (nombre, COALESCE(user_id, 0))
           DO UPDATE SET color = $2, icono = $3
           RETURNING id`,
          [cat.nombre, cat.color, cat.icono, 'ingreso']
        );
        categoryMap[cat.nombre] = result.rows[0].id;
      }
    });
    
    await performStep('Creating default expense categories', async () => {
      for (const cat of DEFAULT_CATEGORIES.expense) {
        const result = await client.query(
          `INSERT INTO categorias 
           (nombre, color, icono, tipo, user_id)
           VALUES ($1, $2, $3, $4, NULL)
           ON CONFLICT (nombre, COALESCE(user_id, 0))
           DO UPDATE SET color = $2, icono = $3
           RETURNING id`,
          [cat.nombre, cat.color, cat.icono, 'egreso']
        );
        categoryMap[cat.nombre] = result.rows[0].id;
      }
    });
    
    await performStep('Creating common categories', async () => {
      for (const cat of DEFAULT_CATEGORIES.common) {
        // Insert as income category
        const resultIncome = await client.query(
          `INSERT INTO categorias 
           (nombre, color, icono, tipo, user_id)
           VALUES ($1, $2, $3, $4, NULL)
           ON CONFLICT (nombre, COALESCE(user_id, 0))
           DO UPDATE SET color = $2, icono = $3
           RETURNING id`,
          [cat.nombre + ' (Ingreso)', cat.color, cat.icono, 'ingreso']
        );
        categoryMap[cat.nombre + '_ingreso'] = resultIncome.rows[0].id;

        // Insert as expense category
        const resultEgreso = await client.query(
          `INSERT INTO categorias 
           (nombre, color, icono, tipo, user_id)
           VALUES ($1, $2, $3, $4, NULL)
           ON CONFLICT (nombre, COALESCE(user_id, 0))
           DO UPDATE SET color = $2, icono = $3
           RETURNING id`,
          [cat.nombre + ' (Egreso)', cat.color, cat.icono, 'egreso']
        );
        categoryMap[cat.nombre + '_egreso'] = resultEgreso.rows[0].id;
        
        // Store the original name for backward compatibility
        categoryMap[cat.nombre] = resultIncome.rows[0].id;
      }
    });
    
    // Add sample data if --dev flag is used
    if (includeDev) {
      let demoUserId;
      
      await performStep('Creating demo user', async () => {
        const hashedPassword = await bcrypt.hash(SAMPLE_DATA.users[0].password, 10);
        const result = await client.query(
          `INSERT INTO users 
           (nombre, email, password_hash)
           VALUES ($1, $2, $3)
           ON CONFLICT (email) 
           DO UPDATE SET nombre = $1, password_hash = $3
           RETURNING id`,
          [SAMPLE_DATA.users[0].nombre, SAMPLE_DATA.users[0].email, hashedPassword]
        );
        demoUserId = result.rows[0].id;
      });
      
      await performStep('Creating sample income records', async () => {
        for (const income of SAMPLE_DATA.ingresos) {
          await client.query(
            `INSERT INTO ingresos 
             (monto, descripcion, fecha, categoria_id, user_id)
             VALUES ($1, $2, $3, $4, $5)`,
            [income.monto, income.descripcion, income.fecha, categoryMap[income.categoria], demoUserId]
          );
        }
      });
      
      await performStep('Creating sample expense records', async () => {
        for (const expense of SAMPLE_DATA.egresos) {
          await client.query(
            `INSERT INTO egresos 
             (monto, descripcion, fecha, categoria_id, user_id)
             VALUES ($1, $2, $3, $4, $5)`,
            [expense.monto, expense.descripcion, expense.fecha, categoryMap[expense.categoria], demoUserId]
          );
        }
      });
    }
    
    // Commit transaction
    await client.query('COMMIT');
    
    console.log('🎉 Database seeding completed successfully!\n');
    
    if (includeDev) {
      console.log('📝 Demo user credentials:');
      console.log('   Email: demo@example.com');
      console.log('   Password: password123\n');
    }
    
  } catch (error) {
    // Rollback transaction on error
    await client.query('ROLLBACK');
    console.error('\n❌ Database seeding failed:', error);
    throw error;
  } finally {
    // Release client
    client.release();
  }
}

// Run the seed function if executed directly
if (require.main === module) {
  seed()
    .then(() => {
      console.log('Seed script completed');
      process.exit(0);
    })
    .catch(error => {
      console.error('Seed script failed:', error);
      process.exit(1);
    });
}

module.exports = { seed };

