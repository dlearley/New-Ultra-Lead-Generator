/**
 * Test setup and utilities
 */

import { Pool } from 'pg';
import { generateCreateTablesSQL } from '../src/schema/index.js';

// Use test database
export const TEST_DB_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'ai_platform_test',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
};

let testPool: Pool;

export async function setupTestDb(): Promise<Pool> {
  testPool = new Pool(TEST_DB_CONFIG);

  try {
    // Create pgvector extension if not exists
    await testPool.query('CREATE EXTENSION IF NOT EXISTS vector');

    // Create tables
    const sql = generateCreateTablesSQL();
    await testPool.query(sql);

    console.log('Test database initialized');
  } catch (error) {
    console.error('Database setup error:', error);
    throw error;
  }

  return testPool;
}

export async function cleanupTestDb(): Promise<void> {
  try {
    await testPool.query('DROP TABLE IF EXISTS business_content_cache CASCADE');
    await testPool.query('DROP TABLE IF EXISTS embedding_metrics CASCADE');
    await testPool.query('DROP TABLE IF EXISTS embedding_jobs CASCADE');
    await testPool.query('DROP TABLE IF EXISTS business_embeddings CASCADE');
    console.log('Test database cleaned');
  } finally {
    await testPool.end();
  }
}

export async function insertTestBusiness(
  pool: pg.Pool,
  id: string = '00000000-0000-0000-0000-000000000001',
  name: string = 'Test Business',
  description: string = 'A test business'
): Promise<void> {
  // First ensure businesses table exists
  await pool.query(`
    CREATE TABLE IF NOT EXISTS businesses (
      id UUID PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      website VARCHAR(255),
      latitude FLOAT,
      longitude FLOAT,
      category VARCHAR(128),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(
    `INSERT INTO businesses (id, name, description) VALUES ($1, $2, $3)
     ON CONFLICT (id) DO UPDATE SET name = $2, description = $3`,
    [id, name, description]
  );
}

export async function clearBusinesses(pool: Pool): Promise<void> {
  await pool.query('DELETE FROM business_embeddings');
  await pool.query('DELETE FROM businesses');
}
