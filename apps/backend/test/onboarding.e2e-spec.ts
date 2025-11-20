import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Onboarding (e2e)', () => {
  let app: INestApplication;
  const organizationId = 'test-org-456';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /api/onboarding', () => {
    it('should get or create onboarding data', () => {
      return request(app.getHttpServer())
        .get('/api/onboarding')
        .set('organizationId', organizationId)
        .expect(200)
        .expect((res) => {
          expect(res.body.organizationId).toBe(organizationId);
          expect(res.body.orgICP).toBeDefined();
          expect(res.body.isCompleted).toBe(false);
        });
    });
  });

  describe('PUT /api/onboarding/icp', () => {
    it('should update OrgICP', () => {
      return request(app.getHttpServer())
        .put('/api/onboarding/icp')
        .set('organizationId', organizationId)
        .send({
          industries: ['Technology', 'Finance'],
          geographies: ['North America'],
          dealSizes: ['$1M-$5M'],
          personas: ['CEO', 'VP Sales'],
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.orgICP.industries).toContain('Technology');
          expect(res.body.orgICP.geographies).toContain('North America');
          expect(res.body.orgICP.aiScoring).toBeDefined();
        });
    });
  });

  describe('POST /api/onboarding/complete', () => {
    it('should complete onboarding', () => {
      return request(app.getHttpServer())
        .post('/api/onboarding/complete')
        .set('organizationId', organizationId)
        .send({
          orgICP: {
            industries: ['Technology', 'Finance'],
            geographies: ['North America', 'Europe'],
            dealSizes: ['$1M-$5M', '$5M-$10M'],
            personas: ['CEO', 'VP Sales', 'CFO'],
          },
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.isCompleted).toBe(true);
          expect(res.body.completedAt).toBeDefined();
          expect(res.body.orgICP.aiScoring).toBeDefined();
          expect(res.body.orgICP.aiScoring.score).toBeGreaterThanOrEqual(0);
        });
    });
  });

  describe('AI Scoring', () => {
    it('should calculate AI score based on ICP', async () => {
      const response = await request(app.getHttpServer())
        .put('/api/onboarding/icp')
        .set('organizationId', organizationId)
        .send({
          industries: ['Technology', 'Finance', 'Healthcare'],
          geographies: ['North America', 'Europe', 'Asia Pacific'],
          dealSizes: ['$1M-$5M', '$5M-$10M'],
          personas: ['CEO', 'VP Sales', 'CFO', 'VP Marketing'],
        });

      expect(response.status).toBe(200);
      expect(response.body.orgICP.aiScoring.score).toBeLessThanOrEqual(100);
      expect(response.body.orgICP.aiScoring.factors).toBeDefined();
      expect(Object.keys(response.body.orgICP.aiScoring.factors).length).toBeGreaterThan(0);
    });
  });
});
