import { faker } from '@faker-js/faker';

export interface Contact {
  id: string;
  business_id: string;
  first_name: string;
  last_name: string;
  title: string;
  email: string;
  phone: string;
  linkedin_url: string | null;
  role: string;
  is_decision_maker: boolean;
  metadata: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}

const TITLES = [
  'Owner',
  'CEO',
  'President',
  'Vice President',
  'General Manager',
  'Operations Manager',
  'Sales Manager',
  'Marketing Director',
  'Business Development Manager',
  'Account Manager',
  'Regional Manager',
  'Service Manager',
];

const DECISION_MAKER_TITLES = ['Owner', 'CEO', 'President', 'Vice President', 'General Manager'];

export function createContact(businessId: string, overrides?: Partial<Contact>): Contact {
  const firstName = faker.person.firstName();
  const lastName = faker.person.lastName();
  const title = faker.helpers.arrayElement(TITLES);
  const isDecisionMaker = DECISION_MAKER_TITLES.includes(title);

  return {
    id: faker.string.uuid(),
    business_id: businessId,
    first_name: firstName,
    last_name: lastName,
    title,
    email: faker.internet.email({ firstName, lastName }).toLowerCase(),
    phone: faker.phone.number('###-###-####'),
    linkedin_url: faker.datatype.boolean({ probability: 0.6 })
      ? `https://linkedin.com/in/${firstName.toLowerCase()}-${lastName.toLowerCase()}-${faker.string.alphanumeric(8)}`
      : null,
    role: faker.helpers.arrayElement([
      'Executive',
      'Management',
      'Sales',
      'Operations',
      'Technical',
      'Administrative',
    ]),
    is_decision_maker: isDecisionMaker,
    metadata: {
      direct_phone: faker.datatype.boolean({ probability: 0.3 })
        ? faker.phone.number('###-###-####')
        : null,
      assistant: faker.datatype.boolean({ probability: 0.2 }) ? faker.person.fullName() : null,
    },
    created_at: faker.date.past({ years: 1 }),
    updated_at: new Date(),
    ...overrides,
  };
}

export function createContacts(businessId: string, count: number): Contact[] {
  return Array.from({ length: count }, () => createContact(businessId));
}
