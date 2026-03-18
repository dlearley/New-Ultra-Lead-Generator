import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../app.module';

describe('Enrichment API (e2e)', () => {
  let app: INestApplication;
  let authToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // Create test user and get auth token
    const registerResponse = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: 'test@example.com',
        password: 'TestPassword123!',
        firstName: 'Test',
        lastName: 'User',
      });

    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'test@example.com',
        password: 'TestPassword123!',
      });

    authToken = loginResponse.body.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /enrichment/status', () => {
    it('should return provider status when authenticated', async () => {
      const response = await request(app.getHttpServer())
        .get('/enrichment/status')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('providers');
      expect(response.body).toHaveProperty('allConnected');
      expect(Array.isArray(response.body.providers)).toBe(true);
    });

    it('should return 401 when not authenticated', async () => {
      await request(app.getHttpServer()).get('/enrichment/status').expect(401);
    });
  });

  describe('POST /enrichment/email/verify', () => {
    it('should verify email when authenticated', async () => {
      const response = await request(app.getHttpServer())
        .post('/enrichment/email/verify')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ email: 'test@example.com' })
        .expect(201);

      expect(response.body).toHaveProperty('result');
      expect(response.body.result).toHaveProperty('email');
      expect(response.body.result).toHaveProperty('status');
    });

    it('should return 400 for invalid email', async () => {
      await request(app.getHttpServer())
        .post('/enrichment/email/verify')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ email: 'invalid-email' })
        .expect(400);
    });
  });

  describe('POST /enrichment/company', () => {
    it('should enrich company when authenticated', async () => {
      const response = await request(app.getHttpServer())
        .post('/enrichment/company')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ domain: 'example.com' })
        .expect(201);

      expect(response.body).toHaveProperty('result');
    });

    it('should return 400 for invalid domain', async () => {
      await request(app.getHttpServer())
        .post('/enrichment/company')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ domain: '' })
        .expect(400);
    });
  });

  describe('POST /enrichment/technologies', () => {
    it('should detect technologies when authenticated', async () => {
      const response = await request(app.getHttpServer())
        .post('/enrichment/technologies')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ domain: 'example.com' })
        .expect(201);

      expect(response.body).toHaveProperty('result');
    });
  });

  describe('POST /enrichment/find-email', () => {
    it('should find email when authenticated', async () => {
      const response = await request(app.getHttpServer())
        .post('/enrichment/find-email')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          domain: 'example.com',
          firstName: 'John',
          lastName: 'Doe',
        })
        .expect(201);

      expect(response.body).toBeDefined();
    });

    it('should return 400 when domain is missing', async () => {
      await request(app.getHttpServer())
        .post('/enrichment/find-email')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ firstName: 'John' })
        .expect(400);
    });
  });
});
