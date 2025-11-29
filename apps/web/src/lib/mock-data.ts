import type {
  Prospect,
  ProspectFilters,
  ProspectSearchResponse,
  SortField,
} from "@/types/prospect";
import { CITY_LIBRARY, INDUSTRIES, TECH_STACK_TAGS } from "@/data/reference-data";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const baseFilters: ProspectFilters = {
  query: "",
  industries: [],
  naicsCodes: [],
  sicCodes: [],
  ownershipTypes: [],
  businessTypes: [],
  locations: [],
  radiusMiles: 150,
  revenueRange: null,
  employeesRange: null,
  minimumReviewRating: 0,
  minimumReviewCount: 0,
  reviewPlatforms: [],
  hasRecentReviews: false,
  isHiring: null,
  hasWebsite: null,
  hasGenericEmail: null,
  techStacks: [],
};

export const DEFAULT_FILTERS: ProspectFilters = Object.freeze(baseFilters);

export function createDefaultFilters(): ProspectFilters {
  return {
    ...baseFilters,
    industries: [],
    naicsCodes: [],
    sicCodes: [],
    ownershipTypes: [],
    businessTypes: [],
    locations: [],
    reviewPlatforms: [],
    techStacks: [],
  };
}

const mockProspects: Prospect[] = [
  {
    id: "1",
    name: "TechCorp Solutions",
    description: "Leading B2B software provider for enterprise customers",
    industry: "Software Development",
    naics: "541511",
    sic: "7372",
    ownership: "Private",
    businessType: "B2B",
    location: {
      city: "San Francisco",
      state: "CA",
      country: "USA",
      lat: 37.7749,
      lng: -122.4194,
    },
    revenueRange: [10_000_000, 50_000_000],
    employeesRange: [50, 100],
    reviewCount: 120,
    reviewRating: 4.5,
    reviewPlatforms: ["G2", "Capterra"],
    recentReviewDays: 15,
    isHiring: true,
    hasWebsite: true,
    hasGenericEmail: false,
    techStack: ["React", "Node.js", "PostgreSQL"],
    aiLeadScore: 92,
    fundingStage: "Series B",
    lastFundingRound: "2023-06-15",
    tags: ["High Growth", "Tech"],
  },
  {
    id: "2",
    name: "Healthcare Innovations Inc",
    description: "Healthcare technology solutions",
    industry: "Healthcare Technology",
    naics: "621111",
    sic: "8011",
    ownership: "Public",
    businessType: "B2B",
    location: {
      city: "Boston",
      state: "MA",
      country: "USA",
      lat: 42.3601,
      lng: -71.0589,
    },
    revenueRange: [50_000_000, 100_000_000],
    employeesRange: [200, 500],
    reviewCount: 85,
    reviewRating: 4.2,
    reviewPlatforms: ["Glassdoor"],
    recentReviewDays: 5,
    isHiring: true,
    hasWebsite: true,
    hasGenericEmail: false,
    techStack: ["Python", "Django", "AWS"],
    aiLeadScore: 88,
    fundingStage: "IPO",
    lastFundingRound: "2021-03-10",
    tags: ["Healthcare", "Established"],
  },
  {
    id: "3",
    name: "FinPay Technologies",
    description: "Next-generation payment processing for businesses",
    industry: "Fintech",
    naics: "522320",
    sic: "6199",
    ownership: "VC-backed",
    businessType: "B2B",
    location: {
      city: "Austin",
      state: "TX",
      country: "USA",
      lat: 30.2672,
      lng: -97.7431,
    },
    revenueRange: [10_000_000, 50_000_000],
    employeesRange: [51, 200],
    reviewCount: 45,
    reviewRating: 4.7,
    reviewPlatforms: ["G2", "TrustRadius"],
    recentReviewDays: 10,
    isHiring: true,
    hasWebsite: true,
    hasGenericEmail: false,
    techStack: ["React", "Node.js", "AWS", "MongoDB"],
    aiLeadScore: 94,
    fundingStage: "Series A",
    lastFundingRound: "2023-09-20",
    tags: ["High Growth", "Fintech"],
  },
  {
    id: "4",
    name: "GreenEnergy Solutions",
    description: "Clean energy solutions for enterprises",
    industry: "Energy",
    naics: "221111",
    sic: "4911",
    ownership: "Private",
    businessType: "B2B",
    location: {
      city: "Denver",
      state: "CO",
      country: "USA",
      lat: 39.7392,
      lng: -104.9903,
    },
    revenueRange: [100_000_000, 500_000_000],
    employeesRange: [501, 1_000],
    reviewCount: 150,
    reviewRating: 4.3,
    reviewPlatforms: ["Glassdoor", "Google"],
    recentReviewDays: 7,
    isHiring: false,
    hasWebsite: true,
    hasGenericEmail: false,
    techStack: ["Python", "AWS", "PostgreSQL"],
    aiLeadScore: 78,
    fundingStage: "Series C",
    lastFundingRound: "2022-05-10",
    tags: ["Established", "Energy"],
  },
  {
    id: "5",
    name: "ShopFlow E-commerce",
    description: "Omnichannel retail platform for brands",
    industry: "Retail & E-commerce",
    naics: "454110",
    sic: "5961",
    ownership: "PE-backed",
    businessType: "B2C",
    location: {
      city: "New York",
      state: "NY",
      country: "USA",
      lat: 40.7128,
      lng: -74.006,
    },
    revenueRange: [50_000_000, 100_000_000],
    employeesRange: [201, 500],
    reviewCount: 200,
    reviewRating: 4.6,
    reviewPlatforms: ["G2", "Capterra", "Google"],
    recentReviewDays: 3,
    isHiring: true,
    hasWebsite: true,
    hasGenericEmail: false,
    techStack: ["React", "Next.js", "Node.js", "MongoDB"],
    aiLeadScore: 91,
    fundingStage: "Growth",
    lastFundingRound: "2023-11-15",
    tags: ["High Growth", "E-commerce"],
  },
  {
    id: "6",
    name: "ManufactureIQ",
    description: "Smart manufacturing and supply chain solutions",
    industry: "Manufacturing",
    naics: "333120",
    sic: "3569",
    ownership: "Public",
    businessType: "B2B",
    location: {
      city: "Chicago",
      state: "IL",
      country: "USA",
      lat: 41.8781,
      lng: -87.6298,
    },
    revenueRange: [500_000_000, 2_000_000_000],
    employeesRange: [1_000, 10_000],
    reviewCount: 300,
    reviewRating: 4.1,
    reviewPlatforms: ["Glassdoor"],
    recentReviewDays: 20,
    isHiring: true,
    hasWebsite: true,
    hasGenericEmail: true,
    techStack: ["Python", "Azure", "Kafka", "PostgreSQL"],
    aiLeadScore: 75,
    fundingStage: "IPO",
    lastFundingRound: "2019-08-01",
    tags: ["Established", "Manufacturing"],
  },
  {
    id: "7",
    name: "CloudSync Software",
    description: "Cloud collaboration tools for remote teams",
    industry: "Software Development",
    naics: "541511",
    sic: "7372",
    ownership: "VC-backed",
    businessType: "B2B",
    location: {
      city: "Seattle",
      state: "WA",
      country: "USA",
      lat: 47.6062,
      lng: -122.3321,
    },
    revenueRange: [10_000_000, 50_000_000],
    employeesRange: [50, 100],
    reviewCount: 80,
    reviewRating: 4.8,
    reviewPlatforms: ["G2", "Capterra"],
    recentReviewDays: 5,
    isHiring: true,
    hasWebsite: true,
    hasGenericEmail: false,
    techStack: ["React", "Node.js", "GCP", "PostgreSQL"],
    aiLeadScore: 95,
    fundingStage: "Series B",
    lastFundingRound: "2023-07-30",
    tags: ["High Growth", "SaaS"],
  },
  {
    id: "8",
    name: "MedTech Diagnostics",
    description: "AI-powered diagnostic tools for healthcare providers",
    industry: "Healthcare Technology",
    naics: "621111",
    sic: "8011",
    ownership: "Private",
    businessType: "B2B",
    location: {
      city: "Atlanta",
      state: "GA",
      country: "USA",
      lat: 33.749,
      lng: -84.388,
    },
    revenueRange: [10_000_000, 50_000_000],
    employeesRange: [51, 200],
    reviewCount: 60,
    reviewRating: 4.4,
    reviewPlatforms: ["G2", "Glassdoor"],
    recentReviewDays: 12,
    isHiring: false,
    hasWebsite: true,
    hasGenericEmail: false,
    techStack: ["Python", "Django", "AWS", "Snowflake"],
    aiLeadScore: 85,
    fundingStage: "Series A",
    lastFundingRound: "2023-04-10",
    tags: ["Healthcare", "AI"],
  },
];

