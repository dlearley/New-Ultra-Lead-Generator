import request from 'supertest';
import app from '../../index';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

describe('CRM Controller', () => {
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
    await prisma.syncJob.deleteMany();
    await prisma.businessLead.deleteMany();
    await prisma.crmConfiguration.deleteMany();
    await prisma.organization.deleteMany();
  });

  describe('POST /api/integrations/crm/push-leads', () => {
    it('should accept push leads request', async () => {
      const response = await request(app)
        .post('/api/integrations/crm/push-leads')
        .set('x-organization-id', organizationId)
        .send({
          crmType: 'SALESFORCE',
          leads: [
            {
              email: 'test@example.com',
              firstName: 'John',
              lastName: 'Doe',
              company: 'Test Company',
            },
          ],
        });

      expect(response.status).toBe(202);
      expect(response.body.success).toBe(true);
      expect(response.body.data.jobIds).toBeDefined();
      expect(response.body.data.leadCount).toBe(1);
    });

    it('should reject request without organization ID', async () => {
      const response = await request(app)
        .post('/api/integrations/crm/push-leads')
        .send({
          crmType: 'SALESFORCE',
          leads: [
            {
              email: 'test@example.com',
            },
          ],
        });

      expect(response.status).toBe(400);
      expect(response.body.error.message).toContain('Organization ID is required');
    });

    it('should validate request body', async () => {
      const response = await request(app)
        .post('/api/integrations/crm/push-leads')
        .set('x-organization-id', organizationId)
        .send({
          crmType: 'INVALID_CRM',
        });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/integrations/crm/sync-jobs', () => {
    it('should return sync jobs list', async () => {
      // Create test sync job
      await prisma.syncJob.create({
        data: {
          organizationId,
          businessLeadId: 'test-lead-id',
          crmType: 'SALESFORCE',
          status: 'PENDING',
        },
      });

      const response = await request(app)
        .get('/api/integrations/crm/sync-jobs')
        .set('x-organization-id', organizationId);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.jobs).toHaveLength(1);
      expect(response.body.data.total).toBe(1);
    });

    it('should support pagination', async () => {
      // Create multiple test sync jobs
      for (let i = 0; i < 5; i++) {
        await prisma.syncJob.create({
          data: {
            organizationId,
            businessLeadId: `test-lead-id-${i}`,
            crmType: 'SALESFORCE',
            status: 'PENDING',
          },
        });
      }

      const response = await request(app)
        .get('/api/integrations/crm/sync-jobs?page=1&limit=3')
        .set('x-organization-id', organizationId);

      expect(response.status).toBe(200);
      expect(response.body.data.jobs).toHaveLength(3);
      expect(response.body.data.page).toBe(1);
      expect(response.body.data.limit).toBe(3);
    });
  });

  describe('POST /api/integrations/crm/test-connection', () => {
    it('should test CRM connection', async () => {
      const response = await request(app)
        .post('/api/integrations/crm/test-connection')
        .set('x-organization-id', organizationId)
        .send({
          crmType: 'SALESFORCE',
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('message');
    });

    it('should handle missing CRM configuration', async () => {
      // Delete CRM configuration
      await prisma.crmConfiguration.deleteMany();

      const response = await request(app)
        .post('/api/integrations/crm/test-connection')
        .set('x-organization-id', organizationId)
        .send({
          crmType: 'HUBSPOT',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('No active CRM configuration');
    });
  });
});