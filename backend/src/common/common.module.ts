import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { EncryptionService } from './encryption.service';
import { RedactionService } from './redaction.service';
import { AuditLogInterceptor } from './interceptors/audit-log.interceptor';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
  providers: [
    EncryptionService,
    RedactionService,
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditLogInterceptor,
    },
  ],
  exports: [EncryptionService, RedactionService],
})
export class CommonModule {}

