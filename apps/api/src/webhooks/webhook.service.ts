import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../services/prisma.service';
import * as crypto from 'crypto';

export interface WebhookPayload {
  event: string;
  timestamp: string;
  data: any;
  organizationId: string;
}

export interface WebhookDeliveryResult {
  success: boolean;
  statusCode?: number;
  responseBody?: string;
  error?: string;
  retryCount: number;
  deliveredAt?: Date;
}

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);
  private readonly MAX_RETRIES = 5;
  private readonly RETRY_DELAYS = [1000, 5000, 15000, 60000, 300000]; // 1s, 5s, 15s, 1m, 5m

  constructor(private readonly prisma: PrismaService) {}

  // ============================================================
  // WEBHOOK MANAGEMENT
  // ============================================================

  async createWebhook(
    organizationId: string,
    data: {
      url: string;
      events: string[];
      secret?: string;
      description?: string;
      active?: boolean;
    },
  ) {
    // Validate URL
    if (!this.isValidUrl(data.url)) {
      throw new Error('Invalid webhook URL');
    }

    // Generate secret if not provided
    const secret = data.secret || this.generateSecret();

    return this.prisma.webhook.create({
      data: {
        organizationId,
        url: data.url,
        events: data.events,
        secret,
        description: data.description,
        active: data.active ?? true,
      },
    });
  }

  async updateWebhook(
    organizationId: string,
    webhookId: string,
    data: Partial<{
      url: string;
      events: string[];
      secret: string;
      description: string;
      active: boolean;
    }>,
  ) {
    const webhook = await this.prisma.webhook.findFirst({
      where: { id: webhookId, organizationId },
    });

    if (!webhook) {
      throw new Error('Webhook not found');
    }

    if (data.url && !this.isValidUrl(data.url)) {
      throw new Error('Invalid webhook URL');
    }

    return this.prisma.webhook.update({
      where: { id: webhookId },
      data,
    });
  }

  async deleteWebhook(organizationId: string, webhookId: string): Promise<void> {
    const webhook = await this.prisma.webhook.findFirst({
      where: { id: webhookId, organizationId },
    });

    if (!webhook) {
      throw new Error('Webhook not found');
    }

    await this.prisma.webhook.delete({
      where: { id: webhookId },
    });
  }

  async getWebhooks(organizationId: string, filters?: { active?: boolean }) {
    return this.prisma.webhook.findMany({
      where: {
        organizationId,
        ...(filters?.active !== undefined && { active: filters.active }),
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getWebhook(organizationId: string, webhookId: string) {
    return this.prisma.webhook.findFirst({
      where: { id: webhookId, organizationId },
      include: {
        deliveries: {
          orderBy: { createdAt: 'desc' },
          take: 50,
        },
      },
    });
  }

  // ============================================================
  // WEBHOOK DELIVERY
  // ============================================================

  async triggerEvent(
    organizationId: string,
    event: string,
    data: any,
  ): Promise<void> {
    // Find active webhooks subscribed to this event
    const webhooks = await this.prisma.webhook.findMany({
      where: {
        organizationId,
        active: true,
        events: { has: event },
      },
    });

    if (webhooks.length === 0) {
      return;
    }

    // Create payload
    const payload: WebhookPayload = {
      event,
      timestamp: new Date().toISOString(),
      data,
      organizationId,
    };

    // Queue deliveries
    await Promise.all(
      webhooks.map((webhook) => this.queueDelivery(webhook, payload)),
    );
  }

  private async queueDelivery(
    webhook: any,
    payload: WebhookPayload,
  ): Promise<void> {
    // Create delivery record
    const delivery = await this.prisma.webhookDelivery.create({
      data: {
        webhookId: webhook.id,
        organizationId: webhook.organizationId,
        event: payload.event,
        payload: payload as any,
        status: 'pending',
        retryCount: 0,
        nextRetryAt: new Date(),
      },
    });

    // Attempt immediate delivery
    await this.attemptDelivery(delivery.id);
  }

  async attemptDelivery(deliveryId: string): Promise<void> {
    const delivery = await this.prisma.webhookDelivery.findUnique({
      where: { id: deliveryId },
      include: { webhook: true },
    });

    if (!delivery || delivery.status === 'delivered') {
      return;
    }

    const result = await this.sendWebhook(
      delivery.webhook.url,
      delivery.payload as WebhookPayload,
      delivery.webhook.secret,
    );

    if (result.success) {
      // Mark as delivered
      await this.prisma.webhookDelivery.update({
        where: { id: deliveryId },
        data: {
          status: 'delivered',
          httpStatusCode: result.statusCode,
          responseBody: result.responseBody,
          deliveredAt: new Date(),
        },
      });

      // Update webhook stats
      await this.updateWebhookStats(delivery.webhookId, true);
    } else {
      // Schedule retry or mark as failed
      const shouldRetry = delivery.retryCount < this.MAX_RETRIES;

      if (shouldRetry) {
        const nextRetryDelay = this.RETRY_DELAYS[delivery.retryCount] || 300000;
        const nextRetryAt = new Date(Date.now() + nextRetryDelay);

        await this.prisma.webhookDelivery.update({
          where: { id: deliveryId },
          data: {
            status: 'retrying',
            retryCount: { increment: 1 },
            nextRetryAt,
            lastError: result.error,
            httpStatusCode: result.statusCode,
          },
        });
      } else {
        await this.prisma.webhookDelivery.update({
          where: { id: deliveryId },
          data: {
            status: 'failed',
            lastError: result.error,
            httpStatusCode: result.statusCode,
          },
        });

        // Update webhook stats
        await this.updateWebhookStats(delivery.webhookId, false);

        // Disable webhook if too many failures
        await this.checkWebhookHealth(delivery.webhookId);
      }
    }
  }

  private async sendWebhook(
    url: string,
    payload: WebhookPayload,
    secret: string,
  ): Promise<WebhookDeliveryResult> {
    const startTime = Date.now();
    const signature = this.generateSignature(payload, secret);

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000); // 30s timeout

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': signature,
          'X-Webhook-Timestamp': payload.timestamp,
          'X-Webhook-Event': payload.event,
          'User-Agent': 'UltraLead-Webhook/1.0',
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      const responseBody = await response.text();
      const responseTime = Date.now() - startTime;

      // Log response time for monitoring
      this.logger.debug(`Webhook delivered to ${url} in ${responseTime}ms`);

      return {
        success: response.status >= 200 && response.status < 300,
        statusCode: response.status,
        responseBody: responseBody.slice(0, 10000), // Limit response size
        retryCount: 0,
        deliveredAt: new Date(),
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        retryCount: 0,
      };
    }
  }

  // ============================================================
  // RETRY PROCESSING
  // ============================================================

  async processRetries(): Promise<{ processed: number; delivered: number; failed: number }> {
    const now = new Date();

    // Find pending retries
    const pendingDeliveries = await this.prisma.webhookDelivery.findMany({
      where: {
        status: 'retrying',
        nextRetryAt: { lte: now },
      },
      take: 100, // Process in batches
    });

    let delivered = 0;
    let failed = 0;

    await Promise.all(
      pendingDeliveries.map(async (delivery) => {
        await this.attemptDelivery(delivery.id);
        const updated = await this.prisma.webhookDelivery.findUnique({
          where: { id: delivery.id },
        });
        if (updated?.status === 'delivered') delivered++;
        else if (updated?.status === 'failed') failed++;
      }),
    );

    return {
      processed: pendingDeliveries.length,
      delivered,
      failed,
    };
  }

  // ============================================================
  // WEBHOOK HEALTH & MONITORING
  // ============================================================

  private async updateWebhookStats(webhookId: string, success: boolean): Promise<void> {
    await this.prisma.webhook.update({
      where: { id: webhookId },
      data: {
        lastTriggeredAt: new Date(),
        ...(success
          ? { lastSuccessAt: new Date() }
          : { lastFailureAt: new Date() }),
      },
    });
  }

  private async checkWebhookHealth(webhookId: string): Promise<void> {
    // Get recent delivery stats
    const recentDeliveries = await this.prisma.webhookDelivery.findMany({
      where: {
        webhookId,
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }, // Last 24 hours
      },
    });

    const total = recentDeliveries.length;
    const failed = recentDeliveries.filter((d) => d.status === 'failed').length;
    const failureRate = total > 0 ? failed / total : 0;

    // Disable webhook if failure rate > 50% and more than 10 attempts
    if (total >= 10 && failureRate > 0.5) {
      this.logger.warn(`Disabling webhook ${webhookId} due to high failure rate (${(failureRate * 100).toFixed(1)}%)`);
      
      await this.prisma.webhook.update({
        where: { id: webhookId },
        data: { active: false },
      });

      // TODO: Send notification to organization admins
    }
  }

  async getDeliveryStats(
    organizationId: string,
    webhookId?: string,
    period: '24h' | '7d' | '30d' = '24h',
  ) {
    const periodMap = {
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000,
    };

    const since = new Date(Date.now() - periodMap[period]);

    const where: any = {
      organizationId,
      createdAt: { gte: since },
    };

    if (webhookId) {
      where.webhookId = webhookId;
    }

    const [
      total,
      delivered,
      failed,
      pending,
      avgResponseTime,
    ] = await Promise.all([
      this.prisma.webhookDelivery.count({ where }),
      this.prisma.webhookDelivery.count({ where: { ...where, status: 'delivered' } }),
      this.prisma.webhookDelivery.count({ where: { ...where, status: 'failed' } }),
      this.prisma.webhookDelivery.count({ where: { ...where, status: { in: ['pending', 'retrying'] } } }),
      this.prisma.webhookDelivery.aggregate({
        where: { ...where, status: 'delivered' },
        _avg: { responseTimeMs: true },
      }),
    ]);

    return {
      total,
      delivered,
      failed,
      pending,
      successRate: total > 0 ? (delivered / total) * 100 : 0,
      avgResponseTime: avgResponseTime._avg.responseTimeMs || 0,
    };
  }

  // ============================================================
  // SIGNATURE VERIFICATION
  // ============================================================

  private generateSignature(payload: WebhookPayload, secret: string): string {
    const payloadString = JSON.stringify(payload);
    return crypto
      .createHmac('sha256', secret)
      .update(payloadString)
      .digest('hex');
  }

  verifySignature(payload: string, signature: string, secret: string): boolean {
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature),
    );
  }

  // ============================================================
  // HELPERS
  // ============================================================

  private isValidUrl(url: string): boolean {
    try {
      const parsed = new URL(url);
      return parsed.protocol === 'https:';
    } catch {
      return false;
    }
  }

  private generateSecret(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  // ============================================================
  // CLEANUP
  // ============================================================

  async cleanupOldDeliveries(olderThanDays: number = 30): Promise<{ deleted: number }> {
    const cutoff = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);

    const result = await this.prisma.webhookDelivery.deleteMany({
      where: {
        status: { in: ['delivered', 'failed'] },
        createdAt: { lt: cutoff },
      },
    });

    return { deleted: result.count };
  }
}
