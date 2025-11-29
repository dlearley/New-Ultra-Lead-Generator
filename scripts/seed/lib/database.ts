import { Pool, PoolClient } from 'pg';

let pool: Pool | null = null;

export function getPool(): Pool {
  if (!pool) {
    const connectionString =
      process.env.DATABASE_URL ||
      process.env.POSTGRES_URL ||
      'postgresql://postgres:postgres@localhost:5432/app_db';

    pool = new Pool({
      connectionString,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });
  }

  return pool;
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

export async function withTransaction<T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function truncateTables(client: PoolClient): Promise<void> {
  console.log('🧹 Truncating existing data...');

  const tables = [
    'app_public.lead_list_items',
    'app_public.lead_lists',
    'app_public.alerts',
    'app_public.saved_searches',
    'app_public.org_icp_configs',
    'app_public.social_profiles',
    'app_public.contacts',
    'app_public.businesses',
    'app_public.users',
    'app_public.organizations',
  ];

  for (const table of tables) {
    await client.query(`TRUNCATE TABLE ${table} CASCADE`);
  }

  console.log('✅ All tables truncated');
}

export async function testConnection(): Promise<boolean> {
  try {
    const pool = getPool();
    const result = await pool.query('SELECT NOW()');
    console.log('✅ Database connection successful:', result.rows[0].now);
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    return false;
  }
}
