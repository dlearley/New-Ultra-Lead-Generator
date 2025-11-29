import { faker } from '@faker-js/faker';

export interface Alert {
  id: string;
  organization_id: string;
  user_id: string;
  saved_search_id: string | null;
  name: string;
  description: string;
  alert_type: string;
  trigger_conditions: Record<string, any>;
  notification_channels: string[];
  is_enabled: boolean;
  frequency: string;
  last_triggered_at: Date | null;
  metadata: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}

const ALERT_TYPES = [
  'new_leads',
  'lead_status_change',
  'quality_threshold',
  'geographic_expansion',
  'competitor_activity',
  'market_trend',
];

const FREQUENCIES = ['real-time', 'hourly', 'daily', 'weekly', 'monthly'];

export function createAlert(
  organizationId: string,
  userId: string,
  savedSearchId?: string,
  overrides?: Partial<Alert>
): Alert {
  const alertType = faker.helpers.arrayElement(ALERT_TYPES);

  const triggerConditions = generateTriggerConditions(alertType);

  return {
    id: faker.string.uuid(),
    organization_id: organizationId,
    user_id: userId,
    saved_search_id: savedSearchId || null,
    name: generateAlertName(alertType),
    description: faker.lorem.sentence(),
    alert_type: alertType,
    trigger_conditions: triggerConditions,
    notification_channels: faker.helpers.arrayElements(['email', 'sms', 'slack', 'webhook'], {
      min: 1,
      max: 2,
    }),
    is_enabled: faker.datatype.boolean({ probability: 0.8 }),
    frequency: faker.helpers.arrayElement(FREQUENCIES),
    last_triggered_at: faker.datatype.boolean({ probability: 0.5 })
      ? faker.date.recent({ days: 7 })
      : null,
    metadata: {
      trigger_count: faker.number.int({ min: 0, max: 100 }),
      last_notification_sent: faker.date.recent({ days: 7 }).toISOString(),
    },
    created_at: faker.date.past({ years: 1 }),
    updated_at: new Date(),
    ...overrides,
  };
}

function generateAlertName(alertType: string): string {
  const names: Record<string, string[]> = {
    new_leads: [
      'New High-Quality Leads',
      'Fresh Prospects Alert',
      'New Business Matches',
      'Daily Lead Digest',
    ],
    lead_status_change: [
      'Lead Status Updates',
      'Pipeline Changes',
      'Conversion Alerts',
      'Status Change Notifications',
    ],
    quality_threshold: [
      'High-Quality Lead Alert',
      'Premium Prospects',
      'Top-Tier Opportunities',
      'Quality Score Threshold',
    ],
    geographic_expansion: [
      'New Market Opportunities',
      'Geographic Growth Alert',
      'Territory Expansion',
      'Regional Prospects',
    ],
    competitor_activity: [
      'Competitor Movement',
      'Market Activity Alert',
      'Competitive Intelligence',
      'Industry Changes',
    ],
    market_trend: ['Market Trends', 'Industry Insights', 'Trend Analysis', 'Market Shifts'],
  };

  const options = names[alertType] || ['Generic Alert'];
  return faker.helpers.arrayElement(options);
}

function generateTriggerConditions(alertType: string): Record<string, any> {
  const conditions: Record<string, any> = {
    new_leads: {
      min_quality_score: faker.number.float({ min: 0.7, max: 0.9, fractionDigits: 1 }),
      min_count: faker.number.int({ min: 5, max: 20 }),
    },
    lead_status_change: {
      from_status: faker.helpers.arrayElement(['new', 'contacted', 'qualified']),
      to_status: faker.helpers.arrayElement(['qualified', 'converted', 'disqualified']),
    },
    quality_threshold: {
      threshold: faker.number.float({ min: 0.8, max: 0.95, fractionDigits: 2 }),
      comparison: 'greater_than',
    },
    geographic_expansion: {
      target_regions: faker.helpers.arrayElements(['Northeast', 'Southeast', 'Midwest', 'West'], {
        min: 1,
        max: 2,
      }),
      min_leads_per_region: faker.number.int({ min: 10, max: 50 }),
    },
    competitor_activity: {
      competitors: faker.helpers.arrayElements(
        ['Competitor A', 'Competitor B', 'Competitor C'],
        { min: 1, max: 2 }
      ),
      activity_types: ['new_location', 'price_change', 'new_service'],
    },
    market_trend: {
      trend_type: faker.helpers.arrayElement(['growth', 'decline', 'emergence']),
      threshold_percentage: faker.number.int({ min: 10, max: 50 }),
    },
  };

  return conditions[alertType] || {};
}

export function createAlerts(organizationId: string, userId: string, count: number): Alert[] {
  return Array.from({ length: count }, () => createAlert(organizationId, userId));
}
