import request from 'supertest';
import app from '../../index';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

describe('Field Mapping Controller', () => {
  let organizationId: string;

  beforeEach(async () => {
    // Create test organization
    const org = await prisma.organization.create({
      data: {
        name: 'Test Organization',
      },
    });
    organizationId = org.id;

    // Create test CRM configuration
    await prisma.crmConfiguration.create({
      data: {
        organizationId,
        crmType: 'SALESFORCE',
        isActive: true,
        credentials: {
          clientId: 'test-client-id',
          clientSecret: 'test-client-secret',
          username: 'test@example.com',
          password: 'test-password',
          securityToken: 'test-token',
        },
      },
    });
  });

  afterEach(async () => {
    // Clean up test data
    await prisma.fieldMapping.deleteMany();
    await prisma.crmConfiguration.deleteMany();
    await prisma.organization.deleteMany();
  });

  describe('POST /api/integrations/field-mappings', () => {
    it('should create field mappings', async () => {
      const response = await request(app)
        .post('/api/integrations/field-mappings')
        .set('x-organization-id', organizationId)
        .send({
          crmType: 'SALESFORCE',
          mappings: [
            {
              sourceField: 'email',
              targetField: 'Email',
              fieldType: 'EMAIL',
              isRequired: true,
            },
            {
              sourceField: 'firstName',
              targetField: 'FirstName',
              fieldType: 'STRING',
              isRequired: false,
            },
          ],
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.mappings).toHaveLength(2);
      expect(response.body.data.crmType).toBe('SALESFORCE');
    });

    it('should reject request without organization ID', async () => {
      const response = await request(app)
        .post('/api/integrations/field-mappings')
        .send({
          crmType: 'SALESFORCE',
          mappings: [],
        });

      expect(response.status).toBe(400);
      expect(response.body.error.message).toContain('Organization ID is required');
    });

    it('should validate field mapping data', async () => {
      const response = await request(app)
        .post('/api/integrations/field-mappings')
        .set('x-organization-id', organizationId)
        .send({
          crmType: 'INVALID_CRM',
          mappings: [
            {
              sourceField: 'email',
              targetField: 'Email',
              fieldType: 'INVALID_TYPE',
            },
          ],
        });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/integrations/field-mappings', () => {
    it('should return field mappings list', async () => {
      // Create test field mappings
      await prisma.fieldMapping.create({
        data: {
          organizationId,
          crmType: 'SALESFORCE',
          sourceField: 'email',
          targetField: 'Email',
          fieldType: 'EMAIL',
          isRequired: true,
        },
      });

      const response = await request(app)
        .get('/api/integrations/field-mappings')
        .set('x-organization-id', organizationId);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.mappings).toHaveLength(1);
      expect(response.body.data.mappings[0].sourceField).toBe('email');
    });

    it('should filter by CRM type', async () => {
      // Create field mappings for different CRM types
      await prisma.fieldMapping.createMany({
        data: [
          {
            organizationId,
            crmType: 'SALESFORCE',
            sourceField: 'email',
            targetField: 'Email',
            fieldType: 'EMAIL',
            isRequired: true,
          },
          {
            organizationId,
            crmType: 'HUBSPOT',
            sourceField: 'email',
            targetField: 'email',
            fieldType: 'EMAIL',
            isRequired: true,
          },
        ],
      });

      const response = await request(app)
        .get('/api/integrations/field-mappings?crmType=SALESFORCE')
        .set('x-organization-id', organizationId);

      expect(response.status).toBe(200);
      expect(response.body.data.mappings).toHaveLength(1);
      expect(response.body.data.mappings[0].crmType).toBe('SALESFORCE');
    });
  });

  describe('DELETE /api/integrations/field-mappings/:id', () => {
    it('should delete field mapping', async () => {
      // Create test field mapping
      const mapping = await prisma.fieldMapping.create({
        data: {
          organizationId,
          crmType: 'SALESFORCE',
          sourceField: 'email',
          targetField: 'Email',
          fieldType: 'EMAIL',
          isRequired: true,
        },
      });

      const response = await request(app)
        .delete(`/api/integrations/field-mappings/${mapping.id}`)
        .set('x-organization-id', organizationId);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('deleted successfully');
    });

    it('should return 404 for non-existent mapping', async () => {
      const response = await request(app)
        .delete('/api/integrations/field-mappings/non-existent-id')
        .set('x-organization-id', organizationId);

      expect(response.status).toBe(404);
      expect(response.body.error.message).toContain('Field mapping not found');
    });
  });

  describe('GET /api/integrations/field-mappings/standard-fields', () => {
    it('should return standard business lead fields', async () => {
      const response = await request(app)
        .get('/api/integrations/field-mappings/standard-fields');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.fields).toContain('email');
      expect(response.body.data.fields).toContain('firstName');
      expect(response.body.data.fields).toContain('lastName');
      expect(response.body.data.fields).toContain('phone');
      expect(response.body.data.fields).toContain('company');
    });
  });

  describe('POST /api/integrations/field-mappings/validate', () => {
    it('should validate field mappings', async () => {
      const response = await request(app)
        .post('/api/integrations/field-mappings/validate')
        .set('x-organization-id', organizationId)
        .send({
          crmType: 'SALESFORCE',
          mappings: [
            {
              sourceField: 'email',
              targetField: 'Email',
              fieldType: 'EMAIL',
              isRequired: true,
            },
          ],
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('data');
    });

    it('should handle validation errors', async () => {
      const response = await request(app)
        .post('/api/integrations/field-mappings/validate')
        .set('x-organization-id', organizationId)
        .send({
          crmType: 'SALESFORCE',
          mappings: [
            {
              sourceField: 'invalidField',
              targetField: 'InvalidField',
              fieldType: 'INVALID_TYPE',
            },
          ],
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.data.errors).toBeDefined();
    });
  });
});