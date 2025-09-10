#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
// Load .env, and if DATABASE_URL is missing, try .env.development automatically
dotenv.config();
if (!process.env.DATABASE_URL) {
  const devEnvPath = path.join(__dirname, '../../.env.development');
  if (fs.existsSync(devEnvPath)) {
    dotenv.config({ path: devEnvPath });
  }
}
const pool = require('../config/database');
const { LOG_MESSAGES } = require('../utils/constants');

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
    console.log(LOG_MESSAGES.MIGRATIONS_TABLE_READY);
  } catch (error) {
    console.error(LOG_MESSAGES.MIGRATIONS_CREATE_TABLE_FAILED_PREFIX, error.message);
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
    console.error(LOG_MESSAGES.MIGRATIONS_GET_EXECUTED_FAILED_PREFIX, error.message);
    return [];
  } finally {
    client.release();
  }
}

async function recordMigration(name) {
  const client = await pool.connect();
  try {
    await client.query('INSERT INTO migrations (name) VALUES ($1)', [name]);
    console.log(`${LOG_MESSAGES.MIGRATIONS_RECORDED_PREFIX} ${name}`);
  } catch (error) {
    console.error(`${LOG_MESSAGES.MIGRATIONS_RECORD_FAILED_PREFIX} ${name}:`, error.message);
    throw error;
  } finally {
    client.release();
  }
}

async function runMigrations() {
  console.log(LOG_MESSAGES.MIGRATIONS_STARTING);
  
  await createMigrationsTable();
  
  if (!fs.existsSync(MIGRATIONS_DIR)) {
    console.log(LOG_MESSAGES.MIGRATIONS_NO_DIR);
    return;
  }
  
  const executedMigrations = await getExecutedMigrations();
  const migrationFiles = fs.readdirSync(MIGRATIONS_DIR)
    .filter(file => file.endsWith('.js'))
    .sort();
  
  console.log(`${LOG_MESSAGES.MIGRATIONS_FOUND_FILES_PREFIX} ${migrationFiles.length} migration files`);
  console.log(`${LOG_MESSAGES.MIGRATIONS_ALREADY_EXECUTED_PREFIX} ${executedMigrations.length} migrations already executed`);
  
  for (const file of migrationFiles) {
    const migrationName = path.basename(file, '.js');
    
    if (executedMigrations.includes(migrationName)) {
      console.log(`${LOG_MESSAGES.MIGRATIONS_SKIPPING_PREFIX} ${migrationName} (already executed)`);
      continue;
    }
    
    console.log(`${LOG_MESSAGES.MIGRATIONS_RUNNING_PREFIX} ${migrationName}`);
    
    try {
      const migrationPath = path.join(MIGRATIONS_DIR, file);
      const migration = require(migrationPath);
      
      if (typeof migration.up !== 'function') {
        throw new Error(`Migration ${migrationName} does not export an 'up' function`);
      }
      
      await migration.up();
      await recordMigration(migrationName);
      
      console.log(`${LOG_MESSAGES.MIGRATIONS_COMPLETED_PREFIX} ${migrationName}`);
      
    } catch (error) {
      console.error(`${LOG_MESSAGES.MIGRATIONS_FAILED_PREFIX} ${migrationName}:`, error.message);
      throw error;
    }
  }
  
  console.log(LOG_MESSAGES.MIGRATIONS_ALL_DONE);
}

// Run migrations if called directly
if (require.main === module) {
  runMigrations()
    .then(() => {
      console.log(LOG_MESSAGES.MIGRATIONS_PROCESS_COMPLETED);
      process.exit(0);
    })
    .catch((error) => {
      console.error(LOG_MESSAGES.MIGRATIONS_PROCESS_FAILED_PREFIX, error);
      process.exit(1);
    });
}

module.exports = { runMigrations };