const toNumber = (value: string, magnitude: string) => {
  const numeric = Number(value);
  if (Number.isNaN(numeric)) return null;
  if (magnitude.startsWith("k")) return numeric * 1_000;
  if (magnitude.startsWith("m")) return numeric * 1_000_000;
  if (magnitude.startsWith("b")) return numeric * 1_000_000_000;
  return numeric;
};

const kmToMiles = (km: number) => km * 0.621371;

const haversine = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371; // km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return kmToMiles(R * c);
};

const normalizeLocations = (
  locations: ProspectFilters["locations"]
): ProspectFilters["locations"] => {
  if (!locations?.length) return [];
  return locations.map((location) => {
    if (location.lat && location.lng) {
      return location;
    }
    const match = CITY_LIBRARY.find(
      (city) =>
        city.city.toLowerCase() === location.city?.toLowerCase() &&
        city.state.toLowerCase() === location.state?.toLowerCase()
    );
    if (match) {
      return {
        ...location,
        lat: match.lat,
        lng: match.lng,
      };
    }
    return location;
  });
};

export async function parseSearchQueryToFilters(
  query: string
): Promise<Partial<ProspectFilters>> {
  await delay(350);
  if (!query.trim()) {
    return { query: "" };
  }

  const partial: Partial<ProspectFilters> = { query };
  const normalized = query.toLowerCase();

  const inferredIndustries = INDUSTRIES.filter((industry) =>
    industry.keywords.some((keyword) => normalized.includes(keyword.toLowerCase()))
  );
  if (inferredIndustries.length) {
    partial.industries = inferredIndustries.map((industry) => industry.value);
    partial.naicsCodes = inferredIndustries.map((industry) => industry.naics);
    partial.sicCodes = inferredIndustries.map((industry) => industry.sic);
  }

  if (normalized.includes("b2b")) {
    partial.businessTypes = ["B2B"];
  } else if (normalized.includes("b2c")) {
    partial.businessTypes = ["B2C"];
  }

  if (normalized.includes("public")) {
    partial.ownershipTypes = ["Public"];
  } else if (normalized.includes("private")) {
    partial.ownershipTypes = ["Private"];
  }

  const cityMatch = CITY_LIBRARY.find((city) =>
    normalized.includes(city.city.toLowerCase()) ||
    normalized.includes(city.state.toLowerCase())
  );
  if (cityMatch) {
    partial.locations = [cityMatch];
  }

  const radiusMatch = normalized.match(/(\d+)\s?(mile|mi)/);
  if (radiusMatch) {
    partial.radiusMiles = Math.min(500, Number(radiusMatch[1]));
  }

  const revenueMatch = normalized.match(/\$?(\d+)\s?(k|m|b)/);
  if (revenueMatch) {
    const value = toNumber(revenueMatch[1], revenueMatch[2]);
    if (value) {
      partial.revenueRange = [value, value * 2] as [number, number];
    }
  }

  const employeeRangeMatch = normalized.match(/(\d+)\s?-\s?(\d+)\s?(employee|headcount|people)/);
  if (employeeRangeMatch) {
    partial.employeesRange = [Number(employeeRangeMatch[1]), Number(employeeRangeMatch[2])] as [
      number,
      number
    ];
  }

  const minEmployeesMatch = normalized.match(/(\d+)\+\s?(employee|people)/);
  if (!partial.employeesRange && minEmployeesMatch) {
    partial.employeesRange = [Number(minEmployeesMatch[1]), 10_000];
  }

  if (normalized.includes("hiring")) {
    partial.isHiring = true;
  }
  if (normalized.includes("website")) {
    partial.hasWebsite = true;
  }
  if (normalized.includes("no generic")) {
    partial.hasGenericEmail = false;
  }
  if (normalized.includes("recent review")) {
    partial.hasRecentReviews = true;
  }

  const ratingMatch = normalized.match(/(\d(?:\.\d)?)\s?(star|rating)/);
  if (ratingMatch) {
    partial.minimumReviewRating = Number(ratingMatch[1]);
  }

  const reviewCountMatch = normalized.match(/(\d+)\s?reviews/);
  if (reviewCountMatch) {
    partial.minimumReviewCount = Number(reviewCountMatch[1]);
  }

  const techMatches = TECH_STACK_TAGS.filter((tech) =>
    normalized.includes(tech.toLowerCase())
  );
  if (techMatches.length) {
    partial.techStacks = techMatches;
  }

  return partial;
}

