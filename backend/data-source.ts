import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import * as path from 'path';

// Load environment variables
config();

let databaseUrl = process.env.DATABASE_URL || '';

// Convert postgresql+asyncpg:// to postgresql:// for TypeORM
if (databaseUrl && databaseUrl.includes('postgresql+asyncpg://')) {
  databaseUrl = databaseUrl.replace('postgresql+asyncpg://', 'postgresql://');
}

// Extract SSL mode from URL if present
let url: URL;
let sslConfig: any = undefined;

try {
  url = new URL(databaseUrl);
  const sslMode = url.searchParams.get('sslmode');
  url.searchParams.delete('sslmode');

  // Configure SSL if required
  if (sslMode === 'require') {
    sslConfig = {
      rejectUnauthorized: false,
    };
  }
} catch (e) {
  throw new Error('Invalid DATABASE_URL');
}

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: url.toString(),
  entities: [path.join(__dirname, 'src', '**', '*.entity{.ts,.js}')],
  migrations: [path.join(__dirname, 'src', 'migrations', '*.{.ts,.js}')],
  synchronize: false, // Disable synchronize for migrations
  logging: true,
  ...(sslConfig && { ssl: sslConfig }),
});

