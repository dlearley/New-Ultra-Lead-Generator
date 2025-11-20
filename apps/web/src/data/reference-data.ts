import type { BusinessType, OwnershipType } from "@/types/prospect";

export const INDUSTRIES = [
  {
    label: "Software Development",
    value: "Software Development",
    naics: "541511",
    sic: "7372",
    description: "Custom software, product engineering, SaaS platforms",
    keywords: ["software", "saas", "platform", "dev"],
  },
  {
    label: "Healthcare Technology",
    value: "Healthcare Technology",
    naics: "621111",
    sic: "8011",
    description: "Care delivery, digital health, clinical systems",
    keywords: ["health", "care", "clinical", "life science"],
  },
  {
    label: "Fintech",
    value: "Fintech",
    naics: "522320",
    sic: "6199",
    description: "Payments, lending, neobank, wealth management",
    keywords: ["finance", "payments", "bank", "lending"],
  },
  {
    label: "Manufacturing",
    value: "Manufacturing",
    naics: "333120",
    sic: "3569",
    description: "Industrial systems, supply chain, fabrication",
    keywords: ["manufacturing", "plant", "supply"],
  },
  {
    label: "Retail & E-commerce",
    value: "Retail & E-commerce",
    naics: "454110",
    sic: "5961",
    description: "Marketplaces, consumer brands, omnichannel retail",
    keywords: ["retail", "commerce", "store", "shop"],
  },
  {
    label: "Energy",
    value: "Energy",
    naics: "221111",
    sic: "4911",
    description: "Utilities, clean energy, grid infrastructure",
    keywords: ["energy", "utility", "grid", "solar", "wind"],
  },
];

export const OWNERSHIP_TYPES: OwnershipType[] = [
  "Public",
  "Private",
  "PE-backed",
  "VC-backed",
];

export const BUSINESS_TYPES: BusinessType[] = ["B2B", "B2C", "Marketplace", "D2C"];

export const REVIEW_PLATFORMS = ["G2", "Capterra", "Glassdoor", "TrustRadius", "Google"];

export const TECH_STACK_TAGS = [
  "React",
  "Next.js",
  "Node.js",
  "Python",
  "Django",
  "Ruby on Rails",
  "AWS",
  "GCP",
  "Azure",
  "PostgreSQL",
  "MongoDB",
  "Kafka",
  "Snowflake",
  "Salesforce",
];

export const CITY_LIBRARY = [
  {
    label: "San Francisco, CA",
    city: "San Francisco",
    state: "CA",
    country: "USA",
    lat: 37.7749,
    lng: -122.4194,
  },
  {
    label: "Austin, TX",
    city: "Austin",
    state: "TX",
    country: "USA",
    lat: 30.2672,
    lng: -97.7431,
  },
  {
    label: "New York, NY",
    city: "New York",
    state: "NY",
    country: "USA",
    lat: 40.7128,
    lng: -74.006,
  },
  {
    label: "Boston, MA",
    city: "Boston",
    state: "MA",
    country: "USA",
    lat: 42.3601,
    lng: -71.0589,
  },
  {
    label: "Chicago, IL",
    city: "Chicago",
    state: "IL",
    country: "USA",
    lat: 41.8781,
    lng: -87.6298,
  },
  {
    label: "Seattle, WA",
    city: "Seattle",
    state: "WA",
    country: "USA",
    lat: 47.6062,
    lng: -122.3321,
  },
  {
    label: "Denver, CO",
    city: "Denver",
    state: "CO",
    country: "USA",
    lat: 39.7392,
    lng: -104.9903,
  },
  {
    label: "Atlanta, GA",
    city: "Atlanta",
    state: "GA",
    country: "USA",
    lat: 33.749,
    lng: -84.388,
  },
];

export const REVENUE_BANDS = [
  { label: "$0 - $10M", range: [0, 10_000_000] },
  { label: "$10M - $50M", range: [10_000_000, 50_000_000] },
  { label: "$50M - $100M", range: [50_000_000, 100_000_000] },
  { label: "$100M - $500M", range: [100_000_000, 500_000_000] },
  { label: "$500M+", range: [500_000_000, 2_000_000_000] },
];

export const EMPLOYEE_BANDS = [
  { label: "1-50", range: [1, 50] },
  { label: "51-200", range: [51, 200] },
  { label: "201-500", range: [201, 500] },
  { label: "501-1k", range: [501, 1000] },
  { label: "1k+", range: [1000, 10000] },
];

export const DEFAULT_PAGE_SIZE = 8;
