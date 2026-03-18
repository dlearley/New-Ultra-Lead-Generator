import { Test, TestingModule } from '@nestjs/testing';
import { EnrichmentService } from '../enrichment.service';
import { PrismaService } from '../../services/prisma.service';
import { ClearbitProvider } from '../providers/clearbit.provider';
import { HunterProvider } from '../providers/hunter.provider';
import { BuiltWithProvider } from '../providers/builtwith.provider';
import { ConfigService } from '@nestjs/config';

describe('EnrichmentService', () => {
  let service: EnrichmentService;
  let prisma: PrismaService;

  const mockPrismaService = {
    contact: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    company: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    technology: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    companyTechnology: {
      upsert: jest.fn(),
    },
    enrichmentLog: {
      create: jest.fn(),
    },
    enrichmentCredit: {
      aggregate: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockClearbitProvider = {
    testConnection: jest.fn().mockResolvedValue(true),
    enrichCompany: jest.fn(),
    enrichPerson: jest.fn(),
  };

  const mockHunterProvider = {
    testConnection: jest.fn().mockResolvedValue(true),
    verifyEmail: jest.fn(),
    findEmail: jest.fn(),
  };

  const mockBuiltWithProvider = {
    testConnection: jest.fn().mockResolvedValue(true),
    detectTechnologies: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EnrichmentService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ClearbitProvider, useValue: mockClearbitProvider },
        { provide: HunterProvider, useValue: mockHunterProvider },
        { provide: BuiltWithProvider, useValue: mockBuiltWithProvider },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<EnrichmentService>(EnrichmentService);
    prisma = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  describe('getProviderStatus', () => {
    it('should return status of all providers', async () => {
      const status = await service.getProviderStatus();

      expect(status).toHaveLength(3);
      expect(status).toContainEqual({ name: 'clearbit', connected: true });
      expect(status).toContainEqual({ name: 'hunter', connected: true });
      expect(status).toContainEqual({ name: 'builtwith', connected: true });
    });
  });

  describe('enrichContact', () => {
    it('should return error if contact not found', async () => {
      mockPrismaService.contact.findUnique.mockResolvedValue(null);

      const result = await service.enrichContact('invalid-id');

      expect(result.success).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({ error: 'Contact not found' })
      );
    });

    it('should return error if insufficient credits', async () => {
      mockPrismaService.contact.findUnique.mockResolvedValue({
        id: 'contact-1',
        email: 'test@example.com',
        organizationId: 'org-1',
      });
      mockPrismaService.enrichmentCredit.aggregate.mockResolvedValue({
        _sum: { remaining: 0 },
      });

      const result = await service.enrichContact('contact-1');

      expect(result.success).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({ error: 'Insufficient enrichment credits' })
      );
    });

    it('should enrich contact with email verification', async () => {
      const contact = {
        id: 'contact-1',
        email: 'test@example.com',
        organizationId: 'org-1',
        company: null,
      };

      mockPrismaService.contact.findUnique.mockResolvedValue(contact);
      mockPrismaService.enrichmentCredit.aggregate.mockResolvedValue({
        _sum: { remaining: 10 },
      });
      mockPrismaService.enrichmentCredit.findMany.mockResolvedValue([
        { id: 'credit-1', remaining: 10 },
      ]);

      mockHunterProvider.verifyEmail.mockResolvedValue({
        result: {
          email: 'test@example.com',
          status: 'valid' as const,
          isDeliverable: true,
          isDisposable: false,
          isRoleAccount: false,
          isFreeProvider: false,
          hasMxRecord: true,
          smtpVerified: true,
          confidence: 0.95,
          source: 'hunter',
        },
      });

      mockClearbitProvider.enrichPerson.mockResolvedValue({
        result: {
          firstName: 'John',
          lastName: 'Doe',
          title: 'CEO',
          confidence: 0.9,
          source: 'clearbit',
        },
      });

      mockClearbitProvider.enrichCompany.mockResolvedValue({
        error: {
          provider: 'clearbit',
          error: 'Company not found',
          retryable: false,
        },
      });

      const result = await service.enrichContact('contact-1');

      expect(result.success).toBe(true);
      expect(result.fieldsEnriched).toContain('email_status');
      expect(mockPrismaService.contact.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'contact-1' },
          data: expect.objectContaining({ emailStatus: 'valid' }),
        })
      );
    });
  });

  describe('enrichEmail', () => {
    it('should verify email through Hunter', async () => {
      const mockResult = {
        email: 'test@example.com',
        status: 'valid' as const,
        isDeliverable: true,
        isDisposable: false,
        isRoleAccount: false,
        isFreeProvider: false,
        hasMxRecord: true,
        smtpVerified: true,
        confidence: 0.95,
        source: 'hunter',
      };

      mockHunterProvider.verifyEmail.mockResolvedValue({ result: mockResult });

      const result = await service.enrichEmail('test@example.com');

      expect(result.result).toEqual(mockResult);
      expect(mockHunterProvider.verifyEmail).toHaveBeenCalledWith('test@example.com');
    });
  });

  describe('enrichCompany', () => {
    it('should enrich company through Clearbit', async () => {
      const mockResult = {
        name: 'Acme Corp',
        domain: 'acme.com',
        industry: 'Software',
        employeeCount: 100,
        confidence: 0.9,
        source: 'clearbit',
      };

      mockClearbitProvider.enrichCompany.mockResolvedValue({ result: mockResult });

      const result = await service.enrichCompany('acme.com');

      expect(result.result).toEqual(mockResult);
      expect(mockClearbitProvider.enrichCompany).toHaveBeenCalledWith('acme.com');
    });
  });

  describe('detectTechnologies', () => {
    it('should detect technologies through BuiltWith', async () => {
      const mockResult = {
        domain: 'example.com',
        technologies: [
          { name: 'React', category: 'framework', confidence: 0.95 },
          { name: 'Node.js', category: 'platform', confidence: 0.9 },
        ],
        detectedAt: new Date(),
        source: 'builtwith',
      };

      mockBuiltWithProvider.detectTechnologies.mockResolvedValue({ result: mockResult });

      const result = await service.detectTechnologies('example.com');

      expect(result.result).toEqual(mockResult);
      expect(mockBuiltWithProvider.detectTechnologies).toHaveBeenCalledWith('example.com');
    });
  });
});
