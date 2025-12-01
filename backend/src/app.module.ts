import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AppController } from './app.controller';
import { DatabaseConfig } from './config/database.config';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { SessionsModule } from './sessions/sessions.module';
import { TranscriptsModule } from './transcripts/transcripts.module';
import { ClinicalModule } from './clinical/clinical.module';
import { SoapModule } from './soap/soap.module';
import { ExportModule } from './export/export.module';
import { AdminModule } from './admin/admin.module';
import { RealtimeModule } from './realtime/realtime.module';
import { PatientsModule } from './patients/patients.module';
import { CommonModule } from './common/common.module';
import { AuditModule } from './audit/audit.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { EncryptionService } from './common/encryption.service';
import { setEncryptionService } from './common/typeorm-encrypt.transformer';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRootAsync({
      useClass: DatabaseConfig,
    }),
    CommonModule,
    AuditModule,
    AuthModule,
    UsersModule,
    SessionsModule,
    TranscriptsModule,
    ClinicalModule,
    SoapModule,
    ExportModule,
    AdminModule,
    RealtimeModule,
    PatientsModule,
    SubscriptionsModule,
  ],
  controllers: [AppController],
  providers: [
    // Initialize encryption service for transformers
    {
      provide: 'ENCRYPTION_SERVICE_INIT',
      useFactory: (encryptionService: EncryptionService) => {
        setEncryptionService(encryptionService);
        return true;
      },
      inject: [EncryptionService],
    },
  ],
})
export class AppModule {}

