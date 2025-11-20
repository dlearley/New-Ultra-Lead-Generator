#!/usr/bin/env node

import { createIndexMigrationService } from '../migration';
import { createOpenSearchClient } from '../client';

// Configuration from environment variables with defaults
const config = {
  node: process.env.OPENSEARCH_NODE || 'http://localhost:9200',
  auth: process.env.OPENSEARCH_USERNAME && process.env.OPENSEARCH_PASSWORD ? {
    username: process.env.OPENSEARCH_USERNAME,
    password: process.env.OPENSEARCH_PASSWORD
  } : undefined,
  ssl: process.env.OPENSEARCH_SSL_CA ? {
    ca: process.env.OPENSEARCH_SSL_CA,
    rejectUnauthorized: process.env.OPENSEARCH_SSL_REJECT_UNAUTHORIZED !== 'false'
  } : undefined,
  maxRetries: parseInt(process.env.OPENSEARCH_MAX_RETRIES || '3'),
  requestTimeout: parseInt(process.env.OPENSEARCH_REQUEST_TIMEOUT || '30000')
};

async function initIndex() {
  console.log('Initializing OpenSearch business leads index...');
  console.log(`Node: ${config.node}`);
  
  try {
    // Test connection
    const client = createOpenSearchClient(config);
    console.log('Testing OpenSearch connection...');
    
    const isHealthy = await client.ping();
    if (!isHealthy) {
      throw new Error('Failed to connect to OpenSearch');
    }
    
    const health = await client.health();
    console.log(`Cluster health: ${health.status}`);
    
    // Run migration
    const migrationService = createIndexMigrationService(config);
    await migrationService.migrate({
      deleteExisting: process.env.OPENSEARCH_DELETE_EXISTING === 'true',
      skipIfExists: process.env.OPENSEARCH_SKIP_IF_EXISTS === 'true',
      updateMapping: process.env.OPENSEARCH_UPDATE_MAPPING === 'true'
    });
    
    // Verify the index
    const isValid = await migrationService.verify();
    if (!isValid) {
      throw new Error('Index verification failed');
    }
    
    console.log('✅ Business leads index initialized successfully!');
    
  } catch (error) {
    console.error('❌ Failed to initialize business leads index:', error);
    process.exit(1);
  }
}

// CLI argument parsing
const args = process.argv.slice(2);
const command = args[0];

if (command === 'help' || command === '--help' || command === '-h') {
  console.log(`
Usage: pnpm search:init [command]

Commands:
  (no args)    Initialize the business leads index
  help         Show this help message
  verify       Verify the index exists and has correct mappings
  delete       Delete the existing index
  
Environment Variables:
  OPENSEARCH_NODE                  OpenSearch node URL (default: http://localhost:9200)
  OPENSEARCH_USERNAME              OpenSearch username
  OPENSEARCH_PASSWORD              OpenSearch password
  OPENSEARCH_SSL_CA                SSL certificate authority
  OPENSEARCH_SSL_REJECT_UNAUTHORIZED Reject unauthorized SSL connections (default: true)
  OPENSEARCH_MAX_RETRIES           Maximum connection retries (default: 3)
  OPENSEARCH_REQUEST_TIMEOUT       Request timeout in ms (default: 30000)
  OPENSEARCH_DELETE_EXISTING       Delete existing index before creation (true/false)
  OPENSEARCH_SKIP_IF_EXISTS        Skip if index already exists (true/false)
  OPENSEARCH_UPDATE_MAPPING        Update existing index mapping (true/false)
`);
  process.exit(0);
}

if (command === 'verify') {
  (async () => {
    try {
      const migrationService = createIndexMigrationService(config);
      const isValid = await migrationService.verify();
      process.exit(isValid ? 0 : 1);
    } catch (error) {
      console.error('Verification failed:', error);
      process.exit(1);
    }
  })();
} else if (command === 'delete') {
  (async () => {
    try {
      const migrationService = createIndexMigrationService(config);
      await migrationService.rollback();
      console.log('✅ Index deleted successfully');
    } catch (error) {
      console.error('❌ Failed to delete index:', error);
      process.exit(1);
    }
  })();
} else {
  // Default: initialize the index
  initIndex();
}