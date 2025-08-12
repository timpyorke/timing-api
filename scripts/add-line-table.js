const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function addLineTable() {
  try {
    console.log('Adding LINE tokens table...');
    
    // Create LINE tokens table
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS line_tokens (
        id SERIAL PRIMARY KEY,
        line_user_id TEXT NOT NULL UNIQUE,
        user_id VARCHAR(128),
        user_info JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;
    
    await pool.query(createTableQuery);
    
    console.log('✅ LINE tokens table created successfully!');
    
    // Verify table exists
    const verifyQuery = 'SELECT COUNT(*) FROM line_tokens';
    const result = await pool.query(verifyQuery);
    console.log('✅ Table verification passed - line_tokens is ready to use');
    
  } catch (error) {
    console.error('❌ Error adding LINE tokens table:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

addLineTable();