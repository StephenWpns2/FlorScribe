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
    // Temporary: allow access regardless of plan/subscription.
    return true;
  }
}

