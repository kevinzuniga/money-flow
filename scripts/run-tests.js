#!/usr/bin/env node

/**
 * Comprehensive Test Runner Script
 * 
 * This script automates the process of running tests in a proper environment:
 * 1. Sets up the test environment variables
 * 2. Initializes and seeds the test database
 * 3. Runs different test suites in sequence
 * 4. Generates test reports
 * 5. Cleans up resources
 * 
 * Usage:
 *   node scripts/run-tests.js [options]
 * 
 * Options:
 *   --unit       Run unit tests only
 *   --api        Run API tests only
 *   --db         Run database tests only
 *   --e2e        Run end-to-end tests only
 *   --all        Run all test suites (default)
 *   --no-setup   Skip database setup
 *   --no-report  Skip report generation
 *   --verbose    Show detailed output
 *   --help       Show this help message
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const readline = require('readline');

// Command-line arguments
const args = process.argv.slice(2);
const options = {
  unit: args.includes('--unit'),
  api: args.includes('--api'),
  db: args.includes('--db'),
  e2e: args.includes('--e2e'),
  all: args.includes('--all') || (!args.includes('--unit') && !args.includes('--api') && 
        !args.includes('--db') && !args.includes('--e2e')),
  setup: !args.includes('--no-setup'),
  report: !args.includes('--no-report'),
  verbose: args.includes('--verbose'),
  help: args.includes('--help')
};

// Show help if requested
if (options.help) {
  console.log(`
Comprehensive Test Runner

Usage:
  node scripts/run-tests.js [options]

Options:
  --unit       Run unit tests only
  --api        Run API tests only
  --db         Run database tests only
  --e2e        Run end-to-end tests only
  --all        Run all test suites (default)
  --no-setup   Skip database setup
  --no-report  Skip report generation
  --verbose    Show detailed output
  --help       Show this help message

Examples:
  node scripts/run-tests.js --all          Run all test suites
  node scripts/run-tests.js --unit --api    Run unit and API tests
  node scripts/run-tests.js --e2e --verbose Run E2E tests with detailed output
  `);
  process.exit(0);
}

// Path constants
const PROJECT_ROOT = path.resolve(__dirname, '..');
const ENV_FILE = path.join(PROJECT_ROOT, '.env.test');
const COVERAGE_DIR = path.join(PROJECT_ROOT, 'coverage');
const REPORT_DIR = path.join(PROJECT_ROOT, 'test-reports');

// Ensure required directories exist
if (!fs.existsSync(COVERAGE_DIR)) {
  fs.mkdirSync(COVERAGE_DIR, { recursive: true });
}

if (!fs.existsSync(REPORT_DIR)) {
  fs.mkdirSync(REPORT_DIR, { recursive: true });
}

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

// Server process for E2E tests
let serverProcess = null;

/**
 * Log a message with color
 */
function log(message, color = '') {
  console.log(`${color}${message}${colors.reset}`);
}

/**
 * Log a section header
 */
function logSection(title) {
  console.log('\n' + '='.repeat(80));
  console.log(`${colors.bright}${colors.cyan}${title}${colors.reset}`);
  console.log('='.repeat(80));
}

/**
 * Run a command and return its output
 */
function runCommand(command, options = {}) {
  const { silent = false, env = process.env } = options;
  
  try {
    if (!silent) {
      log(`Running: ${colors.dim}${command}${colors.reset}`);
    }
    
    return execSync(command, { 
      cwd: PROJECT_ROOT, 
      stdio: silent ? 'pipe' : 'inherit',
      env: { ...process.env, ...env }
    });
  } catch (error) {
    if (!silent) {
      log(`Command failed: ${error.message}`, colors.red);
    }
    throw error;
  }
}

/**
 * Start the application server for E2E tests
 */