const matchesQuery = (prospect: Prospect, query: string) => {
  if (!query) return true;
  const normalized = query.toLowerCase();
  return (
    prospect.name.toLowerCase().includes(normalized) ||
    prospect.description.toLowerCase().includes(normalized) ||
    prospect.industry.toLowerCase().includes(normalized) ||
    prospect.techStack.some((tech) => tech.toLowerCase().includes(normalized)) ||
    `${prospect.location.city}, ${prospect.location.state}`
      .toLowerCase()
      .includes(normalized)
  );
};

const intersects = <T,>(left: T[] = [], right: T[] = []) =>
  left.length === 0 || left.some((value) => right.includes(value));

const matchesLocation = (
  prospect: Prospect,
  locations: ProspectFilters["locations"],
  radiusMiles: number
) => {
  if (!locations.length) return true;
  return locations.some((location) => {
    if (location.lat && location.lng) {
      const distance = haversine(
        prospect.location.lat,
        prospect.location.lng,
        location.lat,
        location.lng
      );
      return distance <= radiusMiles;
    }
    const cityMatch = location.city
      ? prospect.location.city.toLowerCase() === location.city.toLowerCase()
      : true;
    const stateMatch = location.state
      ? prospect.location.state.toLowerCase() === location.state.toLowerCase()
      : true;
    return cityMatch && stateMatch;
  });
};

