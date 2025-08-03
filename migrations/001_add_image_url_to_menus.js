const pool = require('../src/config/database');

/**
 * Migration: Add image_url column to menus table
 * Date: 2025-08-01
 * Description: Adds support for image URLs in menu items
 */

async function up() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Running migration: Add image_url column to menus table');
    
    // Check if column already exists
    const checkColumn = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'menus' AND column_name = 'image_url';
    `);
    
    if (checkColumn.rows.length > 0) {
      console.log('✅ image_url column already exists in menus table');
      return;
    }
    
    // Add the image_url column
    await client.query('ALTER TABLE menus ADD COLUMN image_url TEXT;');
    
    console.log('✅ Successfully added image_url column to menus table');
    
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
    console.log('🔄 Rolling back migration: Remove image_url column from menus table');
    
    // Check if column exists before trying to drop it
    const checkColumn = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'menus' AND column_name = 'image_url';
    `);
    
    if (checkColumn.rows.length === 0) {
      console.log('✅ image_url column does not exist in menus table');
      return;
    }
    
    // Remove the image_url column
    await client.query('ALTER TABLE menus DROP COLUMN image_url;');
    
    console.log('✅ Successfully removed image_url column from menus table');
    
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
    console.log('Usage: node migrations/001_add_image_url_to_menus.js [up|down]');
    process.exit(1);
  }
}

module.exports = { up, down };