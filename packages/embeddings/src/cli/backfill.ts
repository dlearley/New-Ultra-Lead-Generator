#!/usr/bin/env node

/**
 * CLI for backfilling embeddings
 */

import { Queue } from 'bullmq';
import { getPool, closePool } from '../db/index.js';
import { BackfillService } from '../services/backfill-service.js';
import { EmbeddingJobData } from '../types.js';

const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const REDIS_PORT = parseInt(process.env.REDIS_PORT || '6379', 10);

interface CLIOptions {
  provider: string;
  model: string;
  jobName: string;
  batchSize?: number;
  action: 'start' | 'status' | 'resume';
  jobId?: string;
}

async function parseArgs(): Promise<CLIOptions> {
  const args = process.argv.slice(2);
  
  if (args.length < 3) {
    printUsage();
    process.exit(1);
  }

  const action = args[0];
  const provider = args[1];
  const model = args[2];
  const jobName = args[3] || `backfill-${provider}-${model}-${Date.now()}`;
  const batchSize = args[4] ? parseInt(args[4], 10) : 100;
  const jobId = args[5];

  if (!['start', 'status', 'resume'].includes(action)) {
    console.error(`Invalid action: ${action}`);
    printUsage();
    process.exit(1);
  }

  return {
    action: action as 'start' | 'status' | 'resume',
    provider,
    model,
    jobName,
    batchSize,
    jobId,
  };
}

function printUsage(): void {
  console.log(`
Usage: backfill <action> <provider> <model> [jobName] [batchSize] [jobId]

Actions:
  start    - Start a new backfill job
  status   - Check status of a backfill job
  resume   - Resume incomplete jobs

Examples:
  npx ts-node backfill.ts start openai text-embedding-3-small
  npx ts-node backfill.ts status openai text-embedding-3-small my-job
  npx ts-node backfill.ts resume openai text-embedding-3-small
  `);
}

async function startBackfill(
  backfillService: BackfillService,
  options: CLIOptions
): Promise<void> {
  console.log(`Starting backfill job for ${options.provider}/${options.model}...`);
  
  const jobId = await backfillService.startBackfill(options.jobName, {
    provider: options.provider,
    model: options.model,
    batchSize: options.batchSize,
  });

  console.log(`✅ Backfill job started: ${jobId}`);
  console.log(`Use "backfill status ${options.provider} ${options.model}" to check progress`);
}

async function checkStatus(
  backfillService: BackfillService,
  options: CLIOptions
): Promise<void> {
  if (!options.jobId) {
    console.error('Job ID is required for status check');
    process.exit(1);
  }

  const progress = await backfillService.getJobProgress(options.jobId);

  if (!progress) {
    console.error(`Job ${options.jobId} not found`);
    process.exit(1);
  }

  console.log(`\nJob Progress for ${options.jobId}:`);
  console.log(`Status: ${progress.status}`);
  console.log(`Total: ${progress.totalBusinesses}`);
  console.log(`Processed: ${progress.processedBusinesses}`);
  console.log(`Failed: ${progress.failedBusinesses}`);
  console.log(`Skipped: ${progress.skippedBusinesses}`);
  console.log(`Started: ${progress.startedAt}`);
  console.log(`Updated: ${progress.updatedAt}`);

  const percentComplete = Math.round(
    (progress.processedBusinesses / progress.totalBusinesses) * 100
  );
  console.log(`\nProgress: ${percentComplete}%`);
}

async function resumeIncomplete(
  backfillService: BackfillService,
  options: CLIOptions
): Promise<void> {
  console.log(`Resuming incomplete jobs for ${options.provider}/${options.model}...`);
  
  const jobIds = await backfillService.resumeIncompleteJobs(options.provider, options.model);

  if (jobIds.length === 0) {
    console.log('No incomplete jobs found');
    return;
  }

  console.log(`✅ Resumed ${jobIds.length} incomplete job(s):`);
  jobIds.forEach((id) => console.log(`  - ${id}`));
}

async function main(): Promise<void> {
  const options = await parseArgs();
  const pool = getPool();

  try {
    const embeddingsQueue = new Queue<EmbeddingJobData>('compute-embeddings', {
      connection: { host: REDIS_HOST, port: REDIS_PORT },
    });

    const backfillService = new BackfillService(pool, embeddingsQueue);

    switch (options.action) {
      case 'start':
        await startBackfill(backfillService, options);
        break;
      case 'status':
        await checkStatus(backfillService, options);
        break;
      case 'resume':
        await resumeIncomplete(backfillService, options);
        break;
    }
  } finally {
    await closePool();
  }
}

main().catch((error) => {
  console.error('CLI error:', error);
  process.exit(1);
});
