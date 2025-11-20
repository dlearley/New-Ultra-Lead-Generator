import { faker } from '@faker-js/faker';

export interface LeadList {
  id: string;
  organization_id: string;
  user_id: string;
  name: string;
  description: string;
  status: string;
  metadata: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}

export interface LeadListItem {
  id: string;
  lead_list_id: string;
  business_id: string;
  position: number;
  notes: string | null;
  status: string;
  metadata: Record<string, any>;
  added_at: Date;
}

const LIST_NAME_TEMPLATES = [
  'Q{quarter} {year} Prospects',
  '{industry} Targets - {region}',
  'High Value {industry} Leads',
  '{month} {year} Pipeline',
  'Top {industry} Prospects',
  'Outreach List - {date}',
  '{region} Expansion Targets',
  'Warm Leads - {month}',
];

export function createLeadList(
  organizationId: string,
  userId: string,
  overrides?: Partial<LeadList>
): LeadList {
  const template = faker.helpers.arrayElement(LIST_NAME_TEMPLATES);
  const name = template
    .replace('{quarter}', `Q${faker.number.int({ min: 1, max: 4 })}`)
    .replace('{year}', new Date().getFullYear().toString())
    .replace(
      '{industry}',
      faker.helpers.arrayElement(['Dental', 'HVAC', 'Plumbing', 'Trucking', 'Legal'])
    )
    .replace(
      '{region}',
      faker.helpers.arrayElement(['Northeast', 'Southeast', 'Midwest', 'West', 'Southwest'])
    )
    .replace('{month}', faker.date.month())
    .replace('{date}', faker.date.recent().toLocaleDateString());

  return {
    id: faker.string.uuid(),
    organization_id: organizationId,
    user_id: userId,
    name,
    description: faker.lorem.sentence(),
    status: faker.helpers.weightedArrayElement([
      { value: 'active', weight: 7 },
      { value: 'archived', weight: 2 },
      { value: 'completed', weight: 1 },
    ]),
    metadata: {
      target_count: faker.number.int({ min: 50, max: 500 }),
      campaign_type: faker.helpers.arrayElement(['email', 'phone', 'direct_mail', 'multi-channel']),
    },
    created_at: faker.date.past({ years: 1 }),
    updated_at: new Date(),
    ...overrides,
  };
}

export function createLeadListItem(
  leadListId: string,
  businessId: string,
  position: number,
  overrides?: Partial<LeadListItem>
): LeadListItem {
  return {
    id: faker.string.uuid(),
    lead_list_id: leadListId,
    business_id: businessId,
    position,
    notes: faker.datatype.boolean({ probability: 0.3 }) ? faker.lorem.sentence() : null,
    status: faker.helpers.arrayElement(['new', 'contacted', 'qualified', 'converted', 'disqualified']),
    metadata: {
      added_by: faker.person.fullName(),
      priority: faker.helpers.arrayElement(['high', 'medium', 'low']),
    },
    added_at: faker.date.recent({ days: 60 }),
    ...overrides,
  };
}

export function createLeadLists(organizationId: string, userId: string, count: number): LeadList[] {
  return Array.from({ length: count }, () => createLeadList(organizationId, userId));
}
