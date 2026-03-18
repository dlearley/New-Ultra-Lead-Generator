import 'reflect-metadata';

// Global test setup
beforeAll(() => {
  // Setup test environment
  process.env.NODE_ENV = 'test';
  process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://test:test@localhost:5433/test';
  process.env.JWT_SECRET = 'test-secret-key';
});

afterAll(async () => {
  // Cleanup
});
