#!/usr/bin/env node

/**
 * Money Flow - Project Setup Script
 * 
 * This script helps developers set up the Money Flow application
 * for both local development and AWS deployment.
 */

const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');
const readline = require('readline');
const util = require('util');
const os = require('os');

// Define colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

// Define emojis for better readability
const emoji = {
  success: '✅',
  error: '❌',
  warning: '⚠️',
  info: 'ℹ️',
  rocket: '🚀',
  gear: '⚙️',
  database: '🗄️',
  cloud: '☁️',
};

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Promisify readline question
const question = util.promisify(rl.question).bind(rl);

// Get the project root directory
const projectRoot = path.resolve(__dirname, '..');

/**
 * Main function to run the setup process
 */
async function main() {
  try {
    printBanner();
    
    await checkPrerequisites();
    
    const setupMode = await askSetupMode();
    
    if (setupMode === 'local' || setupMode === 'both') {
      await setupLocalDevelopment();
    }
    
    if (setupMode === 'aws' || setupMode === 'both') {
      await setupAwsDeployment();
    }
    
    console.log(`\n${emoji.success} ${colors.green}${colors.bright}Setup completed successfully!${colors.reset}`);
    console.log(`\n${emoji.rocket} You can now start the application with: ${colors.cyan}npm run dev${colors.reset}`);
    
    if (setupMode === 'aws' || setupMode === 'both') {
      console.log(`\n${emoji.cloud} To deploy to AWS, run: ${colors.cyan}copilot deploy${colors.reset}`);
    }
    
    rl.close();
  } catch (error) {
    console.error(`\n${emoji.error} ${colors.red}Setup failed: ${error.message}${colors.reset}`);
    process.exit(1);
  }
}

/**
 * Print the application banner
 */
function printBanner() {
  console.log('\n');
  console.log(`${colors.cyan}${colors.bright}==============================================${colors.reset}`);
  console.log(`${colors.cyan}${colors.bright}       MONEY FLOW - SETUP SCRIPT             ${colors.reset}`);
  console.log(`${colors.cyan}${colors.bright}==============================================${colors.reset}`);
  console.log('\n');
  console.log(`This script will help you set up the Money Flow application`);
  console.log(`for both local development and AWS deployment.`);
  console.log('\n');
}

/**
 * Ask user for setup mode
 */
async function askSetupMode() {
  const response = await question(`${emoji.info} ${colors.bright}Select setup mode:${colors.reset}
  1) ${colors.cyan}Local development only${colors.reset}
  2) ${colors.yellow}AWS deployment only${colors.reset}
  3) ${colors.green}Both local and AWS${colors.reset}
  
Choose an option (1-3): `);
  
  switch (response.trim()) {
    case '1':
      return 'local';
    case '2':
      return 'aws';
    case '3':
      return 'both';
    default:
      console.log(`${emoji.warning} ${colors.yellow}Invalid option. Please choose 1, 2, or 3.${colors.reset}`);
      return askSetupMode();
  }
}

/**
 * Check if all prerequisites are installed
 */
async function checkPrerequisites() {
  console.log(`\n${emoji.info} ${colors.bright}Checking prerequisites...${colors.reset}`);
  
  // Check Node.js version
  try {
    const nodeVersion = execSync('node --version').toString().trim();
    const versionMatch = nodeVersion.match(/v(\d+)\./);
    const majorVersion = versionMatch ? parseInt(versionMatch[1]) : 0;
    
    if (majorVersion < 16) {
      throw new Error(`Node.js v16 or higher is required. Found: ${nodeVersion}`);
    }
    
    console.log(`${emoji.success} Node.js ${nodeVersion} - OK`);
  } catch (error) {
    if (error.message.includes('command not found')) {
      throw new Error('Node.js is not installed. Please install Node.js v16 or higher.');
    }
    throw error;
  }
  
  // Check npm version
  try {
    const npmVersion = execSync('npm --version').toString().trim();
    console.log(`${emoji.success} npm ${npmVersion} - OK`);
  } catch (error) {
    throw new Error('npm is not installed correctly.');
  }
  
  // Check Docker (optional but recommended)
  try {
    const dockerVersion = execSync('docker --version').toString().trim();
    console.log(`${emoji.success} ${dockerVersion} - OK`);
  } catch (error) {
    console.log(`${emoji.warning} ${colors.yellow}Docker is not installed. It's recommended for containerized development.${colors.reset}`);
  }
  
  // Check PostgreSQL
  try {
    const pgVersion = execSync('psql --version').toString().trim();
    console.log(`${emoji.success} ${pgVersion} - OK`);
  } catch (error) {
    console.log(`${emoji.warning} ${colors.yellow}PostgreSQL is not installed or not in PATH. You'll need it for local database.${colors.reset}`);
  }
  
  // Check AWS CLI (only needed for AWS deployment)
  try {
    const awsVersion = execSync('aws --version').toString().trim();
    console.log(`${emoji.success} ${awsVersion} - OK`);
  } catch (error) {
    console.log(`${emoji.warning} ${colors.yellow}AWS CLI is not installed. It's required for AWS deployment.${colors.reset}`);
  }
  
  // Check AWS Copilot (only needed for AWS deployment)
  try {
    const copilotVersion = execSync('copilot --version').toString().trim();
    console.log(`${emoji.success} AWS Copilot ${copilotVersion} - OK`);
  } catch (error) {
    console.log(`${emoji.warning} ${colors.yellow}AWS Copilot is not installed. It's required for AWS deployment.${colors.reset}`);
  }
  
  console.log(`${emoji.success} ${colors.green}Prerequisites check completed${colors.reset}\n`);
}

