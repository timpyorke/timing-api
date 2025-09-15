const pool = require('../src/config/database');

async function up() {
  const client = await pool.connect();
  try {
    await client.query('ALTER TABLE orders ADD COLUMN IF NOT EXISTS attachment_url TEXT;');
  } finally {
    client.release();
  }
}

module.exports = { up };

