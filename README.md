# Engine Labs API - Search Module

Phase 4 Part 2: Business Search API with OpenSearch and PostgreSQL integration.

## Features

- **Full-text Search**: Keyword search with fuzzy matching support
- **Geo Distance Filtering**: Search by coordinates or address with distance radius
- **Multi-Filter Combinations**: Filter by industry, location, revenue, employees, hiring, tech stack
- **Aggregations/Facets**: Get breakdowns by industry, geography, revenue ranges, hiring levels, and tech stack
- **Pagination & Sorting**: Skip/take pagination with multiple sort options (relevance, name, revenue, employees, distance, created date)
- **Saved Searches**: CRUD operations for storing search queries with user/organization metadata
- **"Did You Mean" Suggestions**: Smart query suggestions based on search results

## Project Structure

```
src/
├── api/
│   ├── search/
│   │   ├── search.controller.ts       # Search API endpoints
│   │   ├── search.service.ts          # Search business logic
│   │   ├── opensearch.service.ts      # OpenSearch integration
│   │   ├── search.module.ts           # Search module
│   │   └── query-builder.spec.ts      # Unit tests
│   └── saved-search/
│       ├── saved-search.controller.ts # Saved search CRUD endpoints
│       ├── saved-search.service.ts    # Saved search business logic
│       └── saved-search.module.ts     # Saved search module
├── common/
│   ├── dtos/
│   │   ├── business-search.input.ts   # Search input DTO with validation
│   │   ├── search-response.dto.ts     # Search response structure
│   │   └── saved-search.dto.ts        # Saved search DTOs
│   └── services/
│       └── geocoding.service.ts       # Address-to-coordinates conversion
├── database/
│   ├── entities/
│   │   ├── business.entity.ts         # Business entity
│   │   └── saved-search.entity.ts     # Saved search entity
│   ├── data-source.ts                 # TypeORM data source
│   └── database.module.ts             # Database module
└── main.ts                            # Application entry point

tests/
└── e2e/
    └── search-api.spec.ts             # Playwright contract tests
```

## API Endpoints

### Search Businesses

```bash
POST /api/search/businesses
Content-Type: application/json

{
  "query": "tech company",
  "industry": "Technology",
  "location": "San Francisco",
  "geoLocation": {
    "latitude": 37.7749,
    "longitude": -122.4194,
    "distanceKm": 50
  },
  "minRevenue": 1000000,
  "maxRevenue": 10000000,
  "minEmployees": 10,
  "maxEmployees": 500,
  "minHiring": 5,
  "maxHiring": 100,
  "techStack": ["JavaScript", "React"],
  "sortBy": "relevance",
  "sortOrder": "desc",
  "skip": 0,
  "take": 20,
  "fuzzyMatching": "high"
}
```

**Response:**
```json
{
  "results": [
    {
      "id": "uuid",
      "name": "Tech Company Inc",
      "description": "Leading technology company",
      "industry": "Technology",
      "location": "San Francisco",
      "latitude": 37.7749,
      "longitude": -122.4194,
      "revenue": 5000000,
      "employees": 150,
      "hiring": 25,
      "techStack": ["JavaScript", "React", "Node.js"],
      "score": 0.95
    }
  ],
  "total": 42,
  "skip": 0,
  "take": 20,
  "aggregations": {
    "industry": [
      { "name": "Technology", "count": 30, "value": "Technology" },
      { "name": "Finance", "count": 12, "value": "Finance" }
    ],
    "location": [...],
    "techStack": [...],
    "revenueRanges": [...],
    "hiringLevels": [...]
  },
  "suggestions": [
    { "text": "Tech Company Inc", "score": 0.95 },
    { "text": "Tech Solutions LLC", "score": 0.87 }
  ]
}
```

### Saved Searches

#### Create Saved Search
```bash
POST /api/saved-searches
Content-Type: application/json

{
  "name": "Tech Companies in SF",
  "description": "Search for tech companies",
  "userId": "user-uuid",
  "organizationId": "org-uuid",
  "query": {
    "query": "tech",
    "industry": "Technology",
    "geoLocation": {
      "latitude": 37.7749,
      "longitude": -122.4194,
      "distanceKm": 50
    }
  },
  "filters": {
    "minRevenue": 1000000,
    "maxRevenue": 10000000
  }
}
```

