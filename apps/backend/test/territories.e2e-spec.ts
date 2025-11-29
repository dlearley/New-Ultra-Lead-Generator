import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Territories (e2e)', () => {
  let app: INestApplication;
  const organizationId = 'test-org-123';
  let createdTerritoryId: string;

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

  describe('POST /api/territories', () => {
    it('should create a territory', () => {
      return request(app.getHttpServer())
        .post('/api/territories')
        .set('organizationId', organizationId)
        .send({
          name: 'Test Territory',
          type: 'polygon',
          polygonCoordinates: [
            { latitude: 40.7128, longitude: -74.006 },
            { latitude: 40.758, longitude: -73.9855 },
          ],
        })
        .expect(201)
        .expect((res) => {
          createdTerritoryId = res.body.id;
          expect(res.body.name).toBe('Test Territory');
          expect(res.body.type).toBe('polygon');
          expect(res.body.organizationId).toBe(organizationId);
        });
    });
  });

  describe('GET /api/territories', () => {
    it('should get all territories', () => {
      return request(app.getHttpServer())
        .get('/api/territories')
        .set('organizationId', organizationId)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBeGreaterThan(0);
        });
    });
  });

  describe('GET /api/territories/:id', () => {
    it('should get a territory by id', () => {
      return request(app.getHttpServer())
        .get(`/api/territories/${createdTerritoryId}`)
        .set('organizationId', organizationId)
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe(createdTerritoryId);
          expect(res.body.name).toBe('Test Territory');
        });
    });
  });

  describe('PUT /api/territories/:id', () => {
    it('should update a territory', () => {
      return request(app.getHttpServer())
        .put(`/api/territories/${createdTerritoryId}`)
        .set('organizationId', organizationId)
        .send({
          name: 'Updated Territory',
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.name).toBe('Updated Territory');
        });
    });
  });

  describe('DELETE /api/territories/:id', () => {
    it('should delete a territory', () => {
      return request(app.getHttpServer())
        .delete(`/api/territories/${createdTerritoryId}`)
        .set('organizationId', organizationId)
        .expect(200)
        .expect((res) => {
          expect(res.body.message).toBe('Territory deleted successfully');
        });
    });
  });
});
