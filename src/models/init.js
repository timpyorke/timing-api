const pool = require('../config/database');

// Creates required minimal tables if they don't exist yet.
async function initSchema() {
  const createLineTokens = `
    CREATE TABLE IF NOT EXISTS line_tokens (
      id SERIAL PRIMARY KEY,
      line_user_id TEXT NOT NULL UNIQUE,
      user_id VARCHAR(128),
      user_info JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;

  try {
    await pool.query(createLineTokens);
    if (process.env.NODE_ENV !== 'test') {
      console.log('DB init: ensured table line_tokens');
    }
  } catch (err) {
    console.error('DB init: failed to ensure line_tokens table', err.message);
  }
}

module.exports = initSchema;