#### List Saved Searches
```bash
GET /api/saved-searches?userId=user-uuid&organizationId=org-uuid&skip=0&take=20
```

#### Get Single Saved Search
```bash
GET /api/saved-searches/{id}
```

#### Update Saved Search
```bash
PUT /api/saved-searches/{id}
Content-Type: application/json

{
  "name": "Updated Name",
  "description": "Updated description",
  "query": { ... },
  "filters": { ... }
}
```

#### Delete Saved Search
```bash
DELETE /api/saved-searches/{id}
```

## Setup and Installation

### Prerequisites
- Node.js 18+
- PostgreSQL 12+
- OpenSearch 2.0+

### Installation

1. Install dependencies:
```bash
npm install
```

2. Create `.env` file:
```bash
cp .env.example .env
```

3. Configure environment variables for your database and OpenSearch instance

4. Run database migrations:
```bash
npm run build
npm run db:migrate
```

## Development

### Start Development Server
```bash
npm run start:dev
```

### Run Tests

#### Unit Tests (Vitest)
```bash
npm run test:vitest
npm run test:vitest:ui
```

#### E2E Tests (Playwright)
```bash
npm run test:pw
```

#### All Tests
```bash
npm test
```

### Code Quality

#### Format Code
```bash
npm run format
```

#### Lint Code
```bash
npm run lint
```

## Query Builder Features

The query builder supports:

1. **Text Search**: Multi-field search with keyword matching
2. **Fuzzy Matching**: Automatic fuzzy search for typo tolerance (fuzziness: AUTO)
3. **Multi-Filter Combinations**: Boolean logic combining multiple filters
4. **Geo Distance**: Haversine formula distance filtering
5. **Range Filters**: Revenue, employees, hiring count ranges
6. **Faceted Search**: Aggregations across multiple dimensions
7. **Sorting**: Multiple sort fields with ASC/DESC ordering
8. **Pagination**: Skip/take for efficient result chunking

## Validation

- Input DTOs use `class-validator` for comprehensive validation
- All numeric inputs support min/max constraints
- Enum validation for sort fields and sort orders
- Array validation for multi-value filters

## Error Handling

- 404 Not Found: When saved search doesn't exist
- 400 Bad Request: Validation errors on input
- 500 Internal Server Error: Server errors logged with context

## Database Schema

### businesses table
```sql
- id (UUID, Primary Key)
- name (String, Required, Indexed)
- description (Text)
- industry (String, Indexed)
- location (String, Indexed)
- latitude (Decimal)
- longitude (Decimal)
- revenue (Integer)
- employees (Integer)
- hiring (Integer)
- techStack (Array)
- metadata (JSONB)
- createdAt (Timestamp, Indexed)
- updatedAt (Timestamp)
```

### saved_searches table
```sql
- id (UUID, Primary Key)
- name (String, Required)
- description (Text)
- userId (UUID, Indexed)
- organizationId (UUID, Indexed)
- query (JSONB, Required)
- filters (JSONB)
- resultsCount (Integer)
- createdAt (Timestamp, Indexed)
- updatedAt (Timestamp)
```

## OpenSearch Mapping

The `businesses` index uses:
- Text fields with standard analyzer and keyword sub-fields
- Geo-point fields for distance calculations
- Keyword fields for exact matching
- Integer fields for range queries
- Custom tokenizers for autocomplete (if needed)

## Testing

### Unit Tests
- Query builder validation
- Filter combination logic
- Range filter calculations
- Pagination parameters

### Playwright Contract Tests
- Full API contract validation
- Text search with various queries
- Geo-distance filtering
- Multi-filter combinations
- Aggregation structure validation
- Saved search CRUD operations
- Pagination and sorting
- "Did you mean" suggestions

## Performance Considerations

- Database indexes on frequently queried fields
- OpenSearch indexing for fast full-text search
- Pagination limits (max 100 results per page)
- Aggregation bucketing with reasonable limits
- Connection pooling for database

## Security

- Input validation on all DTOs
- SQL injection prevention via TypeORM parameterized queries
- OpenSearch query injection prevention via proper query building
- CORS enabled (configurable)
- Environment variable secrets management

## License

MIT
