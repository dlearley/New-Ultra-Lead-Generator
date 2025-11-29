import { Injectable, BadRequestException } from '@nestjs/common';
import Stripe from 'stripe';

@Injectable()
export class StripeService {
  private stripe: Stripe;

  constructor() {
    const apiKey = process.env.STRIPE_API_KEY;
    if (!apiKey) {
      console.warn('STRIPE_API_KEY not configured - Stripe integration will be stubbed');
    }
    this.stripe = new Stripe(apiKey || 'sk_test_stub', {
      apiVersion: '2024-04-10',
    });
  }

  async createCustomer(email: string, organizationName: string): Promise<string> {
    try {
      const customer = await this.stripe.customers.create({
        email,
        description: organizationName,
      });
      return customer.id;
    } catch (error) {
      console.error('Error creating Stripe customer:', error);
      throw new BadRequestException('Failed to create billing customer');
    }
  }

  async createSubscription(
    customerId: string,
    priceId: string,
  ): Promise<{ subscriptionId: string; status: string }> {
    try {
      const subscription = await this.stripe.subscriptions.create({
        customer: customerId,
        items: [{ price: priceId }],
      });

      return {
        subscriptionId: subscription.id,
        status: subscription.status,
      };
    } catch (error) {
      console.error('Error creating subscription:', error);
      throw new BadRequestException('Failed to create subscription');
    }
  }

  async getSubscription(subscriptionId: string): Promise<any> {
    try {
      return await this.stripe.subscriptions.retrieve(subscriptionId);
    } catch (error) {
      console.error('Error retrieving subscription:', error);
      throw new BadRequestException('Failed to retrieve subscription');
    }
  }

  async cancelSubscription(subscriptionId: string): Promise<void> {
    try {
      await this.stripe.subscriptions.del(subscriptionId);
    } catch (error) {
      console.error('Error canceling subscription:', error);
      throw new BadRequestException('Failed to cancel subscription');
    }
  }

  async getInvoices(customerId: string): Promise<any[]> {
    try {
      const invoices = await this.stripe.invoices.list({
        customer: customerId,
        limit: 10,
      });
      return invoices.data;
    } catch (error) {
      console.error('Error fetching invoices:', error);
      return [];
    }
  }

  async updatePaymentMethod(customerId: string, paymentMethodId: string): Promise<void> {
    try {
      await this.stripe.customers.update(customerId, {
        invoice_settings: {
          default_payment_method: paymentMethodId,
        },
      });
    } catch (error) {
      console.error('Error updating payment method:', error);
      throw new BadRequestException('Failed to update payment method');
    }
  }
}
