import { describe, it, expect, beforeEach } from 'vitest';
import { version, Database, createDatabase } from './index';

describe('@monorepo/db', () => {
  let db: Database;

  beforeEach(() => {
    const config = {
      host: 'localhost',
      port: 5432,
      database: 'test',
      username: 'user',
      password: 'password',
    };
    db = createDatabase(config);
  });

  it('should export version', () => {
    expect(version).toBe('0.0.1');
  });

  it('should create Database', () => {
    expect(db).toBeDefined();
    expect(db.config.database).toBe('test');
  });

  it('should return empty query result', async () => {
    const result = await db.query('SELECT * FROM users');
    expect(result.data).toEqual([]);
    expect(result.count).toBe(0);
  });
});
