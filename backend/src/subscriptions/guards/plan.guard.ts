import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SubscriptionsService } from '../subscriptions.service';

export const RequirePlan = (planType: string) => {
  return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    // This decorator will be used with SetMetadata
    Reflect.defineMetadata('requiredPlan', planType, descriptor.value);
  };
};

@Injectable()
export class PlanGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private subscriptionsService: SubscriptionsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPlan = this.reflector.get<string>('requiredPlan', context.getHandler());
    
    if (!requiredPlan) {
      return true; // No plan requirement
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Authentication required');
    }

    const subscription = await this.subscriptionsService.getUserSubscription(user.id);
    
    if (!subscription || subscription.status !== 'ACTIVE') {
      throw new ForbiddenException('Active subscription required');
    }

    // Check if user's plan meets the requirement
    const planHierarchy = { LITE: 1, PRO: 2, ENTERPRISE: 3 };
    const userPlanLevel = planHierarchy[subscription.plan.planType] || 0;
    const requiredPlanLevel = planHierarchy[requiredPlan] || 0;

    if (userPlanLevel < requiredPlanLevel) {
      throw new ForbiddenException(`Plan upgrade required: ${requiredPlan} plan needed`);
    }

    return true;
  }
}

