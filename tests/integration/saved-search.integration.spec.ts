import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as request from 'supertest';
import { SavedSearch } from '@database/entities/saved-search.entity';
import { SavedSearchModule } from '@api/saved-search/saved-search.module';

describe('Saved Search Integration Tests', () => {
  let app: INestApplication;
  let repository: Repository<SavedSearch>;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [SavedSearchModule],
    }).compile();

    app = module.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();

    repository = module.get<Repository<SavedSearch>>(
      getRepositoryToken(SavedSearch),
    );
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/saved-searches', () => {
    it('should create a new saved search', async () => {
      const createDto = {
        name: 'Test Search',
        description: 'A test search',
        query: { query: 'tech' },
        filters: { industry: 'Technology' },
      };

      const response = await request(app.getHttpServer())
        .post('/api/saved-searches')
        .send(createDto)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe(createDto.name);
      expect(response.body.description).toBe(createDto.description);
      expect(response.body.query).toEqual(createDto.query);
    });

    it('should reject invalid payload', async () => {
      const invalidDto = {
        name: 'Test Search',
        query: {},
      };

      await request(app.getHttpServer())
        .post('/api/saved-searches')
        .send(invalidDto)
        .expect(400);
    });
  });

  describe('GET /api/saved-searches', () => {
    beforeEach(async () => {
      await repository.clear();
    });

    it('should list saved searches', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/saved-searches')
        .expect(200);

      expect(response.body).toHaveProperty('items');
      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('hasMore');
      expect(Array.isArray(response.body.items)).toBe(true);
    });

    it('should filter by userId', async () => {
      const userId = 'user-123';

      const response = await request(app.getHttpServer())
        .get(`/api/saved-searches?userId=${userId}`)
        .expect(200);

      expect(response.body).toHaveProperty('items');
      expect(Array.isArray(response.body.items)).toBe(true);
    });

    it('should support pagination', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/saved-searches?skip=0&take=10')
        .expect(200);

      expect(response.body.items.length).toBeLessThanOrEqual(10);
    });
  });

  describe('GET /api/saved-searches/:id', () => {
    it('should get a saved search by id', async () => {
      const createDto = {
        name: 'Test Search',
        query: { query: 'test' },
      };

      const createResponse = await request(app.getHttpServer())
        .post('/api/saved-searches')
        .send(createDto)
        .expect(201);

      const searchId = createResponse.body.id;

      const response = await request(app.getHttpServer())
        .get(`/api/saved-searches/${searchId}`)
        .expect(200);

      expect(response.body.id).toBe(searchId);
      expect(response.body.name).toBe(createDto.name);
    });

    it('should return 404 for non-existent id', async () => {
      await request(app.getHttpServer())
        .get('/api/saved-searches/non-existent-id')
        .expect(404);
    });
  });

  describe('PUT /api/saved-searches/:id', () => {
    it('should update a saved search', async () => {
      const createDto = {
        name: 'Original Name',
        query: { query: 'test' },
      };

      const createResponse = await request(app.getHttpServer())
        .post('/api/saved-searches')
        .send(createDto)
        .expect(201);

      const searchId = createResponse.body.id;

      const updateDto = {
        name: 'Updated Name',
        description: 'Updated description',
      };

      const response = await request(app.getHttpServer())
        .put(`/api/saved-searches/${searchId}`)
        .send(updateDto)
        .expect(200);

      expect(response.body.name).toBe(updateDto.name);
      expect(response.body.description).toBe(updateDto.description);
    });
  });

  describe('DELETE /api/saved-searches/:id', () => {
    it('should delete a saved search', async () => {
      const createDto = {
        name: 'Test Search',
        query: { query: 'test' },
      };

      const createResponse = await request(app.getHttpServer())
        .post('/api/saved-searches')
        .send(createDto)
        .expect(201);

      const searchId = createResponse.body.id;

      await request(app.getHttpServer())
        .delete(`/api/saved-searches/${searchId}`)
        .expect(204);

      await request(app.getHttpServer())
        .get(`/api/saved-searches/${searchId}`)
        .expect(404);
    });
  });
});
