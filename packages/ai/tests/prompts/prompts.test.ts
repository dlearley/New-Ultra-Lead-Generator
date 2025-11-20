import { describe, it, expect } from 'vitest';
import {
  PromptBuilder,
  COMMON_PROMPT_TEMPLATES,
  getPromptTemplate,
  listPromptTemplates,
} from '../../src/prompts/index.js';

describe('Prompt Templates', () => {
  describe('COMMON_PROMPT_TEMPLATES', () => {
    it('should define classification template', () => {
      const template = COMMON_PROMPT_TEMPLATES.classification;
      expect(template).toBeDefined();
      expect(template.id).toBe('classification');
      expect(template.system).toBeDefined();
    });

    it('should define summarization template', () => {
      const template = COMMON_PROMPT_TEMPLATES.summarization;
      expect(template).toBeDefined();
      expect(template.id).toBe('summarization');
    });

    it('should define extraction template', () => {
      const template = COMMON_PROMPT_TEMPLATES.extraction;
      expect(template).toBeDefined();
      expect(template.id).toBe('extraction');
    });

    it('should define generation template', () => {
      const template = COMMON_PROMPT_TEMPLATES.generation;
      expect(template).toBeDefined();
      expect(template.id).toBe('generation');
    });

    it('should define reasoning template', () => {
      const template = COMMON_PROMPT_TEMPLATES.reasoning;
      expect(template).toBeDefined();
      expect(template.id).toBe('reasoning');
    });

    it('should define jsonGeneration template', () => {
      const template = COMMON_PROMPT_TEMPLATES.jsonGeneration;
      expect(template).toBeDefined();
      expect(template.id).toBe('jsonGeneration');
    });
  });

  describe('PromptBuilder', () => {
    it('should create builder from template', () => {
      const builder = PromptBuilder.create('classification');
      expect(builder).toBeDefined();
    });

    it('should set variables', () => {
      const messages = PromptBuilder.create('classification')
        .set('text', 'sample text')
        .set('categories', 'A, B, C')
        .build();

      expect(messages).toHaveLength(2);
      expect(messages[0].role).toBe('system');
      expect(messages[1].role).toBe('user');
    });

    it('should build message array with system and user roles', () => {
      const messages = PromptBuilder.create('summarization')
        .set('text', 'Long text to summarize')
        .build();

      expect(messages).toHaveLength(2);
      expect(messages[0].role).toBe('system');
      expect(messages[1].role).toBe('user');
    });

    it('should include system message content', () => {
      const messages = PromptBuilder.create('classification').build();
      expect(messages[0].content).toContain('classify');
    });

    it('should include user content with variables', () => {
      const messages = PromptBuilder.create('summarization')
        .set('text', 'Test content')
        .set('maxLength', '100')
        .build();

      const userContent = messages[1].content;
      expect(userContent).toContain('text');
      expect(userContent).toContain('Test content');
      expect(userContent).toContain('maxLength');
      expect(userContent).toContain('100');
    });

    it('should handle missing variables gracefully', () => {
      const messages = PromptBuilder.create('classification')
        .set('text', 'sample')
        .build();

      expect(messages).toHaveLength(2);
      expect(messages[1].content).toBeDefined();
    });

    it('should throw for unknown template', () => {
      expect(() => PromptBuilder.create('unknown')).toThrow();
    });

    it('should chain method calls', () => {
      const messages = PromptBuilder.create('generation')
        .set('prompt', 'Generate a story')
        .set('style', 'fantasy')
        .set('tone', 'mysterious')
        .build();

      expect(messages).toHaveLength(2);
    });
  });

  describe('getPromptTemplate', () => {
    it('should retrieve template by id', () => {
      const template = getPromptTemplate('classification');
      expect(template).toBeDefined();
      expect(template?.id).toBe('classification');
    });

    it('should return undefined for unknown template', () => {
      const template = getPromptTemplate('unknown');
      expect(template).toBeUndefined();
    });

    it('should return template with all required fields', () => {
      const template = getPromptTemplate('extraction');
      expect(template).toBeDefined();
      expect(template?.id).toBeDefined();
      expect(template?.name).toBeDefined();
      expect(template?.description).toBeDefined();
      expect(template?.system).toBeDefined();
      expect(template?.version).toBeDefined();
    });
  });

  describe('listPromptTemplates', () => {
    it('should return array of templates', () => {
      const templates = listPromptTemplates();
      expect(Array.isArray(templates)).toBe(true);
      expect(templates.length).toBeGreaterThan(0);
    });

    it('should include all predefined templates', () => {
      const templates = listPromptTemplates();
      const ids = templates.map((t) => t.id);

      expect(ids).toContain('classification');
      expect(ids).toContain('summarization');
      expect(ids).toContain('extraction');
      expect(ids).toContain('generation');
      expect(ids).toContain('reasoning');
      expect(ids).toContain('jsonGeneration');
    });

    it('should return templates with complete definitions', () => {
      const templates = listPromptTemplates();
      templates.forEach((template) => {
        expect(template.id).toBeDefined();
        expect(template.name).toBeDefined();
        expect(template.description).toBeDefined();
        expect(template.system).toBeDefined();
        expect(template.version).toBeDefined();
      });
    });
  });

  describe('specific template scenarios', () => {
    it('should build JSON generation prompt correctly', () => {
      const messages = PromptBuilder.create('jsonGeneration')
        .set('schema', '{"type": "object", "properties": {"name": "string"}}')
        .set('prompt', 'Generate a person object')
        .build();

      expect(messages[0].content).toContain('JSON');
      expect(messages[1].content).toContain('schema');
    });

    it('should build reasoning prompt correctly', () => {
      const messages = PromptBuilder.create('reasoning')
        .set('problem', 'Solve this math problem')
        .build();

      expect(messages[0].content).toContain('reasoning');
      expect(messages[0].content).toContain('steps');
    });

    it('should build classification prompt correctly', () => {
      const messages = PromptBuilder.create('classification')
        .set('text', 'Review text')
        .set('categories', 'positive, negative, neutral')
        .build();

      expect(messages[0].content).toContain('classify');
      expect(messages[1].content).toContain('text');
    });
  });
});
