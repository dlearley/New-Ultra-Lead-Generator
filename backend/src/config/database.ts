import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

export const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'admin_data_sources',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

export const initDatabase = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS admin_users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL,
        permissions JSONB NOT NULL DEFAULT '[]',
        last_login TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS data_sources (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        type VARCHAR(50) NOT NULL,
        connector VARCHAR(255) NOT NULL,
        credentials JSONB NOT NULL DEFAULT '{}',
        rate_limit JSONB NOT NULL DEFAULT '{"requestsPerMinute": 60, "requestsPerHour": 1000, "requestsPerDay": 10000, "currentUsage": {"minute": 0, "hour": 0, "day": 0}}',
        enabled BOOLEAN DEFAULT true,
        health_status JSONB NOT NULL DEFAULT '{"status": "unknown", "errorRate": 0}',
        last_health_check TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS feature_flags (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        key VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        enabled BOOLEAN DEFAULT false,
        plans TEXT[] DEFAULT '{}',
        tenant_overrides JSONB NOT NULL DEFAULT '[]',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS plans (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) UNIQUE NOT NULL,
        tier VARCHAR(50) NOT NULL,
        features TEXT[] DEFAULT '{}',
        limits JSONB NOT NULL DEFAULT '{}',
        price DECIMAL(10,2) DEFAULT 0,
        active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS data_quality_metrics (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        data_source_id UUID REFERENCES data_sources(id),
        region VARCHAR(100),
        industry VARCHAR(100),
        completeness DECIMAL(5,2),
        accuracy DECIMAL(5,2),
        consistency DECIMAL(5,2),
        timeliness DECIMAL(5,2),
        validity DECIMAL(5,2),
        score DECIMAL(5,2),
        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS moderation_queue (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        entity_type VARCHAR(50) NOT NULL,
        entity_id UUID NOT NULL,
        changes JSONB NOT NULL,
        status VARCHAR(50) DEFAULT 'pending',
        moderator_id UUID REFERENCES admin_users(id),
        moderator_notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        reviewed_at TIMESTAMP
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS health_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        data_source_id UUID REFERENCES data_sources(id),
        level VARCHAR(20) NOT NULL,
        message TEXT NOT NULL,
        details JSONB DEFAULT '{}',
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        resolved BOOLEAN DEFAULT false
      );
    `);

    console.log('Database tables initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
};