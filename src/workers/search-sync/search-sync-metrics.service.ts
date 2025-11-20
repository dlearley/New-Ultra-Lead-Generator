import { Injectable, Logger } from '@nestjs/common';
import { SearchSyncMetrics, SearchSyncAlert } from './search-sync.dto';

@Injectable()
export class SearchSyncMetricsService {
  private readonly logger = new Logger(SearchSyncMetricsService.name);
  private metricsHistory: Map<string, SearchSyncMetrics> = new Map();
  private alertCallbacks: ((alert: SearchSyncAlert) => void)[] = [];

  createMetrics(jobId?: string): SearchSyncMetrics {
    return {
      successCount: 0,
      failureCount: 0,
      totalCount: 0,
      duration: 0,
      timestamp: Date.now(),
      jobId,
      status: 'pending',
    };
  }

  updateMetrics(
    metrics: SearchSyncMetrics,
    successCount: number,
    failureCount: number,
    totalCount: number,
  ): SearchSyncMetrics {
    const updated = {
      ...metrics,
      successCount,
      failureCount,
      totalCount,
      duration: Date.now() - metrics.timestamp,
    };

    if (metrics.jobId) {
      this.metricsHistory.set(metrics.jobId, updated);
    }

    return updated;
  }

  recordSuccess(metrics: SearchSyncMetrics): SearchSyncMetrics {
    return this.updateMetrics(
      metrics,
      metrics.successCount + 1,
      metrics.failureCount,
      metrics.totalCount + 1,
    );
  }

  recordFailure(metrics: SearchSyncMetrics): SearchSyncMetrics {
    return this.updateMetrics(
      metrics,
      metrics.successCount,
      metrics.failureCount + 1,
      metrics.totalCount + 1,
    );
  }

  completeMetrics(metrics: SearchSyncMetrics, status: 'completed' | 'failed'): SearchSyncMetrics {
    return {
      ...metrics,
      status,
      duration: Date.now() - metrics.timestamp,
    };
  }

  getMetrics(jobId: string): SearchSyncMetrics | undefined {
    return this.metricsHistory.get(jobId);
  }

  getAllMetrics(): SearchSyncMetrics[] {
    return Array.from(this.metricsHistory.values());
  }

  clearMetrics(jobId?: string): void {
    if (jobId) {
      this.metricsHistory.delete(jobId);
    } else {
      this.metricsHistory.clear();
    }
  }

  onAlert(callback: (alert: SearchSyncAlert) => void): void {
    this.alertCallbacks.push(callback);
  }

  emitAlert(alert: SearchSyncAlert): void {
    this.logger.log(`Alert: ${alert.message}`, alert.type);
    this.alertCallbacks.forEach((callback) => {
      try {
        callback(alert);
      } catch (error) {
        this.logger.error(`Error calling alert callback: ${error.message}`);
      }
    });
  }

  emitSuccessAlert(message: string, metrics: SearchSyncMetrics): void {
    this.emitAlert({
      type: 'success',
      message,
      metrics,
      timestamp: Date.now(),
    });
  }

  emitWarningAlert(message: string, metrics?: SearchSyncMetrics): void {
    this.emitAlert({
      type: 'warning',
      message,
      metrics,
      timestamp: Date.now(),
    });
  }

  emitErrorAlert(message: string, metrics?: SearchSyncMetrics): void {
    this.emitAlert({
      type: 'error',
      message,
      metrics,
      timestamp: Date.now(),
    });
  }

  getMetricsSummary(): Record<string, any> {
    const allMetrics = this.getAllMetrics();
    if (allMetrics.length === 0) {
      return {
        totalJobs: 0,
        successfulJobs: 0,
        failedJobs: 0,
        totalSuccessCount: 0,
        totalFailureCount: 0,
        averageDuration: 0,
      };
    }

    const successfulJobs = allMetrics.filter((m) => m.status === 'completed');
    const failedJobs = allMetrics.filter((m) => m.status === 'failed');
    const totalSuccessCount = allMetrics.reduce((sum, m) => sum + m.successCount, 0);
    const totalFailureCount = allMetrics.reduce((sum, m) => sum + m.failureCount, 0);
    const averageDuration =
      allMetrics.length > 0
        ? allMetrics.reduce((sum, m) => sum + m.duration, 0) / allMetrics.length
        : 0;

    return {
      totalJobs: allMetrics.length,
      successfulJobs: successfulJobs.length,
      failedJobs: failedJobs.length,
      totalSuccessCount,
      totalFailureCount,
      averageDuration: Math.round(averageDuration),
    };
  }
}
