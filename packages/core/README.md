# Core Package

Core utilities, models, and validation schemas for the monorepo.

## Features

- **TypeScript Models**: Business search input and lead data models
- **Enumerations**: Industry, business type, ownership, and size classifications
- **Zod Validation**: Runtime validation for all data models
- **Geo Types**: Geospatial point definitions

## Installation

```bash
pnpm add @monorepo/core
```

## Usage

### Business Search Input

```typescript
import { 
  BusinessSearchInputSchema, 
  Industry, 
  RevenueBand, 
  EmployeeBand 
} from '@monorepo/core';

// Parse and validate search input
const input = BusinessSearchInputSchema.parse({
  query: 'technology companies',
  industries: [Industry.TECHNOLOGY],
  revenueBands: [RevenueBand.RANGE_1M_5M],
  employeeBands: [EmployeeBand.RANGE_10_50],
  location: { lat: 37.7749, lon: -122.4194 },
  radius: 25,
  limit: 20,
  sortBy: 'relevance',
  sortOrder: 'desc'
});
```

### Business Lead Data

```typescript
import { 
  BusinessLeadSchema, 
  BusinessType, 
  BusinessMode, 
  Ownership 
} from '@monorepo/core';

// Parse and validate business lead data
const lead = BusinessLeadSchema.parse({
  id: 'business-123',
  name: 'Tech Corp',
  canonicalName: 'Tech Corporation',
  description: 'A technology company specializing in SaaS solutions',
  website: 'https://techcorp.com',
  coordinates: { lat: 37.7749, lon: -122.4194 },
  industry: Industry.TECHNOLOGY,
  businessType: BusinessType.CORPORATION,
  businessMode: BusinessMode.HYBRID,
  ownership: Ownership.PRIVATE,
  revenue: 5000000,
  revenueBand: RevenueBand.RANGE_1M_5M,
  employeeCount: 50,
  employeeBand: EmployeeBand.RANGE_10_50,
  techStack: ['React', 'Node.js', 'AWS', 'PostgreSQL'],
  industryTags: ['SaaS', 'B2B', 'Enterprise'],
  foundedYear: 2020,
  isVerified: true
});
```

## Enumerations

### Industry
```typescript
enum Industry {
  TECHNOLOGY = 'technology',
  HEALTHCARE = 'healthcare',
  FINANCE = 'finance',
  MANUFACTURING = 'manufacturing',
  RETAIL = 'retail',
  EDUCATION = 'education',
  REAL_ESTATE = 'real_estate',
  CONSTRUCTION = 'construction',
  TRANSPORTATION = 'transportation',
  HOSPITALITY = 'hospitality',
  AGRICULTURE = 'agriculture',
  ENERGY = 'energy',
  MEDIA = 'media',
  CONSULTING = 'consulting',
  LEGAL = 'legal',
  OTHER = 'other'
}
```

### Business Type
```typescript
enum BusinessType {
  CORPORATION = 'corporation',
  LLC = 'llc',
  PARTNERSHIP = 'partnership',
  SOLE_PROPRIETORSHIP = 'sole_proprietorship',
  NON_PROFIT = 'non_profit',
  COOPERATIVE = 'cooperative'
}
```

### Business Mode
```typescript
enum BusinessMode {
  ONLINE = 'online',
  OFFLINE = 'offline',
  HYBRID = 'hybrid'
}
```

### Ownership
```typescript
enum Ownership {
  PUBLIC = 'public',
  PRIVATE = 'private',
  GOVERNMENT = 'government',
  FRANCHISE = 'franchise'
}
```

### Revenue Bands
```typescript
enum RevenueBand {
  UNDER_1M = 'under_1m',
  RANGE_1M_5M = 'range_1m_5m',
  RANGE_5M_10M = 'range_5m_10m',
  RANGE_10M_50M = 'range_10m_50m',
  RANGE_50M_100M = 'range_50m_100m',
  RANGE_100M_500M = 'range_100m_500m',
  RANGE_500M_1B = 'range_500m_1b',
  OVER_1B = 'over_1b'
}
```

### Employee Bands
```typescript
enum EmployeeBand {
  UNDER_10 = 'under_10',
  RANGE_10_50 = 'range_10_50',
  RANGE_50_100 = 'range_50_100',
  RANGE_100_500 = 'range_100_500',
  RANGE_500_1000 = 'range_500_1000',
  RANGE_1000_5000 = 'range_1000_5000',
  RANGE_5000_10000 = 'range_5000_10000',
  OVER_10000 = 'over_10000'
}
```

## Validation

All schemas use Zod for runtime validation:

```typescript
import { BusinessSearchInputSchema } from '@monorepo/core';

// Safe parsing with error handling
const result = BusinessSearchInputSchema.safeParse(input);

if (!result.success) {
  console.error('Validation errors:', result.error.errors);
  return;
}

// Use validated data
const validatedInput = result.data;
```

## Geospatial Types

```typescript
import { GeoPointSchema } from '@monorepo/core';

const point = GeoPointSchema.parse({
  lat: 37.7749,
  lon: -122.4194
});
```

## Search Result Types

```typescript
import { SearchResultSchema } from '@monorepo/core';

const searchResult = SearchResultSchema.parse({
  items: [/* business leads */],
  total: 100,
  hasMore: true,
  took: 45 // milliseconds
});
```

## Testing

```bash
# Run tests
pnpm test

# Run tests with coverage
pnpm test --coverage
```