import { Injectable, NotFoundException, BadRequestException, ForbiddenException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { SubscriptionPlan, PlanType } from './entities/subscription-plan.entity';
import { UserSubscription, SubscriptionStatus } from './entities/user-subscription.entity';
import { UsageTracking } from './entities/usage-tracking.entity';
import { User } from '../users/entities/user.entity';

@Injectable()
export class SubscriptionsService implements OnModuleInit {
  constructor(
    @InjectRepository(SubscriptionPlan)
    private planRepository: Repository<SubscriptionPlan>,
    @InjectRepository(UserSubscription)
    private subscriptionRepository: Repository<UserSubscription>,
    @InjectRepository(UsageTracking)
    private usageRepository: Repository<UsageTracking>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async onModuleInit() {
    await this.initializePlans();
  }

  async initializePlans(): Promise<void> {
    const plans = [
      {
        planType: PlanType.LITE,
        name: 'Scribe Lite',
        price: 19.0,
        audioHoursLimit: 5,
        notesLimit: 5,
        features: { multiUser: false, ehrIntegration: false },
      },
      {
        planType: PlanType.PRO,
        name: 'Scribe Pro',
        price: 49.0,
        audioHoursLimit: 20,
        notesLimit: null,
        features: { multiUser: false, ehrIntegration: false },
      },
      {
        planType: PlanType.ENTERPRISE,
        name: 'Scribe Enterprise',
        price: 149.0,
        audioHoursLimit: null,
        notesLimit: null,
        features: { multiUser: true, ehrIntegration: true },
      },
    ];

    for (const planData of plans) {
      const existing = await this.planRepository.findOne({
        where: { planType: planData.planType },
      });
      if (!existing) {
        const plan = this.planRepository.create(planData);
        await this.planRepository.save(plan);
      }
    }
  }

  async getPlans(): Promise<SubscriptionPlan[]> {
    return this.planRepository.find({ order: { price: 'ASC' } });
  }

  async getPlanByType(planType: PlanType): Promise<SubscriptionPlan | null> {
    const plan = await this.planRepository.findOne({ where: { planType } });
    if (!plan) {
      // Try to initialize plans if they don't exist
      await this.initializePlans();
      return this.planRepository.findOne({ where: { planType } });
    }
    return plan;
  }

  async getUserSubscription(userId: number): Promise<UserSubscription | null> {
    // Prefer the latest active subscription; fall back to latest any status.
    const active = await this.subscriptionRepository.findOne({
      where: { userId, status: SubscriptionStatus.ACTIVE },
      relations: ['plan'],
      order: { createdAt: 'DESC' },
    });

    if (active) {
      return active;
    }

    return this.subscriptionRepository.findOne({
      where: { userId },
      relations: ['plan'],
      order: { createdAt: 'DESC' },
    });
  }

  async createSubscription(
    userId: number,
    planId: number,
    stripeSubscriptionId: string,
    stripeCustomerId: string,
    currentPeriodStart: Date,
    currentPeriodEnd: Date,
  ): Promise<UserSubscription> {
    // Cancel existing subscription if any
    const existing = await this.getUserSubscription(userId);
    if (existing) {
      existing.status = SubscriptionStatus.CANCELLED;
      await this.subscriptionRepository.save(existing);
    }

    const subscription = this.subscriptionRepository.create({
      userId,
      planId,
      stripeSubscriptionId,
      stripeCustomerId,
      status: SubscriptionStatus.ACTIVE,
      currentPeriodStart,
      currentPeriodEnd,
    });

    const saved = await this.subscriptionRepository.save(subscription);

    // Update user's subscription reference
    await this.userRepository.update(userId, {
      subscriptionId: saved.id,
      stripeCustomerId,
    });

    // Initialize usage tracking for this period
    await this.getOrCreateUsageTracking(userId, currentPeriodStart, currentPeriodEnd);

    return saved;
  }

  async updateSubscriptionPeriod(
    subscriptionId: number,
    currentPeriodStart: Date,
    currentPeriodEnd: Date,
  ): Promise<void> {
    await this.subscriptionRepository.update(subscriptionId, {
      currentPeriodStart,
      currentPeriodEnd,
    });

    const subscription = await this.subscriptionRepository.findOne({
      where: { id: subscriptionId },
    });

    if (subscription) {
      // Reset usage for new period
      await this.getOrCreateUsageTracking(
        subscription.userId,
        currentPeriodStart,
        currentPeriodEnd,
      );
    }
  }

  async cancelSubscription(userId: number): Promise<void> {
    const subscription = await this.getUserSubscription(userId);
    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    subscription.status = SubscriptionStatus.CANCELLED;
    await this.subscriptionRepository.save(subscription);
  }

  async getOrCreateUsageTracking(
    userId: number,
    periodStart: Date,
    periodEnd: Date,
  ): Promise<UsageTracking> {
    let usage = await this.usageRepository.findOne({
      where: {
        userId,
        periodStart,
        periodEnd,
      },
    });

    if (!usage) {
      usage = this.usageRepository.create({
        userId,
        periodStart,
        periodEnd,
        audioHoursUsed: 0,
        notesCreated: 0,
      });
      usage = await this.usageRepository.save(usage);
    }

    return usage;
  }

  async getCurrentUsage(userId: number): Promise<{
    subscription: UserSubscription | null;
    usage: UsageTracking | null;
    audioHoursUsed: number;
    audioHoursLimit: number | null;
    notesCreated: number;
    notesLimit: number | null;
  }> {
    const subscription = await this.getUserSubscription(userId);

    if (!subscription || subscription.status !== SubscriptionStatus.ACTIVE) {
      return {
        subscription: null,
        usage: null,
        audioHoursUsed: 0,
        audioHoursLimit: null,
        notesCreated: 0,
        notesLimit: null,
      };
    }

    const usage = await this.getOrCreateUsageTracking(
      userId,
      subscription.currentPeriodStart,
      subscription.currentPeriodEnd,
    );

    return {
      subscription,
      usage,
      audioHoursUsed: Number(usage.audioHoursUsed),
      audioHoursLimit: subscription.plan.audioHoursLimit,
      notesCreated: usage.notesCreated,
      notesLimit: subscription.plan.notesLimit,
    };
  }

  async checkAudioLimit(userId: number, additionalHours: number = 0): Promise<{
    allowed: boolean;
    currentUsage: number;
    limit: number | null;
    remaining: number | null;
  }> {
    // Temporary: allow all usage without requiring payment/subscription.
    const current = await this.getCurrentUsage(userId);
    if (!current.subscription) {
      return {
        allowed: true,
        currentUsage: additionalHours,
        limit: null,
        remaining: null,
      };
    }

    const limit = current.audioHoursLimit;
    const currentUsage = current.audioHoursUsed + additionalHours;

    if (limit === null) {
      // Unlimited
      return {
        allowed: true,
        currentUsage,
        limit: null,
        remaining: null,
      };
    }

    return {
      allowed: currentUsage <= limit,
      currentUsage,
      limit,
      remaining: Math.max(0, limit - currentUsage),
    };
  }

  async checkNotesLimit(userId: number, additionalNotes: number = 0): Promise<{
    allowed: boolean;
    currentUsage: number;
    limit: number | null;
    remaining: number | null;
  }> {
    // Temporary: allow all usage without requiring payment/subscription.
    const current = await this.getCurrentUsage(userId);
    if (!current.subscription) {
      return {
        allowed: true,
        currentUsage: additionalNotes,
        limit: null,
        remaining: null,
      };
    }

    const limit = current.notesLimit;
    const currentUsage = current.notesCreated + additionalNotes;

    if (limit === null) {
      // Unlimited
      return {
        allowed: true,
        currentUsage,
        limit: null,
        remaining: null,
      };
    }

    return {
      allowed: currentUsage <= limit,
      currentUsage,
      limit,
      remaining: Math.max(0, limit - currentUsage),
    };
  }

  async incrementAudioUsage(userId: number, hours: number): Promise<void> {
    const subscription = await this.getUserSubscription(userId);
    if (!subscription || subscription.status !== SubscriptionStatus.ACTIVE) {
      return;
    }

    const usage = await this.getOrCreateUsageTracking(
      userId,
      subscription.currentPeriodStart,
      subscription.currentPeriodEnd,
    );

    usage.audioHoursUsed = Number(usage.audioHoursUsed) + hours;
    await this.usageRepository.save(usage);
  }

  async incrementNotesUsage(userId: number, count: number = 1): Promise<void> {
    const subscription = await this.getUserSubscription(userId);
    if (!subscription || subscription.status !== SubscriptionStatus.ACTIVE) {
      return;
    }

    const usage = await this.getOrCreateUsageTracking(
      userId,
      subscription.currentPeriodStart,
      subscription.currentPeriodEnd,
    );

    usage.notesCreated += count;
    await this.usageRepository.save(usage);
  }

  async calculateAudioDurationFromBuffer(audioBuffer: Buffer, mimeType: string): Promise<number> {
    // For webm files, we'll estimate based on file size and typical bitrate
    // This is an approximation - for accurate duration, use AssemblyAI's response
    // or a library like get-audio-duration
    
    // Typical webm bitrate: ~64 kbps for voice
    // Duration in seconds = (file size in bytes * 8) / (bitrate in bps)
    
    // For now, we'll use a conservative estimate
    // In production, you'd want to use AssemblyAI's duration from transcript response
    // or a library like node-ffmpeg or get-audio-duration
    
    const fileSizeBytes = audioBuffer.length;
    const estimatedBitrate = 64000; // 64 kbps
    const durationSeconds = (fileSizeBytes * 8) / estimatedBitrate;
    
    // Cap at reasonable maximum (e.g., 2 hours)
    return Math.min(durationSeconds / 3600, 2);
  }
}

