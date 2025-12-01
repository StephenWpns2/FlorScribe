import { Injectable, BadRequestException, Logger, Inject, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import Stripe from 'stripe';
import { SubscriptionsService } from './subscriptions.service';
import { PlanType } from './entities/subscription-plan.entity';
import { User } from '../users/entities/user.entity';

@Injectable()
export class StripeService {
  private readonly logger = new Logger(StripeService.name);
  private stripe: Stripe;

  constructor(
    private configService: ConfigService,
    @Inject(forwardRef(() => SubscriptionsService))
    private subscriptionsService: SubscriptionsService,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {
    const secretKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    if (!secretKey) {
      this.logger.warn('STRIPE_SECRET_KEY not configured. Stripe functionality will be disabled.');
      return;
    }

    this.stripe = new Stripe(secretKey, {
      apiVersion: '2025-11-17.clover',
    });
  }

  async createCustomer(email: string, name?: string): Promise<Stripe.Customer> {
    if (!this.stripe) {
      throw new BadRequestException('Stripe is not configured');
    }

    return this.stripe.customers.create({
      email,
      name,
    });
  }

  async createCheckoutSession(
    customerId: string,
    planType: PlanType,
    successUrl: string,
    cancelUrl: string,
  ): Promise<Stripe.Checkout.Session> {
    if (!this.stripe) {
      this.logger.error('Stripe is not configured. Please set STRIPE_SECRET_KEY in environment variables.');
      throw new BadRequestException('Stripe is not configured. Please contact support.');
    }

    this.logger.log(`Creating checkout session for plan: ${planType}, customer: ${customerId}`);
    
    const plan = await this.subscriptionsService.getPlanByType(planType);
    if (!plan) {
      this.logger.error(`Plan ${planType} not found in database. Plans may not be initialized.`);
      throw new BadRequestException(`Plan ${planType} not found. Please ensure plans are initialized.`);
    }

    this.logger.log(`Found plan: ${plan.name}, price: $${plan.price}`);

    // Create or retrieve Stripe price ID
    // In production, you'd want to create products/prices in Stripe dashboard
    // and store the price IDs. For now, we'll create them on the fly.
    const priceId = await this.getOrCreatePriceId(plan);

    this.logger.log(`Using Stripe price ID: ${priceId}`);

    try {
      const session = await this.stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ['card'],
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        mode: 'subscription',
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: {
          planType,
          planId: plan.id.toString(),
        },
      });

      this.logger.log(`Checkout session created: ${session.id}`);
      return session;
    } catch (error: any) {
      this.logger.error(`Stripe API error creating checkout session: ${error.message}`, error.stack);
      throw new BadRequestException(`Failed to create checkout session: ${error.message}`);
    }
  }

  private async getOrCreatePriceId(plan: any): Promise<string> {
    try {
      // In production, store price IDs in database or config
      // For now, search for existing price or create one
      const productName = `Scribe ${plan.planType}`;
      
      // Search for existing product
      const products = await this.stripe.products.list({
        limit: 100,
      });

      let product = products.data.find((p) => p.name === productName);

      if (!product) {
        product = await this.stripe.products.create({
          name: productName,
          description: plan.name,
        });
        this.logger.log(`Created Stripe product: ${productName} (${product.id})`);
      }

      // Search for existing price
      const prices = await this.stripe.prices.list({
        product: product.id,
        limit: 1,
      });

      if (prices.data.length > 0) {
        return prices.data[0].id;
      }

      // Create new price
      const price = await this.stripe.prices.create({
        product: product.id,
        unit_amount: Math.round(Number(plan.price) * 100), // Convert to cents
        currency: 'usd',
        recurring: {
          interval: 'month',
        },
      });

      this.logger.log(`Created Stripe price: ${price.id} for product ${productName}`);
      return price.id;
    } catch (error: any) {
      this.logger.error(`Error creating/getting Stripe price: ${error.message}`, error.stack);
      throw new BadRequestException(`Failed to create Stripe price: ${error.message}`);
    }
  }

  async handleWebhook(
    payload: Buffer,
    signature: string,
  ): Promise<{ processed: boolean; eventType: string }> {
    if (!this.stripe) {
      throw new BadRequestException('Stripe is not configured');
    }

    const webhookSecret = this.configService.get<string>('STRIPE_WEBHOOK_SECRET');
    if (!webhookSecret) {
      this.logger.warn('STRIPE_WEBHOOK_SECRET not configured. Webhook verification skipped.');
    }

    let event: Stripe.Event;

    try {
      if (webhookSecret) {
        event = this.stripe.webhooks.constructEvent(payload, signature, webhookSecret);
      } else {
        // In development, parse without verification
        event = JSON.parse(payload.toString()) as Stripe.Event;
        this.logger.warn('Webhook verification skipped (development mode)');
      }
    } catch (err) {
      this.logger.error(`Webhook signature verification failed: ${err.message}`);
      throw new BadRequestException(`Webhook signature verification failed: ${err.message}`);
    }

    this.logger.log(`Processing Stripe webhook: ${event.type}`);

    try {
      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object as Stripe.Checkout.Session;
          await this.handleCheckoutCompleted(session);
          break;
        }

        case 'customer.subscription.created':
        case 'customer.subscription.updated': {
          const subscription = event.data.object as Stripe.Subscription;
          await this.handleSubscriptionUpdated(subscription);
          break;
        }

        case 'customer.subscription.deleted': {
          const subscription = event.data.object as Stripe.Subscription;
          await this.handleSubscriptionDeleted(subscription);
          break;
        }

        case 'invoice.payment_succeeded': {
          const invoice = event.data.object as Stripe.Invoice;
          await this.handlePaymentSucceeded(invoice);
          break;
        }

        case 'invoice.payment_failed': {
          const invoice = event.data.object as Stripe.Invoice;
          await this.handlePaymentFailed(invoice);
          break;
        }

        default:
          this.logger.log(`Unhandled event type: ${event.type}`);
      }

      return { processed: true, eventType: event.type };
    } catch (error) {
      this.logger.error(`Error processing webhook ${event.type}: ${error.message}`, error.stack);
      throw error;
    }
  }

  private async handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
    const customerId = session.customer as string;
    const subscriptionId = session.subscription as string;
    const planType = session.metadata?.planType as PlanType;

    if (!customerId || !subscriptionId || !planType) {
      this.logger.error('Missing required data in checkout session', {
        customerId,
        subscriptionId,
        planType,
      });
      return;
    }

    const subscription = await this.stripe.subscriptions.retrieve(subscriptionId);
    const plan = await this.subscriptionsService.getPlanByType(planType);

    if (!plan) {
      this.logger.error(`Plan ${planType} not found`);
      return;
    }

    // Find user by Stripe customer ID
    const user = await this.findUserByStripeCustomerId(customerId);
    if (!user) {
      this.logger.error(`User not found for Stripe customer ${customerId}`);
      return;
    }

    await this.subscriptionsService.createSubscription(
      user.id,
      plan.id,
      subscriptionId,
      customerId,
      new Date((subscription as any).current_period_start * 1000),
      new Date((subscription as any).current_period_end * 1000),
    );

    this.logger.log(`Subscription created for user ${user.id}, plan ${planType}`);
  }

  private async handleSubscriptionUpdated(subscription: Stripe.Subscription): Promise<void> {
    const subscriptionId = subscription.id;
    const customerId = subscription.customer as string;

    const user = await this.findUserByStripeCustomerId(customerId);
    if (!user) {
      this.logger.error(`User not found for Stripe customer ${customerId}`);
      return;
    }

    const userSubscription = await this.subscriptionsService.getUserSubscription(user.id);
    if (!userSubscription || userSubscription.stripeSubscriptionId !== subscriptionId) {
      return;
    }

    await this.subscriptionsService.updateSubscriptionPeriod(
      userSubscription.id,
      new Date((subscription as any).current_period_start * 1000),
      new Date((subscription as any).current_period_end * 1000),
    );

    this.logger.log(`Subscription period updated for user ${user.id}`);
  }

  private async handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
    const customerId = subscription.customer as string;

    const user = await this.findUserByStripeCustomerId(customerId);
    if (!user) {
      this.logger.error(`User not found for Stripe customer ${customerId}`);
      return;
    }

    await this.subscriptionsService.cancelSubscription(user.id);
    this.logger.log(`Subscription cancelled for user ${user.id}`);
  }

  private async handlePaymentSucceeded(invoice: Stripe.Invoice): Promise<void> {
    const customerId = invoice.customer as string;
    const subscriptionId = (invoice as any).subscription 
      ? (typeof (invoice as any).subscription === 'string' 
          ? (invoice as any).subscription 
          : (invoice as any).subscription?.id)
      : null;

    if (!subscriptionId) {
      return;
    }

    const subscription = await this.stripe.subscriptions.retrieve(subscriptionId);
    const user = await this.findUserByStripeCustomerId(customerId);

    if (!user) {
      this.logger.error(`User not found for Stripe customer ${customerId}`);
      return;
    }

    // Update subscription period if needed
    const userSubscription = await this.subscriptionsService.getUserSubscription(user.id);
    if (userSubscription && userSubscription.stripeSubscriptionId === subscriptionId) {
      await this.subscriptionsService.updateSubscriptionPeriod(
        userSubscription.id,
        new Date((subscription as any).current_period_start * 1000),
        new Date((subscription as any).current_period_end * 1000),
      );
    }

    this.logger.log(`Payment succeeded for user ${user.id}`);
  }

  private async handlePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
    const customerId = invoice.customer as string;
    const user = await this.findUserByStripeCustomerId(customerId);

    if (!user) {
      this.logger.error(`User not found for Stripe customer ${customerId}`);
      return;
    }

    // Optionally mark subscription as past_due
    // This would be handled by Stripe webhook for subscription.updated with past_due status
    this.logger.warn(`Payment failed for user ${user.id}`);
  }

  async cancelSubscription(stripeSubscriptionId: string): Promise<void> {
    if (!this.stripe) {
      throw new BadRequestException('Stripe is not configured');
    }

    await this.stripe.subscriptions.cancel(stripeSubscriptionId);
  }

  private async findUserByStripeCustomerId(customerId: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { stripeCustomerId: customerId },
    });
  }
}

