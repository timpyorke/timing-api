#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Migration runner utility
 * Runs all migrations in order or specific migrations
 */

const migrationsDir = path.join(__dirname, '..', 'migrations');

async function getAllMigrations() {
  const files = fs.readdirSync(migrationsDir);
  return files
    .filter(file => file.endsWith('.js'))
    .sort(); // Ensure they run in order
}

async function runMigration(migrationFile, action = 'up') {
  const migrationPath = path.join(migrationsDir, migrationFile);
  
  try {
    console.log(`\n🔄 Running ${action} for ${migrationFile}...`);
    
    const migration = require(migrationPath);
    
    if (typeof migration[action] === 'function') {
      await migration[action]();
      console.log(`✅ ${migrationFile} ${action} completed successfully`);
    } else {
      console.log(`⚠️  ${migrationFile} does not have a ${action} function`);
    }
  } catch (error) {
    console.error(`❌ ${migrationFile} ${action} failed:`, error.message);
    throw error;
  }
}

async function runAllMigrations(action = 'up') {
  const migrations = await getAllMigrations();
  
  console.log(`\n🚀 Running ${action} for ${migrations.length} migrations...`);
  
  for (const migration of migrations) {
    await runMigration(migration, action);
  }
  
  console.log(`\n🎉 All migrations ${action} completed successfully!`);
}

async function main() {
  const args = process.argv.slice(2);
  const action = args[0] || 'up';
  const specificMigration = args[1];
  
  if (!['up', 'down'].includes(action)) {
    console.error('Usage: node scripts/run-migrations.js [up|down] [migration-file]');
    console.error('Examples:');
    console.error('  node scripts/run-migrations.js up');
    console.error('  node scripts/run-migrations.js down');
    console.error('  node scripts/run-migrations.js up 002_add_menu_localization.js');
    process.exit(1);
  }
  
  try {
    if (specificMigration) {
      await runMigration(specificMigration, action);
    } else {
      await runAllMigrations(action);
    }
    
    console.log('\n✨ Migration process completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('\n💥 Migration process failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = {
  runMigration,
  runAllMigrations,
  getAllMigrations
};