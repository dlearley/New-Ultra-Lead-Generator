import { beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import { PrismaClient } from '@prisma/client';
import { Redis } from 'ioredis';

const prisma = new PrismaClient();
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  maxRetriesPerRequest: 0, // Disable retries for tests
});

beforeAll(async () => {
  // Connect to test database
  await prisma.$connect();
  
  // Clear Redis before tests
  await redis.flushdb();
});

afterAll(async () => {
  // Clean up test database
  await prisma.businessLead.deleteMany();
  await prisma.syncJob.deleteMany();
  await prisma.fieldMapping.deleteMany();
  await prisma.crmConfiguration.deleteMany();
  await prisma.organization.deleteMany();
  
  // Disconnect
  await prisma.$disconnect();
  await redis.disconnect();
});

beforeEach(async () => {
  // Clean up before each test
  await redis.flushdb();
});

afterEach(async () => {
  // Clean up after each test
  await prisma.businessLead.deleteMany();
  await prisma.syncJob.deleteMany();
  await prisma.fieldMapping.deleteMany();
  await prisma.crmConfiguration.deleteMany();
  await prisma.organization.deleteMany();
});

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};