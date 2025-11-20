import type { GuardrailsConfig } from '../types/index.js';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export class Guardrails {
  private config: GuardrailsConfig;

  constructor(config?: GuardrailsConfig) {
    this.config = config || {};
  }

  validateContent(content: string): ValidationResult {
    const errors: string[] = [];

    if (this.config.maxContentLength && content.length > this.config.maxContentLength) {
      errors.push(
        `Content exceeds maximum length of ${this.config.maxContentLength} characters`
      );
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  validateFilter(filter: string): ValidationResult {
    const errors: string[] = [];

    if (this.config.allowedFilters && !this.config.allowedFilters.includes(filter)) {
      errors.push(
        `Filter '${filter}' is not in allowed list: ${this.config.allowedFilters.join(', ')}`
      );
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  validateJsonSchema(data: unknown, schema: Record<string, unknown>): ValidationResult {
    const errors: string[] = [];

    if (this.config.enforceJsonSchema && typeof data === 'object' && data !== null) {
      const dataObj = data as Record<string, unknown>;
      
      for (const key in schema) {
        if (!(key in dataObj)) {
          errors.push(`Missing required field: ${key}`);
        }
      }

      for (const key in dataObj) {
        if (!(key in schema)) {
          errors.push(`Unexpected field: ${key}`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  validateModel(model: string): ValidationResult {
    const errors: string[] = [];

    if (this.config.allowedModels && !this.config.allowedModels.includes(model)) {
      errors.push(
        `Model '${model}' is not in allowed list: ${this.config.allowedModels.join(', ')}`
      );
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  applyAllGuardrails(
    content: string,
    model: string,
    data?: unknown,
    schema?: Record<string, unknown>
  ): ValidationResult {
    const allErrors: string[] = [];

    const contentResult = this.validateContent(content);
    if (!contentResult.valid) {
      allErrors.push(...contentResult.errors);
    }

    const modelResult = this.validateModel(model);
    if (!modelResult.valid) {
      allErrors.push(...modelResult.errors);
    }

    if (data && schema) {
      const schemaResult = this.validateJsonSchema(data, schema);
      if (!schemaResult.valid) {
        allErrors.push(...schemaResult.errors);
      }
    }

    return {
      valid: allErrors.length === 0,
      errors: allErrors,
    };
  }
}

export const createGuardrails = (config?: GuardrailsConfig): Guardrails => {
  return new Guardrails(config);
};
