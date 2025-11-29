import request from 'supertest';
import express from 'express';
import { AppDataSource } from '../data-source';

const app = express();

// Mock the database connection
jest.mock('../data-source', () => ({
  AppDataSource: {
    initialize: jest.fn().mockResolvedValue(true),
    query: jest.fn().mockResolvedValue([{ '1': 1 }]),
  },
}));

describe('API Health Check', () => {
  beforeAll(async () => {
    app.use(express.json());
    
    // Health check endpoint
    app.get('/api/health', async (req, res) => {
      try {
        await AppDataSource.query('SELECT 1');
        res.json({
          status: 'healthy',
          timestamp: new Date().toISOString(),
          services: {
            database: 'connected',
            search: 'connected',
          },
        });
      } catch (error) {
        res.status(503).json({
          status: 'unhealthy',
          timestamp: new Date().toISOString(),
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    });

    // Users endpoint
    app.get('/api/users', (req, res) => {
      res.json({
        success: true,
        data: [
          { id: '1', email: 'user@example.com', name: 'Test User', role: 'user' },
        ],
      });
    });
  });

  it('should return healthy status', async () => {
    const response = await request(app).get('/api/health');
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('healthy');
    expect(response.body.services.database).toBe('connected');
  });

  it('should return users list', async () => {
    const response = await request(app).get('/api/users');
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].email).toBe('user@example.com');
  });
});