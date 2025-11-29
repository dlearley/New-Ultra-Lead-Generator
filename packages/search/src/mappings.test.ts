import { describe, it, expect } from 'vitest';
import { 
  businessLeadsMapping, 
  businessLeadsIndexSettings,
  BUSINESS_LEADS_INDEX,
  customAnalyzers 
} from './mappings';

describe('Business Leads Mappings', () => {
  describe('index constants', () => {
    it('should export correct index name', () => {
      expect(BUSINESS_LEADS_INDEX).toBe('business_leads');
    });
  });

  describe('custom analyzers', () => {
    it('should define business name analyzer', () => {
      const analyzer = customAnalyzers.business_name_analyzer;
      expect(analyzer.type).toBe('custom');
      expect(analyzer.tokenizer).toBe('standard');
      expect(analyzer.filter).toContain('lowercase');
      expect(analyzer.filter).toContain('stop');
    });

    it('should define tag analyzer', () => {
      const analyzer = customAnalyzers.tag_analyzer;
      expect(analyzer.type).toBe('custom');
      expect(analyzer.tokenizer).toBe('keyword');
      expect(analyzer.filter).toContain('lowercase');
    });

    it('should define text search analyzer', () => {
      const analyzer = customAnalyzers.text_search_analyzer;
      expect(analyzer.type).toBe('custom');
      expect(analyzer.tokenizer).toBe('standard');
      expect(analyzer.filter).toContain('lowercase');
      expect(analyzer.filter).toContain('stemmer');
    });

    it('should define autocomplete analyzer', () => {
      const analyzer = customAnalyzers.autocomplete_analyzer;
      expect(analyzer.type).toBe('custom');
      expect(analyzer.tokenizer).toBe('edge_ngram');
      expect(analyzer.filter).toContain('lowercase');
    });
  });

  describe('index settings', () => {
    it('should define proper index settings', () => {
      expect(businessLeadsIndexSettings.number_of_shards).toBe(1);
      expect(businessLeadsIndexSettings.number_of_replicas).toBe(0);
      expect(businessLeadsIndexSettings.analysis).toBeDefined();
      expect(businessLeadsIndexSettings.analysis.analyzer).toBeDefined();
      expect(businessLeadsIndexSettings.analysis.tokenizer).toBeDefined();
    });
  });

  describe('field mappings', () => {
    it('should map basic identification fields', () => {
      expect(businessLeadsMapping.properties.id.type).toBe('keyword');
      expect(businessLeadsMapping.properties.name.type).toBe('text');
      expect(businessLeadsMapping.properties.name.fields.keyword.type).toBe('keyword');
      expect(businessLeadsMapping.properties.name.fields.suggest.type).toBe('completion');
    });

    it('should map business name fields with proper analyzers', () => {
      expect(businessLeadsMapping.properties.canonicalName.analyzer).toBe('business_name_analyzer');
      expect(businessLeadsMapping.properties.alternateNames.analyzer).toBe('business_name_analyzer');
    });

    it('should map location fields correctly', () => {
      expect(businessLeadsMapping.properties.coordinates.type).toBe('geo_point');
      expect(businessLeadsMapping.properties.address.type).toBe('text');
      expect(businessLeadsMapping.properties.city.type).toBe('keyword');
      expect(businessLeadsMapping.properties.country.type).toBe('keyword');
    });

    it('should map business classification fields', () => {
      expect(businessLeadsMapping.properties.industry.type).toBe('keyword');
      expect(businessLeadsMapping.properties.businessType.type).toBe('keyword');
      expect(businessLeadsMapping.properties.businessMode.type).toBe('keyword');
      expect(businessLeadsMapping.properties.ownership.type).toBe('keyword');
    });

    it('should map size metrics', () => {
      expect(businessLeadsMapping.properties.revenue.type).toBe('integer');
      expect(businessLeadsMapping.properties.employeeCount.type).toBe('integer');
      expect(businessLeadsMapping.properties.revenueBand.type).toBe('keyword');
      expect(businessLeadsMapping.properties.employeeBand.type).toBe('keyword');
    });

    it('should map tags with proper analyzers', () => {
      expect(businessLeadsMapping.properties.techStack.analyzer).toBe('tag_analyzer');
      expect(businessLeadsMapping.properties.industryTags.analyzer).toBe('tag_analyzer');
      expect(businessLeadsMapping.properties.specializations.analyzer).toBe('tag_analyzer');
      
      expect(businessLeadsMapping.properties.techStack.fields.keyword.type).toBe('keyword');
      expect(businessLeadsMapping.properties.industryTags.fields.keyword.type).toBe('keyword');
    });

    it('should map metadata fields', () => {
      expect(businessLeadsMapping.properties.foundedYear.type).toBe('integer');
      expect(businessLeadsMapping.properties.isVerified.type).toBe('boolean');
      expect(businessLeadsMapping.properties.confidence.type).toBe('float');
    });

    it('should map timestamp fields', () => {
      expect(businessLeadsMapping.properties.createdAt.type).toBe('date');
      expect(businessLeadsMapping.properties.updatedAt.type).toBe('date');
    });
  });

  describe('mapping validation', () => {
    it('should have strict dynamic mapping', () => {
      expect(businessLeadsMapping.dynamic).toBe('strict');
    });

    it('should include all required business fields', () => {
      const requiredFields = [
        'id', 'name', 'canonicalName', 'industry', 'businessType', 
        'businessMode', 'ownership', 'coordinates', 'revenue', 
        'employeeCount', 'createdAt', 'updatedAt'
      ];

      requiredFields.forEach((field: string) => {
        expect(businessLeadsMapping.properties[field as keyof typeof businessLeadsMapping.properties]).toBeDefined();
      });
    });

    it('should have proper field configurations for search', () => {
      // Name field should have multiple configurations
      expect(businessLeadsMapping.properties.name.fields).toBeDefined();
      expect(Object.keys(businessLeadsMapping.properties.name.fields)).toContain('keyword');
      expect(Object.keys(businessLeadsMapping.properties.name.fields)).toContain('suggest');
      expect(Object.keys(businessLeadsMapping.properties.name.fields)).toContain('autocomplete');
    });
  });
});