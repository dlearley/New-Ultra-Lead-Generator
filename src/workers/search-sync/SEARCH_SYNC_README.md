# Search Sync Module (BullMQ)

Phase 4 Part 3: BullMQ job queue for search index management with automatic retry/backoff, metrics tracking, and multi-tenant support.

## Features

- **Full Rebuild**: Rebuild entire search index from PostgreSQL in configurable batches
- **Per-Tenant Rebuild**: Rebuild index for specific tenants
- **Incremental Sync**: Index, update, and delete individual records
- **Retry/Backoff**: Automatic exponential backoff with max retry attempts
- **Metrics Tracking**: Success/failure counts, job duration, and performance metrics
- **Alerts**: Success and error alerts with metrics context
- **Queue Management**: Pause, resume, and clear queue operations
- **CLI Commands**: Command-line tools for job triggering and monitoring

## Architecture

### Components

1. **SearchSyncService**: Main service for queueing and managing jobs
2. **SearchSyncProcessor**: BullMQ job processor for rebuild and incremental sync
3. **RebuildSearchIndexJob**: Job handler for full index rebuilds
4. **IncrementalSyncJob**: Job handler for individual document operations
5. **SearchIndexTransformerService**: Transforms database entities to index documents
6. **SearchSyncMetricsService**: Tracks job metrics and emits alerts
7. **SearchSyncController**: REST API endpoints for job management

### Job Types

#### rebuild-search-index
Rebuilds the entire search index or per-tenant index.

**Data Structure:**
```typescript
{
  tenantId?: string;          // Optional: rebuild for specific tenant
  organizationId?: string;    // Optional: filter by organization
  batchSize?: number;         // Batch size for processing (default: 1000)
}
```

#### incremental-sync
Handles individual document index, update, or delete operations.

**Data Structure:**
```typescript
{
  tenantId?: string;
  organizationId?: string;
  entityType: string;         // e.g., 'Business'
  operation: 'index' | 'update' | 'delete';
  entityId?: string;          // ID of entity to sync
  data?: Record<string, any>; // Optional: additional data
}
```

## API Endpoints

### POST /api/search-sync/rebuild
Rebuild entire search index.

```bash
curl -X POST http://localhost:3000/api/search-sync/rebuild \
  -H "Content-Type: application/json" \
  -d '{ "batchSize": 1000 }'
```

**Response:**
```json
{
  "jobId": "1",
  "message": "Rebuild search index job queued successfully"
}
```

### POST /api/search-sync/rebuild-tenant/:tenantId
Rebuild search index for specific tenant.

```bash
curl -X POST http://localhost:3000/api/search-sync/rebuild-tenant/tenant-123 \
  -H "Content-Type: application/json"
```

### POST /api/search-sync/rebuild-corpus
Rebuild entire corpus with optional batch size.

```bash
curl -X POST "http://localhost:3000/api/search-sync/rebuild-corpus?batchSize=500" \
  -H "Content-Type: application/json"
```

### POST /api/search-sync/index/:businessId
Index a single business record.

```bash
curl -X POST "http://localhost:3000/api/search-sync/index/business-123" \
  -H "Content-Type: application/json"
```

### POST /api/search-sync/update/:businessId
Update a business record in the index.

```bash
curl -X POST "http://localhost:3000/api/search-sync/update/business-123" \
  -H "Content-Type: application/json"
```

### POST /api/search-sync/delete/:businessId
Delete a business record from the index.

```bash
curl -X POST "http://localhost:3000/api/search-sync/delete/business-123" \
  -H "Content-Type: application/json"
```

### GET /api/search-sync/job-status/:jobId
Get the status of a specific job.

```bash
curl http://localhost:3000/api/search-sync/job-status/1
```

**Response:**
```json
{
  "jobId": "1",
  "status": "completed",
  "progress": 100,
  "returnValue": { "success": true, "metrics": {...} }
}
```

### GET /api/search-sync/stats
Get queue statistics and metrics summary.

```bash
curl http://localhost:3000/api/search-sync/stats
```

**Response:**
```json
{
  "queue": {
    "active": 0,
    "completed": 5,
    "failed": 0,
    "delayed": 0,
    "waiting": 0
  },
  "metrics": {
    "totalJobs": 5,
    "successfulJobs": 5,
    "failedJobs": 0,
    "totalSuccessCount": 1250,
    "totalFailureCount": 0,
    "averageDuration": 5423
  }
}
```

### POST /api/search-sync/pause
Pause the search sync queue.

```bash
curl -X POST http://localhost:3000/api/search-sync/pause
```

### POST /api/search-sync/resume
Resume the search sync queue.

```bash
curl -X POST http://localhost:3000/api/search-sync/resume
```

### POST /api/search-sync/clear
Clear completed and failed jobs from the queue.

```bash
curl -X POST http://localhost:3000/api/search-sync/clear
```

## CLI Commands

