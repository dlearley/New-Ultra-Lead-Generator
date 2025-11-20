import { faker } from '@faker-js/faker';
import { INDUSTRY_KEYS } from '../lib/industries';

export interface SavedSearch {
  id: string;
  organization_id: string;
  user_id: string;
  name: string;
  description: string;
  query_params: Record<string, any>;
  result_count: number;
  last_run_at: Date;
  is_favorite: boolean;
  metadata: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}

export function createSavedSearch(
  organizationId: string,
  userId: string,
  overrides?: Partial<SavedSearch>
): SavedSearch {
  const industry = faker.helpers.arrayElement(INDUSTRY_KEYS);
  const cities = faker.helpers.arrayElements(
    ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Miami', 'Seattle', 'Boston'],
    { min: 1, max: 3 }
  );

  const queryParams = {
    industries: [industry],
    locations: cities.map((city) => ({ city })),
    employee_count: {
      min: faker.number.int({ min: 1, max: 50 }),
      max: faker.number.int({ min: 51, max: 500 }),
    },
    annual_revenue: {
      min: faker.number.int({ min: 100000, max: 1000000 }),
      max: faker.number.int({ min: 1000001, max: 10000000 }),
    },
    quality_score: {
      min: faker.number.float({ min: 0.5, max: 0.7, fractionDigits: 1 }),
    },
  };

  const name = `${industry} in ${cities[0]}${cities.length > 1 ? ` +${cities.length - 1} more` : ''}`;

  return {
    id: faker.string.uuid(),
    organization_id: organizationId,
    user_id: userId,
    name,
    description: faker.lorem.sentence(),
    query_params: queryParams,
    result_count: faker.number.int({ min: 10, max: 500 }),
    last_run_at: faker.date.recent({ days: 7 }),
    is_favorite: faker.datatype.boolean({ probability: 0.3 }),
    metadata: {
      execution_time_ms: faker.number.int({ min: 50, max: 2000 }),
      last_modified_by: faker.person.fullName(),
    },
    created_at: faker.date.past({ years: 1 }),
    updated_at: new Date(),
    ...overrides,
  };
}

export function createSavedSearches(
  organizationId: string,
  userId: string,
  count: number
): SavedSearch[] {
  return Array.from({ length: count }, () => createSavedSearch(organizationId, userId));
}
