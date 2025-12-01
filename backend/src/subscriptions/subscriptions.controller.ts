import {
  Controller,
  Get,
  Post,
  Body,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
  RawBodyRequest,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { SubscriptionsService } from './subscriptions.service';
import { StripeService } from './stripe.service';
import { PlanType } from './entities/subscription-plan.entity';

@Controller('subscriptions')
export class SubscriptionsController {
  constructor(
    private subscriptionsService: SubscriptionsService,
    private stripeService: StripeService,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  @Get('plans')
  async getPlans() {
    return this.subscriptionsService.getPlans();
  }

  @Get('current')
  @UseGuards(JwtAuthGuard)
  async getCurrentSubscription(@CurrentUser() user: User) {
    const subscription = await this.subscriptionsService.getUserSubscription(user.id);
    return subscription;
  }

  @Get('usage')
  @UseGuards(JwtAuthGuard)
  async getUsage(@CurrentUser() user: User) {
    return this.subscriptionsService.getCurrentUsage(user.id);
  }

  @Post('create-checkout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async createCheckoutSession(
    @CurrentUser() user: User,
    @Body('planType') planType: PlanType,
  ) {
    try {
      if (!planType || !Object.values(PlanType).includes(planType)) {
        throw new BadRequestException('Invalid plan type');
      }

      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      const successUrl = `${frontendUrl}/pricing?success=true`;
      const cancelUrl = `${frontendUrl}/pricing?canceled=true`;

      // Get or create Stripe customer
      let customerId = user.stripeCustomerId;
      if (!customerId) {
        const customer = await this.stripeService.createCustomer(user.email, user.name || undefined);
        customerId = customer.id;
        // Update user with Stripe customer ID
        await this.userRepository.update(user.id, { stripeCustomerId: customerId });
      }

      const session = await this.stripeService.createCheckoutSession(
        customerId,
        planType,
        successUrl,
        cancelUrl,
      );

      return {
        sessionId: session.id,
        url: session.url,
      };
    } catch (error: any) {
      console.error('Error creating checkout session:', error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      const errorMessage = error?.message || error?.toString() || 'Failed to create checkout session';
      throw new BadRequestException(errorMessage);
    }
  }

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async handleWebhook(@Req() req: RawBodyRequest<Request & { rawBody?: Buffer }>) {
    const signature = req.headers['stripe-signature'] as string;
    if (!signature) {
      throw new Error('Missing stripe-signature header');
    }

    const payload = (req as any).rawBody || Buffer.from(JSON.stringify(req.body || {}));

    return this.stripeService.handleWebhook(payload, signature);
  }

  @Post('cancel')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async cancelSubscription(@CurrentUser() user: User) {
    const subscription = await this.subscriptionsService.getUserSubscription(user.id);
    if (!subscription || !subscription.stripeSubscriptionId) {
      throw new Error('No active subscription found');
    }

    await this.stripeService.cancelSubscription(subscription.stripeSubscriptionId);
    await this.subscriptionsService.cancelSubscription(user.id);

    return { message: 'Subscription cancelled successfully' };
  }
}