/**
 * Set up local development environment
 */
async function setupLocalDevelopment() {
  console.log(`\n${emoji.gear} ${colors.bright}Setting up local development environment...${colors.reset}`);
  
  // Install dependencies
  await installDependencies();
  
  // Set up environment variables
  await setupEnvironmentVariables();
  
  // Set up database
  await setupDatabase();
  
  console.log(`${emoji.success} ${colors.green}Local development environment set up successfully${colors.reset}\n`);
}

/**
 * Install project dependencies
 */
async function installDependencies() {
  console.log(`\n${emoji.info} ${colors.bright}Installing dependencies...${colors.reset}`);
  
  try {
    execSync('npm install', { stdio: 'inherit', cwd: projectRoot });
    console.log(`${emoji.success} ${colors.green}Dependencies installed successfully${colors.reset}`);
  } catch (error) {
    throw new Error(`Failed to install dependencies: ${error.message}`);
  }
}

/**
 * Set up environment variables
 */
async function setupEnvironmentVariables() {
  console.log(`\n${emoji.info} ${colors.bright}Setting up environment variables...${colors.reset}`);
  
  const envExamplePath = path.join(projectRoot, '.env.example');
  const envPath = path.join(projectRoot, '.env');
  
  // Check if .env.example exists
  if (!fs.existsSync(envExamplePath)) {
    throw new Error('.env.example file not found');
  }
  
  // Check if .env already exists
  if (fs.existsSync(envPath)) {
    const overwrite = await question(`${emoji.warning} ${colors.yellow}A .env file already exists. Overwrite? (y/n): ${colors.reset}`);
    
    if (overwrite.toLowerCase() !== 'y') {
      console.log(`${emoji.info} Keeping existing .env file`);
      return;
    }
  }
  
  // Copy .env.example to .env
  fs.copyFileSync(envExamplePath, envPath);
  
  // Ask for database configuration
  const dbHost = await question(`${emoji.database} Database host (default: localhost): `) || 'localhost';
  const dbPort = await question(`${emoji.database} Database port (default: 5432): `) || '5432';
  const dbName = await question(`${emoji.database} Database name (default: money_flow): `) || 'money_flow';
  const dbUser = await question(`${emoji.database} Database user (default: postgres): `) || 'postgres';
  const dbPassword = await question(`${emoji.database} Database password: `);
  
  // Update .env file with user input
  let envContent = fs.readFileSync(envPath, 'utf8');
  envContent = envContent
    .replace(/DB_HOST=.*/g, `DB_HOST=${dbHost}`)
    .replace(/DB_PORT=.*/g, `DB_PORT=${dbPort}`)
    .replace(/DB_NAME=.*/g, `DB_NAME=${dbName}`)
    .replace(/DB_USER=.*/g, `DB_USER=${dbUser}`)
    .replace(/DB_PASSWORD=.*/g, `DB_PASSWORD=${dbPassword}`);
  
  fs.writeFileSync(envPath, envContent);
  
  console.log(`${emoji.success} ${colors.green}Environment variables configured${colors.reset}`);
}

/**
 * Set up database
 */
