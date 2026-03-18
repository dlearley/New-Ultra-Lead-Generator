import { Injectable } from '@nestjs/common';

export interface PlainEnglishRule {
  description: string;
  rule: {
    name: string;
    ruleType: string;
    condition: {
      field: string;
      operator: string;
      value: any;
    };
    points: number;
  };
}

@Injectable()
export class RuleBuilderService {
  // Pre-defined rule templates with plain-English descriptions
  private readonly ruleTemplates: PlainEnglishRule[] = [
    // Demographic Rules
    {
      description: '+10 points if email domain is a company domain (not Gmail/Yahoo)',
      rule: {
        name: 'Company Email Domain',
        ruleType: 'demographic',
        condition: {
          field: 'email',
          operator: 'regex',
          value: '^(?!.*@gmail\\.com|.*@yahoo\\.com|.*@hotmail\\.com)',
        },
        points: 10,
      },
    },
    {
      description: '+20 points if contact is a C-level executive',
      rule: {
        name: 'C-Level Executive',
        ruleType: 'demographic',
        condition: {
          field: 'seniority',
          operator: 'eq',
          value: 'c_level',
        },
        points: 20,
      },
    },
    {
      description: '+15 points if contact is VP or Director level',
      rule: {
        name: 'VP or Director',
        ruleType: 'demographic',
        condition: {
          field: 'seniority',
          operator: 'in',
          value: ['vp', 'director'],
        },
        points: 15,
      },
    },
    {
      description: '+10 points if contact is in Sales or Marketing department',
      rule: {
        name: 'Sales or Marketing',
        ruleType: 'demographic',
        condition: {
          field: 'department',
          operator: 'in',
          value: ['sales', 'marketing'],
        },
        points: 10,
      },
    },

    // Firmographic Rules
    {
      description: '+20 points if company has 200+ employees',
      rule: {
        name: 'Large Company',
        ruleType: 'firmographic',
        condition: {
          field: 'company.employeeCount',
          operator: 'gte',
          value: 200,
        },
        points: 20,
      },
    },
    {
      description: '+15 points if company has 50-199 employees',
      rule: {
        name: 'Mid-Size Company',
        ruleType: 'firmographic',
        condition: {
          field: 'company.employeeCount',
          operator: 'between',
          value: [50, 199],
        },
        points: 15,
      },
    },
    {
      description: '+25 points if company is in target industries (Tech, SaaS, Finance)',
      rule: {
        name: 'Target Industry',
        ruleType: 'firmographic',
        condition: {
          field: 'company.industry',
          operator: 'in',
          value: ['Technology', 'Software', 'SaaS', 'Finance', 'Financial Services'],
        },
        points: 25,
      },
    },
    {
      description: '+30 points if company just raised funding',
      rule: {
        name: 'Recent Funding',
        ruleType: 'firmographic',
        condition: {
          field: 'company.lastFundingDate',
          operator: 'gte',
          value: '90_days_ago', // Special handling in service
        },
        points: 30,
      },
    },
    {
      description: '+15 points if company uses Salesforce or HubSpot',
      rule: {
        name: 'Uses Target Technology',
        ruleType: 'firmographic',
        condition: {
          field: 'company.technologies.name',
          operator: 'in',
          value: ['Salesforce', 'HubSpot', 'Marketo', 'Pardot'],
        },
        points: 15,
      },
    },

    // Behavioral Rules
    {
      description: '+20 points if visited pricing page',
      rule: {
        name: 'Visited Pricing',
        ruleType: 'behavioral',
        condition: {
          field: 'pageViewsList.pageUrl',
          operator: 'contains',
          value: '/pricing',
        },
        points: 20,
      },
    },
    {
      description: '+15 points if visited product/demo pages',
      rule: {
        name: 'Viewed Product',
        ruleType: 'behavioral',
        condition: {
          field: 'pageViewsList.pageUrl',
          operator: 'contains',
          value: ['/product', '/demo', '/features'],
        },
        points: 15,
      },
    },
    {
      description: '+25 points if requested a demo',
      rule: {
        name: 'Requested Demo',
        ruleType: 'behavioral',
        condition: {
          field: 'activities.type',
          operator: 'has',
          value: 'demo_request',
        },
        points: 25,
      },
    },
    {
      description: '+10 points per page view (max 50 points)',
      rule: {
        name: 'Multiple Page Views',
        ruleType: 'behavioral',
        condition: {
          field: 'pageViewsList.count',
          operator: 'gte',
          value: 3,
        },
        points: 10,
      },
    },
    {
      description: '+5 points for each email opened',
      rule: {
        name: 'Email Engagement',
        ruleType: 'engagement',
        condition: {
          field: 'activities.type',
          operator: 'has',
          value: 'email_open',
        },
        points: 5,
      },
    },
    {
      description: '+15 points if clicked email link',
      rule: {
        name: 'Email Click',
        ruleType: 'engagement',
        condition: {
          field: 'activities.type',
          operator: 'has',
          value: 'email_click',
        },
        points: 15,
      },
    },

    // Intent Rules
    {
      description: '+30 points if has high intent signals (pricing view + demo request)',
      rule: {
        name: 'High Buying Intent',
        ruleType: 'intent',
        condition: {
          field: 'intents.type',
          operator: 'has_all',
          value: ['pricing_view', 'demo_request'],
        },
        points: 30,
      },
    },
    {
      description: '+20 points if intent score is 70+',
      rule: {
        name: 'High Intent Score',
        ruleType: 'intent',
        condition: {
          field: 'intentScore',
          operator: 'gte',
          value: 70,
        },
        points: 20,
      },
    },
    {
      description: '+15 points if buying stage is Decision',
      rule: {
        name: 'Decision Stage',
        ruleType: 'intent',
        condition: {
          field: 'buyingStage',
          operator: 'eq',
          value: 'decision',
        },
        points: 15,
      },
    },

    // Penalty Rules (negative points)
    {
      description: '-10 points if email bounced',
      rule: {
        name: 'Email Bounced',
        ruleType: 'demographic',
        condition: {
          field: 'emailStatus',
          operator: 'eq',
          value: 'invalid',
        },
        points: -10,
      },
    },
    {
      description: '-20 points if unsubscribed',
      rule: {
        name: 'Unsubscribed',
        ruleType: 'engagement',
        condition: {
          field: 'activities.type',
          operator: 'has',
          value: 'unsubscribe',
        },
        points: -20,
      },
    },
    {
      description: '-15 points if no activity in 30 days',
      rule: {
        name: 'Stale Lead',
        ruleType: 'engagement',
        condition: {
          field: 'lastActivityAt',
          operator: 'lt',
          value: '30_days_ago',
        },
        points: -15,
      },
    },
  ];

