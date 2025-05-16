import { Pool } from 'pg';

// Create PostgreSQL connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/money_flow',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Log database connection errors
pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

// Execute SQL query with parameters
const query = async (text, params = []) => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    
    // Log slow queries (> 200ms) for debugging
    if (duration > 200) {
      console.log('Slow query:', { text, duration, rows: res.rowCount });
    }
    
    return res;
  } catch (error) {
    console.error('Database query error:', error);
    
    // Add more context to the error for debugging
    error.query = text;
    error.params = params;
    
    throw error;
  }
};

// Get a client from the pool for transactions
const getClient = async () => {
  const client = await pool.connect();
  
  // Monkey patch the query method to implement the same logic as above
  const originalQuery = client.query;
  client.query = async (text, params = []) => {
    const start = Date.now();
    try {
      const res = await originalQuery.call(client, text, params);
      const duration = Date.now() - start;
      
      if (duration > 200) {
        console.log('Slow query in transaction:', { text, duration, rows: res.rowCount });
      }
      
      return res;
    } catch (error) {
      console.error('Database transaction query error:', error);
      error.query = text;
      error.params = params;
      throw error;
    }
  };
  
  return client;
};

// Run a function within a transaction
const transaction = async (callback) => {
  const client = await getClient();
  
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

// Export database operations
export default {
  query,
  getClient,
  transaction,
  pool
};
