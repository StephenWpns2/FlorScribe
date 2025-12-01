import { AppDataSource } from '../data-source';

async function recordMigration() {
  await AppDataSource.initialize();
  
  try {
    await AppDataSource.query(
      'INSERT INTO migrations (timestamp, name) VALUES ($1, $2)',
      [1764582730948, 'CreateSubscriptionTables1764582730948']
    );
    console.log('✅ Migration recorded successfully');
  } catch (error: any) {
    if (error.message.includes('duplicate key') || error.message.includes('UNIQUE')) {
      console.log('✅ Migration already recorded');
    } else {
      throw error;
    }
  }
  
  await AppDataSource.destroy();
}

recordMigration().catch(console.error);

