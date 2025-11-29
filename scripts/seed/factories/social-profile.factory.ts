import { faker } from '@faker-js/faker';

export interface SocialProfile {
  id: string;
  business_id: string;
  platform: string;
  profile_url: string;
  handle: string;
  follower_count: number;
  engagement_rate: number;
  last_post_at: Date;
  metadata: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}

const PLATFORMS = ['Facebook', 'Instagram', 'Twitter', 'LinkedIn', 'YouTube', 'TikTok'];

export function createSocialProfile(
  businessId: string,
  platform: string,
  businessName: string,
  overrides?: Partial<SocialProfile>
): SocialProfile {
  const handle = generateHandle(businessName, platform);

  return {
    id: faker.string.uuid(),
    business_id: businessId,
    platform,
    profile_url: generateProfileUrl(platform, handle),
    handle,
    follower_count: faker.number.int({ min: 50, max: 50000 }),
    engagement_rate: parseFloat(
      faker.number.float({ min: 0.5, max: 8.0, fractionDigits: 2 }).toFixed(2)
    ),
    last_post_at: faker.date.recent({ days: 30 }),
    metadata: {
      verified: faker.datatype.boolean({ probability: 0.1 }),
      posts_per_week: faker.number.int({ min: 1, max: 10 }),
    },
    created_at: faker.date.past({ years: 1 }),
    updated_at: new Date(),
    ...overrides,
  };
}

function generateHandle(businessName: string, platform: string): string {
  const cleanName = businessName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .substring(0, 15);

  if (platform === 'Twitter') {
    return `@${cleanName}`;
  }

  return cleanName;
}

function generateProfileUrl(platform: string, handle: string): string {
  const cleanHandle = handle.replace('@', '');

  const urls: Record<string, string> = {
    Facebook: `https://facebook.com/${cleanHandle}`,
    Instagram: `https://instagram.com/${cleanHandle}`,
    Twitter: `https://twitter.com/${cleanHandle}`,
    LinkedIn: `https://linkedin.com/company/${cleanHandle}`,
    YouTube: `https://youtube.com/@${cleanHandle}`,
    TikTok: `https://tiktok.com/@${cleanHandle}`,
  };

  return urls[platform] || `https://${platform.toLowerCase()}.com/${cleanHandle}`;
}

export function createSocialProfiles(
  businessId: string,
  businessName: string,
  count: number = 2
): SocialProfile[] {
  const selectedPlatforms = faker.helpers.arrayElements(PLATFORMS, count);
  return selectedPlatforms.map((platform) =>
    createSocialProfile(businessId, platform, businessName)
  );
}
