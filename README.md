# Money Flow - Personal Finance Management Application

![Money Flow Logo](https://via.placeholder.com/200x60?text=Money+Flow)

A modern web application for managing personal finances, tracking income and expenses, generating financial reports, and analyzing spending patterns over time.

## ⚡ Quick Start

Get up and running with Money Flow quickly using our setup tools:

```bash
# Clone the repository
git clone https://github.com/yourusername/money-flow.git
cd money-flow

# Run the interactive setup script (recommended for first-time setup)
npm run setup

# OR use NPM scripts directly:
npm install                # Install dependencies
cp .env.example .env       # Set up environment variables
npm run db:init            # Initialize the database
npm run db:seed            # Seed with default categories
npm run db:seed:dev        # Seed with sample data for development
npm run dev                # Start the development server
```

### Development Workflow

```bash
# Start the development server
npm run dev

# Start the development server with database initialization
npm run dev:with-db

# Reset database, seed with sample data, and start server
npm run dev:clean

# Run linting
npm run lint

# Start with debugging enabled
npm run dev:debug
```

### Deployment to AWS

```bash
# Build and deploy the application to AWS
npm run deploy

# Initialize a new service in AWS
npm run deploy:init

# Initialize a new environment
npm run deploy:env

# Check deployment status
npm run deploy:status

# View logs
npm run deploy:logs

# Run database migrations in production
npm run deploy:db-migrate
```

### Available Scripts

All available scripts are defined in `package.json`. Some key scripts include:

```bash
# Database scripts
npm run db:init            # Initialize the database
npm run db:reset           # Reset the database (destructive)
npm run db:seed            # Seed with default categories
npm run db:seed:dev        # Seed with sample development data
npm run db:migrate         # Run migrations
npm run db:rollback        # Rollback migrations
npm run db:cleanup         # Clean up old data

# Development scripts
npm run dev                # Start development server
npm run build              # Build for production
npm run start              # Start production server
npm run lint               # Run linting

# Deployment scripts
npm run deploy             # Deploy to AWS
npm run deploy:status      # Check deployment status
npm run deploy:logs        # View deployment logs
```

For detailed setup instructions, see the [Local Development Setup](#-local-development-setup) section below.

## 📊 Features

- **User Authentication**: Secure login and registration system
- **Income Management**: Record and categorize income sources
- **Expense Tracking**: Log and categorize expenses
- **Financial Dashboard**: Get a quick overview of your financial status
- **Detailed Reports**: Generate comprehensive reports with charts and visualizations
- **Monthly Analysis**: Track spending patterns and trends over time
- **Responsive Design**: Works seamlessly on desktop and mobile devices
- **Data Export**: Export your financial data in various formats

## 🚀 Technology Stack

- **Frontend**: Next.js with React, Chakra UI, Recharts
- **Backend**: Node.js, Express.js
- **Database**: PostgreSQL
- **Authentication**: NextAuth.js with JWT
- **Deployment**: AWS (ECS, RDS, CloudFront)
- **Infrastructure**: Docker, AWS Copilot

## 🛠 Local Development Setup

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- PostgreSQL (v14 or higher)
- Docker (optional for containerized development)

### Installation Steps

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/money-flow.git
   cd money-flow
   ```

2. Install dependencies:
   ```bash
   npm install
   # or
   yarn install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env
   ```
   Edit the `.env` file with your local configuration.

4. Set up the database:
   ```bash
   # Initialize the database (creates if needed)
   npm run db:init

   # Seed with default categories
   npm run db:seed

   # Optional: Seed with sample development data
   npm run db:seed:dev
   ```

   Alternatively, for a clean development setup:
   ```bash
   # Reset DB, run migrations, and seed with sample data
   npm run db:reset
   ```

5. Start the development server:
   ```bash
   npm run dev
   # or
   yarn dev
   ```

6. Open your browser and navigate to http://localhost:3000

### Using Docker for Development

Alternatively, you can use Docker for development:

```bash
# Build and start the containers
docker-compose up -d

# Run migrations
docker-compose exec web npm run db:migrate

# Seed initial data (optional)
docker-compose exec web npm run db:seed
```

## ⚙️ Environment Configuration

The application requires several environment variables to be set. See `.env.example` for a complete list with descriptions.

### Key Environment Variables

- **Database Configuration**:
  - `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`

- **Authentication Settings**:
  - `JWT_SECRET`, `NEXTAUTH_URL`, `NEXTAUTH_SECRET`

- **API Configuration**:
  - `API_VERSION`, `API_PREFIX`, `API_TIMEOUT`

- **Application Settings**:
  - `PORT`, `NODE_ENV`, `DEFAULT_CURRENCY`

## 🗄️ Database Setup and Migration

### Initial Setup

1. Create a PostgreSQL database:
   ```bash
   createdb money_flow
   ```

2. Update the database connection details in your `.env` file.

### Running Migrations

```bash
# Run all pending migrations
npm run db:migrate

# Rollback the last migration
npm run db:rollback

# Create a new migration
npm run db:create-migration -- create_users_table
```

### Database Schema

The application uses the following main tables:

**usuarios (users)**
- `id`: UUID, primary key
- `nombre`: User's name
- `email`: User's email (unique)
- `password_hash`: Bcrypt hashed password
- `is_active`: Boolean indicating if user account is active
- `created_at`: Timestamp of creation
- `updated_at`: Timestamp of last update

**ingresos (income)**
- `id`: Serial, primary key
- `monto`: Decimal amount
- `descripcion`: Optional description
- `fecha`: Date of income
- `categoria`: Foreign key to categorias
- `user_id`: Foreign key to usuarios
- `created_at`: Timestamp of creation
- `updated_at`: Timestamp of last update

**egresos (expenses)**
- `id`: Serial, primary key
- `monto`: Decimal amount
- `descripcion`: Optional description
- `fecha`: Date of expense
- `categoria`: Foreign key to categorias
- `user_id`: Foreign key to usuarios
- `created_at`: Timestamp of creation
- `updated_at`: Timestamp of last update

**categorias (categories)**
- `id`: Serial, primary key
- `nombre`: Category name 
- `tipo`: Type (`ingreso`, `egreso`, or `ambos`)
- `descripcion`: Optional description
- `color`: Optional color code
- `icono`: Optional icon name
- `user_id`: Foreign key to usuarios (NULL for system categories)
- `created_at`: Timestamp of creation
- `updated_at`: Timestamp of last update

## 🌩️ AWS Deployment with Copilot

### Prerequisites

1. Install the AWS CLI:
   ```bash
   brew install awscli
   # or
   curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
   unzip awscliv2.zip
   sudo ./aws/install
   ```

2. Install AWS Copilot:
   ```bash
   brew install aws/tap/copilot-cli
   # or
   curl -Lo copilot https://github.com/aws/copilot-cli/releases/latest/download/copilot-linux
   chmod +x copilot
   sudo mv copilot /usr/local/bin/copilot
   ```

3. Configure AWS credentials:
   ```bash
   aws configure
   ```

### Deployment Steps

1. Initialize the application:
   ```bash
   copilot init
   ```
   Follow the prompts to set up your application.

2. Create a new environment:
   ```bash
   copilot env init
   ```
   Follow the prompts to set up your environment.

3. Deploy the application:
   ```bash
   copilot deploy
   ```

4. View the deployed application:
   ```bash
   copilot app show
   ```

### Deploying Database Resources

The RDS PostgreSQL instance is defined as an addon in `copilot/addons/rds.yml` and will be deployed automatically with the environment.

### Updating the Application

To update the deployed application:

```bash
# Make your changes and commit them
git add .
git commit -m "Update application"

# Deploy the changes
copilot deploy
```

## 📚 API Documentation

### API Endpoints

The API follows RESTful conventions and uses JWT for authentication.

#### Authentication

- `POST /api/auth/login`: User login
- `POST /api/auth/register`: User registration
- `GET /api/auth/me`: Get current user information
- `POST /api/auth/logout`: User logout

#### Income Management

- `GET /api/ingresos`: List income entries (supports pagination and filtering)
- `POST /api/ingresos`: Create a new income entry
- `GET /api/ingresos/{id}`: Get details of a specific income entry
- `PUT /api/ingresos/{id}`: Update an existing income entry
- `DELETE /api/ingresos/{id}`: Delete an income entry

#### Expense Management

- `GET /api/egresos`: List expense entries (supports pagination and filtering)
- `POST /api/egresos`: Create a new expense entry
- `GET /api/egresos/{id}`: Get details of a specific expense entry
- `PUT /api/egresos/{id}`: Update an existing expense entry
- `DELETE /api/egresos/{id}`: Delete an expense entry

#### Category Management

- `GET /api/categorias`: List categories (supports filtering by type)
- `POST /api/categorias`: Create a new category
- `GET /api/categorias/{id}`: Get details of a specific category
- `PUT /api/categorias/{id}`: Update an existing category
- `DELETE /api/categorias/{id}`: Delete a category

#### System Information

- `GET /api/health`: API health check status

### API Request/Response Format

All API responses follow a consistent format:

```json
{
  "success": true,
  "message": "Operation successful message",
  "data": { /* Response data */ }
}
```

For paginated results:

```json
{
  "success": true,
  "message": "Operation successful message",
  "data": [ /* Array of items */ ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "totalItems": 45,
    "totalPages": 5
  }
}
```

## 🔍 Troubleshooting

### Common Issues

#### Database Connection Issues

- Verify database credentials in `.env` file
- Ensure PostgreSQL service is running
- Check network connectivity and firewall settings
- Run `npm run db:init` to initialize the database
- Check the logs in the database initialization process

#### Database Migration Issues

- Ensure all migrations are in the correct order
- Check for any conflicts in migration files
- Try running `npm run db:reset` to reset the database (warning: destructive)
- Verify PostgreSQL version is compatible (v14+ recommended)

#### Deployment Issues

- Check AWS IAM permissions
- Verify VPC and subnet configurations
- Review CloudWatch logs for error messages
- Ensure RDS instance is properly configured
- Check security groups allow necessary traffic

#### Application Startup Problems

- Ensure all dependencies are installed
- Check for port conflicts
- Verify environment variables are set correctly
- Check for JavaScript syntax errors
- Review Next.js build errors

#### Authentication Issues

- Verify JWT secret is properly set
- Check token expiration settings
- Ensure cookies are properly configured
- Clear browser cache and cookies

### Logs and Debugging

- **Development**: Console logs and browser developer tools
- **Production**: AWS CloudWatch Logs
  ```bash
  copilot svc logs
  ```

## 🤝 Contributing

We welcome contributions to Money Flow! Here's how you can help:

### Contribution Guidelines

1. Fork the repository
2. Create a feature branch:
   ```bash
   git checkout -b feature/amazing-feature
   ```
3. Make your changes
4. Run linting and tests:
   ```bash
   npm run lint
   npm test
   ```
5. Commit your changes:
   ```bash
   git commit -m 'Add amazing feature'
   ```
6. Push to the branch:
   ```bash
   git push origin feature/amazing-feature
   ```
7. Open a Pull Request

### Code Style and Standards

- Follow the ESLint configuration
- Write unit tests for new features
- Keep components small and focused
- Document API endpoints and functions

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📞 Support and Contact

For support or inquiries, please open an issue on the GitHub repository or contact the development team at support@moneyflow.example.com.

---

Made with ❤️ by the Money Flow Team

