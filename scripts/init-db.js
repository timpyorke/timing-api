const fs = require('fs');
const path = require('path');
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function initializeDatabase() {
  try {
    console.log('Initializing database...');
    
    // Read the SQL schema file
    const schemaPath = path.join(__dirname, '../src/models/database.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    // Execute the schema
    await pool.query(schema);
    
    console.log('Database initialized successfully!');
    console.log('Tables created:');
    console.log('- menus');
    console.log('- orders');
    console.log('- order_items');
    console.log('');
    console.log('Sample data inserted:');
    console.log('- Admin user: username=admin, password=admin123');
    console.log('- Sample menus with customizations');
    
  } catch (error) {
    console.error('Error initializing database:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

initializeDatabase();