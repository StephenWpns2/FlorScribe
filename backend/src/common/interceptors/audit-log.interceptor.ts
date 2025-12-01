import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request } from 'express';
import { AuditService } from '../../audit/audit.service';
import { AuditAction, AuditResourceType } from '../../audit/entities/audit-log.entity';
import { AUDIT_LOG_KEY, AuditLogMetadata } from '../decorators/audit-log.decorator';

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  constructor(
    private reflector: Reflector,
    private auditService: AuditService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const metadata = this.reflector.get<AuditLogMetadata>(
      AUDIT_LOG_KEY,
      context.getHandler(),
    );

    // If no audit metadata, skip logging
    if (!metadata) {
      return next.handle();
    }

    // Extract user info from request (set by JWT guard)
    const user = (request as any).user;
    const userId = user?.id || user?.userId;
    const userEmail = user?.email;

    // Extract resource IDs from request params/body
    const resourceId = metadata.resourceIdParam
      ? request.params[metadata.resourceIdParam] || request.body[metadata.resourceIdParam]
      : undefined;

    const patientId = metadata.patientIdParam
      ? request.params[metadata.patientIdParam] || request.body[metadata.patientIdParam]
      : undefined;

    const sessionId = metadata.sessionIdParam
      ? request.params[metadata.sessionIdParam] || request.body[metadata.sessionIdParam]
      : undefined;

    // Extract IP address and user agent
    const ipAddress =
      request.ip ||
      request.headers['x-forwarded-for']?.toString().split(',')[0] ||
      request.socket.remoteAddress;

    const userAgent = request.headers['user-agent'];

    // Log audit entry after request completes
    return next.handle().pipe(
      tap(() => {
        // Log asynchronously without blocking the response
        this.auditService
          .log({
            userId,
            userEmail,
            sessionId: sessionId ? Number(sessionId) : undefined,
            patientId: patientId ? Number(patientId) : undefined,
            action: metadata.action,
            resourceType: metadata.resourceType,
            resourceId: resourceId ? Number(resourceId) : undefined,
            ipAddress,
            userAgent,
            requestPath: request.path,
            requestMethod: request.method,
          })
          .catch((error) => {
            // Log error but don't fail the request
            console.error('Failed to create audit log:', error);
          });
      }),
    );
  }
}



