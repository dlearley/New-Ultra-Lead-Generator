import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../services/prisma.service';

export interface AIEmailRequest {
  purpose: 'intro' | 'follow_up' | 'breakup' | 'meeting_request' | 'value_proposition';
  contact: {
    firstName: string;
    lastName?: string;
    jobTitle?: string;
    company?: string;
    industry?: string;
  };
  company?: {
    name: string;
    industry?: string;
    size?: string;
  };
  context?: {
    previousInteraction?: string;
    triggerEvent?: string;
    mutualConnection?: string;
    referral?: string;
  };
  tone?: 'professional' | 'casual' | 'friendly' | 'formal' | 'enthusiastic';
  length?: 'short' | 'medium' | 'long';
  customInstructions?: string;
}

export interface AIEmailResult {
  subject: string;
  body: string;
  personalizationTips: string[];
  alternativeSubjects: string[];
  confidenceScore: number;
}

export interface SubjectLineSuggestion {
  subject: string;
  predictedOpenRate: number;
  tone: string;
  emoji: boolean;
}

@Injectable()
export class AIEmailWriterService {
  private readonly logger = new Logger(AIEmailWriterService.name);
  private openAIKey: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    this.openAIKey = this.configService.get('OPENAI_API_KEY') || '';
  }

  // ============================================================
  // AI EMAIL GENERATION
  // ============================================================

  async generateEmail(request: AIEmailRequest): Promise<AIEmailResult> {
    const prompt = this.buildPrompt(request);
    
    try {
      // Call OpenAI API
      const response = await this.callOpenAI(prompt);
      
      // Parse and enhance the response
      const result = this.parseAIResponse(response, request);
      
      // Log the generation
      await this.logAIGeneration(request, result);
      
      return result;
    } catch (error) {
      this.logger.error('AI email generation failed:', error);
      
      // Fallback to template-based generation
      return this.generateFallbackEmail(request);
    }
  }

  private buildPrompt(request: AIEmailRequest): string {
    const { purpose, contact, company, context, tone, length, customInstructions } = request;
    
    const lengthGuide = {
      short: '50-75 words',
      medium: '100-150 words',
      long: '200-300 words',
    };
    
    const purposeGuide = {
      intro: 'First-time introduction, establish credibility and value',
      follow_up: 'Follow up on previous interaction or content',
      breakup: 'Final attempt, professional closure',
      meeting_request: 'Request a meeting or demo',
      value_proposition: 'Share specific value or insight',
    };
    
    let prompt = `Write a ${tone || 'professional'} cold email for B2B sales outreach.

PURPOSE: ${purposeGuide[purpose]}
TONE: ${tone || 'professional'}
LENGTH: ${lengthGuide[length || 'medium']}

RECIPIENT:
- Name: ${contact.firstName} ${contact.lastName || ''}
- Title: ${contact.jobTitle || 'Unknown'}
- Company: ${contact.company || company?.name || 'Unknown'}
${contact.industry ? `- Industry: ${contact.industry}` : ''}

${company ? `TARGET COMPANY:
- Name: ${company.name}
${company.industry ? `- Industry: ${company.industry}` : ''}
${company.size ? `- Size: ${company.size}` : ''}` : ''}

${context?.previousInteraction ? `PREVIOUS INTERACTION: ${context.previousInteraction}` : ''}
${context?.triggerEvent ? `TRIGGER EVENT: ${context.triggerEvent}` : ''}
${context?.referral ? `REFERRAL: ${context.referral}` : ''}
${customInstructions ? `CUSTOM INSTRUCTIONS: ${customInstructions}` : ''}

REQUIREMENTS:
1. Write a compelling subject line (max 60 characters)
2. Personalize using recipient's name and company
3. Reference their role/industry if known
4. Include a clear, low-friction call-to-action
5. Keep paragraphs short (2-3 lines max)
6. Avoid spam trigger words (free, guarantee, act now, etc.)
7. Make it sound human, not salesy

OUTPUT FORMAT:
Subject: [subject line]

Body:
[email body]

Personalization Tips:
- [tip 1]
- [tip 2]

Alternative Subjects:
1. [alternative 1]
2. [alternative 2]
3. [alternative 3]`;

    return prompt;
  }

  private async callOpenAI(prompt: string): Promise<string> {
    // Mock implementation - in production, call actual OpenAI API
    // const response = await fetch('https://api.openai.com/v1/chat/completions', {
    //   method: 'POST',
    //   headers: {
    //     'Authorization': `Bearer ${this.openAIKey}`,
    //     'Content-Type': 'application/json',
    //   },
    //   body: JSON.stringify({
    //     model: 'gpt-4',
    //     messages: [{ role: 'user', content: prompt }],
    //     temperature: 0.7,
    //     max_tokens: 800,
    //   }),
    // });
    
    // Mock response for now
    return this.generateMockAIResponse(prompt);
  }

  private generateMockAIResponse(prompt: string): string {
    // Extract name from prompt
    const nameMatch = prompt.match(/Name: ([^\n]+)/);
    const name = nameMatch ? nameMatch[1].trim() : 'there';
    const firstName = name.split(' ')[0];
    
    return `Subject: Quick question about {{company}}'s growth plans

Body:
Hi ${firstName},

I noticed {{company}} has been expanding rapidly in the {{industry}} space. Impressive growth!

I'm reaching out because we've helped similar companies like {{similarCompany1}} and {{similarCompany2}} streamline their lead generation process, resulting in a 40% increase in qualified pipeline.

Given your role as {{jobTitle}}, I thought you might be interested in how we did it.

Worth a brief conversation next week?

Best,
[Your name]

Personalization Tips:
- Mention a specific recent company achievement or news
- Reference their LinkedIn activity or content they've shared
- Connect to their specific industry challenges

Alternative Subjects:
1. {{company}} + {{yourCompany}} = faster growth?
2. Idea for {{company}}'s sales team
3. Saw {{company}}'s expansion - congrats!`;
  }

  private parseAIResponse(response: string, request: AIEmailRequest): AIEmailResult {
    const lines = response.split('\n');
    
    let subject = '';
    let body = '';
    let inBody = false;
    const personalizationTips: string[] = [];
    const alternativeSubjects: string[] = [];
    
    for (const line of lines) {
      if (line.startsWith('Subject:')) {
        subject = line.replace('Subject:', '').trim();
      } else if (line.includes('Body:')) {
        inBody = true;
      } else if (line.includes('Personalization Tips:')) {
        inBody = false;
      } else if (line.includes('Alternative Subjects:')) {
        // Continue to collect alternatives
      } else if (line.trim().startsWith('-') && !inBody) {
        personalizationTips.push(line.trim().substring(1).trim());
      } else if (/^\d+\./.test(line.trim()) && !inBody) {
        alternativeSubjects.push(line.trim().replace(/^\d+\.\s*/, ''));
      } else if (inBody) {
        body += line + '\n';
      }
    }
    
    return {
      subject: subject || 'Following up',
      body: body.trim(),
      personalizationTips,
      alternativeSubjects,
      confidenceScore: 0.85,
    };
  }

  // ============================================================
  // SUBJECT LINE OPTIMIZATION
  // ============================================================

  async suggestSubjectLines(
    context: {
      purpose: string;
      company?: string;
      industry?: string;
    },
    count: number = 5,
  ): Promise<SubjectLineSuggestion[]> {
    const subjects: SubjectLineSuggestion[] = [
      {
        subject: context.company 
          ? `Quick question about ${context.company}'s growth` 
          : 'Quick question about your growth plans',
        predictedOpenRate: 42,
        tone: 'curiosity',
        emoji: false,
      },
      {
        subject: context.company
          ? `${context.company} + our solution = faster pipeline?`
          : 'Faster pipeline generation?',
        predictedOpenRate: 38,
        tone: 'benefit-driven',
        emoji: false,
      },
      {
        subject: context.industry
          ? `${context.industry} leaders are using this...`
          : 'How top performers are winning more deals',
        predictedOpenRate: 45,
        tone: 'social-proof',
        emoji: false,
      },
      {
        subject: 'Idea for your sales team',
        predictedOpenRate: 35,
        tone: 'value-first',
        emoji: false,
      },
      {
        subject: 'Saw your expansion - congrats! 🎉',
        predictedOpenRate: 48,
        tone: 'personal',
        emoji: true,
      },
    ];
    
    return subjects.slice(0, count);
  }

  async scoreSubjectLine(subject: string): Promise<{
    score: number;
    issues: string[];
    suggestions: string[];
  }> {
    const issues: string[] = [];
    const suggestions: string[] = [];
    let score = 100;
    
    // Check length
    if (subject.length > 60) {
      issues.push('Subject is too long');
      suggestions.push('Keep under 60 characters for mobile');
      score -= 15;
    }
    
    // Check for spam words
    const spamWords = ['free', 'guarantee', 'act now', 'limited time', 'urgent', 'winner'];
    for (const word of spamWords) {
      if (subject.toLowerCase().includes(word)) {
        issues.push(`Contains spam trigger word: "${word}"`);
        suggestions.push(`Replace "${word}" with alternative`);
        score -= 20;
      }
    }
    
    // Check for all caps
    if (subject === subject.toUpperCase() && subject.length > 3) {
      issues.push('All caps detected');
      suggestions.push('Use sentence case instead');
      score -= 15;
    }
    
    // Check for excessive punctuation
    const exclamationCount = (subject.match(/!/g) || []).length;
    if (exclamationCount > 1) {
      issues.push('Too many exclamation marks');
      suggestions.push('Use max 1 exclamation mark');
      score -= 10;
    }
    
    // Check for personalization placeholder
    if (!subject.includes('{{') && !subject.includes('{{company}}')) {
      suggestions.push('Consider adding personalization');
    }
    
    // Positive signals
    if (subject.includes('?')) {
      score += 5; // Questions perform well
    }
    
    if (subject.length >= 30 && subject.length <= 50) {
      score += 5; // Optimal length
    }
    
    return {
      score: Math.max(0, Math.min(100, score)),
      issues,
      suggestions,
    };
  }

  // ============================================================
  // PERSONALIZATION SUGGESTIONS
  // ============================================================

  async getPersonalizationSuggestions(
    contactId: string,
  ): Promise<{
    suggestions: Array<{
      type: string;
      data: string;
      howToUse: string;
    }>;
    icebreakers: string[];
  }> {
    // In production, this would analyze:
    // - LinkedIn profile
    // - Recent company news
    // - Previous interactions
    // - Content they've engaged with
    
    return {
      suggestions: [
        {
          type: 'company_news',
          data: 'Company recently announced Series B funding',
          howToUse: 'Reference their growth and how you can help scale',
        },
        {
          type: 'linkedin_activity',
          data: 'Posted about sales automation challenges',
          howToUse: 'Reference their post and offer insights',
        },
        {
          type: 'mutual_connection',
          data: 'Connected with Sarah Johnson (VP Sales at SimilarCo)',
          howToUse: 'Mention Sarah as a mutual connection',
        },
      ],
      icebreakers: [
        'Saw your recent post about scaling the sales team - great insights!',
        'Congrats on the recent funding announcement!',
        'Noticed you\'re connected with Sarah Johnson - small world!',
      ],
    };
  }

  // ============================================================
  // EMAIL VARIANTS
  // ============================================================

  async generateVariants(
    baseEmail: string,
    variants: ('subject' | 'opening' | 'cta' | 'tone')[],
  ): Promise<Record<string, string>> {
    const results: Record<string, string> = {};
    
    if (variants.includes('subject')) {
      results.subjectA = 'Original: ' + baseEmail.split('\n')[0];
      results.subjectB = 'Alternative: Quick question about your growth';
    }
    
    if (variants.includes('opening')) {
      results.openingA = 'Original opening paragraph';
      results.openingB = 'Alternative: Direct value prop opening';
    }
    
    if (variants.includes('cta')) {
      results.ctaA = 'Original: Worth a brief conversation next week?';
      results.ctaB = 'Alternative: Are you open to a 15-min call Tuesday?';
    }
    
    return results;
  }

  // ============================================================
  // FALLBACK GENERATION
  // ============================================================

  private generateFallbackEmail(request: AIEmailRequest): AIEmailResult {
    const { purpose, contact, company } = request;
    const firstName = contact.firstName || 'there';
    const companyName = company?.name || contact.company || 'your company';
    
    const templates: Record<string, AIEmailResult> = {
      intro: {
        subject: `Quick question about ${companyName}`,
        body: `Hi ${firstName},

I hope this email finds you well. I came across ${companyName} and was impressed by your work in the industry.

I\'m reaching out because we\'ve helped similar companies streamline their lead generation process and increase qualified pipeline by 40%.

Would you be open to a brief conversation about how we might help ${companyName} achieve similar results?

Best regards,`,
        personalizationTips: ['Reference specific company achievements', 'Mention their industry challenges'],
        alternativeSubjects: [
          `${companyName} + lead generation = growth?`,
          'Idea for your sales team',
          'Following up on your expansion',
        ],
        confidenceScore: 0.7,
      },
      follow_up: {
        subject: 'Following up on my previous note',
        body: `Hi ${firstName},

Just circling back on my previous email about helping ${companyName} with lead generation.

I know things get busy, so I wanted to make sure this didn\'t slip through the cracks.

Would a quick 15-minute call next week work for you?

Best,`,
        personalizationTips: ['Reference previous email content', 'Acknowledge their busy schedule'],
        alternativeSubjects: [
          'Quick follow-up',
          '15 minutes next week?',
          'Did my email get buried?',
        ],
        confidenceScore: 0.7,
      },
      breakup: {
        subject: 'Should I close your file?',
        body: `Hi ${firstName},

I\'ve reached out a few times about helping ${companyName} with lead generation, but haven\'t heard back.

I don\'t want to be a nuisance, so this will be my last email unless you\'re interested in exploring further.

If now\'s not the right time, I completely understand. Feel free to reach out whenever makes sense.

Best of luck with everything,`,
        personalizationTips: ['Keep it respectful', 'Leave door open for future'],
        alternativeSubjects: [
          'One last try',
          'Closing your file',
          'Last email from me',
        ],
        confidenceScore: 0.7,
      },
      meeting_request: {
        subject: '15 minutes to discuss {{company}} growth?',
        body: `Hi ${firstName},

I\'d love to show you how we helped {{similarCompany}} increase their sales pipeline by 40% in just 3 months.

Given your role at ${companyName}, I think you\'d find the approach particularly interesting.

Do you have 15 minutes for a quick call this week or next?

Looking forward to hearing from you,`,
        personalizationTips: ['Reference similar company success', 'Keep CTA specific'],
        alternativeSubjects: [
          'Quick call this week?',
          '15 min to explore {{company}} growth?',
          'Worth a brief conversation?',
        ],
        confidenceScore: 0.7,
      },
      value_proposition: {
        subject: 'Idea for {{company}}',
        body: `Hi ${firstName},

I\'ve been thinking about ${companyName} and wanted to share an insight that\'s helped similar companies in {{industry}}.

[Specific value proposition here]

Worth a conversation to explore how this might apply to ${companyName}?

Best,`,
        personalizationTips: ['Make value prop specific', 'Reference industry trends'],
        alternativeSubjects: [
          'Idea for {{company}}',
          'Insight for {{industry}} leaders',
          'Value for {{company}}',
        ],
        confidenceScore: 0.7,
      },
    };
    
    return templates[purpose] || templates.intro;
  }

  private async logAIGeneration(
    request: AIEmailRequest,
    result: AIEmailResult,
  ): Promise<void> {
    this.logger.log('AI email generated', {
      purpose: request.purpose,
      tone: request.tone,
      confidenceScore: result.confidenceScore,
    });
  }
}
