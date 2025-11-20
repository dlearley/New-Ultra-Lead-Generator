import type { AIMessage } from '../types/index.js';

export interface PromptTemplate {
  id: string;
  name: string;
  description: string;
  system: string;
  examples?: AIMessage[][];
  variables?: string[];
  version: string;
}

export const COMMON_PROMPT_TEMPLATES = {
  classification: {
    id: 'classification',
    name: 'Text Classification',
    description: 'Classify text into predefined categories',
    system: `You are a text classification assistant. Your task is to classify the given text into one of the provided categories. 
    
    Return ONLY the category name, nothing else.`,
    variables: ['text', 'categories'],
    version: '1.0.0',
  } as PromptTemplate,

  summarization: {
    id: 'summarization',
    name: 'Text Summarization',
    description: 'Summarize text into a concise summary',
    system: `You are a text summarization assistant. Your task is to create a concise, accurate summary of the provided text.
    
    Maintain the key information and key insights.`,
    variables: ['text', 'maxLength'],
    version: '1.0.0',
  } as PromptTemplate,

  extraction: {
    id: 'extraction',
    name: 'Information Extraction',
    description: 'Extract specific information from text',
    system: `You are an information extraction assistant. Your task is to extract the requested information from the text.
    
    Return the extracted information in a structured format.`,
    variables: ['text', 'fields'],
    version: '1.0.0',
  } as PromptTemplate,

  generation: {
    id: 'generation',
    name: 'Content Generation',
    description: 'Generate content based on a prompt',
    system: `You are a creative content generation assistant. Your task is to generate high-quality content based on the provided requirements.
    
    Be creative, coherent, and relevant.`,
    variables: ['prompt', 'style', 'tone'],
    version: '1.0.0',
  } as PromptTemplate,

  reasoning: {
    id: 'reasoning',
    name: 'Multi-step Reasoning',
    description: 'Perform multi-step reasoning and problem solving',
    system: `You are a reasoning assistant. Break down complex problems into steps.
    
    Show your reasoning process clearly and arrive at well-justified conclusions.`,
    variables: ['problem'],
    version: '1.0.0',
  } as PromptTemplate,

  jsonGeneration: {
    id: 'jsonGeneration',
    name: 'Structured JSON Generation',
    description: 'Generate structured JSON output',
    system: `You are a JSON generation assistant. Your task is to generate valid JSON output that matches the provided schema.
    
    Return ONLY valid JSON, no additional text.`,
    variables: ['schema', 'prompt'],
    version: '1.0.0',
  } as PromptTemplate,
};

export class PromptBuilder {
  private template: PromptTemplate;
  private variables: Record<string, string>;

  constructor(template: PromptTemplate) {
    this.template = template;
    this.variables = {};
  }

  set(key: string, value: string): this {
    this.variables[key] = value;
    return this;
  }

  build(): AIMessage[] {
    const systemMessage: AIMessage = {
      role: 'system',
      content: this.template.system,
    };

    let userContent = '';
    for (const varName of this.template.variables || []) {
      const value = this.variables[varName];
      if (value) {
        userContent += `${varName}: ${value}\n`;
      }
    }

    const userMessage: AIMessage = {
      role: 'user',
      content: userContent.trim(),
    };

    return [systemMessage, userMessage];
  }

  static create(templateId: string): PromptBuilder {
    const template = COMMON_PROMPT_TEMPLATES[templateId as keyof typeof COMMON_PROMPT_TEMPLATES];
    if (!template) {
      throw new Error(`Unknown prompt template: ${templateId}`);
    }
    return new PromptBuilder(template);
  }
}

export function getPromptTemplate(id: string): PromptTemplate | undefined {
  return COMMON_PROMPT_TEMPLATES[id as keyof typeof COMMON_PROMPT_TEMPLATES];
}

export function listPromptTemplates(): PromptTemplate[] {
  return Object.values(COMMON_PROMPT_TEMPLATES);
}