function startServer() {
  const env = {
    NODE_ENV: 'test',
    PORT: 3000,
    ...loadEnvFile()
  };

  log('Starting server for E2E tests...', colors.cyan);
  
  serverProcess = spawn('npm', ['start'], {
    cwd: PROJECT_ROOT,
    stdio: 'pipe',
    env: { ...process.env, ...env },
    detached: true
  });
  
  // Log server output if verbose
  if (options.verbose) {
    serverProcess.stdout.on('data', (data) => {
      process.stdout.write(`${colors.dim}[Server] ${data}${colors.reset}`);
    });
    
    serverProcess.stderr.on('data', (data) => {
      process.stderr.write(`${colors.red}[Server Error] ${data}${colors.reset}`);
    });
  }
  
  // Wait for the server to start
  return new Promise((resolve, reject) => {
    let started = false;
    
    const checkServer = () => {
      try {
        const response = execSync('curl -s http://localhost:3000/api/health', {
          stdio: 'pipe'
        });
        
        if (response && !started) {
          log('Server started successfully', colors.green);
          started = true;
          resolve();
        }
      } catch (error) {
        // Server not ready yet
      }
    };
    
    // Check server every 1 second
    const interval = setInterval(checkServer, 1000);
    
    // Set a timeout of 30 seconds
    const timeout = setTimeout(() => {
      clearInterval(interval);
      if (!started) {
        reject(new Error('Server failed to start within 30 seconds'));
      }
    }, 30000);
    
    // Initial check
    checkServer();
    
    // Also resolve if the server logs indicate it's ready
    serverProcess.stdout.on('data', (data) => {
      if (data.toString().includes('ready') && !started) {
        clearInterval(interval);
        clearTimeout(timeout);
        log('Server started successfully', colors.green);
        started = true;
        resolve();
      }
    });
    
    // Handle server crash
    serverProcess.on('error', (error) => {
      clearInterval(interval);
      clearTimeout(timeout);
      reject(error);
    });
    
    serverProcess.on('exit', (code) => {
      if (code !== null && code !== 0 && !started) {
        clearInterval(interval);
        clearTimeout(timeout);
        reject(new Error(`Server exited with code ${code}`));
      }
    });
  });
}

/**
 * Stop the application server
 */
function stopServer() {
  if (serverProcess) {
    log('Stopping server...', colors.cyan);
    
    // Kill process group
    if (process.platform === 'win32') {
      execSync(`taskkill /pid ${serverProcess.pid} /T /F`);
    } else {
      process.kill(-serverProcess.pid, 'SIGINT');
    }
    
    serverProcess = null;
    log('Server stopped', colors.green);
  }
}

/**
 * Load environment variables from .env.test file
 */
function loadEnvFile() {
  if (fs.existsSync(ENV_FILE)) {
    return dotenv.parse(fs.readFileSync(ENV_FILE));
  }
  return {};
}

/**
 * Create or update the .env.test file
 */
function setupEnvironment() {
  logSection('Setting up test environment');
  
  // Create .env.test file if it doesn't exist
  if (!fs.existsSync(ENV_FILE)) {
    log('Creating .env.test file...', colors.cyan);
    
    // Check if .env.example exists
    const exampleEnvFile = path.join(PROJECT_ROOT, '.env.example');
    if (fs.existsSync(exampleEnvFile)) {
      // Copy from example
      fs.copyFileSync(exampleEnvFile, ENV_FILE);
    } else {
      // Create empty file
      fs.writeFileSync(ENV_FILE, '');
    }
  }
  
  // Update with test configurations
  const env = loadEnvFile();
  
  // Set test-specific values
  const testEnv = {
    NODE_ENV: 'test',
    DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/money_flow_test',
    JWT_SECRET: 'test-jwt-secret',
    NEXTAUTH_SECRET: 'test-nextauth-secret',
    ...env
  };
  
  // Write updated env file
  const envContent = Object.entries(testEnv)
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');
  
  fs.writeFileSync(ENV_FILE, envContent);
  
  log('Test environment configured successfully', colors.green);
  
  return testEnv;
}

/**
 * Initialize the test database
 */
