import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../services/prisma.service';

export interface HelpBubble {
  id: string;
  target: string; // CSS selector
  title: string;
  content: string;
  position: 'top' | 'bottom' | 'left' | 'right';
  category: string;
  trigger: 'hover' | 'click' | 'focus';
  page?: string;
  role?: string[];
  priority: number;
  dismissable: boolean;
}

export interface ContextualHelp {
  page: string;
  section: string;
  articles: Array<{
    title: string;
    url: string;
    relevance: number;
  }>;
  videos?: Array<{
    title: string;
    url: string;
    thumbnail: string;
  }>;
  shortcuts?: Array<{
    keys: string[];
    action: string;
  }>;
}

@Injectable()
export class HelpBubblesService {
  private readonly logger = new Logger(HelpBubblesService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ============================================================
  // HELP BUBBLES
  // ============================================================

  private getHelpBubbles(): HelpBubble[] {
    return [
      // Dashboard
      {
        id: 'lead_score_help',
        target: '[data-help="lead-score"]',
        title: 'Lead Score',
        content: 'Scores range from 0-100 based on engagement, firmographics, and intent signals. 70+ = Hot, 40-69 = Warm, <40 = Cold.',
        position: 'right',
        category: 'scoring',
        trigger: 'hover',
        page: '/dashboard',
        priority: 1,
        dismissable: true,
      },
      {
        id: 'ai_insights_help',
        target: '[data-help="ai-insights"]',
        title: 'AI Insights',
        content: 'These are automatically generated based on your data trends. Click to see recommended actions.',
        position: 'left',
        category: 'ai',
        trigger: 'hover',
        page: '/dashboard',
        priority: 2,
        dismissable: true,
      },
      // Sequences
      {
        id: 'sequence_step_help',
        target: '[data-help="sequence-step"]',
        title: 'Sequence Steps',
        content: 'Each step can be email, LinkedIn, phone, or task. Set delays in days/hours between steps.',
        position: 'right',
        category: 'sequences',
        trigger: 'hover',
        page: '/sequences',
        priority: 1,
        dismissable: true,
      },
      {
        id: 'ai_writer_help',
        target: '[data-help="ai-writer"]',
        title: 'AI Content Writer',
        content: 'Click to generate personalized content. The AI researches the contact and crafts a message based on their profile.',
        position: 'bottom',
        category: 'ai',
        trigger: 'hover',
        page: '/sequences',
        priority: 2,
        dismissable: true,
      },
      // Contacts
      {
        id: 'buying_group_help',
        target: '[data-help="buying-group"]',
        title: 'Buying Group',
        content: 'AI-detected stakeholders at this account. Roles: Decision Maker, Champion, Influencer, Blocker.',
        position: 'right',
        category: 'intelligence',
        trigger: 'hover',
        page: '/contacts',
        priority: 1,
        dismissable: true,
      },
      {
        id: 'one_click_apply_help',
        target: '[data-help="one-click-apply"]',
        title: 'One-Click Actions',
        content: 'Apply AI suggestions instantly: Add to sequence, Create task, Add note, or Send now.',
        position: 'bottom',
        category: 'productivity',
        trigger: 'hover',
        page: '/contacts',
        priority: 2,
        dismissable: true,
      },
      // Analytics
      {
        id: 'attribution_help',
        target: '[data-help="attribution"]',
        title: 'Attribution Models',
        content: 'First Touch = Credit first interaction. Last Touch = Credit before conversion. Linear = Equal credit to all.',
        position: 'right',
        category: 'analytics',
        trigger: 'hover',
        page: '/analytics',
        priority: 1,
        dismissable: true,
      },
      {
        id: 'benchmark_help',
        target: '[data-help="benchmark"]',
        title: 'Industry Benchmarks',
        content: 'Compare your metrics to similar companies. P50 = median, P75 = top quartile, P90 = top 10%.',
        position: 'left',
        category: 'analytics',
        trigger: 'hover',
        page: '/analytics',
        priority: 2,
        dismissable: true,
      },
      // AI Chat
      {
        id: 'ai_chat_help',
        target: '[data-help="ai-chat"]',
        title: 'Ask Me Anything',
        content: 'Try: "Write an email for the CTO at Acme" or "Show me hot leads" or "Research Salesforce"',
        position: 'left',
        category: 'ai',
        trigger: 'hover',
        page: '/',
        priority: 1,
        dismissable: false,
      },
      // Integrations
      {
        id: 'sync_help',
        target: '[data-help="sync"]',
        title: 'Two-Way Sync',
        content: 'Changes in either system sync automatically. Use conflict resolution rules if data differs.',
        position: 'right',
        category: 'integrations',
        trigger: 'hover',
        page: '/integrations',
        priority: 1,
        dismissable: true,
      },
    ];
  }

  async getHelpBubblesForPage(
    page: string,
    userRole?: string,
  ): Promise<HelpBubble[]> {
    const bubbles = this.getHelpBubbles();
    
    return bubbles.filter((b) => {
      if (b.page && b.page !== page) return false;
      if (b.role && userRole && !b.role.includes(userRole)) return false;
      return true;
    }).sort((a, b) => a.priority - b.priority);
  }

  async getHelpBubble(id: string): Promise<HelpBubble | null> {
    const bubbles = this.getHelpBubbles();
    return bubbles.find((b) => b.id === id) || null;
  }

  // ============================================================
  // CONTEXTUAL HELP
  // ============================================================

  async getContextualHelp(
    page: string,
    section?: string,
  ): Promise<ContextualHelp> {
    const helpContent: Record<string, ContextualHelp> = {
      '/dashboard': {
        page: '/dashboard',
        section: 'overview',
        articles: [
          { title: 'Understanding Lead Scores', url: '/help/lead-scoring', relevance: 95 },
          { title: 'Reading AI Insights', url: '/help/ai-insights', relevance: 90 },
          { title: 'Dashboard Customization', url: '/help/dashboard-customize', relevance: 70 },
        ],
        videos: [
          { title: 'Dashboard Walkthrough', url: '/videos/dashboard', thumbnail: '/thumbs/dashboard.png' },
        ],
        shortcuts: [
          { keys: ['Ctrl', 'K'], action: 'Quick search' },
          { keys: ['Ctrl', 'N'], action: 'New lead' },
        ],
      },
      '/sequences': {
        page: '/sequences',
        section: 'sequence_builder',
        articles: [
          { title: 'Building Effective Sequences', url: '/help/sequences', relevance: 95 },
          { title: 'Using the AI Writer', url: '/help/ai-writer', relevance: 90 },
          { title: 'A/B Testing Messages', url: '/help/ab-testing', relevance: 75 },
        ],
        videos: [
          { title: 'Sequence Builder Tutorial', url: '/videos/sequences', thumbnail: '/thumbs/sequences.png' },
          { title: 'AI Writer Demo', url: '/videos/ai-writer', thumbnail: '/thumbs/ai-writer.png' },
        ],
        shortcuts: [
          { keys: ['Ctrl', 'Enter'], action: 'Save step' },
          { keys: ['Ctrl', 'Shift', 'A'], action: 'Add step' },
        ],
      },
      '/contacts': {
        page: '/contacts',
        section: 'contact_details',
        articles: [
          { title: 'Understanding Buying Groups', url: '/help/buying-groups', relevance: 95 },
          { title: 'Account Research Features', url: '/help/account-research', relevance: 85 },
          { title: 'One-Click Actions', url: '/help/one-click', relevance: 80 },
        ],
        shortcuts: [
          { keys: ['E'], action: 'Edit contact' },
          { keys: ['S'], action: 'Add to sequence' },
        ],
      },
      '/analytics': {
        page: '/analytics',
        section: 'reporting',
        articles: [
          { title: 'Attribution Models Explained', url: '/help/attribution', relevance: 95 },
          { title: 'Industry Benchmarks', url: '/help/benchmarks', relevance: 85 },
          { title: 'Creating Custom Reports', url: '/help/custom-reports', relevance: 75 },
        ],
      },
      '/integrations': {
        page: '/integrations',
        section: 'crm_sync',
        articles: [
          { title: 'Setting Up CRM Sync', url: '/help/crm-sync', relevance: 95 },
          { title: 'Conflict Resolution', url: '/help/conflicts', relevance: 80 },
          { title: 'Field Mapping Guide', url: '/help/field-mapping', relevance: 75 },
        ],
      },
    };

    return helpContent[page] || {
      page,
      section: section || 'general',
      articles: [
        { title: 'Getting Started', url: '/help/getting-started', relevance: 90 },
        { title: 'Keyboard Shortcuts', url: '/help/shortcuts', relevance: 70 },
      ],
    };
  }

  // ============================================================
  // SEARCH HELP
  // ============================================================

  async searchHelp(query: string): Promise<Array<{
    title: string;
    content: string;
    url: string;
    category: string;
    relevance: number;
  }>> {
    const helpArticles = [
      {
        title: 'How to Write Effective Cold Emails',
        content: 'Best practices for subject lines, personalization, and CTAs.',
        url: '/help/cold-emails',
        category: 'sales',
      },
      {
        title: 'Using AI to Personalize at Scale',
        content: 'Leverage AI research and content generation for hyper-personalization.',
        url: '/help/ai-personalization',
        category: 'ai',
      },
      {
        title: 'Understanding Attribution Models',
        content: 'First touch, last touch, linear, and time-decay explained.',
        url: '/help/attribution',
        category: 'analytics',
      },
      {
        title: 'Setting Up Two-Way CRM Sync',
        content: 'Connect Salesforce, HubSpot, or other CRMs with conflict resolution.',
        url: '/help/crm-sync',
        category: 'integrations',
      },
      {
        title: 'Building Multi-Channel Sequences',
        content: 'Combine email, LinkedIn, and phone for maximum engagement.',
        url: '/help/multi-channel',
        category: 'sequences',
      },
      {
        title: 'Detecting Buying Groups',
        content: 'Use AI to identify all stakeholders in a deal.',
        url: '/help/buying-groups',
        category: 'intelligence',
      },
    ];

    // Simple search
    const lowerQuery = query.toLowerCase();
    return helpArticles
      .filter((article) =>
        article.title.toLowerCase().includes(lowerQuery) ||
        article.content.toLowerCase().includes(lowerQuery),
      )
      .map((article) => ({
        ...article,
        relevance: this.calculateRelevance(article, lowerQuery),
      }))
      .sort((a, b) => b.relevance - a.relevance);
  }

  private calculateRelevance(article: any, query: string): number {
    let score = 50;
    
    if (article.title.toLowerCase().includes(query)) score += 30;
    if (article.content.toLowerCase().includes(query)) score += 20;
    
    return Math.min(score, 100);
  }

  // ============================================================
  // SHORTCUTS
  // ============================================================

  async getKeyboardShortcuts(): Promise<Array<{
    keys: string[];
    action: string;
    context: string;
  }>> {
    return [
      { keys: ['Ctrl', 'K'], action: 'Quick search', context: 'Global' },
      { keys: ['Ctrl', 'N'], action: 'New lead', context: 'Global' },
      { keys: ['Ctrl', '/'], action: 'Show shortcuts', context: 'Global' },
      { keys: ['?'], action: 'Open help', context: 'Global' },
      { keys: ['G', 'D'], action: 'Go to Dashboard', context: 'Global' },
      { keys: ['G', 'L'], action: 'Go to Leads', context: 'Global' },
      { keys: ['G', 'S'], action: 'Go to Sequences', context: 'Global' },
      { keys: ['G', 'A'], action: 'Go to Analytics', context: 'Global' },
      { keys: ['E'], action: 'Edit', context: 'Contact/Lead detail' },
      { keys: ['S'], action: 'Add to sequence', context: 'Contact/Lead detail' },
      { keys: ['Ctrl', 'Enter'], action: 'Save', context: 'Forms' },
      { keys: ['Esc'], action: 'Close/Cancel', context: 'Modals' },
    ];
  }
}
