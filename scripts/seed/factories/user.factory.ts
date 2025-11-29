import { faker } from '@faker-js/faker';

export interface User {
  id: string;
  organization_id: string;
  email: string;
  name: string;
  role: string;
  status: string;
  last_login_at: Date | null;
  metadata: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}

export function createUser(organizationId: string, overrides?: Partial<User>): User {
  const firstName = faker.person.firstName();
  const lastName = faker.person.lastName();

  return {
    id: faker.string.uuid(),
    organization_id: organizationId,
    email: faker.internet.email({ firstName, lastName }).toLowerCase(),
    name: `${firstName} ${lastName}`,
    role: faker.helpers.arrayElement(['admin', 'user', 'viewer']),
    status: faker.helpers.weightedArrayElement([
      { value: 'active', weight: 9 },
      { value: 'inactive', weight: 1 },
    ]),
    last_login_at: faker.datatype.boolean({ probability: 0.7 })
      ? faker.date.recent({ days: 30 })
      : null,
    metadata: {
      timezone: faker.location.timeZone(),
      preferences: {
        email_notifications: faker.datatype.boolean(),
        sms_notifications: faker.datatype.boolean(),
      },
    },
    created_at: faker.date.past({ years: 1 }),
    updated_at: new Date(),
    ...overrides,
  };
}

export function createUsers(organizationId: string, count: number): User[] {
  return Array.from({ length: count }, () => createUser(organizationId));
}
