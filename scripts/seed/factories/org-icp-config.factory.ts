import { faker } from '@faker-js/faker';
import { INDUSTRIES, IndustryKey, INDUSTRY_KEYS } from '../lib/industries';

export interface OrgICPConfig {
  id: string;
  organization_id: string;
  name: string;
  description: string;
  target_industries: string[];
  excluded_industries: string[];
  min_employees: number | null;
  max_employees: number | null;
  min_revenue: number | null;
  max_revenue: number | null;
  target_locations: Record<string, any>;
  excluded_locations: Record<string, any>;
  required_technologies: string[];
  required_certifications: string[];
  keywords: string[];
  score_weights: Record<string, number>;
  is_active: boolean;
  metadata: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}

export function createOrgICPConfig(
  organizationId: string,
  overrides?: Partial<OrgICPConfig>
): OrgICPConfig {
  const targetIndustryKeys = faker.helpers.arrayElements(INDUSTRY_KEYS, {
    min: 1,
    max: 3,
  }) as IndustryKey[];
  const targetIndustries = targetIndustryKeys.map((key) => INDUSTRIES[key].name);

  const excludedIndustryKeys = faker.helpers
    .arrayElements(
      INDUSTRY_KEYS.filter((key) => !targetIndustryKeys.includes(key)),
      { min: 0, max: 2 }
    )
    .map((key) => INDUSTRIES[key as IndustryKey].name);

  const targetStates = faker.helpers.arrayElements(
    ['CA', 'NY', 'TX', 'FL', 'IL', 'PA', 'OH', 'GA', 'NC', 'MI'],
    { min: 2, max: 5 }
  );

  const excludedStates = faker.helpers.arrayElements(
    ['AK', 'HI', 'MT', 'WY', 'ND', 'SD', 'VT'],
    { min: 0, max: 2 }
  );

  // Get certifications from target industries
  const allCertifications = targetIndustryKeys.flatMap((key) => INDUSTRIES[key].certifications);
  const requiredCertifications = faker.helpers.arrayElements(allCertifications, { min: 0, max: 2 });

  return {
    id: faker.string.uuid(),
    organization_id: organizationId,
    name: `${targetIndustries[0]} ICP - ${faker.helpers.arrayElement(['East Coast', 'West Coast', 'Midwest', 'National'])}`,
    description: faker.lorem.sentence(),
    target_industries: targetIndustries,
    excluded_industries: excludedIndustryKeys,
    min_employees: faker.helpers.arrayElement([null, 10, 25, 50]),
    max_employees: faker.helpers.arrayElement([null, 100, 250, 500]),
    min_revenue: faker.helpers.arrayElement([null, 500000, 1000000, 5000000]),
    max_revenue: faker.helpers.arrayElement([null, 10000000, 50000000, 100000000]),
    target_locations: {
      states: targetStates,
      regions: faker.helpers.arrayElements(['Northeast', 'Southeast', 'Midwest', 'West'], {
        min: 1,
        max: 2,
      }),
    },
    excluded_locations: {
      states: excludedStates,
    },
    required_technologies: faker.helpers.arrayElements(
      ['CRM', 'ERP', 'Cloud Storage', 'Marketing Automation', 'Analytics'],
      { min: 0, max: 2 }
    ),
    required_certifications: requiredCertifications,
    keywords: faker.helpers.arrayElements(
      ['certified', 'licensed', 'insured', 'bonded', 'veteran-owned', 'family-owned', 'eco-friendly'],
      { min: 2, max: 5 }
    ),
    score_weights: {
      industry_match: 0.3,
      size_match: 0.2,
      location_match: 0.2,
      certification_match: 0.15,
      technology_match: 0.1,
      keyword_match: 0.05,
    },
    is_active: faker.datatype.boolean({ probability: 0.8 }),
    metadata: {
      version: 1,
      last_reviewed: faker.date.recent({ days: 30 }).toISOString(),
      performance_score: faker.number.float({ min: 0.6, max: 0.95, fractionDigits: 2 }),
    },
    created_at: faker.date.past({ years: 1 }),
    updated_at: new Date(),
    ...overrides,
  };
}

export function createOrgICPConfigs(organizationId: string, count: number): OrgICPConfig[] {
  return Array.from({ length: count }, () => createOrgICPConfig(organizationId));
}
