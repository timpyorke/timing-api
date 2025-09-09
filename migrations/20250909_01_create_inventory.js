const pool = require('../src/config/database');

async function up() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(`
      CREATE TABLE IF NOT EXISTS ingredients (
        id SERIAL PRIMARY KEY,
        name TEXT UNIQUE NOT NULL,
        unit TEXT NOT NULL,
        stock NUMERIC NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS menu_ingredients (
        menu_id INTEGER REFERENCES menus(id) ON DELETE CASCADE,
        ingredient_id INTEGER REFERENCES ingredients(id) ON DELETE CASCADE,
        quantity_per_unit NUMERIC NOT NULL,
        PRIMARY KEY (menu_id, ingredient_id)
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS stock_movements (
        id SERIAL PRIMARY KEY,
        ingredient_id INTEGER REFERENCES ingredients(id) ON DELETE CASCADE,
        change NUMERIC NOT NULL,
        reason TEXT,
        order_id INTEGER,
        meta JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query('COMMIT');
    console.log('Inventory tables created');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Failed to create inventory tables', err.message);
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { up };

