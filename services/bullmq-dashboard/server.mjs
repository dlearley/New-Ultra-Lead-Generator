import express from 'express';
import basicAuth from 'basic-auth';
import { Queue } from 'bullmq';
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter.js';
import { ExpressAdapter } from '@bull-board/express';
import IORedis from 'ioredis';

const {
  REDIS_HOST = 'redis',
  REDIS_PORT = '6379',
  REDIS_PASSWORD = '',
  BULLMQ_DASHBOARD_PORT = '3002',
  BULLMQ_DASHBOARD_USERNAME = 'ops',
  BULLMQ_DASHBOARD_PASSWORD = 'super-secret',
  BULLMQ_QUEUES = 'default'
} = process.env;

const redis = new IORedis({
  host: REDIS_HOST,
  port: Number(REDIS_PORT),
  password: REDIS_PASSWORD || undefined,
  enableReadyCheck: true,
  maxRetriesPerRequest: null
});

const queueNames = BULLMQ_QUEUES.split(',')
  .map((name) => name.trim())
  .filter(Boolean);

const queues = queueNames.map((name) => new Queue(name, { connection: redis }));
const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/');
createBullBoard({
  queues: queues.map((queue) => new BullMQAdapter(queue)),
  serverAdapter
});

const app = express();

app.get('/healthz', async (_req, res) => {
  try {
    await redis.ping();
    res.json({ status: 'ok', queues: queueNames });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

app.use((req, res, next) => {
  if (!BULLMQ_DASHBOARD_USERNAME && !BULLMQ_DASHBOARD_PASSWORD) {
    return next();
  }

  const credentials = basicAuth(req);
  if (!credentials) {
    res.set('WWW-Authenticate', 'Basic realm="BullMQ Dashboard"');
    return res.status(401).send('Authentication required');
  }

  const isValid =
    credentials.name === BULLMQ_DASHBOARD_USERNAME &&
    credentials.pass === BULLMQ_DASHBOARD_PASSWORD;

  if (!isValid) {
    res.set('WWW-Authenticate', 'Basic realm="BullMQ Dashboard"');
    return res.status(401).send('Invalid credentials');
  }

  return next();
});

app.use('/', serverAdapter.getRouter());

const server = app.listen(Number(BULLMQ_DASHBOARD_PORT), () => {
  console.log(
    `BullMQ dashboard listening on http://0.0.0.0:${BULLMQ_DASHBOARD_PORT} (queues: ${queueNames.join(', ') || 'none'})`
  );
});

const handleShutdown = async () => {
  await Promise.all(queues.map((queue) => queue.close()));
  await redis.quit();
  server.close(() => process.exit(0));
};

process.on('SIGTERM', handleShutdown);
process.on('SIGINT', handleShutdown);
