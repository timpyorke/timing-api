#!/usr/bin/env node
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const pool = require('../config/database');

const MIGRATIONS_DIR = path.join(__dirname, '../../migrations');

async function createMigrationsTable() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Migrations table ready');
  } catch (error) {
    console.error('❌ Failed to create migrations table:', error.message);
    throw error;
  } finally {
    client.release();
  }
}

async function getExecutedMigrations() {
  const client = await pool.connect();
  try {
    const result = await client.query('SELECT name FROM migrations ORDER BY id');
    return result.rows.map(row => row.name);
  } catch (error) {
    console.error('❌ Failed to get executed migrations:', error.message);
    return [];
  } finally {
    client.release();
  }
}

async function recordMigration(name) {
  const client = await pool.connect();
  try {
    await client.query('INSERT INTO migrations (name) VALUES ($1)', [name]);
    console.log(`📝 Recorded migration: ${name}`);
  } catch (error) {
    console.error(`❌ Failed to record migration ${name}:`, error.message);
    throw error;
  } finally {
    client.release();
  }
}

async function runMigrations() {
  console.log('🚀 Starting database migrations...');
  
  await createMigrationsTable();
  
  if (!fs.existsSync(MIGRATIONS_DIR)) {
    console.log('📁 No migrations directory found');
    return;
  }
  
  const executedMigrations = await getExecutedMigrations();
  const migrationFiles = fs.readdirSync(MIGRATIONS_DIR)
    .filter(file => file.endsWith('.js'))
    .sort();
  
  console.log(`📂 Found ${migrationFiles.length} migration files`);
  console.log(`✅ ${executedMigrations.length} migrations already executed`);
  
  for (const file of migrationFiles) {
    const migrationName = path.basename(file, '.js');
    
    if (executedMigrations.includes(migrationName)) {
      console.log(`⏭️  Skipping ${migrationName} (already executed)`);
      continue;
    }
    
    console.log(`🔄 Running migration: ${migrationName}`);
    
    try {
      const migrationPath = path.join(MIGRATIONS_DIR, file);
      const migration = require(migrationPath);
      
      if (typeof migration.up !== 'function') {
        throw new Error(`Migration ${migrationName} does not export an 'up' function`);
      }
      
      await migration.up();
      await recordMigration(migrationName);
      
      console.log(`✅ Completed migration: ${migrationName}`);
      
    } catch (error) {
      console.error(`❌ Migration ${migrationName} failed:`, error.message);
      throw error;
    }
  }
  
  console.log('🎉 All migrations completed successfully!');
}

// Run migrations if called directly
if (require.main === module) {
  runMigrations()
    .then(() => {
      console.log('✨ Migration process completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Migration process failed:', error);
      process.exit(1);
    });
}

module.exports = { runMigrations };