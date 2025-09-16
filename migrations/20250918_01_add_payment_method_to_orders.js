const pool = require('../src/config/database');

async function up() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`
      ALTER TABLE orders
      ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50);
    `);
    await client.query('COMMIT');
    console.log('Added payment_method to orders');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Failed to add payment_method to orders', err.message);
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { up };

