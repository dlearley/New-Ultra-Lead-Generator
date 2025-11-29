import { describe, it, expect } from 'vitest';
import { Guardrails, createGuardrails } from '../../src/guardrails/index.js';

describe('Guardrails', () => {
  describe('validateContent', () => {
    it('should allow valid content', () => {
      const guardrails = createGuardrails();
      const result = guardrails.validateContent('This is valid content');
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject content exceeding max length', () => {
      const guardrails = createGuardrails({ maxContentLength: 10 });
      const result = guardrails.validateContent('This is a very long content that exceeds the limit');
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('exceeds maximum length');
    });

    it('should allow empty config', () => {
      const guardrails = new Guardrails();
      const result = guardrails.validateContent('Any content is valid');
      expect(result.valid).toBe(true);
    });
  });

  describe('validateFilter', () => {
    it('should allow allowed filters', () => {
      const guardrails = createGuardrails({
        allowedFilters: ['filter1', 'filter2'],
      });
      const result = guardrails.validateFilter('filter1');
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject disallowed filters', () => {
      const guardrails = createGuardrails({
        allowedFilters: ['filter1', 'filter2'],
      });
      const result = guardrails.validateFilter('filter3');
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('not in allowed list');
    });

    it('should allow any filter without config', () => {
      const guardrails = createGuardrails();
      const result = guardrails.validateFilter('anyFilter');
      expect(result.valid).toBe(true);
    });
  });

  describe('validateJsonSchema', () => {
    it('should validate correct schema', () => {
      const guardrails = createGuardrails({ enforceJsonSchema: true });
      const data = { name: 'John', age: 30 };
      const schema = { name: 'string', age: 'number' };

      const result = guardrails.validateJsonSchema(data, schema);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject missing required fields', () => {
      const guardrails = createGuardrails({ enforceJsonSchema: true });
      const data = { name: 'John' };
      const schema = { name: 'string', age: 'number' };

      const result = guardrails.validateJsonSchema(data, schema);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing required field: age');
    });

    it('should reject unexpected fields', () => {
      const guardrails = createGuardrails({ enforceJsonSchema: true });
      const data = { name: 'John', age: 30, email: 'john@example.com' };
      const schema = { name: 'string', age: 'number' };

      const result = guardrails.validateJsonSchema(data, schema);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Unexpected field: email');
    });

    it('should skip validation when enforceJsonSchema is false', () => {
      const guardrails = createGuardrails({ enforceJsonSchema: false });
      const data = { name: 'John' };
      const schema = { name: 'string', age: 'number' };

      const result = guardrails.validateJsonSchema(data, schema);
      expect(result.valid).toBe(true);
    });

    it('should handle non-object data', () => {
      const guardrails = createGuardrails({ enforceJsonSchema: true });
      const result = guardrails.validateJsonSchema('string', { key: 'value' });
      expect(result.valid).toBe(true);
    });
  });

  describe('validateModel', () => {
    it('should allow allowed models', () => {
      const guardrails = createGuardrails({
        allowedModels: ['gpt-4', 'claude-3'],
      });
      const result = guardrails.validateModel('gpt-4');
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject disallowed models', () => {
      const guardrails = createGuardrails({
        allowedModels: ['gpt-4', 'claude-3'],
      });
      const result = guardrails.validateModel('gpt-3.5');
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('not in allowed list');
    });

    it('should allow any model without config', () => {
      const guardrails = createGuardrails();
      const result = guardrails.validateModel('any-model');
      expect(result.valid).toBe(true);
    });
  });

  describe('applyAllGuardrails', () => {
    it('should validate all guardrails', () => {
      const guardrails = createGuardrails({
        maxContentLength: 100,
        allowedModels: ['gpt-4'],
        enforceJsonSchema: true,
      });

      const result = guardrails.applyAllGuardrails(
        'Valid content',
        'gpt-4',
        { name: 'test' },
        { name: 'string' }
      );

      expect(result.valid).toBe(true);
    });

    it('should collect errors from all validations', () => {
      const guardrails = createGuardrails({
        maxContentLength: 10,
        allowedModels: ['gpt-4'],
        enforceJsonSchema: true,
      });

      const result = guardrails.applyAllGuardrails(
        'This is very long content that exceeds the limit',
        'gpt-3.5',
        { name: 'test', extra: 'field' },
        { name: 'string' }
      );

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should work with partial guardrails', () => {
      const guardrails = createGuardrails({
        maxContentLength: 100,
      });

      const result = guardrails.applyAllGuardrails(
        'Valid content',
        'any-model'
      );

      expect(result.valid).toBe(true);
    });

    it('should handle missing schema gracefully', () => {
      const guardrails = createGuardrails({
        enforceJsonSchema: true,
      });

      const result = guardrails.applyAllGuardrails(
        'content',
        'model'
      );

      expect(result.valid).toBe(true);
    });
  });
});
