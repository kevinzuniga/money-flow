#!/usr/bin/env node

/**
 * Money Flow - Cleanup Script
 * 
 * This script cleans up old database entries and log files
 * It can be run manually or as a scheduled task
 */

require('dotenv').config();
const path = require('path');
const fs = require('fs');
const { Pool } = require('pg');

// Create database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/money_flow',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Set the retention period (in days)
const LOG_RETENTION_DAYS = process.env.LOG_RETENTION_DAYS || 30;
const TEMP_DATA_RETENTION_DAYS = process.env.TEMP_DATA_RETENTION_DAYS || 7;

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  dryRun: args.includes('--dry-run'),
  logs: args.includes('--logs') || !args.includes('--no-logs'),
  tempData: args.includes('--temp-data') || !args.includes('--no-temp-data'),
  auditTrail: args.includes('--audit-trail')
};

// Main function
async function main() {
  console.log('🧹 Starting Money Flow cleanup process...');
  
  if (options.dryRun) {
    console.log('⚠️ DRY RUN MODE - No data will be deleted');
  }
  
  try {
    // Clean up logs
    if (options.logs) {
      await cleanupLogs();
    }
    
    // Clean up temporary database entries
    if (options.tempData) {
      await cleanupTempData();
    }
    
    // Create audit trail entry
    if (options.auditTrail) {
      await createAuditTrail();
    }
    
    console.log('✅ Cleanup completed successfully!');
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

/**
 * Clean up old log files
 */
async function cleanupLogs() {
  console.log('📄 Cleaning up log files...');
  
  // Calculate cutoff date
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - LOG_RETENTION_DAYS);
  
  // Get the logs directory
  const logsDir = path.join(__dirname, '..', 'logs');
  
  if (!fs.existsSync(logsDir)) {
    console.log('📁 Logs directory not found, skipping log cleanup');
    return;
  }
  
  // Read all files in the logs directory
  const files = fs.readdirSync(logsDir);
  
  let deletedCount = 0;
  let skippedCount = 0;
  
  for (const file of files) {
    const filePath = path.join(logsDir, file);
    const stats = fs.statSync(filePath);
    
    // Check if the file is older than the cutoff date
    if (stats.mtime < cutoffDate) {
      console.log(`🗑️ Deleting old log file: ${file}`);
      
      if (!options.dryRun) {
        fs.unlinkSync(filePath);
      }
      
      deletedCount++;
    } else {
      skippedCount++;
    }
  }
  
  console.log(`📊 Log cleanup summary: ${deletedCount} deleted, ${skippedCount} kept`);
}

/**
 * Clean up temporary database entries
 */
async function cleanupTempData() {
  console.log('🗃️ Cleaning up temporary database entries...');
  
  // Calculate cutoff date
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - TEMP_DATA_RETENTION_DAYS);
  const cutoffDateStr = cutoffDate.toISOString().split('T')[0];
  
  const client = await pool.connect();
  
  try {
    // Begin transaction
    await client.query('BEGIN');
    
    // Clean up old sessions (if exists)
    try {
      const sessionResult = await client.query(
        `DELETE FROM sessions WHERE last_accessed < $1 RETURNING id`,
        [cutoffDateStr]
      );
      console.log(`🗑️ Deleted ${sessionResult.rowCount} old sessions`);
    } catch (error) {
      // If the sessions table doesn't exist, just log and continue
      if (error.code === '42P01') { // undefined_table
        console.log('ℹ️ Sessions table not found, skipping session cleanup');
      } else {
        throw error;
      }
    }
    
    // Clean up password reset tokens (if exists)
    try {
      const tokenResult = await client.query(
        `DELETE FROM password_reset_tokens WHERE expires < $1 RETURNING id`,
        [new Date()]
      );
      console.log(`🗑️ Deleted ${tokenResult.rowCount} expired password reset tokens`);
    } catch (error) {
      // If the table doesn't exist, just log and continue
      if (error.code === '42P01') {
        console.log('ℹ️ Password reset tokens table not found, skipping token cleanup');
      } else {
        throw error;
      }
    }
    
    // Clean up soft-deleted items (if applicable)
    try {
      const softDeleteResult = await client.query(
        `UPDATE ingresos SET deleted_at = NULL WHERE deleted_at < $1 RETURNING id`,
        [cutoffDateStr]
      );
      console.log(`🗑️ Permanently deleted ${softDeleteResult.rowCount} soft-deleted income records`);
    } catch (error) {
      // If column doesn't exist, just log and continue
      if (error.code === '42703') { // undefined_column
        console.log('ℹ️ Soft delete column not found, skipping permanent deletion');
      } else {
        throw error;
      }
    }
    
    // Commit transaction if not in dry run mode
    if (!options.dryRun) {
      await client.query('COMMIT');
    } else {
      console.log('⚠️ DRY RUN - Rolling back transaction');
      await client.query('ROLLBACK');
    }
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Create an audit trail entry for this cleanup operation
 */
async function createAuditTrail() {
  console.log('📝 Creating audit trail entry...');
  
  if (options.dryRun) {
    console.log('⚠️ DRY RUN - Skipping audit trail creation');
    return;
  }
  
  try {
    await pool.query(
      `INSERT INTO audit_log (action, details, performed_by) 
       VALUES ($1, $2, $3)`,
      [
        'CLEANUP',
        JSON.stringify({
          logs: options.logs,
          tempData: options.tempData,
          logRetentionDays: LOG_RETENTION_DAYS,
          tempDataRetentionDays: TEMP_DATA_RETENTION_DAYS
        }),
        'system'
      ]
    );
    console.log('✅ Audit trail entry created');
  } catch (error) {
    // If the audit_log table doesn't exist, just log and continue
    if (error.code === '42P01') {
      console.log('ℹ️ Audit log table not found, skipping audit trail creation');
    } else {
      throw error;
    }
  }
}

// Run the main function
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

