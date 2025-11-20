import { describe, it, expect } from 'vitest';
import { 
  BusinessSearchInputSchema, 
  BusinessLeadSchema, 
  Industry, 
  BusinessType,
  RevenueBand,
  EmployeeBand 
} from './index';

describe('Core Models', () => {
  describe('BusinessSearchInputSchema', () => {
    it('should validate a valid search input', () => {
      const input = {
        query: 'technology companies',
        industries: [Industry.TECHNOLOGY],
        revenueBands: [RevenueBand.RANGE_1M_5M],
        limit: 10,
        sortBy: 'relevance' as const
      };

      const result = BusinessSearchInputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should validate location-based search', () => {
      const input = {
        location: { lat: 37.7749, lon: -122.4194 },
        radius: 50,
        limit: 20
      };

      const result = BusinessSearchInputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should reject invalid coordinates', () => {
      const input = {
        location: { lat: 91, lon: -122.4194 } // Invalid latitude
      };

      const result = BusinessSearchInputSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should reject invalid limit', () => {
      const input = {
        limit: 1001 // Over max limit
      };

      const result = BusinessSearchInputSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });

  describe('BusinessLeadSchema', () => {
    it('should validate a complete business lead', () => {
      const lead = {
        id: 'test-123',
        name: 'Tech Corp',
        canonicalName: 'Tech Corporation',
        description: 'A technology company',
        website: 'https://techcorp.com',
        coordinates: { lat: 37.7749, lon: -122.4194 },
        industry: Industry.TECHNOLOGY,
        businessType: BusinessType.CORPORATION,
        businessMode: 'hybrid' as const,
        ownership: 'private' as const,
        revenue: 5000000,
        revenueBand: RevenueBand.RANGE_1M_5M,
        employeeCount: 50,
        employeeBand: EmployeeBand.RANGE_10_50,
        techStack: ['React', 'Node.js', 'AWS'],
        industryTags: ['SaaS', 'B2B'],
        foundedYear: 2020,
        isVerified: true
      };

      const result = BusinessLeadSchema.safeParse(lead);
      expect(result.success).toBe(true);
    });

    it('should validate a minimal business lead', () => {
      const lead = {
        id: 'minimal-123',
        name: 'Small Biz',
        canonicalName: 'Small Business',
        industry: Industry.RETAIL,
        businessType: BusinessType.SOLE_PROPRIETORSHIP,
        businessMode: 'offline' as const,
        ownership: 'private' as const
      };

      const result = BusinessLeadSchema.safeParse(lead);
      expect(result.success).toBe(true);
    });

    it('should reject invalid email', () => {
      const lead = {
        id: 'test-123',
        name: 'Tech Corp',
        canonicalName: 'Tech Corporation',
        industry: Industry.TECHNOLOGY,
        businessType: BusinessType.CORPORATION,
        businessMode: 'hybrid' as const,
        ownership: 'private' as const,
        email: 'invalid-email'
      };

      const result = BusinessLeadSchema.safeParse(lead);
      expect(result.success).toBe(false);
    });

    it('should reject invalid website URL', () => {
      const lead = {
        id: 'test-123',
        name: 'Tech Corp',
        canonicalName: 'Tech Corporation',
        industry: Industry.TECHNOLOGY,
        businessType: BusinessType.CORPORATION,
        businessMode: 'hybrid' as const,
        ownership: 'private' as const,
        website: 'not-a-url'
      };

      const result = BusinessLeadSchema.safeParse(lead);
      expect(result.success).toBe(false);
    });
  });
});