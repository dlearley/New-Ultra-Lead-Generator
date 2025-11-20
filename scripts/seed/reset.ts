#!/usr/bin/env tsx

/**
 * Reset script - truncates all demo data tables
 * Use this before running seed to ensure clean state
 */

import { getPool, closePool, withTransaction, truncateTables, testConnection } from './lib/database';

async function main() {
  console.log('🧹 Starting database reset...\n');

  // Test database connection
  const connected = await testConnection();
  if (!connected) {
    console.error('❌ Could not connect to database. Exiting.');
    process.exit(1);
  }

  try {
    await withTransaction(async (client) => {
      await truncateTables(client);
    });

    console.log('\n✅ Database reset completed successfully!');
    console.log('   All demo data has been removed.');
    console.log('   Run `pnpm seed` to populate with fresh data.\n');
  } catch (error) {
    console.error('\n❌ Reset failed:', error);
    process.exit(1);
  } finally {
    await closePool();
  }
}

// Run if called directly
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
