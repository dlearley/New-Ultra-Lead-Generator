import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Alerts (e2e)', () => {
  let app: INestApplication;
  const organizationId = 'test-org-123';
  let createdTerritoryId: string;
  let createdAlertId: string;

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

  beforeEach(async () => {
    // Create a territory first
    const res = await request(app.getHttpServer())
      .post('/api/territories')
      .set('organizationId', organizationId)
      .send({
        name: 'Test Territory',
        type: 'state',
        stateCode: 'CA',
      });

    createdTerritoryId = res.body.id;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/alerts', () => {
    it('should create an alert', () => {
      return request(app.getHttpServer())
        .post('/api/alerts')
        .set('organizationId', organizationId)
        .send({
          name: 'Test Alert',
          territoryId: createdTerritoryId,
          savedSearch: {
            id: 'search-123',
            name: 'Test Search',
            criteria: {},
          },
          cadence: 'daily',
          deliveryChannels: ['email', 'in_app'],
        })
        .expect(201)
        .expect((res) => {
          createdAlertId = res.body.id;
          expect(res.body.name).toBe('Test Alert');
          expect(res.body.cadence).toBe('daily');
          expect(res.body.organizationId).toBe(organizationId);
        });
    });
  });

  describe('GET /api/alerts', () => {
    it('should get all alerts', () => {
      return request(app.getHttpServer())
        .get('/api/alerts')
        .set('organizationId', organizationId)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
        });
    });
  });

  describe('POST /api/alerts/:id/trigger', () => {
    it('should trigger an alert and create a run', () => {
      return request(app.getHttpServer())
        .post(`/api/alerts/${createdAlertId}/trigger`)
        .set('organizationId', organizationId)
        .expect(201)
        .expect((res) => {
          expect(res.body.status).toBe('pending');
          expect(res.body.alertId).toBe(createdAlertId);
        });
    });
  });

  describe('GET /api/alerts/:id/runs', () => {
    it('should get alert runs', async () => {
      // Trigger first
      await request(app.getHttpServer())
        .post(`/api/alerts/${createdAlertId}/trigger`)
        .set('organizationId', organizationId);

      // Get runs
      return request(app.getHttpServer())
        .get(`/api/alerts/${createdAlertId}/runs`)
        .set('organizationId', organizationId)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
        });
    });
  });

  describe('PUT /api/alerts/:id', () => {
    it('should update an alert', () => {
      return request(app.getHttpServer())
        .put(`/api/alerts/${createdAlertId}`)
        .set('organizationId', organizationId)
        .send({
          name: 'Updated Alert',
          cadence: 'weekly',
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.name).toBe('Updated Alert');
          expect(res.body.cadence).toBe('weekly');
        });
    });
  });

  describe('DELETE /api/alerts/:id', () => {
    it('should delete an alert', () => {
      return request(app.getHttpServer())
        .delete(`/api/alerts/${createdAlertId}`)
        .set('organizationId', organizationId)
        .expect(200)
        .expect((res) => {
          expect(res.body.message).toBe('Alert deleted successfully');
        });
    });
  });
});
