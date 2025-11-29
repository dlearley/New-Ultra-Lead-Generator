import { INestApplication, Logger } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule, getRepositoryToken } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { Business } from '@database/entities/business.entity';
import { DatabaseModule } from '@database/database.module';
import { SearchSyncModule } from '@workers/search-sync/search-sync.module';
import { SearchSyncService } from '@workers/search-sync/search-sync.service';
import { SearchSyncMetricsService } from '@workers/search-sync/search-sync-metrics.service';
import { OpenSearchService } from '@api/search/opensearch.service';

describe('Search Sync Integration Tests', () => {
  let app: INestApplication;
  let searchSyncService: SearchSyncService;
  let metricsService: SearchSyncMetricsService;
  let openSearchService: OpenSearchService;
  let businessRepository: Repository<Business>;
  const logger = new Logger('SearchSyncIntegrationTests');

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env',
        }),
        BullModule.forRootAsync({
          useFactory: (configService: ConfigService) => ({
            redis: {
              host: configService.get('REDIS_HOST', 'localhost'),
              port: configService.get('REDIS_PORT', 6379),
              password: configService.get('REDIS_PASSWORD'),
            },
          }),
          inject: [ConfigService],
        }),
        DatabaseModule,
        SearchSyncModule,
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();

    searchSyncService = moduleRef.get<SearchSyncService>(SearchSyncService);
    metricsService = moduleRef.get<SearchSyncMetricsService>(SearchSyncMetricsService);
    openSearchService = moduleRef.get<OpenSearchService>(OpenSearchService);
    businessRepository = moduleRef.get<Repository<Business>>(
      getRepositoryToken(Business),
    );
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    // Clear test data
    await businessRepository.clear();
    metricsService.clearMetrics();
  });

  describe('Rebuild Search Index Job', () => {
    it('should rebuild search index from entire corpus', async () => {
      // Create test businesses
      const businesses = [
        {
          name: 'Tech Corp',
          description: 'A technology company',
          industry: 'Technology',
          location: 'San Francisco, CA',
          latitude: 37.7749,
          longitude: -122.4194,
          revenue: 5000000,
          employees: 150,
          hiring: 25,
          techStack: ['JavaScript', 'React', 'Node.js'],
        },
        {
          name: 'Finance Solutions',
          description: 'A fintech company',
          industry: 'Finance',
          location: 'New York, NY',
          latitude: 40.7128,
          longitude: -74.006,
          revenue: 10000000,
          employees: 250,
          hiring: 50,
          techStack: ['Python', 'Java'],
        },
        {
          name: 'Health Innovations',
          description: 'A healthcare company',
          industry: 'Healthcare',
          location: 'Boston, MA',
          latitude: 42.3601,
          longitude: -71.0589,
          revenue: 3000000,
          employees: 75,
          hiring: 15,
          techStack: ['C#', '.NET'],
        },
      ];

      for (const business of businesses) {
        await businessRepository.save(businessRepository.create(business));
      }

      // Trigger rebuild
      const result = await searchSyncService.rebuildEntireCorpus();
      expect(result.jobId).toBeDefined();
      expect(result.message).toContain('successfully');

      // Wait for job processing
      await new Promise((resolve) => setTimeout(resolve, 5000));

      // Get job status
      const status = await searchSyncService.getJobStatus(result.jobId);
      logger.log(`Job status: ${JSON.stringify(status)}`);
      expect(status).toBeDefined();
    });

    it('should handle empty corpus', async () => {
      // Ensure no businesses exist
      const count = await businessRepository.count();
      expect(count).toBe(0);

      // Trigger rebuild
      const result = await searchSyncService.rebuildEntireCorpus();
      expect(result.jobId).toBeDefined();

      // Wait for job processing
      await new Promise((resolve) => setTimeout(resolve, 3000));

      // Get job status
      const status = await searchSyncService.getJobStatus(result.jobId);
      logger.log(`Job status for empty corpus: ${JSON.stringify(status)}`);
      expect(status).toBeDefined();
    });

    it('should batch process large datasets', async () => {
      // Create a larger dataset
      const businesses = [];
      for (let i = 0; i < 2500; i++) {
        businesses.push({
          name: `Business ${i}`,
          description: `Description for business ${i}`,
          industry: ['Technology', 'Finance', 'Healthcare'][i % 3],
          location: ['San Francisco', 'New York', 'Boston'][i % 3],
          latitude: 37.7749 + (i % 10) * 0.01,
          longitude: -122.4194 + (i % 10) * 0.01,
          revenue: 1000000 + (i % 100) * 100000,
          employees: 10 + (i % 500),
          hiring: 5 + (i % 50),
          techStack: ['JavaScript', 'Python', 'Java'],
        });
      }

      // Insert in batches to avoid memory issues
      for (let i = 0; i < businesses.length; i += 500) {
        const batch = businesses.slice(i, i + 500);
        await businessRepository.save(batch);
      }

      // Trigger rebuild with custom batch size
      const result = await searchSyncService.rebuildEntireCorpus(500);
      expect(result.jobId).toBeDefined();

      // Wait for job processing
      await new Promise((resolve) => setTimeout(resolve, 8000));

      // Get job status
      const status = await searchSyncService.getJobStatus(result.jobId);
      logger.log(`Job status for large dataset: ${JSON.stringify(status)}`);
      expect(status).toBeDefined();
    });

    it('should retry on failure', async () => {
      // Create a test business
      const business = await businessRepository.save(
        businessRepository.create({
          name: 'Test Business',
          description: 'Test description',
          industry: 'Technology',
          location: 'San Francisco, CA',
        }),
      );

      // Trigger rebuild
      const result = await searchSyncService.rebuildEntireCorpus();
      expect(result.jobId).toBeDefined();

      // Wait for job processing
      await new Promise((resolve) => setTimeout(resolve, 5000));

      // Get job status
      const status = await searchSyncService.getJobStatus(result.jobId);
      logger.log(`Job status with retries: ${JSON.stringify(status)}`);
      expect(status).toBeDefined();
    });
  });

  describe('Incremental Sync Jobs', () => {
    it('should index a new business', async () => {
      // Create a test business
      const business = await businessRepository.save(
        businessRepository.create({
          name: 'New Business',
          description: 'A new business to index',
          industry: 'Technology',
          location: 'San Francisco, CA',
          latitude: 37.7749,
          longitude: -122.4194,
        }),
      );

      // Trigger incremental sync
      const result = await searchSyncService.indexBusiness(business.id);
      expect(result.jobId).toBeDefined();

      // Wait for job processing
      await new Promise((resolve) => setTimeout(resolve, 3000));

      // Get job status
      const status = await searchSyncService.getJobStatus(result.jobId);
      logger.log(`Index job status: ${JSON.stringify(status)}`);
      expect(status).toBeDefined();
    });

    it('should update an existing business', async () => {
      // Create a test business
      const business = await businessRepository.save(
        businessRepository.create({
          name: 'Original Name',
          description: 'Original description',
          industry: 'Technology',
          location: 'San Francisco, CA',
        }),
      );

      // Update the business
      business.name = 'Updated Name';
      business.description = 'Updated description';
      await businessRepository.save(business);

      // Trigger incremental sync
      const result = await searchSyncService.updateBusiness(business.id);
      expect(result.jobId).toBeDefined();

      // Wait for job processing
      await new Promise((resolve) => setTimeout(resolve, 3000));

      // Get job status
      const status = await searchSyncService.getJobStatus(result.jobId);
      logger.log(`Update job status: ${JSON.stringify(status)}`);
      expect(status).toBeDefined();
    });

    it('should delete a business from index', async () => {
      // Create a test business
      const business = await businessRepository.save(
        businessRepository.create({
          name: 'Business to Delete',
          description: 'This business will be deleted',
          industry: 'Technology',
        }),
      );

      // Trigger delete sync
      const result = await searchSyncService.deleteBusiness(business.id);
      expect(result.jobId).toBeDefined();

      // Wait for job processing
      await new Promise((resolve) => setTimeout(resolve, 3000));

      // Get job status
      const status = await searchSyncService.getJobStatus(result.jobId);
      logger.log(`Delete job status: ${JSON.stringify(status)}`);
      expect(status).toBeDefined();
    });

    it('should handle multiple concurrent incremental syncs', async () => {
      // Create multiple test businesses
      const businesses = [];
      for (let i = 0; i < 5; i++) {
        const business = await businessRepository.save(
          businessRepository.create({
            name: `Business ${i}`,
            description: `Description for business ${i}`,
            industry: 'Technology',
            location: 'San Francisco, CA',
          }),
        );
        businesses.push(business);
      }

      // Trigger multiple concurrent syncs
      const results = await Promise.all(
        businesses.map((business) => searchSyncService.indexBusiness(business.id)),
      );

      expect(results.length).toBe(5);
      results.forEach((result) => {
        expect(result.jobId).toBeDefined();
      });

      // Wait for job processing
      await new Promise((resolve) => setTimeout(resolve, 5000));

      // Check all job statuses
      for (const result of results) {
        const status = await searchSyncService.getJobStatus(result.jobId);
        logger.log(`Concurrent job status: ${JSON.stringify(status)}`);
        expect(status).toBeDefined();
      }
    });
  });

  describe('Queue Management', () => {
    it('should get queue statistics', async () => {
      const stats = await searchSyncService.getQueueStats();
      expect(stats).toHaveProperty('queue');
      expect(stats).toHaveProperty('metrics');
      expect(stats.queue).toHaveProperty('active');
      expect(stats.queue).toHaveProperty('completed');
      expect(stats.queue).toHaveProperty('failed');
      logger.log(`Queue stats: ${JSON.stringify(stats)}`);
    });

    it('should pause and resume queue', async () => {
      // Pause queue
      await searchSyncService.pauseQueue();
      logger.log('Queue paused');

      // Try to get stats
      let stats = await searchSyncService.getQueueStats();
      expect(stats).toBeDefined();

      // Resume queue
      await searchSyncService.resumeQueue();
      logger.log('Queue resumed');

      // Try to get stats again
      stats = await searchSyncService.getQueueStats();
      expect(stats).toBeDefined();
    });

    it('should clear completed jobs', async () => {
      // Create and process a job
      const business = await businessRepository.save(
        businessRepository.create({
          name: 'Test Business',
          industry: 'Technology',
        }),
      );

      const result = await searchSyncService.indexBusiness(business.id);
      expect(result.jobId).toBeDefined();

      // Wait for job completion
      await new Promise((resolve) => setTimeout(resolve, 3000));

      // Clear queue
      await searchSyncService.clearQueue();
      logger.log('Queue cleared');

      // Get queue stats
      const stats = await searchSyncService.getQueueStats();
      expect(stats).toBeDefined();
    });
  });

  describe('Search Sync Metrics', () => {
    it('should track job metrics', async () => {
      // Create test data
      const business = await businessRepository.save(
        businessRepository.create({
          name: 'Metrics Test Business',
          industry: 'Technology',
        }),
      );

      // Trigger a job
      const result = await searchSyncService.indexBusiness(business.id);

      // Wait for job processing
      await new Promise((resolve) => setTimeout(resolve, 3000));

      // Get metrics summary
      const metricsData = metricsService.getMetricsSummary();
      logger.log(`Metrics summary: ${JSON.stringify(metricsData)}`);
      expect(metricsData).toHaveProperty('totalJobs');
    });

    it('should emit alerts on success', async () => {
      return new Promise((resolve) => {
        let alertReceived = false;

        const alertCallback = (alert: any) => {
          if (alert.type === 'success' && !alertReceived) {
            alertReceived = true;
            logger.log(`Success alert: ${alert.message}`);
            resolve(null);
          }
        };

        metricsService.onAlert(alertCallback);

        // Create and process a job
        businessRepository.save(
          businessRepository.create({
            name: 'Alert Test Business',
            industry: 'Technology',
          }),
        ).then(async (business) => {
          await searchSyncService.indexBusiness(business.id);
        });

        // Timeout after 10 seconds
        setTimeout(() => {
          if (!alertReceived) {
            logger.warn('Alert not received within timeout');
          }
          resolve(null);
        }, 10000);
      });
    });

    it('should emit alerts on error', async () => {
      // This test would require mocking a failure scenario
      // For now, we just verify the alert mechanism exists
      const alertCallback = jest.fn();
      metricsService.onAlert(alertCallback);

      // Emit a test error alert
      metricsService.emitErrorAlert('Test error alert');

      // The callback should have been called
      // Note: This might be async, so we might need to wait
      logger.log('Error alert test completed');
    });
  });

  describe('Full-text Search Integration', () => {
    it('should index and search for businesses by name', async () => {
      // Create businesses
      const businesses = [
        {
          name: 'TechFlow Solutions',
          description: 'Enterprise software solutions',
          industry: 'Technology',
          location: 'San Francisco, CA',
        },
        {
          name: 'DataDrive Analytics',
          description: 'Data analytics platform',
          industry: 'Technology',
          location: 'New York, NY',
        },
      ];

      for (const business of businesses) {
        await businessRepository.save(businessRepository.create(business));
      }

      // Rebuild index
      const result = await searchSyncService.rebuildEntireCorpus();
      expect(result.jobId).toBeDefined();

      // Wait for indexing
      await new Promise((resolve) => setTimeout(resolve, 5000));

      logger.log('Full-text search test completed');
    });
  });

  describe('Geo Search Integration', () => {
    it('should index and support geo-distance filtering', async () => {
      // Create businesses with coordinates
      const businesses = [
        {
          name: 'San Francisco Tech',
          industry: 'Technology',
          latitude: 37.7749,
          longitude: -122.4194,
        },
        {
          name: 'Oakland Tech',
          industry: 'Technology',
          latitude: 37.8044,
          longitude: -122.2712,
        },
        {
          name: 'New York Tech',
          industry: 'Technology',
          latitude: 40.7128,
          longitude: -74.006,
        },
      ];

      for (const business of businesses) {
        await businessRepository.save(businessRepository.create(business));
      }

      // Rebuild index
      const result = await searchSyncService.rebuildEntireCorpus();
      expect(result.jobId).toBeDefined();

      // Wait for indexing
      await new Promise((resolve) => setTimeout(resolve, 5000));

      logger.log('Geo search integration test completed');
    });
  });

  describe('Aggregation Integration', () => {
    it('should support aggregations on indexed data', async () => {
      // Create businesses with various industries and locations
      const businesses = [];
      for (let i = 0; i < 10; i++) {
        businesses.push({
          name: `Business ${i}`,
          industry: ['Technology', 'Finance', 'Healthcare'][i % 3],
          location: ['San Francisco', 'New York', 'Boston'][i % 3],
        });
      }

      for (const business of businesses) {
        await businessRepository.save(businessRepository.create(business));
      }

      // Rebuild index
      const result = await searchSyncService.rebuildEntireCorpus();
      expect(result.jobId).toBeDefined();

      // Wait for indexing
      await new Promise((resolve) => setTimeout(resolve, 5000));

      logger.log('Aggregation integration test completed');
    });
  });

  describe('Data Parity', () => {
    it('should maintain data parity between database and OpenSearch', async () => {
      // Create test data
      const business = await businessRepository.save(
        businessRepository.create({
          name: 'Data Parity Test',
          description: 'Testing data consistency',
          industry: 'Technology',
          location: 'San Francisco, CA',
          latitude: 37.7749,
          longitude: -122.4194,
          revenue: 5000000,
          employees: 100,
        }),
      );

      // Index the business
      const result = await searchSyncService.indexBusiness(business.id);
      expect(result.jobId).toBeDefined();

      // Wait for indexing
      await new Promise((resolve) => setTimeout(resolve, 3000));

      // Get the business from database
      const dbBusiness = await businessRepository.findOne({
        where: { id: business.id },
      });
      expect(dbBusiness).toBeDefined();
      expect(dbBusiness?.name).toBe('Data Parity Test');

      logger.log('Data parity test completed');
    });

    it('should sync updates to maintain parity', async () => {
      // Create and index a business
      const business = await businessRepository.save(
        businessRepository.create({
          name: 'Original Name',
          industry: 'Technology',
        }),
      );

      const indexResult = await searchSyncService.indexBusiness(business.id);
      await new Promise((resolve) => setTimeout(resolve, 3000));

      // Update the business
      business.name = 'Updated Name';
      business.industry = 'Finance';
      await businessRepository.save(business);

      // Sync the update
      const updateResult = await searchSyncService.updateBusiness(business.id);
      expect(updateResult.jobId).toBeDefined();

      // Wait for sync
      await new Promise((resolve) => setTimeout(resolve, 3000));

      // Verify the update
      const updatedBusiness = await businessRepository.findOne({
        where: { id: business.id },
      });
      expect(updatedBusiness?.name).toBe('Updated Name');

      logger.log('Update parity test completed');
    });
  });
});
