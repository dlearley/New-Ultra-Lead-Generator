/**
 * Core types for embeddings package
 */

export interface EmbeddingVector {
  vector: number[];
  provider: string;
  model: string;
  createdAt: Date;
  metadata?: Record<string, unknown>;
}

export interface Business {
  id: string;
  name: string;
  content?: string;
  website?: string;
  socialContent?: string;
  latitude?: number;
  longitude?: number;
  category?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface BusinessEmbedding {
  id: string;
  businessId: string;
  contentHash: string;
  embedding: number[];
  provider: string;
  model: string;
  embeddingDimension: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface SimilarBusiness {
  id: string;
  name: string;
  similarity: number;
  distance?: number;
  metadata?: Record<string, unknown>;
}

export interface EmbeddingJobData {
  businessId: string;
  content: string;
  contentHash: string;
  provider: string;
  model: string;
  priority?: number;
  retryCount?: number;
  maxRetries?: number;
}

export interface EmbeddingJobProgress {
  jobId: string;
  totalBusinesses: number;
  processedBusinesses: number;
  failedBusinesses: number;
  skippedBusinesses: number;
  startedAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  metrics?: {
    averageEmbeddingTime?: number;
    throughputPerMinute?: number;
    errorRate?: number;
  };
}

export interface FindSimilarOptions {
  limit?: number;
  similarityThreshold?: number;
  excludeBusinessId?: string;
  category?: string;
  maxDistance?: number;
  provider?: string;
  model?: string;
  geoRadius?: {
    latitude: number;
    longitude: number;
    radiusKm: number;
  };
}

export interface ContentSource {
  type: 'website' | 'social' | 'description';
  content: string;
  url?: string;
  timestamp?: Date;
}