async function setupDatabase() {
  console.log(`\n${emoji.database} ${colors.bright}Setting up database...${colors.reset}`);
  
  // Read the .env file to get database configuration
  const envPath = path.join(projectRoot, '.env');
  const envContent = fs.readFileSync(envPath, 'utf8');
  
  const dbNameMatch = envContent.match(/DB_NAME=(.+)/);
  const dbName = dbNameMatch ? dbNameMatch[1].trim() : 'money_flow';
  
  // Ask if user wants to create the database
  const createDb = await question(`${emoji.info} Create database '${dbName}'? (y/n): `);
  
  if (createDb.toLowerCase() === 'y') {
    try {
      execSync(`createdb ${dbName}`, { stdio: 'inherit' });
      console.log(`${emoji.success} ${colors.green}Database '${dbName}' created${colors.reset}`);
    } catch (error) {
      console.log(`${emoji.warning} ${colors.yellow}Failed to create database: ${error.message}${colors.reset}`);
      console.log(`${emoji.info} You may need to create the database manually: createdb ${dbName}`);
    }
  }
  
  // Ask if user wants to run migrations
  const runMigrations = await question(`${emoji.info} Run database migrations? (y/n): `);
  
  if (runMigrations.toLowerCase() === 'y') {
    try {
      console.log(`${emoji.info} Running migrations...`);
      
      // Check if db:migrate script exists in package.json
      const packageJsonPath = path.join(projectRoot, 'package.json');
      const packageJson = require(packageJsonPath);
      
      if (packageJson.scripts && packageJson.scripts['db:migrate']) {
        execSync('npm run db:migrate', { stdio: 'inherit', cwd: projectRoot });
      } else {
        console.log(`${emoji.warning} ${colors.yellow}db:migrate script not found in package.json${colors.reset}`);
      }
      
      console.log(`${emoji.success} ${colors.green}Migrations completed${colors.reset}`);
    } catch (error) {
      console.log(`${emoji.warning} ${colors.yellow}Failed to run migrations: ${error.message}${colors.reset}`);
    }
  }
  
  // Ask if user wants to seed the database
  const seedDb = await question(`${emoji.info} Seed the database with initial data? (y/n): `);
  
  if (seedDb.toLowerCase() === 'y') {
    try {
      console.log(`${emoji.info} Seeding database...`);
      
      // Check if db:seed script exists in package.json
      const packageJsonPath = path.join(projectRoot, 'package.json');
      const packageJson = require(packageJsonPath);
      
      if (packageJson.scripts && packageJson.scripts['db:seed']) {
        execSync('npm run db:seed', { stdio: 'inherit', cwd: projectRoot });
      } else {
        console.log(`${emoji.warning} ${colors.yellow}db:seed script not found in package.json${colors.reset}`);
      }
      
      console.log(`${emoji.success} ${colors.green}Database seeded${colors.reset}`);
    } catch (error) {
      console.log(`${emoji.warning} ${colors.yellow}Failed to seed database: ${error.message}${colors.reset}`);
    }
  }
}

/**
 * Set up AWS deployment environment
 */
async function setupAwsDeployment() {
  console.log(`\n${emoji.cloud} ${colors.bright}Setting up AWS deployment environment...${colors.reset}`);
  
  // Check if AWS CLI is installed
  try {
    execSync('aws --version');
  } catch (error) {
    throw new Error('AWS CLI is not installed. Please install it to continue with AWS deployment.');
  }
  
  // Check if AWS Copilot is installed
  try {
    execSync('copilot --version');
  } catch (error) {
    throw new Error('AWS Copilot is not installed. Please install it to continue with AWS deployment.');
  }
  
  // Set up AWS credentials
  await setupAwsCredentials();
  
  // Initialize Copilot
  await initializeCopilot();
  
  console.log(`${emoji.success} ${colors.green}AWS deployment environment set up successfully${colors.reset}\n`);
}

/**
 * Set up AWS credentials
 */
async function setupAwsCredentials() {
  console.log(`\n${emoji.info} ${colors.bright}Setting up AWS credentials...${colors.reset}`);
  
  const hasCredentials = await checkAwsCredentials();
  
  if (hasCredentials) {
    const useExisting = await question(`${emoji.info} AWS credentials already exist. Use existing credentials? (y/n): `);
    if (useExisting.toLowerCase() === 'y') {
      console.log(`${emoji.success} Using existing AWS credentials`);
      return;
    }
  }
  
  console.log(`\n${emoji.info} ${colors.bright}Please enter your AWS credentials:${colors.reset}`);
  
  const awsAccessKeyId = await question(`${emoji.cloud} AWS Access Key ID: `);
  const awsSecretAccessKey = await question(`${emoji.cloud} AWS Secret Access Key: `);
  const defaultRegion = await question(`${emoji.cloud} Default region (default: us-east-1): `) || 'us-east-1';
  const outputFormat = await question(`${emoji.cloud} Output format (default: json): `) || 'json';
  
  try {
    // Create AWS credentials directory if it doesn't exist
    const awsDir = path.join(os.homedir(), '.aws');
    if (!fs.existsSync(awsDir)) {
      fs.mkdirSync(awsDir);
    }
    
    // Write AWS credentials file
    const credentialsPath = path.join(awsDir, 'credentials');
    const credentialsContent = `[default]
aws_access_key_id = ${awsAccessKeyId}
aws_secret_access_key = ${awsSecretAccessKey}
`;
    fs.writeFileSync(credentialsPath, credentialsContent);
    
    // Write AWS config file
    const configPath = path.join(awsDir, 'config');
    const configContent = `[default]
region = ${defaultRegion}
output = ${outputFormat}
`;
    fs.writeFileSync(configPath, configContent);
    
    console.log(`${emoji.success} ${colors.green}AWS credentials configured${colors.reset}`);
    
    // Verify credentials
    execSync('aws sts get-caller-identity', { stdio: 'inherit' });
    console.log(`${emoji.success} ${colors.green}AWS credentials verified${colors.reset}`);
  } catch (error) {
    throw new Error(`Failed to configure AWS credentials: ${error.message}`);
  }
}