  getRuleTemplates(): PlainEnglishRule[] {
    return this.ruleTemplates;
  }

  getRulesByCategory(category: string): PlainEnglishRule[] {
    return this.ruleTemplates.filter(
      (template) => template.rule.ruleType === category,
    );
  }

  generateRuleDescription(rule: any): string {
    const { condition, points } = rule;
    const sign = points >= 0 ? '+' : '';
    
    const operatorMap: Record<string, string> = {
      eq: 'equals',
      gte: 'is at least',
      gt: 'is greater than',
      lte: 'is at most',
      lt: 'is less than',
      contains: 'contains',
      in: 'is one of',
      has: 'has',
      exists: 'has a value for',
    };

    const operator = operatorMap[condition.operator] || condition.operator;
    
    return `${sign}${points} points if ${condition.field} ${operator} ${condition.value}`;
  }

  // Create a custom rule from plain English description
  createRuleFromDescription(
    description: string,
    points: number,
    condition: any,
  ): any {
    return {
      name: this.generateRuleName(description),
      description,
      ruleType: this.inferRuleType(condition.field),
      condition,
      points,
      maxPoints: points > 0 ? points * 5 : undefined, // Cap positive points
      frequency: 'unlimited',
    };
  }

  private generateRuleName(description: string): string {
    // Extract key terms from description
    return description
      .replace(/[^\w\s]/g, '')
      .split(' ')
      .slice(0, 5)
      .join(' ');
  }

  private inferRuleType(field: string): string {
    if (field.startsWith('company.')) {
      return 'firmographic';
    }
    if (field.startsWith('pageViews') || field.startsWith('activities')) {
      return 'behavioral';
    }
    if (field.includes('intent') || field.includes('buyingStage')) {
      return 'intent';
    }
    if (field.includes('email') || field.includes('engagement')) {
      return 'engagement';
    }
    return 'demographic';
  }

  // Validate a rule
  validateRule(rule: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!rule.name) {
      errors.push('Rule name is required');
    }

    if (!rule.condition?.field) {
      errors.push('Condition field is required');
    }

    if (!rule.condition?.operator) {
      errors.push('Condition operator is required');
    }

    if (rule.points === undefined || rule.points === null) {
      errors.push('Points value is required');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
