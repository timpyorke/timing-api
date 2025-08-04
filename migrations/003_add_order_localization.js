const pool = require('../src/config/database');

/**
 * Migration: Add localization support to orders table
 * Date: 2025-08-04
 * Description: Adds customer locale preference and localized status messages
 */

async function up() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Running migration: Add localization support to orders table');
    
    // Check if localization columns already exist
    const checkColumns = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'orders' 
      AND column_name IN ('customer_locale', 'notes', 'notes_th');
    `);
    
    const existingColumns = checkColumns.rows.map(row => row.column_name);
    
    // Add customer locale preference if not exists
    if (!existingColumns.includes('customer_locale')) {
      await client.query(`
        ALTER TABLE orders 
        ADD COLUMN customer_locale VARCHAR(5) DEFAULT 'en' 
        CHECK (customer_locale IN ('en', 'th'));
      `);
      console.log('✅ Added customer_locale column');
    }
    
    // Add English notes if not exists
    if (!existingColumns.includes('notes')) {
      await client.query('ALTER TABLE orders ADD COLUMN notes TEXT;');
      console.log('✅ Added notes column');
    }
    
    // Add Thai notes if not exists
    if (!existingColumns.includes('notes_th')) {
      await client.query('ALTER TABLE orders ADD COLUMN notes_th TEXT;');
      console.log('✅ Added notes_th column');
    }
    
    // Create index for customer locale
    const localeIndexExists = await client.query(`
      SELECT indexname 
      FROM pg_indexes 
      WHERE tablename = 'orders' AND indexname = 'idx_orders_customer_locale';
    `);
    
    if (localeIndexExists.rows.length === 0) {
      await client.query('CREATE INDEX idx_orders_customer_locale ON orders(customer_locale);');
      console.log('✅ Created index for customer_locale');
    }
    
    // Create composite index for status and locale for better performance
    const compositeIndexExists = await client.query(`
      SELECT indexname 
      FROM pg_indexes 
      WHERE tablename = 'orders' AND indexname = 'idx_orders_status_locale';
    `);
    
    if (compositeIndexExists.rows.length === 0) {
      await client.query('CREATE INDEX idx_orders_status_locale ON orders(status, customer_locale);');
      console.log('✅ Created composite index for status and customer_locale');
    }
    
    console.log('✅ Successfully added localization support to orders table');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  } finally {
    client.release();
  }
}

async function down() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Rolling back migration: Remove localization support from orders table');
    
    // Drop indexes first
    const localeIndexExists = await client.query(`
      SELECT indexname 
      FROM pg_indexes 
      WHERE tablename = 'orders' AND indexname = 'idx_orders_customer_locale';
    `);
    
    if (localeIndexExists.rows.length > 0) {
      await client.query('DROP INDEX idx_orders_customer_locale;');
      console.log('✅ Dropped index idx_orders_customer_locale');
    }
    
    const compositeIndexExists = await client.query(`
      SELECT indexname 
      FROM pg_indexes 
      WHERE tablename = 'orders' AND indexname = 'idx_orders_status_locale';
    `);
    
    if (compositeIndexExists.rows.length > 0) {
      await client.query('DROP INDEX idx_orders_status_locale;');
      console.log('✅ Dropped index idx_orders_status_locale');
    }
    
    // Check which columns exist before dropping
    const checkColumns = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'orders' 
      AND column_name IN ('customer_locale', 'notes', 'notes_th');
    `);
    
    const existingColumns = checkColumns.rows.map(row => row.column_name);
    
    // Drop columns if they exist
    if (existingColumns.includes('customer_locale')) {
      await client.query('ALTER TABLE orders DROP COLUMN customer_locale;');
      console.log('✅ Dropped customer_locale column');
    }
    
    if (existingColumns.includes('notes')) {
      await client.query('ALTER TABLE orders DROP COLUMN notes;');
      console.log('✅ Dropped notes column');
    }
    
    if (existingColumns.includes('notes_th')) {
      await client.query('ALTER TABLE orders DROP COLUMN notes_th;');
      console.log('✅ Dropped notes_th column');
    }
    
    console.log('✅ Successfully removed localization support from orders table');
    
  } catch (error) {
    console.error('❌ Rollback failed:', error.message);
    throw error;
  } finally {
    client.release();
  }
}

// Run migration if called directly
if (require.main === module) {
  const action = process.argv[2];
  
  if (action === 'up') {
    up()
      .then(() => {
        console.log('🎉 Migration completed successfully');
        process.exit(0);
      })
      .catch((error) => {
        console.error('💥 Migration failed:', error);
        process.exit(1);
      });
  } else if (action === 'down') {
    down()
      .then(() => {
        console.log('🎉 Rollback completed successfully');
        process.exit(0);
      })
      .catch((error) => {
        console.error('💥 Rollback failed:', error);
        process.exit(1);
      });
  } else {
    console.log('Usage: node migrations/003_add_order_localization.js [up|down]');
    process.exit(1);
  }
}

module.exports = { up, down };