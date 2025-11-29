import { faker } from '@faker-js/faker';
import { INDUSTRIES, IndustryKey, getRandomIndustry } from '../lib/industries';
import { getRandomLocation } from '../lib/locations';

export interface Business {
  id: string;
  name: string;
  description: string;
  industry: string;
  sub_industry: string;
  employee_count: number;
  annual_revenue: number;
  website: string;
  phone: string;
  email: string;
  street_address: string;
  city: string;
  state: string;
  zip_code: string;
  country: string;
  latitude: number;
  longitude: number;
  year_founded: number;
  business_type: string;
  certifications: string[];
  specialties: string[];
  source: string;
  source_id: string;
  quality_score: number;
  last_verified_at: Date;
  metadata: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}

export function createBusiness(industryKey?: IndustryKey, overrides?: Partial<Business>): Business {
  const key = industryKey || getRandomIndustry();
  const industry = INDUSTRIES[key];
  const location = getRandomLocation();

  const businessName = generateBusinessName(key, location.city);
  const subIndustry = faker.helpers.arrayElement(industry.subIndustries);
  const specialtiesCount = faker.number.int({ min: 1, max: 3 });
  const specialties = faker.helpers.arrayElements(industry.specialties, specialtiesCount);
  const certificationsCount = faker.number.int({ min: 0, max: 2 });
  const certifications = faker.helpers.arrayElements(industry.certifications, certificationsCount);
  const businessType = faker.helpers.arrayElement(industry.businessTypes);

  const employeeCount = faker.number.int({ min: 1, max: 500 });
  const revenuePerEmployee = faker.number.int({ min: 50000, max: 200000 });
  const annualRevenue = employeeCount * revenuePerEmployee;

  const yearFounded = faker.date
    .past({ years: 50, refDate: new Date('2020-01-01') })
    .getFullYear();

  // Add some location variance
  const latVariance = (Math.random() - 0.5) * 0.2;
  const lngVariance = (Math.random() - 0.5) * 0.2;

  return {
    id: faker.string.uuid(),
    name: businessName,
    description: generateBusinessDescription(businessName, subIndustry, specialties),
    industry: industry.name,
    sub_industry: subIndustry,
    employee_count: employeeCount,
    annual_revenue: annualRevenue,
    website: faker.internet.url(),
    phone: faker.phone.number('###-###-####'),
    email: faker.internet.email({
      firstName: 'info',
      lastName: businessName.split(' ')[0].toLowerCase(),
    }),
    street_address: faker.location.streetAddress(),
    city: location.city,
    state: location.state,
    zip_code: faker.location.zipCode(),
    country: 'US',
    latitude: location.latitude + latVariance,
    longitude: location.longitude + lngVariance,
    year_founded: yearFounded,
    business_type: businessType,
    certifications,
    specialties,
    source: faker.helpers.arrayElement(['web_scrape', 'api', 'manual', 'partnership']),
    source_id: faker.string.alphanumeric(10),
    quality_score: parseFloat(faker.number.float({ min: 0.5, max: 1.0, fractionDigits: 2 }).toFixed(2)),
    last_verified_at: faker.date.recent({ days: 90 }),
    metadata: {
      hours: generateBusinessHours(),
      payment_methods: faker.helpers.arrayElements(
        ['Cash', 'Credit Card', 'Debit Card', 'Check', 'Financing'],
        { min: 2, max: 5 }
      ),
      service_area_radius: faker.number.int({ min: 10, max: 100 }),
    },
    created_at: faker.date.past({ years: 2 }),
    updated_at: new Date(),
    ...overrides,
  };
}

function generateBusinessName(industryKey: IndustryKey, city: string): string {
  const patterns = [
    () => `${city} ${INDUSTRIES[industryKey].name}`,
    () => `${faker.company.name()} ${INDUSTRIES[industryKey].subIndustries[0]}`,
    () =>
      `${faker.person.lastName()} ${faker.helpers.arrayElement(['& Sons', '& Associates', 'Group', 'Services'])}`,
    () =>
      `${faker.helpers.arrayElement(['Elite', 'Premier', 'Pro', 'Expert', 'Quality', 'Reliable'])} ${faker.helpers.arrayElement(INDUSTRIES[industryKey].subIndustries)}`,
    () =>
      `${faker.helpers.arrayElement(['A+', 'AAA', 'Best', '24/7', 'Express'])} ${INDUSTRIES[industryKey].name}`,
  ];

  return faker.helpers.arrayElement(patterns)();
}

function generateBusinessDescription(
  name: string,
  subIndustry: string,
  specialties: string[]
): string {
  const templates = [
    `${name} is a leading ${subIndustry} provider specializing in ${specialties.join(', ')}. We've been serving our community with excellence and dedication.`,
    `Welcome to ${name}, your trusted ${subIndustry} experts. Our specialties include ${specialties.join(', ')}. Quality service guaranteed.`,
    `${name} offers professional ${subIndustry} services with a focus on ${specialties.join(', ')}. Contact us for a free consultation.`,
    `At ${name}, we pride ourselves on delivering top-notch ${subIndustry} solutions. Our expertise in ${specialties.join(', ')} sets us apart.`,
  ];

  return faker.helpers.arrayElement(templates);
}

function generateBusinessHours(): Record<string, string> {
  const weekdayHours = faker.helpers.arrayElement([
    '8:00 AM - 5:00 PM',
    '9:00 AM - 6:00 PM',
    '7:00 AM - 7:00 PM',
    '24/7',
  ]);
  const saturdayHours = faker.helpers.arrayElement([
    '9:00 AM - 2:00 PM',
    '8:00 AM - 4:00 PM',
    'Closed',
    weekdayHours,
  ]);

  return {
    monday: weekdayHours,
    tuesday: weekdayHours,
    wednesday: weekdayHours,
    thursday: weekdayHours,
    friday: weekdayHours,
    saturday: saturdayHours,
    sunday: faker.helpers.arrayElement(['Closed', '10:00 AM - 2:00 PM', weekdayHours]),
  };
}

export function createBusinesses(count: number, industryKey?: IndustryKey): Business[] {
  return Array.from({ length: count }, () => createBusiness(industryKey));
}
