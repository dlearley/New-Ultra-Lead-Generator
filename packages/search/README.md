# Search Package

OpenSearch-based search and indexing library for business leads.

## Features

- **OpenSearch Client**: Configurable client with authentication, SSL, and connection management
- **Business Leads Index**: Pre-configured mapping with custom analyzers for business names, tags, and tech stack
- **Search Service**: Query builders for various search scenarios (text, location, filtered, autocomplete)
- **Migration Service**: Automated index creation and updates
- **TypeScript Support**: Full type safety with Zod validation

## Installation

```bash
pnpm add @monorepo/search
```

## Quick Start

### Initialize the Index

```bash
# Create the business leads index with default settings
pnpm search:init

# With custom OpenSearch configuration
OPENSEARCH_NODE=https://your-opensearch-cluster:9200 \
OPENSEARCH_USERNAME=admin \
OPENSEARCH_PASSWORD=password \
pnpm search:init
```

### Basic Usage

```typescript
import { 
  createOpenSearchClient, 
  createBusinessSearchService 
} from '@monorepo/search';
import { BusinessSearchInputSchema, Industry } from '@monorepo/core';

// Create OpenSearch client
const client = createOpenSearchClient({
  node: 'http://localhost:9200',
  auth: {
    username: 'admin',
    password: 'admin'
  }
});

// Create search service
const searchService = createBusinessSearchService();

// Build search query
const input = BusinessSearchInputSchema.parse({
  query: 'technology companies',
  industries: [Industry.TECHNOLOGY],
  location: { lat: 37.7749, lon: -122.4194 },
  radius: 50,
  limit: 20
});

const query = searchService.buildSearchQuery(input);

// Execute search
const results = await client.search(query.index, query.body);
```

## Configuration

### OpenSearch Client Configuration

```typescript
const config = {
  node: 'http://localhost:9200',
  auth: {
    username: 'admin',
    password: 'admin'
  },
  ssl: {
    ca: '/path/to/ca.crt',
    rejectUnauthorized: true
  },
  maxRetries: 3,
  requestTimeout: 30000
};

const client = createOpenSearchClient(config);
```

### Environment Variables

- `OPENSEARCH_NODE` - OpenSearch node URL (default: http://localhost:9200)
- `OPENSEARCH_USERNAME` - Authentication username
- `OPENSEARCH_PASSWORD` - Authentication password
- `OPENSEARCH_SSL_CA` - SSL certificate authority path
- `OPENSEARCH_SSL_REJECT_UNAUTHORIZED` - Reject unauthorized SSL connections (default: true)
- `OPENSEARCH_MAX_RETRIES` - Maximum connection retries (default: 3)
- `OPENSEARCH_REQUEST_TIMEOUT` - Request timeout in ms (default: 30000)

## Index Schema

The `business_leads` index includes the following field types:

### Core Fields
- `id` (keyword) - Unique identifier
- `name` (text) - Business name with autocomplete support
- `canonicalName` (text) - Normalized business name
- `alternateNames` (text) - Alternative business names
- `description` (text) - Business description

### Location Fields
- `coordinates` (geo_point) - Geographic coordinates
- `address` (text) - Full address
- `city`, `state`, `country`, `postalCode` (keyword)

### Business Classification
- `industry` (keyword) - Industry classification
- `businessType` (keyword) - Legal structure
- `businessMode` (keyword) - Online/offline/hybrid
- `ownership` (keyword) - Public/private/government

### Size Metrics
- `revenue` (integer) - Annual revenue
- `revenueBand` (keyword) - Revenue range category
- `employeeCount` (integer) - Number of employees
- `employeeBand` (keyword) - Employee range category

### Tags and Tech Stack
- `techStack` (text) - Technologies used
- `industryTags` (text) - Industry-specific tags
- `specializations` (text) - Business specializations

## Search Capabilities

### Text Search
```typescript
const input = BusinessSearchInputSchema.parse({
  query: 'SaaS companies in San Francisco'
});
```

### Location-Based Search
```typescript
const input = BusinessSearchInputSchema.parse({
  location: { lat: 37.7749, lon: -122.4194 },
  radius: 25 // kilometers
});
```

### Filtered Search
```typescript
const input = BusinessSearchInputSchema.parse({
  industries: [Industry.TECHNOLOGY, Industry.HEALTHCARE],
  revenueBands: [RevenueBand.RANGE_1M_5M, RevenueBand.RANGE_5M_10M],
  techStack: ['React', 'Node.js']
});
```

### Autocomplete
```typescript
const query = searchService.buildAutocompleteQuery('tech', 10);
const results = await client.search(query.index, query.body);
```

### Similar Business Search
```typescript
const query = searchService.buildSimilarBusinessQuery('business-123');
const results = await client.search(query.index, query.body);
```

## Migration Management

### Create/Update Index
```typescript
import { createIndexMigrationService } from '@monorepo/search';

const migrationService = createIndexMigrationService(config);

// Create new index
await migrationService.migrate();

// Update existing index mapping
await migrationService.migrate({ updateMapping: true });

// Recreate index
await migrationService.migrate({ deleteExisting: true });
```

### Verify Index
```typescript
const isValid = await migrationService.verify();
console.log('Index valid:', isValid);
```

### Rollback
```typescript
await migrationService.rollback();
```

## Custom Analyzers

The index includes custom analyzers for optimal search:

- **business_name_analyzer** - Handles business name variations and legal suffixes
- **tag_analyzer** - Optimized for tech stack and industry tags
- **text_search_analyzer** - General text search with stemming
- **autocomplete_analyzer** - Edge n-gram for autocomplete suggestions

## CLI Commands

```bash
# Initialize index
pnpm search:init

# Verify index
pnpm search:init verify

# Delete index
pnpm search:init delete

# Show help
pnpm search:init help
```

## Testing

```bash
# Run tests
pnpm test

# Run tests with coverage
pnpm test --coverage
```