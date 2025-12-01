import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { SubscriptionsService } from '../subscriptions.service';

@Injectable()
export class UsageInterceptor implements NestInterceptor {
  constructor(private subscriptionsService: SubscriptionsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      return next.handle();
    }

    // This interceptor can be used to track usage after operations complete
    // For now, we'll track usage directly in services
    return next.handle().pipe(
      tap(() => {
        // Usage tracking is handled in services (SessionsService, SoapService)
      }),
    );
  }
}

