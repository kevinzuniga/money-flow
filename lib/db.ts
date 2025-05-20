import { Pool, PoolClient, QueryResult } from 'pg';
import { z } from 'zod';

// Environment variable validation schema
const envSchema = z.object({
  DATABASE_URL: z.string().url().optional(),
  DB_HOST: z.string().optional(),
  DB_PORT: z.string().transform(Number).optional(),
  DB_NAME: z.string().optional(),
  DB_USER: z.string().optional(),
  DB_PASSWORD: z.string().optional(),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DB_SSL: z.boolean().default(false),
  DB_MAX_POOL_SIZE: z.string().transform(Number).default('10'),
  DB_IDLE_TIMEOUT: z.string().transform(Number).default('30000'),
  DB_CONNECTION_TIMEOUT: z.string().transform(Number).default('5000'),
});

// Parse and validate environment variables
const env = envSchema.parse(process.env);

// Connection configuration
const getConnectionConfig = () => {
  if (env.DATABASE_URL) {
    return {
      connectionString: env.DATABASE_URL,
      ssl: env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    };
  }

  return {
    host: env.DB_HOST || 'localhost',
    port: env.DB_PORT || 5432,
    database: env.DB_NAME || 'money_flow',
    user: env.DB_USER || 'postgres',
    password: env.DB_PASSWORD || 'password',
    ssl: env.DB_SSL,
  };
};

// Pool configuration
const poolConfig = {
  ...getConnectionConfig(),
  max: env.DB_MAX_POOL_SIZE,
  idleTimeoutMillis: env.DB_IDLE_TIMEOUT,
  connectionTimeoutMillis: env.DB_CONNECTION_TIMEOUT,
  allowExitOnIdle: true,
};

// Create PostgreSQL connection pool
const pool = new Pool(poolConfig);

// Log database connection errors
pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

// Custom error types
export class DatabaseError extends Error {
  constructor(
    message: string,
    public readonly query?: string,
    public readonly params?: any[],
    public readonly originalError?: Error
  ) {
    super(message);
    this.name = 'DatabaseError';
  }
}

export class TransactionError extends DatabaseError {
  constructor(message: string, query?: string, params?: any[]) {
    super(message, query, params);
    this.name = 'TransactionError';
  }
}

// Query interface
interface QueryOptions {
  timeout?: number;
  maxRetries?: number;
}

// Execute SQL query with parameters and options
const query = async <T = any>(
  text: string,
  params: any[] = [],
  options: QueryOptions = {}
): Promise<QueryResult<T>> => {
  const start = Date.now();
  const { timeout = 5000, maxRetries = 3 } = options;
  let retries = 0;
  
  while (retries < maxRetries) {
    try {
      const res = await Promise.race([
        pool.query(text, params),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Query timeout')), timeout)
        ),
      ]) as QueryResult<T>;

      const duration = Date.now() - start;
      
      // Log slow queries (> 200ms) for debugging
      if (duration > 200) {
        console.warn('Slow query:', {
          text,
          duration,
          rows: res.rowCount,
          params,
        });
      }
      
      return res;
    } catch (error) {
      retries++;
      
      if (retries === maxRetries) {
        console.error('Database query error:', error);
        throw new DatabaseError(
          'Database query failed',
          text,
          params,
          error as Error
        );
      }
      
      // Wait before retrying (exponential backoff)
      await new Promise(resolve =>
        setTimeout(resolve, Math.min(100 * Math.pow(2, retries), 1000))
      );
    }
  }
  
  throw new DatabaseError('Max retries exceeded');
};

// Get a client from the pool for transactions
const getClient = async (): Promise<PoolClient> => {
  const client = await pool.connect();
  
  const originalQuery = client.query;
  client.query = async (...args: Parameters<typeof originalQuery>) => {
    const start = Date.now();
    try {
      const result = await originalQuery.apply(client, args);
      const duration = Date.now() - start;
      
      if (duration > 200) {
        console.warn('Slow query in transaction:', {
          text: args[0],
          duration,
          rows: result.rowCount,
          params: args[1],
        });
      }
      
      return result;
    } catch (error) {
      throw new TransactionError(
        'Transaction query failed',
        args[0] as string,
        args[1] as any[]
      );
    }
  };
  
  return client;
};

// Run a function within a transaction
const transaction = async <T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> => {
  const client = await getClient();
  
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error instanceof TransactionError
      ? error
      : new TransactionError('Transaction failed', undefined, undefined);
  } finally {
    client.release();
  }
};

// Health check function
const healthCheck = async (): Promise<boolean> => {
  try {
    await query('SELECT 1');
    return true;
  } catch (error) {
    console.error('Database health check failed:', error);
    return false;
  }
};

// Graceful shutdown
const shutdown = async (): Promise<void> => {
  try {
    await pool.end();
    console.log('Database pool has ended');
  } catch (error) {
    console.error('Error during database shutdown:', error);
    throw error;
  }
};

// Export database operations
export default {
  query,
  getClient,
  transaction,
  pool,
  healthCheck,
  shutdown,
};

// Export types
export type { QueryOptions, QueryResult };

