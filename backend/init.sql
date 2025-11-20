-- Create extension for UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create initial admin user with default password (change in production)
INSERT INTO admin_users (email, password_hash, role, permissions) VALUES 
(
  'admin@example.com', 
  '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj6ukx.LrUpm', -- password: admin123
  'super_admin', 
  '[
    {"resource": "data_sources", "actions": ["read", "write", "delete"]},
    {"resource": "feature_flags", "actions": ["read", "write", "delete"]},
    {"resource": "plans", "actions": ["read", "write", "delete"]},
    {"resource": "data_quality", "actions": ["read", "write"]},
    {"resource": "health_logs", "actions": ["read", "write"]}
  ]'::jsonb
) ON CONFLICT (email) DO NOTHING;

-- Create sample plans
INSERT INTO plans (name, tier, features, limits, price, active) VALUES 
(
  'Basic Plan', 
  'basic', 
  ARRAY['basic_analytics', '5_data_sources', 'email_support'], 
  '{"dataSources": 5, "apiCallsPerMonth": 10000, "storageGB": 10, "users": 5}'::jsonb, 
  0, 
  true
),
(
  'Pro Plan', 
  'pro', 
  ARRAY['advanced_analytics', '25_data_sources', 'priority_support', 'feature_flags'], 
  '{"dataSources": 25, "apiCallsPerMonth": 100000, "storageGB": 100, "users": 25}'::jsonb, 
  99.99, 
  true
),
(
  'Enterprise Plan', 
  'enterprise', 
  ARRAY['unlimited_data_sources', 'custom_integrations', 'dedicated_support', 'advanced_monitoring', 'feature_flags', 'api_access'], 
  '{"dataSources": -1, "apiCallsPerMonth": -1, "storageGB": -1, "users": -1}'::jsonb, 
  499.99, 
  true
) ON CONFLICT (name) DO NOTHING;

-- Create sample feature flags
INSERT INTO feature_flags (key, name, description, enabled, plans, tenant_overrides) VALUES 
(
  'advanced_analytics', 
  'Advanced Analytics', 
  'Enable advanced analytics and reporting features', 
  false, 
  ARRAY['pro', 'enterprise'], 
  '[]'::jsonb
),
(
  'feature_flags', 
  'Feature Flags Management', 
  'Allow users to manage feature flags', 
  false, 
  ARRAY['pro', 'enterprise'], 
  '[]'::jsonb
),
(
  'api_access', 
  'API Access', 
  'Provide API access for integrations', 
  false, 
  ARRAY['enterprise'], 
  '[]'::jsonb
) ON CONFLICT (key) DO NOTHING;

-- Create sample data sources
INSERT INTO data_sources (name, type, connector, credentials, rate_limit, enabled, health_status) VALUES 
(
  'Production Database', 
  'database', 
  'PostgreSQL', 
  '{"host": "prod-db.example.com", "port": 5432, "database": "production", "username": "app_user", "__encrypted": false}'::jsonb, 
  '{"requestsPerMinute": 100, "requestsPerHour": 5000, "requestsPerDay": 50000, "currentUsage": {"minute": 15, "hour": 200, "day": 1500}}'::jsonb, 
  true, 
  '{"status": "healthy", "errorRate": 0}'::jsonb
),
(
  'Analytics API', 
  'api', 
  'Google Analytics', 
  '{"encrypted": "encrypted_value_placeholder", "iv": "iv_placeholder", "tag": "tag_placeholder", "__encrypted": true}'::jsonb, 
  '{"requestsPerMinute": 60, "requestsPerHour": 1000, "requestsPerDay": 10000, "currentUsage": {"minute": 25, "hour": 400, "day": 3000}}'::jsonb, 
  true, 
  '{"status": "healthy", "errorRate": 0.5}'::jsonb
),
(
  'File Storage', 
  'file', 
  'Amazon S3', 
  '{"bucket": "data-bucket", "region": "us-west-2", "__encrypted": false}'::jsonb, 
  '{"requestsPerMinute": 200, "requestsPerHour": 10000, "requestsPerDay": 100000, "currentUsage": {"minute": 45, "hour": 1200, "day": 8000}}'::jsonb, 
  true, 
  '{"status": "degraded", "errorRate": 2.1}'::jsonb
) ON CONFLICT (name) DO NOTHING;

-- Create sample data quality metrics
INSERT INTO data_quality_metrics (data_source_id, region, industry, completeness, accuracy, consistency, timeliness, validity, score) 
SELECT 
  ds.id, 
  region, 
  industry, 
  random() * 30 + 70::real as completeness, 
  random() * 25 + 75::real as accuracy, 
  random() * 20 + 80::real as consistency, 
  random() * 35 + 65::real as timeliness, 
  random() * 15 + 85::real as validity,
  0 as score
FROM data_sources ds, 
 unnest(ARRAY['North America', 'Europe', 'Asia Pacific', 'Latin America']) as region,
  unnest(ARRAY['Technology', 'Healthcare', 'Finance', 'Retail', 'Manufacturing']) as industry
WHERE ds.name = 'Production Database' OR ds.name = 'Analytics API';

-- Update scores to be the average of all metrics
UPDATE data_quality_metrics 
SET score = (completeness + accuracy + consistency + timeliness + validity) / 5;

-- Create sample health logs
INSERT INTO health_logs (data_source_id, level, message, details, resolved) 
SELECT 
  ds.id, 
  level, 
  message, 
  details, 
  resolved
FROM data_sources ds, 
unnest(ARRAY[
  ('info', 'Successfully connected to data source', '{"responseTime": 150}', true),
  ('warn', 'High latency detected', '{"responseTime": 2500}', false),
  ('error', 'Connection timeout', '{"timeout": 30000}', false),
  ('info', 'Data sync completed', '{"recordsProcessed": 1500}', true),
  ('debug', 'Health check passed', '{"status": "ok"}', true)
]) as logs(level, message, details, resolved)
WHERE ds.name IN ('Production Database', 'Analytics API', 'File Storage')
ORDER BY ds.id, level;

-- Create sample moderation queue items
INSERT INTO moderation_queue (entity_type, entity_id, changes, status) VALUES 
(
  'profile', 
  (SELECT id FROM admin_users WHERE email = 'admin@example.com'), 
  '{"email": "newemail@example.com", "role": "admin"}'::jsonb, 
  'pending'
),
(
  'data', 
  (SELECT id FROM data_sources WHERE name = 'Analytics API'), 
  '{"rateLimit": {"requestsPerMinute": 120}}'::jsonb, 
  'pending'
),
(
  'config', 
  (SELECT id FROM feature_flags WHERE key = 'advanced_analytics'), 
  '{"enabled": true, "plans": ["basic", "pro", "enterprise"]}'::jsonb, 
  'approved'
);