const matchesRange = (range: [number, number] | null, target: [number, number]) => {
  if (!range) return true;
  const [min, max] = range;
  const [tMin, tMax] = target;
  return !(tMax < min || tMin > max);
};

export async function searchProspects(
  filters: ProspectFilters = createDefaultFilters(),
  page = 1,
  pageSize = 8,
  sortField: SortField = "aiLeadScore",
  sortDirection: "asc" | "desc" = "desc"
): Promise<ProspectSearchResponse> {
  await delay(400);

  const normalizedFilters: ProspectFilters = {
    ...createDefaultFilters(),
    ...filters,
    locations: normalizeLocations(filters.locations),
  };

  let data = mockProspects.filter((prospect) => {
    if (!matchesQuery(prospect, normalizedFilters.query)) return false;
    if (
      normalizedFilters.industries.length &&
      !normalizedFilters.industries.includes(prospect.industry)
    ) {
      return false;
    }
    if (
      normalizedFilters.naicsCodes.length &&
      !normalizedFilters.naicsCodes.includes(prospect.naics)
    ) {
      return false;
    }
    if (
      normalizedFilters.sicCodes.length &&
      !normalizedFilters.sicCodes.includes(prospect.sic)
    ) {
      return false;
    }
    if (
      normalizedFilters.ownershipTypes.length &&
      !normalizedFilters.ownershipTypes.includes(prospect.ownership)
    ) {
      return false;
    }
    if (
      normalizedFilters.businessTypes.length &&
      !normalizedFilters.businessTypes.includes(prospect.businessType)
    ) {
      return false;
    }
    if (
      !matchesLocation(
        prospect,
        normalizedFilters.locations,
        normalizedFilters.radiusMiles
      )
    ) {
      return false;
    }
    if (!matchesRange(normalizedFilters.revenueRange, prospect.revenueRange)) {
      return false;
    }
    if (!matchesRange(normalizedFilters.employeesRange, prospect.employeesRange)) {
      return false;
    }
    if (
      normalizedFilters.minimumReviewRating > 0 &&
      prospect.reviewRating < normalizedFilters.minimumReviewRating
    ) {
      return false;
    }
    if (
      normalizedFilters.minimumReviewCount > 0 &&
      prospect.reviewCount < normalizedFilters.minimumReviewCount
    ) {
      return false;
    }
    if (
      normalizedFilters.reviewPlatforms.length &&
      !intersects(normalizedFilters.reviewPlatforms, prospect.reviewPlatforms)
    ) {
      return false;
    }
    if (normalizedFilters.hasRecentReviews && prospect.recentReviewDays > 30) {
      return false;
    }
    if (normalizedFilters.isHiring === true && !prospect.isHiring) {
      return false;
    }
    if (normalizedFilters.hasWebsite === true && !prospect.hasWebsite) {
      return false;
    }
    if (
      normalizedFilters.hasGenericEmail === true &&
      !prospect.hasGenericEmail
    ) {
      return false;
    }
    if (
      normalizedFilters.hasGenericEmail === false &&
      prospect.hasGenericEmail
    ) {
      return false;
    }
    if (
      normalizedFilters.techStacks.length &&
      !normalizedFilters.techStacks.every((tech) => prospect.techStack.includes(tech))
    ) {
      return false;
    }
    return true;
  });

  const direction = sortDirection === "asc" ? 1 : -1;
  data = data.sort((a, b) => {
    switch (sortField) {
      case "name":
        return direction * a.name.localeCompare(b.name);
      case "revenue":
        return direction * (a.revenueRange[0] - b.revenueRange[0]);
      case "employees":
        return direction * (a.employeesRange[0] - b.employeesRange[0]);
      case "aiLeadScore":
      default:
        return direction * (a.aiLeadScore - b.aiLeadScore);
    }
  });

  const total = data.length;
  const start = Math.max(0, (page - 1) * pageSize);
  const results = data.slice(start, start + pageSize);

  return {
    results,
    total,
  };
}

export async function saveSearch(
  name: string,
  filters: ProspectFilters
): Promise<{ id: string }> {
  await delay(350);
  return { id: `${name.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}` };
}

export async function addToList(
  listId: string,
  prospectIds: string[]
): Promise<void> {
  await delay(350);
  console.info(`Added ${prospectIds.length} prospects to list ${listId}`);
}
