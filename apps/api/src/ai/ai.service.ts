// apps/api/src/ai/ai.service.ts
import { Injectable } from '@nestjs/common';
import {
  AIRegistry,
  PromptBuilder,
  generationTemplate,
  ContentType,
} from '@ultra-lead-gen/ai';
import { GenerateOutreachDto, OutreachResponseDto, OutreachType } from './dto/outreach.dto';
import { GenerateSummaryDto, SummaryResponseDto, SummaryType } from './dto/summary.dto';

@Injectable()
export class AIService {
  private registry: AIRegistry;

  constructor() {
    // Initialize AI registry from environment config
    this.registry = AIRegistry.createFromEnv();
  }

  async generateOutreach(dto: GenerateOutreachDto): Promise<OutreachResponseDto> {
    const prompt = this.buildOutreachPrompt(dto);
    
    const result = await this.registry.generate({
      prompt,
      temperature: 0.7,
      maxTokens: 500,
    });

    const content = result.text;
    
    // Parse subject and body from generated content
    const lines = content.split('\n');
    let subject = '';
    let body = '';
    
    // Simple parsing - first line as subject, rest as body
    if (lines.length > 1) {
      subject = lines[0].replace(/^Subject:\s*/i, '').trim();
      body = lines.slice(1).join('\n').trim();
    } else {
      body = content;
    }

    return {
      subject,
      body,
      type: dto.type,
      metadata: {
        tone: dto.tone || 'professional',
        wordCount: body.split(/\s+/).length,
        estimatedReadTime: `${Math.ceil(body.split(/\s+/).length / 200)} min`,
      },
    };
  }

  async generateSummary(dto: GenerateSummaryDto): Promise<SummaryResponseDto> {
    const prompt = this.buildSummaryPrompt(dto);
    
    const result = await this.registry.generate({
      prompt,
      temperature: 0.5,
      maxTokens: this.getMaxTokensForLength(dto.maxLength),
    });

    const summary = result.text.trim();
    const originalLength = dto.content.length;
    const summaryLength = summary.length;
    
    // Extract key points from the summary
    const keyPoints = this.extractKeyPoints(summary);

    return {
      summary,
      type: dto.type,
      keyPoints,
      metadata: {
        originalLength,
        summaryLength,
        compressionRatio: `${Math.round((summaryLength / originalLength) * 100)}%`,
      },
    };
  }

  private buildOutreachPrompt(dto: GenerateOutreachDto): string {
    const templates: Record<OutreachType, string> = {
      [OutreachType.EMAIL]: `Write a professional cold email to ${dto.leadName} at ${dto.leadCompany}.`,
      [OutreachType.LINKEDIN]: `Write a LinkedIn connection message for ${dto.leadName} at ${dto.leadCompany}.`,
      [OutreachType.SMS]: `Write a brief SMS message to ${dto.leadName}.`,
    };

    let prompt = templates[dto.type];

    if (dto.leadTitle) {
      prompt += ` They are the ${dto.leadTitle}.`;
    }

    if (dto.productName) {
      prompt += ` We're reaching out about ${dto.productName}.`;
    }

    if (dto.valueProposition) {
      prompt += ` Key value prop: ${dto.valueProposition}.`;
    }

    prompt += `\n\nTone: ${dto.tone || 'professional'}.`;
    prompt += `\n\nFormat:\nSubject: [compelling subject line]\n\n[email body]`;

    if (dto.additionalContext) {
      prompt += `\n\nAdditional context:\n${JSON.stringify(dto.additionalContext, null, 2)}`;
    }

    return prompt;
  }

  private buildSummaryPrompt(dto: GenerateSummaryDto): string {
    const maxTokens = this.getMaxTokensForLength(dto.maxLength);
    const maxWords = Math.ceil(maxTokens / 1.5);

    let prompt = `Summarize the following ${dto.type} content in approximately ${maxWords} words.`;

    if (dto.title) {
      prompt = `Summarize "${dto.title}" in approximately ${maxWords} words.`;
    }

    if (dto.focus) {
      prompt += ` Focus on: ${dto.focus}.`;
    }

    if (dto.keyPoints?.length) {
      prompt += `\n\nKey points to include:\n${dto.keyPoints.map((p, i) => `${i + 1}. ${p}`).join('\n')}`;
    }

    prompt += `\n\nContent to summarize:\n${dto.content}`;
    prompt += `\n\nProvide a concise summary and list 3-5 key takeaways.`;

    return prompt;
  }

  private getMaxTokensForLength(length?: string): number {
    switch (length) {
      case 'short':
        return 150;
      case 'long':
        return 500;
      case 'medium':
      default:
        return 300;
    }
  }

  private extractKeyPoints(summary: string): string[] {
    // Look for numbered or bulleted lists in the summary
    const lines = summary.split('\n');
    const keyPoints: string[] = [];
    
    for (const line of lines) {
      const trimmed = line.trim();
      // Match numbered items (1., 2., etc.) or bullet points (-, *, •)
      if (/^(\d+\.\s+|[-*•]\s+)/.test(trimmed)) {
        keyPoints.push(trimmed.replace(/^(\d+\.\s+|[-*•]\s+)/, ''));
      }
    }

    // If no key points found, split summary into sentences
    if (keyPoints.length === 0) {
      const sentences = summary
        .replace(/([.!?])\s+/g, '$1|')
        .split('|')
        .filter((s) => s.trim().length > 20);
      return sentences.slice(0, 5);
    }

    return keyPoints.slice(0, 5);
  }
}
