import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../services/prisma.service';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

export interface WebhookPayload {
  event: string;
  timestamp: string;
  organizationId: string;
  data: any;
}

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly httpService: HttpService,
  ) {}

  // ============================================================
  // WEBHOOK SUBSCRIPTION MANAGEMENT
  // ============================================================

  async createSubscription(
    organizationId: string,
    data: {
      name: string;
      description?: string;
      url: string;
      events: string[];
      secret?: string;
    },
  ): Promise<any> {
    return this.prisma.webhookSubscription.create({
      data: {
        organizationId,
        name: data.name,
        description: data.description,
        url: data.url,
        secret: data.secret,
        events: data.events,
      },
    });
  }

  async getSubscriptions(organizationId: string): Promise<any[]> {
    return this.prisma.webhookSubscription.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateSubscription(
    organizationId: string,
    subscriptionId: string,
    data: Partial<{
      name: string;
      description: string;
      url: string;
      events: string[];
      isActive: boolean;
    }>,
  ): Promise<any> {
    return this.prisma.webhookSubscription.update({
      where: { id: subscriptionId, organizationId },
      data,
    });
  }

  async deleteSubscription(
    organizationId: string,
    subscriptionId: string,
  ): Promise<void> {
    await this.prisma.webhookSubscription.delete({
      where: { id: subscriptionId, organizationId },
    });
  }

  // ============================================================
  // WEBHOOK DELIVERY
  // ============================================================

  async triggerWebhook(
    organizationId: string,
    event: string,
    data: any,
  ): Promise<void> {
    // Find all subscriptions for this event
    const subscriptions = await this.prisma.webhookSubscription.findMany({
      where: {
        organizationId,
        isActive: true,
        events: { has: event },
      },
    });

    const payload: WebhookPayload = {
      event,
      timestamp: new Date().toISOString(),
      organizationId,
      data,
    };

    // Queue deliveries
    for (const subscription of subscriptions) {
      await this.queueDelivery(subscription.id, event, payload);
    }
  }

  private async queueDelivery(
    subscriptionId: string,
    eventType: string,
    payload: WebhookPayload,
  ): Promise<void> {
    await this.prisma.webhookDelivery.create({
      data: {
        subscriptionId,
        eventType,
        payload,
        status: 'pending',
        attemptCount: 0,
      },
    });
  }

  async processDeliveries(): Promise<void> {
    // Get pending deliveries
    const pendingDeliveries = await this.prisma.webhookDelivery.findMany({
      where: {
        status: { in: ['pending', 'retrying'] },
        OR: [
          { nextRetryAt: { lte: new Date() } },
          { nextRetryAt: null },
        ],
      },
      take: 100,
      include: { subscription: true },
    });

    for (const delivery of pendingDeliveries) {
      await this.executeDelivery(delivery);
    }
  }

  private async executeDelivery(delivery: any): Promise<void> {
    const subscription = delivery.subscription;
    
    try {
      // Generate signature if secret exists
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'X-Webhook-Event': delivery.eventType,
        'X-Webhook-ID': delivery.id,
        'X-Webhook-Timestamp': new Date().toISOString(),
      };

      if (subscription.secret) {
        headers['X-Webhook-Signature'] = this.generateSignature(
          subscription.secret,
          JSON.stringify(delivery.payload),
        );
      }

      const response = await firstValueFrom(
        this.httpService.post(subscription.url, delivery.payload, { headers }),
      );

      // Mark as delivered
      await this.prisma.webhookDelivery.update({
        where: { id: delivery.id },
        data: {
          status: 'delivered',
          httpStatusCode: response.status,
          responseBody: JSON.stringify(response.data).substring(0, 1000),
          deliveredAt: new Date(),
          attemptCount: { increment: 1 },
        },
      });

      // Update subscription stats
      await this.prisma.webhookSubscription.update({
        where: { id: subscription.id },
        data: {
          totalDelivered: { increment: 1 },
          lastDeliveredAt: new Date(),
        },
      });

    } catch (error: any) {
      await this.handleDeliveryFailure(delivery, subscription, error);
    }
  }

  private async handleDeliveryFailure(
    delivery: any,
    subscription: any,
    error: any,
  ): Promise<void> {
    const newAttemptCount = delivery.attemptCount + 1;
    const shouldRetry = newAttemptCount < subscription.maxRetries;

    if (shouldRetry) {
      // Schedule retry with exponential backoff
      const delayMs = subscription.retryDelay * 1000 * Math.pow(2, newAttemptCount - 1);
      const nextRetryAt = new Date(Date.now() + delayMs);

      await this.prisma.webhookDelivery.update({
        where: { id: delivery.id },
        data: {
          status: 'retrying',
          attemptCount: newAttemptCount,
          nextRetryAt,
          errorMessage: error.message?.substring(0, 500),
        },
      });
    } else {
      // Mark as failed
      await this.prisma.webhookDelivery.update({
        where: { id: delivery.id },
        data: {
          status: 'failed',
          attemptCount: newAttemptCount,
          errorMessage: error.message?.substring(0, 500),
        },
      });

      // Update subscription stats
      await this.prisma.webhookSubscription.update({
        where: { id: subscription.id },
        data: {
          totalFailed: { increment: 1 },
          lastFailedAt: new Date(),
        },
      });
    }
  }

  private generateSignature(secret: string, payload: string): string {
    // HMAC-SHA256 signature
    const crypto = require('crypto');
    return crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');
  }

  // ============================================================
  // EVENT TRIGGERS
  // ============================================================

  async onContactCreated(
    organizationId: string,
    contact: any,
  ): Promise<void> {
    await this.triggerWebhook(organizationId, 'contact.created', contact);
  }

  async onContactUpdated(
    organizationId: string,
    contact: any,
    changes: any,
  ): Promise<void> {
    await this.triggerWebhook(organizationId, 'contact.updated', {
      contact,
      changes,
    });
  }

  async onLeadScored(
    organizationId: string,
    contactId: string,
    score: any,
  ): Promise<void> {
    await this.triggerWebhook(organizationId, 'lead.scored', {
      contactId,
      score,
    });
  }

  async onLeadQualified(
    organizationId: string,
    contactId: string,
    qualification: any,
  ): Promise<void> {
    await this.triggerWebhook(organizationId, 'lead.qualified', {
      contactId,
      qualification,
    });
  }

  async onDealCreated(
    organizationId: string,
    deal: any,
  ): Promise<void> {
    await this.triggerWebhook(organizationId, 'deal.created', deal);
  }

  async onDealWon(
    organizationId: string,
    deal: any,
  ): Promise<void> {
    await this.triggerWebhook(organizationId, 'deal.won', deal);
  }

  async onTaskCreated(
    organizationId: string,
    task: any,
  ): Promise<void> {
    await this.triggerWebhook(organizationId, 'task.created', task);
  }

  async onEnrichmentComplete(
    organizationId: string,
    contactId: string,
    enrichmentData: any,
  ): Promise<void> {
    await this.triggerWebhook(organizationId, 'enrichment.complete', {
      contactId,
      enrichmentData,
    });
  }

  async onFormSubmitted(
    organizationId: string,
    submission: any,
  ): Promise<void> {
    await this.triggerWebhook(organizationId, 'form.submitted', submission);
  }

  // ============================================================
  // DELIVERY HISTORY
  // ============================================================

  async getDeliveryHistory(
    organizationId: string,
    subscriptionId: string,
    limit: number = 50,
  ): Promise<any[]> {
    return this.prisma.webhookDelivery.findMany({
      where: {
        subscriptionId,
        subscription: { organizationId },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async retryDelivery(
    organizationId: string,
    deliveryId: string,
  ): Promise<{ success: boolean; message?: string }> {
    const delivery = await this.prisma.webhookDelivery.findFirst({
      where: {
        id: deliveryId,
        subscription: { organizationId },
      },
      include: { subscription: true },
    });

    if (!delivery) {
      return { success: false, message: 'Delivery not found' };
    }

    // Reset and retry
    await this.prisma.webhookDelivery.update({
      where: { id: deliveryId },
      data: {
        status: 'pending',
        attemptCount: 0,
        nextRetryAt: null,
        errorMessage: null,
      },
    });

    return { success: true, message: 'Delivery queued for retry' };
  }
}
