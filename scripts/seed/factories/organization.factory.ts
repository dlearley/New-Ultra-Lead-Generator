import { faker } from '@faker-js/faker';
import { INDUSTRIES, IndustryKey, INDUSTRY_KEYS } from '../lib/industries';

export interface Organization {
  id: string;
  name: string;
  slug: string;
  industry: string;
  employee_count: number;
  website: string;
  status: string;
  metadata: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}

export function createOrganization(overrides?: Partial<Organization>): Organization {
  const industryKey =
    (overrides?.industry as IndustryKey) ||
    INDUSTRY_KEYS[Math.floor(Math.random() * INDUSTRY_KEYS.length)];
  const industry = INDUSTRIES[industryKey];
  const companyName = faker.company.name();
  const slug = companyName.toLowerCase().replace(/[^a-z0-9]+/g, '-');

  return {
    id: faker.string.uuid(),
    name: companyName,
    slug,
    industry: industry.name,
    employee_count: faker.number.int({ min: 5, max: 10000 }),
    website: faker.internet.url(),
    status: 'active',
    metadata: {
      plan: faker.helpers.arrayElement(['starter', 'professional', 'enterprise']),
      onboarded_at: faker.date.past({ years: 2 }).toISOString(),
    },
    created_at: faker.date.past({ years: 2 }),
    updated_at: new Date(),
    ...overrides,
  };
}

export function createOrganizations(count: number): Organization[] {
  return Array.from({ length: count }, () => createOrganization());
}
