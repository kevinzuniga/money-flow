# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Money Flow is a personal finance management application built with Next.js (Pages Router), React, PostgreSQL, and Chakra UI. It allows users to track income and expenses, categorize transactions, and generate financial reports with visualizations.

**Key Technologies:**
- Next.js 15.3.2 with Pages Router (not App Router)
- React 18.2.0 with Chakra UI for styling
- PostgreSQL database with pg driver
- JWT authentication with httpOnly cookies
- AWS deployment via Copilot CLI
- Jest for testing, Cypress for E2E

## Essential Commands

### Development
```bash
npm run dev                # Start dev server on port 3000
npm run dev:with-db       # Initialize DB + start dev server
npm run dev:clean         # Reset DB, seed sample data, start dev
npm run dev:debug         # Start dev server with Node debugger
npm run build             # Build for production
npm run start             # Start production server
```

### Database Management
```bash
npm run db:init           # Initialize/create database
npm run db:migrate        # Run migrations
npm run db:rollback       # Rollback last migration
npm run db:seed           # Seed with default categories
npm run db:seed:dev       # Seed with sample development data
npm run db:reset          # Reset DB (destructive - drops all data)
npm run db:cleanup        # Clean up old data
npm run db:create-migration  # Create new migration file
```

### Testing
```bash
npm test                  # Run all tests
npm run test:watch        # Run tests in watch mode
npm run test:coverage     # Generate coverage report
npm run test:ci           # Run tests in CI mode
npm run test:api          # Run API tests only
npm run test:db           # Run database tests only
npm run test:unit         # Run unit tests only
npm run test:e2e          # Run Cypress E2E tests
npm run test:e2e:open     # Open Cypress UI
npm run test:smoke        # Run smoke tests in production
```

### Code Quality
```bash
npm run lint              # Run ESLint
npm run lint:fix          # Auto-fix linting issues
npm run format            # Format code with Prettier
```

### Deployment (AWS)
```bash
npm run deploy            # Run tests, build, deploy to AWS
npm run deploy:init       # Initialize Copilot service
npm run deploy:env        # Create new environment
npm run deploy:status     # Check deployment status
npm run deploy:logs       # View service logs
npm run deploy:db-migrate # Run migrations in production
```

## Architecture & Code Structure

### Routing (Pages Router)
- **Pages**: `/pages` directory - Next.js Pages Router (NOT App Router)
  - `_app.js` - App wrapper with ChakraProvider and AuthProvider
  - `index.js` - Dashboard/home page with financial summary
  - `login.js` - Login page
  - `ingresos.js` - Income management page
  - `egresos.js` - Expense management page
  - `reportes.js` - Reports and analytics page

- **API Routes**: `/pages/api`
  - `auth/` - Authentication endpoints (login, logout, me, register)
  - `ingresos/` - Income CRUD operations
  - `egresos/` - Expense CRUD operations
  - `categorias/` - Category management
  - `reportes/` - Report generation
  - `health.js` - Health check endpoint

### Core Libraries

#### Database (`/lib/db.js`)
- PostgreSQL connection pool with automatic retry
- Query logging for slow queries (>200ms)
- Transaction support via `transaction()` helper
- Error handling with query context

#### Authentication (`/lib/auth.js` & `/lib/middleware/auth.js`)
- JWT-based authentication with httpOnly cookies
- Token expiration: 8 hours
- Middleware: `authenticate()` - validates JWT and adds userId to request
- Role-based access control via `requireRoles()`
- Rate limiting and CSRF protection available

#### Auth Context (`/contexts/AuthContext.js`)
- Global auth state management with React Context
- Request deduplication to prevent duplicate auth checks
- Cache-busting for GET requests
- AbortController for cancelling pending requests
- Debounced auth checks (300ms) to prevent rapid calls
- Auto-refresh every 5 minutes

### Database Schema

**Tables:**
- `users` - User accounts (id, email, password_hash, nombre)
- `categorias` - Transaction categories (id, nombre, tipo, color, icono, user_id)
- `ingresos` - Income entries (id, monto, descripcion, fecha, categoria_id, user_id)
- `egresos` - Expense entries (id, monto, descripcion, fecha, categoria_id, user_id)

**Key Points:**
- All tables have `created_at` and `updated_at` with triggers
- User-specific data filtered by `user_id`
- Categories can be user-specific or global (NULL user_id)
- Indexes on user_id, categoria_id, and fecha for performance

### Components (`/components`)
- `Layout.js` - Main layout with navigation
- `LoginForm.js` - Login form component
- `FinancialSummary.js` - Dashboard summary widget
- `TransactionForm.js` - Shared form for income/expenses
- `MonthlyChart.js` - Chart visualizations with Recharts
- `MonthlyTable.js` - Transaction table display
- `MonthSelector.js` / `YearSelector.js` - Date navigation
- `charts/` - Chart components

