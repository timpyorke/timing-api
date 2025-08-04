const pool = require('../src/config/database');

/**
 * Migration: Add localization support to menus table
 * Date: 2025-08-04
 * Description: Adds localized fields for menu names, descriptions, and categories
 */

async function up() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Running migration: Add localization support to menus table');
    
    // Check if localization columns already exist
    const checkColumns = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'menus' 
      AND column_name IN ('name_th', 'description', 'description_th', 'category_th');
    `);
    
    const existingColumns = checkColumns.rows.map(row => row.column_name);
    
    // Add Thai name if not exists
    if (!existingColumns.includes('name_th')) {
      await client.query('ALTER TABLE menus ADD COLUMN name_th VARCHAR(100);');
      console.log('✅ Added name_th column');
    }
    
    // Add English description if not exists
    if (!existingColumns.includes('description')) {
      await client.query('ALTER TABLE menus ADD COLUMN description TEXT;');
      console.log('✅ Added description column');
    }
    
    // Add Thai description if not exists
    if (!existingColumns.includes('description_th')) {
      await client.query('ALTER TABLE menus ADD COLUMN description_th TEXT;');
      console.log('✅ Added description_th column');
    }
    
    // Add Thai category if not exists
    if (!existingColumns.includes('category_th')) {
      await client.query('ALTER TABLE menus ADD COLUMN category_th VARCHAR(50);');
      console.log('✅ Added category_th column');
    }
    
    // Create index for Thai category
    const indexExists = await client.query(`
      SELECT indexname 
      FROM pg_indexes 
      WHERE tablename = 'menus' AND indexname = 'idx_menus_category_th';
    `);
    
    if (indexExists.rows.length === 0) {
      await client.query('CREATE INDEX idx_menus_category_th ON menus(category_th);');
      console.log('✅ Created index for category_th');
    }
    
    // Update existing menu items with basic Thai translations (optional sample data)
    console.log('🔄 Updating existing menu items with sample Thai translations...');
    
    // Coffee category translations
    await client.query(`
      UPDATE menus 
      SET category_th = 'กาแฟ' 
      WHERE category = 'coffee' AND category_th IS NULL;
    `);
    
    // Tea category translations
    await client.query(`
      UPDATE menus 
      SET category_th = 'ชา' 
      WHERE category = 'tea' AND category_th IS NULL;
    `);
    
    // Dessert category translations
    await client.query(`
      UPDATE menus 
      SET category_th = 'ของหวาน' 
      WHERE category = 'dessert' AND category_th IS NULL;
    `);
    
    // Snack category translations
    await client.query(`
      UPDATE menus 
      SET category_th = 'ขนม' 
      WHERE category = 'snack' AND category_th IS NULL;
    `);
    
    // Drink category translations
    await client.query(`
      UPDATE menus 
      SET category_th = 'เครื่องดื่ม' 
      WHERE category = 'drink' AND category_th IS NULL;
    `);
    
    console.log('✅ Successfully added localization support to menus table');
    
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
    console.log('🔄 Rolling back migration: Remove localization support from menus table');
    
    // Drop index first
    const indexExists = await client.query(`
      SELECT indexname 
      FROM pg_indexes 
      WHERE tablename = 'menus' AND indexname = 'idx_menus_category_th';
    `);
    
    if (indexExists.rows.length > 0) {
      await client.query('DROP INDEX idx_menus_category_th;');
      console.log('✅ Dropped index idx_menus_category_th');
    }
    
    // Check which columns exist before dropping
    const checkColumns = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'menus' 
      AND column_name IN ('name_th', 'description', 'description_th', 'category_th');
    `);
    
    const existingColumns = checkColumns.rows.map(row => row.column_name);
    
    // Drop columns if they exist
    if (existingColumns.includes('name_th')) {
      await client.query('ALTER TABLE menus DROP COLUMN name_th;');
      console.log('✅ Dropped name_th column');
    }
    
    if (existingColumns.includes('description')) {
      await client.query('ALTER TABLE menus DROP COLUMN description;');
      console.log('✅ Dropped description column');
    }
    
    if (existingColumns.includes('description_th')) {
      await client.query('ALTER TABLE menus DROP COLUMN description_th;');
      console.log('✅ Dropped description_th column');
    }
    
    if (existingColumns.includes('category_th')) {
      await client.query('ALTER TABLE menus DROP COLUMN category_th;');
      console.log('✅ Dropped category_th column');
    }
    
    console.log('✅ Successfully removed localization support from menus table');
    
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
    console.log('Usage: node migrations/002_add_menu_localization.js [up|down]');
    process.exit(1);
  }
}

module.exports = { up, down };