import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { DataSource } from 'typeorm';
import { Client } from '@opensearch-project/opensearch';

const app = express();
const PORT = process.env.PORT || 3002;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Database connection
const dataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_NAME || 'multiservice',
  synchronize: false,
  logging: process.env.NODE_ENV === 'development',
});

// OpenSearch client
const openSearchClient = new Client({
  node: process.env.OPENSEARCH_URL || 'http://localhost:9200',
});

// Health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    // Check database connection
    await dataSource.query('SELECT 1');
    
    // Check OpenSearch connection
    await openSearchClient.ping();
    
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

// API routes
app.get('/api/users', (req, res) => {
  res.json({
    success: true,
    data: [
      { id: '1', email: 'user@example.com', name: 'Test User', role: 'user' },
    ],
  });
});

// Initialize database and start server
async function startServer() {
  try {
    await dataSource.initialize();
    console.log('Database connection established');
    
    app.listen(PORT, () => {
      console.log(`API server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();