/**
 * Check if AWS credentials already exist
 */
async function checkAwsCredentials() {
  try {
    const awsDir = path.join(os.homedir(), '.aws');
    const credentialsPath = path.join(awsDir, 'credentials');
    
    return fs.existsSync(credentialsPath);
  } catch (error) {
    return false;
  }
}

/**
 * Initialize AWS Copilot
 */
async function initializeCopilot() {
  console.log(`\n${emoji.info} ${colors.bright}Initializing AWS Copilot...${colors.reset}`);
  
  // Check if Copilot is already initialized
  const copilotDirPath = path.join(projectRoot, 'copilot');
  
  if (fs.existsSync(copilotDirPath)) {
    const useExisting = await question(`${emoji.info} Copilot is already initialized. Use existing configuration? (y/n): `);
    if (useExisting.toLowerCase() === 'y') {
      console.log(`${emoji.success} Using existing Copilot configuration`);
      return;
    }
  }
  
  // Ask for application configuration
  const appName = await question(`${emoji.cloud} Application name (default: money-flow): `) || 'money-flow';
  const envName = await question(`${emoji.cloud} Environment name (default: prod): `) || 'prod';
  const serviceName = await question(`${emoji.cloud} Service name (default: web): `) || 'web';
  
  try {
    // Initialize Copilot application
    console.log(`${emoji.info} Initializing Copilot application...`);
    
    // We'll provide commands for manual execution since Copilot is interactive
    console.log(`\n${emoji.info} ${colors.bright}Please run the following commands manually:${colors.reset}`);
    console.log(`\n${colors.cyan}1. Initialize Copilot application:${colors.reset}`);
    console.log(`   ${colors.green}copilot init --app ${appName} --service ${serviceName} --type "Load Balanced Web Service" --dockerfile "./Dockerfile" --port 3000${colors.reset}`);
    
    console.log(`\n${colors.cyan}2. Initialize environment:${colors.reset}`);
    console.log(`   ${colors.green}copilot env init --name ${envName} --profile default --app ${appName}${colors.reset}`);
    
    console.log(`\n${colors.cyan}3. Deploy the application:${colors.reset}`);
    console.log(`   ${colors.green}copilot deploy${colors.reset}`);
    
    // Create AWS Parameter Store parameters for secrets
    console.log(`\n${emoji.info} ${colors.bright}You need to create the following AWS Parameter Store parameters:${colors.reset}`);
    console.log(`   ${colors.yellow}* /moneyflow/prod/DB_PASSWORD${colors.reset}`);
    console.log(`   ${colors.yellow}* /moneyflow/prod/NEXTAUTH_SECRET${colors.reset}`);
    console.log(`   ${colors.yellow}* /moneyflow/prod/JWT_SECRET${colors.reset}`);
    
    console.log(`\n${emoji.info} ${colors.bright}You can create them using the AWS CLI:${colors.reset}`);
    console.log(`   ${colors.green}aws ssm put-parameter --name "/moneyflow/prod/DB_PASSWORD" --value "your-secure-password" --type SecureString${colors.reset}`);
    console.log(`   ${colors.green}aws ssm put-parameter --name "/moneyflow/prod/NEXTAUTH_SECRET" --value "your-nextauth-secret" --type SecureString${colors.reset}`);
    console.log(`   ${colors.green}aws ssm put-parameter --name "/moneyflow/prod/JWT_SECRET" --value "your-jwt-secret" --type SecureString${colors.reset}`);
  } catch (error) {
    throw new Error(`Failed to initialize Copilot: ${error.message}`);
  }
}

// Run the main function
main().catch((error) => {
  console.error(`\n${emoji.error} ${colors.red}Error: ${error.message}${colors.reset}`);
  process.exit(1);
});