### Hooks (`/hooks`)
- `useFinancialData.js` - Custom hook for fetching financial data

## Environment Variables

Key variables (see `.env.example` for full list):

**Database:**
- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`
- `DATABASE_URL` - PostgreSQL connection string (alternative to individual vars)

**Authentication:**
- `JWT_SECRET` - Secret for signing JWT tokens
- `NEXTAUTH_URL` - App URL (e.g., http://localhost:3000)
- `NEXTAUTH_SECRET` - NextAuth.js secret

**Application:**
- `NODE_ENV` - development/production/test
- `PORT` - Server port (default: 3000)

## Important Development Notes

### Authentication Flow
1. Login via `/api/auth/login` sets httpOnly cookie with JWT
2. `AuthContext` automatically validates on mount and every 5 minutes
3. Protected pages should use `useAuth()` hook to check `isAuthenticated`
4. API routes use `authenticate(req, res)` middleware to verify JWT
5. Logout clears cookie and redirects to `/login`

### API Response Format
All API responses follow this structure:
```javascript
{
  success: true,
  message: "Operation successful",
  data: { /* response data */ }
}
```

For paginated responses:
```javascript
{
  success: true,
  data: [...],
  pagination: {
    page: 1,
    limit: 10,
    totalItems: 45,
    totalPages: 5
  }
}
```

### Database Queries
- Always use `db.query(text, params)` from `/lib/db.js`
- Use parameterized queries to prevent SQL injection
- For transactions, use `db.transaction(callback)` helper
- Filter all queries by `user_id` for data isolation

### Testing
- Jest config in `jest.config.js` with path aliases (@/components, @/lib, etc.)
- Setup file: `__tests__/setup.js`
- Coverage threshold: 80% (branches, functions, lines, statements)
- Test API routes with supertest
- E2E tests in Cypress

### Security Headers
Next.js config includes security headers:
- X-Frame-Options: SAMEORIGIN
- X-Content-Type-Options: nosniff
- X-XSS-Protection: 1; mode=block
- Referrer-Policy: origin-when-cross-origin

### Docker Deployment
- Multi-stage build (builder + runner)
- Production image uses Node 20 Alpine
- Runs as non-root user (nextjs:nodejs)
- Exposes port 3000

### AWS Deployment
- Uses AWS Copilot CLI for infrastructure
- Service definition in `/copilot/api/`
- Environment configs in `/copilot/environments/`
- RDS PostgreSQL addon defined in copilot addons
- Post-deploy smoke tests automatically run

## Common Patterns

### Creating a New API Endpoint
```javascript
// pages/api/example.js
import { authenticate } from '@/lib/middleware/auth';
import db from '@/lib/db';

export default async function handler(req, res) {
  // Authenticate user
  const userId = await authenticate(req, res);
  if (!userId) return; // authenticate sends 401 response

  if (req.method === 'GET') {
    const result = await db.query(
      'SELECT * FROM table WHERE user_id = $1',
      [userId]
    );
    res.json({ success: true, data: result.rows });
  }
}
```

### Creating a Protected Page
```javascript
// pages/example.js
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/router';
import { useEffect } from 'react';

export default function ExamplePage() {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, loading, router]);

  if (loading) return <div>Loading...</div>;
  if (!isAuthenticated) return null;

  return <div>Protected content</div>;
}
```

### Database Transaction Pattern
```javascript
import db from '@/lib/db';

const result = await db.transaction(async (client) => {
  await client.query('INSERT INTO table1 ...', [...]);
  await client.query('UPDATE table2 ...', [...]);
  return { success: true };
});
```

## Troubleshooting

### Multiple Auth Requests
- AuthContext uses request deduplication and debouncing
- Check browser DevTools for duplicate `/api/auth/me` calls
- Force refresh: `refreshAuth()` from `useAuth()` hook

### Database Connection Issues
- Verify DATABASE_URL or individual DB_* env vars are set
- Check PostgreSQL is running: `pg_isready`
- Initialize DB: `npm run db:init`
- Reset DB if corrupted: `npm run db:reset` (WARNING: destroys data)

### Build Errors on Next.js 15
- Ensure using Pages Router (not App Router)
- Check `next.config.js` has `useFileSystemPublicRoutes: true`
- Verify React 18.2.0 compatibility

### Test Failures
- Ensure test database is initialized
- Clear Jest cache: `npx jest --clearCache`
- Check test isolation (each test should clean up)
- For API tests, mock authentication middleware

## Migration Guide

### Creating a New Migration
```bash
npm run db:create-migration -- migration_name
```
Creates file in `/migrations/` - use sequential numbering (002_*, 003_*, etc.)

### Migration File Format
```javascript
// migrations/XXX_description.js
exports.up = async (client) => {
  await client.query(`
    CREATE TABLE ...
  `);
};

exports.down = async (client) => {
  await client.query(`
    DROP TABLE ...
  `);
};
```
