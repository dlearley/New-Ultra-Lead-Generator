/**
 * Database schema definitions for embeddings
 */

export const BUSINESS_EMBEDDINGS_SCHEMA = `
  CREATE TABLE IF NOT EXISTS business_embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL,
    content_hash VARCHAR(64) NOT NULL,
    embedding vector(1536) NOT NULL,
    provider VARCHAR(64) NOT NULL,
    model VARCHAR(128) NOT NULL,
    embedding_dimension INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(business_id, provider, model)
  );

  CREATE INDEX IF NOT EXISTS idx_business_embeddings_business_id 
    ON business_embeddings(business_id);
  
  CREATE INDEX IF NOT EXISTS idx_business_embeddings_provider_model 
    ON business_embeddings(provider, model);

  CREATE INDEX IF NOT EXISTS idx_business_embeddings_vector 
    ON business_embeddings USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100);

  CREATE INDEX IF NOT EXISTS idx_business_embeddings_created_at 
    ON business_embeddings(created_at DESC);
`;

export const EMBEDDING_JOBS_SCHEMA = `
  CREATE TABLE IF NOT EXISTS embedding_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_name VARCHAR(255) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'pending',
    total_count INTEGER NOT NULL DEFAULT 0,
    processed_count INTEGER NOT NULL DEFAULT 0,
    failed_count INTEGER NOT NULL DEFAULT 0,
    skipped_count INTEGER NOT NULL DEFAULT 0,
    error_message TEXT,
    provider VARCHAR(64) NOT NULL,
    model VARCHAR(128) NOT NULL,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_embedding_jobs_status 
    ON embedding_jobs(status);

  CREATE INDEX IF NOT EXISTS idx_embedding_jobs_created_at 
    ON embedding_jobs(created_at DESC);

  CREATE INDEX IF NOT EXISTS idx_embedding_jobs_provider_model 
    ON embedding_jobs(provider, model);
`;

export const EMBEDDING_METRICS_SCHEMA = `
  CREATE TABLE IF NOT EXISTS embedding_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES embedding_jobs(id) ON DELETE CASCADE,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    metric_name VARCHAR(128) NOT NULL,
    metric_value FLOAT NOT NULL,
    tags JSONB
  );

  CREATE INDEX IF NOT EXISTS idx_embedding_metrics_job_id 
    ON embedding_metrics(job_id);

  CREATE INDEX IF NOT EXISTS idx_embedding_metrics_timestamp 
    ON embedding_metrics(timestamp DESC);

  CREATE INDEX IF NOT EXISTS idx_embedding_metrics_name 
    ON embedding_metrics(metric_name);
`;

export const BUSINESS_CONTENT_CACHE_SCHEMA = `
  CREATE TABLE IF NOT EXISTS business_content_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL UNIQUE,
    content_hash VARCHAR(64) NOT NULL,
    content TEXT NOT NULL,
    sources JSONB,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_business_content_cache_business_id 
    ON business_content_cache(business_id);

  CREATE INDEX IF NOT EXISTS idx_business_content_cache_expires_at 
    ON business_content_cache(expires_at);
`;

export function generateCreateTablesSQL(): string {
  return [
    BUSINESS_EMBEDDINGS_SCHEMA,
    EMBEDDING_JOBS_SCHEMA,
    EMBEDDING_METRICS_SCHEMA,
    BUSINESS_CONTENT_CACHE_SCHEMA,
  ].join('\n\n');
}

export default {
  BUSINESS_EMBEDDINGS_SCHEMA,
  EMBEDDING_JOBS_SCHEMA,
  EMBEDDING_METRICS_SCHEMA,
  BUSINESS_CONTENT_CACHE_SCHEMA,
  generateCreateTablesSQL,
};
