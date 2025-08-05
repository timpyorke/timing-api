const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  // Optimized connection pool settings
  max: 20, // Maximum number of clients in the pool
  min: 2, // Minimum number of clients in the pool
  idle: 10000, // Close idle clients after 10 seconds
  acquire: 60000, // Acquire connection timeout (60 seconds)
  evict: 1000, // How often to run eviction check (1 second)
  connectionTimeoutMillis: 10000, // Connection timeout
  idleTimeoutMillis: 30000, // Idle timeout
  query_timeout: 30000, // Query timeout
  statement_timeout: 30000 // Statement timeout
});

// Connection event handlers
pool.on('connect', (client) => {
  if (process.env.NODE_ENV !== 'test') {
    console.log('Connected to PostgreSQL database');
  }
});

pool.on('error', (err, client) => {
  console.error('Database connection error:', err);
});

pool.on('acquire', (client) => {
  // Client acquired from pool
});

pool.on('release', (client) => {
  // Client released back to pool
});

// Graceful pool shutdown
const gracefulShutdown = async () => {
  console.log('Shutting down database pool...');
  await pool.end();
  console.log('Database pool closed');
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

module.exports = pool;