### Rebuild Search Index

```bash
npm run start -- search-index:rebuild
npm run start -- search-index:rebuild --tenantId=tenant-123 --batchSize=500
```

### Get Job Status

```bash
npm run start -- search-index:status --jobId=1
```

### Get Queue Statistics

```bash
npm run start -- search-index:stats
```

### Pause Queue

```bash
npm run start -- search-index:pause
```

### Resume Queue

```bash
npm run start -- search-index:resume
```

### Clear Queue

```bash
npm run start -- search-index:clear
```

## Metrics

The SearchSyncMetricsService tracks:

- **successCount**: Number of successfully processed documents
- **failureCount**: Number of failed documents
- **totalCount**: Total documents to be processed
- **duration**: Job execution time in milliseconds
- **status**: Current job status (pending, processing, completed, failed)
- **timestamp**: Job start timestamp

## Alerts

The system emits three types of alerts:

### Success Alert
```json
{
  "type": "success",
  "message": "Rebuild search index job completed successfully",
  "metrics": { ... },
  "timestamp": 1699999999999
}
```

### Warning Alert
```json
{
  "type": "warning",
  "message": "No businesses found to index",
  "metrics": { ... },
  "timestamp": 1699999999999
}
```

### Error Alert
```json
{
  "type": "error",
  "message": "Failed to bulk index documents",
  "metrics": { ... },
  "timestamp": 1699999999999
}
```

## Retry/Backoff Strategy

- **Max Retries**: 3 attempts
- **Initial Delay**: 1000ms (incremental), 2000ms (rebuild)
- **Backoff Type**: Exponential
- **Formula**: delay = baseDelay × 2^(attempt - 1)

Example retry timeline for incremental sync:
- Attempt 1: Immediate
- Attempt 2: 1000ms delay
- Attempt 3: 2000ms delay

Example retry timeline for rebuild:
- Attempt 1: Immediate
- Attempt 2: 2000ms delay
- Attempt 3: 4000ms delay

## Configuration

### Environment Variables

```env
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

OPENSEARCH_HOST=localhost
OPENSEARCH_PORT=9200
OPENSEARCH_PROTOCOL=http

DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USER=postgres
DATABASE_PASSWORD=password
DATABASE_NAME=engine_labs
```

### Redis Configuration

The module uses @nestjs/bull which connects to Redis. Configure connection in BullModule.forRootAsync in app.module.ts:

```typescript
BullModule.forRootAsync({
  useFactory: (configService: ConfigService) => ({
    redis: {
      host: configService.get('REDIS_HOST', 'localhost'),
      port: configService.get('REDIS_PORT', 6379),
      password: configService.get('REDIS_PASSWORD'),
    },
  }),
  inject: [ConfigService],
})
```

## Testing

### Unit Tests
```bash
npm test
```

### Integration Tests
```bash
npm run test:vitest
```

Requires running services:
```bash
docker-compose up -d
```

### E2E Tests
```bash
npm run test:pw
```

## Monitoring

### BullMQ Dashboard

Install Bull Board for visual monitoring:
```bash
npm install @bull-board/express @bull-board/ui
```

Then add to your app:
```typescript
import { createBullBoard } from '@bull-board/express';
import { BullAdapter } from '@bull-board/express/bullAdapter';

const { router } = createBullBoard({
  queues: [new BullAdapter(searchSyncQueue)],
});

app.use('/bull', router);
```

Access at: http://localhost:3000/bull

## Performance Considerations

- **Batch Size**: Default 1000 per batch; adjust based on document size and memory
- **Retry Backoff**: Exponential backoff prevents overwhelming the system
- **Concurrent Jobs**: Multiple jobs can run concurrently; configure worker count
- **Index Mapping**: Pre-configured for efficient search and filtering
- **Bulk API**: Uses OpenSearch bulk API for optimal throughput

## Troubleshooting

### Job Stuck in Processing
```bash
# Check job status
curl http://localhost:3000/api/search-sync/job-status/1

# Pause and resume queue
curl -X POST http://localhost:3000/api/search-sync/pause
curl -X POST http://localhost:3000/api/search-sync/resume
```

### High Failure Rate
- Check Redis connection
- Verify OpenSearch is accessible
- Check database connection
- Review logs for specific errors

### Memory Issues
- Reduce batch size: `?batchSize=250`
- Ensure sufficient Redis memory
- Monitor OS-level memory usage

## Data Parity

The system ensures data parity between PostgreSQL and OpenSearch:

1. **Initial Index**: Full corpus rebuild
2. **Incremental Sync**: Real-time sync on create/update/delete
3. **Periodic Validation**: Run periodic rebuilds to catch inconsistencies

Example validation flow:
```typescript
// Create/update in database
const business = await businessRepository.save(data);

// Queue incremental sync
await searchSyncService.updateBusiness(business.id);

// System automatically syncs to OpenSearch
```

## License

MIT
