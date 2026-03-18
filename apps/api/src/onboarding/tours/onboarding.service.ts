import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../services/prisma.service';

export interface TourStep {
  id: string;
  target: string; // CSS selector or element ID
  title: string;
  content: string;
  position: 'top' | 'bottom' | 'left' | 'right' | 'center';
  action?: {
    type: 'click' | 'input' | 'scroll';
    target?: string;
    value?: string;
  };
  allowSkip?: boolean;
}

export interface OnboardingTour {
  id: string;
  name: string;
  description: string;
  role: string; // 'new_user', 'sales', 'marketing', 'admin'
  steps: TourStep[];
  trigger: {
    type: 'first_login' | 'page_visit' | 'manual';
    page?: string;
  };
}

export interface UserTourProgress {
  tourId: string;
  currentStep: number;
  completed: boolean;
  skipped: boolean;
  startedAt: Date;
  completedAt?: Date;
}

@Injectable()
export class OnboardingService {
  private readonly logger = new Logger(OnboardingService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ============================================================
  // PRE-BUILT TOURS
  // ============================================================

  private getDefaultTours(): OnboardingTour[] {
    return [
      {
        id: 'welcome_tour',
        name: 'Welcome to Ultra Lead Generator',
        description: 'Get familiar with the platform basics',
        role: 'new_user',
        trigger: { type: 'first_login' },
        steps: [
          {
            id: 'welcome',
            target: 'body',
            title: 'Welcome! 👋',
            content: 'Let\'s take a quick tour to help you get started with Ultra Lead Generator. This will only take 2 minutes.',
            position: 'center',
            allowSkip: true,
          },
          {
            id: 'dashboard',
            target: '[data-tour="dashboard"]',
            title: 'Your Dashboard',
            content: 'This is your command center. View key metrics, recent leads, and AI-powered insights at a glance.',
            position: 'bottom',
          },
          {
            id: 'leads',
            target: '[data-tour="leads"]',
            title: 'Manage Leads',
            content: 'View, filter, and manage all your leads. Click any lead to see detailed information and engagement history.',
            position: 'right',
          },
          {
            id: 'sequences',
            target: '[data-tour="sequences"]',
            title: 'Outreach Sequences',
            content: 'Create automated email and LinkedIn sequences. AI will help you write personalized messages.',
            position: 'right',
          },
          {
            id: 'ai_chat',
            target: '[data-tour="ai-chat"]',
            title: 'AI Assistant',
            content: 'Need help? Just ask! Type "Write an email for the CTO at Acme Corp" and watch the magic happen.',
            position: 'left',
          },
          {
            id: 'complete',
            target: 'body',
            title: 'You\'re All Set! 🎉',
            content: 'You\'re ready to start generating leads. Check out the Help Center anytime for more tips.',
            position: 'center',
          },
        ],
      },
      {
        id: 'sales_tour',
        name: 'Sales Workflow',
        description: 'Learn the sales-focused features',
        role: 'sales',
        trigger: { type: 'manual' },
        steps: [
          {
            id: 'hot_leads',
            target: '[data-tour="hot-leads"]',
            title: 'Prioritize Hot Leads',
            content: 'These leads have high scores and engagement. Focus your efforts here for the best ROI.',
            position: 'right',
          },
          {
            id: 'buying_group',
            target: '[data-tour="buying-group"]',
            title: 'Multi-Threading',
            content: 'See all stakeholders at an account. The AI identifies decision makers, champions, and influencers.',
            position: 'left',
          },
          {
            id: 'ai_suggestions',
            target: '[data-tour="ai-suggestions"]',
            title: 'AI Recommendations',
            content: 'One-click apply AI suggestions directly into your sequences or CRM notes.',
            position: 'bottom',
          },
        ],
      },
      {
        id: 'marketing_tour',
        name: 'Marketing Campaigns',
        description: 'Set up campaigns and track ROI',
        role: 'marketing',
        trigger: { type: 'page_visit', page: '/campaigns' },
        steps: [
          {
            id: 'attribution',
            target: '[data-tour="attribution"]',
            title: 'Attribution Modeling',
            content: 'See which touchpoints drive conversions. Choose from first-touch, last-touch, or multi-touch models.',
            position: 'bottom',
          },
          {
            id: 'roi_dashboard',
            target: '[data-tour="roi-dashboard"]',
            title: 'ROI Dashboard',
            content: 'Track campaign performance and ROI by channel. Export reports for your team.',
            position: 'right',
          },
        ],
      },
      {
        id: 'sequence_builder_tour',
        name: 'Building Sequences',
        description: 'Learn to build effective outreach sequences',
        role: 'sales',
        trigger: { type: 'page_visit', page: '/sequences/new' },
        steps: [
          {
            id: 'sequence_name',
            target: '[data-tour="sequence-name"]',
            title: 'Name Your Sequence',
            content: 'Give it a descriptive name like "Enterprise CTOs - Security Focus"',
            position: 'bottom',
          },
          {
            id: 'add_steps',
            target: '[data-tour="add-step"]',
            title: 'Add Steps',
            content: 'Click here to add email, LinkedIn, or phone steps. We recommend 3-5 touches.',
            position: 'left',
          },
          {
            id: 'ai_writer',
            target: '[data-tour="ai-writer"]',
            title: 'AI Content Writer',
            content: 'Let AI write personalized content for each step. Just describe your target and goal.',
            position: 'right',
          },
          {
            id: 'enroll_contacts',
            target: '[data-tour="enroll-contacts"]',
            title: 'Enroll Contacts',
            content: 'Select contacts to add to this sequence. You can filter by lead score, industry, etc.',
            position: 'top',
          },
        ],
      },
    ];
  }

  // ============================================================
  // GET TOURS
  // ============================================================

  async getAvailableTours(
    organizationId: string,
    userId: string,
    userRole: string,
  ): Promise<OnboardingTour[]> {
    const allTours = this.getDefaultTours();
    
    // Filter by role or show all for new users
    return allTours.filter((tour) => 
      tour.role === 'new_user' || 
      tour.role === userRole ||
      tour.role === 'sales', // Default fallback
    );
  }

  async getTour(tourId: string): Promise<OnboardingTour | null> {
    const tours = this.getDefaultTours();
    return tours.find((t) => t.id === tourId) || null;
  }

  // ============================================================
  // TOUR PROGRESS
  // ============================================================

  async startTour(
    organizationId: string,
    userId: string,
    tourId: string,
  ): Promise<UserTourProgress> {
    // In production, save to database
    // For now, return in-memory progress
    
    return {
      tourId,
      currentStep: 0,
      completed: false,
      skipped: false,
      startedAt: new Date(),
    };
  }

  async updateTourProgress(
    organizationId: string,
    userId: string,
    tourId: string,
    step: number,
  ): Promise<void> {
    // Save progress to database
    this.logger.log(`User ${userId} progressed to step ${step} in tour ${tourId}`);
  }

  async completeTour(
    organizationId: string,
    userId: string,
    tourId: string,
  ): Promise<void> {
    // Mark tour as completed
    this.logger.log(`User ${userId} completed tour ${tourId}`);
  }

  async skipTour(
    organizationId: string,
    userId: string,
    tourId: string,
  ): Promise<void> {
    // Mark tour as skipped
    this.logger.log(`User ${userId} skipped tour ${tourId}`);
  }

  // ============================================================
  // CHECK TOUR TRIGGERS
  // ============================================================

  async checkTriggers(
    organizationId: string,
    userId: string,
    event: {
      type: 'first_login' | 'page_visit';
      page?: string;
    },
  ): Promise<OnboardingTour[]> {
    const tours = this.getDefaultTours();
    
    return tours.filter((tour) => {
      if (tour.trigger.type !== event.type) return false;
      if (event.type === 'page_visit' && tour.trigger.page !== event.page) return false;
      return true;
    });
  }

  // ============================================================
  // TOUR ANALYTICS
  // ============================================================

  async getTourAnalytics(
    organizationId: string,
  ): Promise<{
    totalStarts: number;
    totalCompletions: number;
    completionRate: number;
    averageTime: number;
    dropOffSteps: Record<string, number>;
  }> {
    // In production, query actual analytics
    return {
      totalStarts: 150,
      totalCompletions: 120,
      completionRate: 80,
      averageTime: 180, // seconds
      dropOffSteps: {
        'step_3': 15,
        'step_5': 10,
      },
    };
  }
}
