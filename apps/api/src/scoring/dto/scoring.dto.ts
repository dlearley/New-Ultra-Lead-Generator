// Lead Scoring DTOs

export interface CreateScoringModelDto {
  name: string;
  description?: string;
  modelType?: 'rule_based' | 'ai_predictive' | 'hybrid';
  hotThreshold?: number;
  warmThreshold?: number;
  rules: ScoringRuleDto[];
}

export interface ScoringRuleDto {
  id?: string;
  name: string;
  description?: string;
  ruleType: 'demographic' | 'behavioral' | 'firmographic' | 'intent' | 'engagement';
  condition: {
    field: string;
    operator: string;
    value: any;
  };
  points: number;
  maxPoints?: number;
  frequency?: 'once' | 'daily' | 'per_session' | 'unlimited';
}

export interface UpdateScoringModelDto extends Partial<CreateScoringModelDto> {
  status?: 'active' | 'paused' | 'archived';
}

export interface LeadScoreResponse {
  contactId: string;
  modelId: string;
  totalScore: number;
  maxPossible: number;
  category: 'hot' | 'warm' | 'cold';
  breakdown: {
    demographic: number;
    behavioral: number;
    firmographic: number;
    intent: number;
    engagement: number;
  };
  ruleContributions: Array<{
    ruleId: string;
    ruleName: string;
    points: number;
    reason: string;
  }>;
  conversionProbability?: number;
  predictedValue?: number;
  timeToClose?: number;
  calculatedAt: string;
}

export interface ScoreDashboardDto {
  overview: {
    totalLeads: number;
    hotLeads: number;
    warmLeads: number;
    coldLeads: number;
    avgScore: number;
  };
  distribution: Array<{
    category: string;
    count: number;
    percentage: number;
  }>;
  trends: Array<{
    date: string;
    avgScore: number;
    hotCount: number;
    warmCount: number;
    coldCount: number;
  }>;
  topRules: Array<{
    ruleId: string;
    ruleName: string;
    timesTriggered: number;
    totalPoints: number;
  }>;
}

export interface BatchScoreDto {
  contactIds?: string[];
  filter?: {
    category?: string;
    minScore?: number;
    maxScore?: number;
    assigned?: boolean;
  };
}

export interface SalesRoutingDto {
  name: string;
  description?: string;
  rules: Array<{
    condition: {
      category?: string;
      minScore?: number;
      industry?: string[];
    };
    assignTo: string; // User ID
    priority: number;
  }>;
  defaultAssigneeId?: string;
  autoAssign: boolean;
}

export interface LeadQualificationDto {
  contactId: string;
  answers: Record<string, {
    answer: any;
    questionId: string;
  }>;
  method: 'chatbot' | 'form' | 'manual' | 'ai_inferred';
}

export interface QualificationResultDto {
  contactId: string;
  isQualified: boolean;
  qualificationScore: number;
  bantCriteria: {
    budget: boolean;
    authority: boolean;
    need: boolean;
    timeline: boolean;
  };
  passedCriteria: string[];
  failedCriteria: string[];
  recommendations: string[];
}

export interface PredictiveScoreDto {
  contactId: string;
  conversionProbability: number;
  confidence: number;
  factors: Array<{
    factor: string;
    impact: 'positive' | 'negative' | 'neutral';
    weight: number;
  }>;
  predictedValue: number;
  predictedCloseDate: string;
  recommendedActions: string[];
}
