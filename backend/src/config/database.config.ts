import { Injectable } from '@nestjs/common';
import { TypeOrmOptionsFactory, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class DatabaseConfig implements TypeOrmOptionsFactory {
  constructor(private configService: ConfigService) {}

  createTypeOrmOptions(): TypeOrmModuleOptions {
    let databaseUrl = this.configService.get<string>('DATABASE_URL');
    
    // Convert postgresql+asyncpg:// to postgresql:// for TypeORM
    if (databaseUrl && databaseUrl.includes('postgresql+asyncpg://')) {
      databaseUrl = databaseUrl.replace('postgresql+asyncpg://', 'postgresql://');
    }
    
    // Extract SSL mode from URL if present
    const url = new URL(databaseUrl);
    const sslMode = url.searchParams.get('sslmode');
    url.searchParams.delete('sslmode');
    
    // Configure SSL if required
    const sslConfig = sslMode === 'require' ? {
      rejectUnauthorized: false, // For self-signed certificates in development
    } : undefined;
    
    const options: TypeOrmModuleOptions = {
      type: 'postgres',
      url: url.toString(),
      entities: [__dirname + '/../**/*.entity{.ts,.js}'],
      // Enable synchronize in development (when NODE_ENV is not 'production')
      synchronize: process.env.NODE_ENV !== 'production',
      logging: process.env.NODE_ENV !== 'production',
      ...(sslConfig && { ssl: sslConfig }),
    };
    
    return options;
  }
}

