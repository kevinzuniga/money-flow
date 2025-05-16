/**
 * API Health Check Endpoint
 * 
 * Provides health status information about the API service, including:
 * - Database connection status
 * - System status
 * - Performance metrics
 * - Environment information
 */

import db from '../../lib/db';
import { registerRoutes, formatSuccess } from '../../lib/api/router';
import os from 'os';

/**
 * Calculate system uptime in a human-readable format
 * 
 * @returns {string} Human readable uptime
 */
function getReadableUptime() {
  const uptimeSec = os.uptime();
  const days = Math.floor(uptimeSec / (3600 * 24));
  const hours = Math.floor((uptimeSec % (3600 * 24)) / 3600);
  const minutes = Math.floor((uptimeSec % 3600) / 60);
  const seconds = Math.floor(uptimeSec % 60);
  
  return `${days}d ${hours}h ${minutes}m ${seconds}s`;
}

/**
 * Get system resource usage metrics
 * 
 * @returns {Object} System metrics
 */
function getSystemMetrics() {
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;
  
  return {
    cpu: {
      cores: os.cpus().length,
      model: os.cpus()[0].model,
      load: os.loadavg()
    },
    memory: {
      total: Math.round(totalMem / (1024 * 1024)) + 'MB',
      free: Math.round(freeMem / (1024 * 1024)) + 'MB',
      used: Math.round(usedMem / (1024 * 1024)) + 'MB',
      usagePercentage: Math.round((usedMem / totalMem) * 100) + '%'
    },
    uptime: getReadableUptime(),
    platform: os.platform(),
    hostname: os.hostname(),
    nodeVersion: process.version
  };
}

/**
 * Handle GET request for health status
 * 
 * @param {Object} req - The request object
 * @param {Object} res - The response object
 */
async function getHealthStatus(req, res) {
  const startTime = process.hrtime();
  
  // Check database connection
  let dbStatus = 'ok';
  let dbResponseTime = 0;
  
  try {
    const dbStartTime = process.hrtime();
    await db.query('SELECT 1');
    const dbTimeDiff = process.hrtime(dbStartTime);
    dbResponseTime = (dbTimeDiff[0] * 1e9 + dbTimeDiff[1]) / 1e6; // Convert to ms
  } catch (error) {
    dbStatus = 'error';
    console.error('Database health check failed:', error);
  }
  
  // Calculate API response time
  const timeDiff = process.hrtime(startTime);
  const responseTime = (timeDiff[0] * 1e9 + timeDiff[1]) / 1e6; // Convert to ms
  
  // Get version information
  const appVersion = process.env.npm_package_version || '1.0.0';
  
  // Compile health information
  const healthInfo = {
    status: dbStatus === 'ok' ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    version: appVersion,
    environment: process.env.NODE_ENV || 'development',
    database: {
      status: dbStatus,
      responseTime: `${dbResponseTime.toFixed(2)}ms`
    },
    system: getSystemMetrics(),
    performance: {
      responseTime: `${responseTime.toFixed(2)}ms`
    }
  };
  
  return res.status(200).json(
    formatSuccess(
      healthInfo,
      'Health check completed'
    )
  );
}

// Register the health check route with minimal middleware
export default registerRoutes(
  {
    GET: getHealthStatus
  },
  {
    // No auth required for health checks
    auth: false,
    // Apply rate limiting to prevent abuse
    rateLimit: {
      maxRequests: 60,
      windowMs: 60 * 1000 // 1 minute
    }
  }
);

