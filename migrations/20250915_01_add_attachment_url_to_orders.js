const pool = require('../src/config/database');

async function up() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`
      ALTER TABLE orders
      ADD COLUMN IF NOT EXISTS attachment_url TEXT;
    `);
    await client.query('COMMIT');
    console.log('Added attachment_url to orders');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Failed to add attachment_url to orders', err.message);
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { up };