async function setupDatabase() {
  logSection('Setting up test database');
  
  try {
    log('Initializing test database...', colors.cyan);
    runCommand('npm run db:init', {
      env: {
        NODE_ENV: 'test',
        DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/money_flow_test'
      }
    });
    
    log('Seeding test database...', colors.cyan);
    runCommand('npm run db:seed', {
      env: {
        NODE_ENV: 'test',
        DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/money_flow_test'
      }
    });
    
    log('Database setup completed successfully', colors.green);
  } catch (error) {
    log('Database setup failed!', colors.red);
    log(`Error: ${error.message}`, colors.red);
    process.exit(1);
  }
}

/**
 * Run unit tests
 */
async function runUnitTests() {
  logSection('Running Unit Tests');
  
  try {
    runCommand('npm run test:unit', {
      env: { NODE_ENV: 'test' }
    });
    log('Unit tests completed successfully', colors.green);
    return true;
  } catch (error) {
    log('Unit tests failed!', colors.red);
    return false;
  }
}

/**
 * Run API tests
 */
async function runApiTests() {
  logSection('Running API Tests');
  
  try {
    runCommand('npm run test:api', {
      env: { 
        NODE_ENV: 'test',
        DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/money_flow_test'
      }
    });
    log('API tests completed successfully', colors.green);
    return true;
  } catch (error) {
    log('API tests failed!', colors.red);
    return false;
  }
}

/**
 * Run database tests
 */
async function runDatabaseTests() {
  logSection('Running Database Tests');
  
  try {
    runCommand('npm run test:db', {
      env: { 
        NODE_ENV: 'test',
        DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/money_flow_test'
      }
    });
    log('Database tests completed successfully', colors.green);
    return true;
  } catch (error) {
    log('Database tests failed!', colors.red);
    return false;
  }
}

/**
 * Run E2E tests
 */
async function runE2ETests() {
  logSection('Running End-to-End Tests');
  
  try {
    // Build the application first
    log('Building application for E2E tests...', colors.cyan);
    runCommand('npm run build', {
      env: { NODE_ENV: 'test' }
    });
    
    // Start the server
    await startServer();
    
    // Run Cypress tests
    log('Running Cypress tests...', colors.cyan);
    runCommand('npx cypress run', {
      env: { 
        NODE_ENV: 'test',
        CYPRESS_BASE_URL: 'http://localhost:3000',
        CYPRESS_API_URL: 'http://localhost:3000/api'
      }
    });
    
    log('E2E tests completed successfully', colors.green);
    return true;
  } catch (error) {
    log('E2E tests failed!', colors.red);
    log(`Error: ${error.message}`, colors.red);
    return false;
  } finally {
    // Stop the server
    stopServer();
  }
}

/**
 * Generate and display test reports
 */
async function generateReports() {
  logSection('Generating Test Reports');
  
  try {
    // Check if we have coverage data
    if (fs.existsSync(path.join(COVERAGE_DIR, 'coverage-final.json'))) {
      log('Generating coverage reports...', colors.cyan);
      runCommand('npx nyc report --reporter=html --reporter=text --report-dir=./test-reports/coverage');
    }
    
    // Check if we have Cypress results
    const cypressResultsDir = path.join(PROJECT_ROOT, 'cypress', 'results');
    if (fs.existsSync(cypressResultsDir)) {
      log('Generating Cypress reports...', colors.cyan);
      runCommand('npx mochawesome-merge cypress/results/*.json > test-reports/cypress-report.json');
      runCommand('npx marge test-reports/cypress-report.json -o test-reports/cypress -f cypress-report');
    }
    
    log('Report generation completed', colors.green);
    
    // Display summary
    log('\nTest Report Summary:', colors.bright + colors.cyan);
    log('-------------------', colors.cyan);
    
    // Check if unit test coverage exists
    const coverageFile = path.join(COVERAGE_DIR, 'coverage-summary.json');
    if (fs.existsSync(coverageFile)) {
      const coverage = JSON.parse(fs.readFileSync(coverageFile, 'utf8'));
      const total = coverage.total;
      
      log('\nCode Coverage:', colors.yellow);
      log(`  Statements : ${total.statements.pct}%`, total.statements.pct >= 80 ? colors.green : colors.red);
      log(`  Branches   : ${total.branches.pct

