import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BillingService } from '../billing.service';
import { AuditLogService } from '../audit-log.service';
import { BillingEntity, BillingStatus, BillingPlan } from '../../entities/billing.entity';

describe('BillingService', () => {
  let service: BillingService;
  let repository: Repository<BillingEntity>;
  let auditLogService: AuditLogService;

  const mockBillingRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    createQueryBuilder: jest.fn(),
    merge: jest.fn(),
  };

  const mockAuditLogService = {
    createLog: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BillingService,
        {
          provide: getRepositoryToken(BillingEntity),
          useValue: mockBillingRepository,
        },
        {
          provide: AuditLogService,
          useValue: mockAuditLogService,
        },
      ],
    }).compile();

    service = module.get<BillingService>(BillingService);
    repository = module.get<Repository<BillingEntity>>(getRepositoryToken(BillingEntity));
    auditLogService = module.get<AuditLogService>(AuditLogService);
  });

  describe('createBilling', () => {
    it('should create a billing record', async () => {
      const dto = {
        organizationId: 'org-123',
        status: BillingStatus.TRIAL,
        plan: BillingPlan.STARTER,
      };

      const savedBilling = {
        id: 'billing-123',
        ...dto,
      };

      mockBillingRepository.findOne.mockResolvedValue(null);
      mockBillingRepository.create.mockReturnValue(dto);
      mockBillingRepository.save.mockResolvedValue(savedBilling);

      const result = await service.createBilling(dto);

      expect(result).toEqual(savedBilling);
      expect(mockAuditLogService.createLog).toHaveBeenCalled();
    });

    it('should throw error if billing already exists', async () => {
      const dto = {
        organizationId: 'org-123',
        status: BillingStatus.TRIAL,
        plan: BillingPlan.STARTER,
      };

      mockBillingRepository.findOne.mockResolvedValue({ id: 'existing' });

      await expect(service.createBilling(dto)).rejects.toThrow();
    });
  });

  describe('getBillingByOrganization', () => {
    it('should retrieve billing by organization ID', async () => {
      const billing = {
        id: 'billing-123',
        organizationId: 'org-123',
        status: BillingStatus.PAID,
      };

      mockBillingRepository.findOne.mockResolvedValue(billing);

      const result = await service.getBillingByOrganization('org-123');

      expect(result).toEqual(billing);
      expect(mockBillingRepository.findOne).toHaveBeenCalledWith({
        where: { organizationId: 'org-123' },
      });
    });

    it('should throw error if billing not found', async () => {
      mockBillingRepository.findOne.mockResolvedValue(null);

      await expect(service.getBillingByOrganization('org-123')).rejects.toThrow();
    });
  });
});
