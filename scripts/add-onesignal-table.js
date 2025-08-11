require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function addOneSignalTable() {
  try {
    console.log('Adding OneSignal tokens table...');
    
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS onesignal_tokens (
          id SERIAL PRIMARY KEY,
          player_id TEXT NOT NULL UNIQUE,
          user_id VARCHAR(128),
          device_info JSONB DEFAULT '{}',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      
      -- Create indexes for better performance
      CREATE INDEX IF NOT EXISTS idx_onesignal_tokens_player_id ON onesignal_tokens(player_id);
      CREATE INDEX IF NOT EXISTS idx_onesignal_tokens_user_id ON onesignal_tokens(user_id);
      CREATE INDEX IF NOT EXISTS idx_onesignal_tokens_updated_at ON onesignal_tokens(updated_at);
    `;
    
    // Execute the query
    await pool.query(createTableQuery);
    
    console.log('✅ OneSignal tokens table created successfully!');
    console.log('Table: onesignal_tokens');
    console.log('Indexes created for player_id, user_id, and updated_at');
    
  } catch (error) {
    console.error('❌ Error adding OneSignal table:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

addOneSignalTable();