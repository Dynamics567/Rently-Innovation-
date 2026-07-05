import { DataSource } from 'typeorm';
import { config } from 'dotenv';

config();

/**
 * Standalone DataSource for the TypeORM CLI (migration:generate/run/revert).
 * Deliberately separate from the Nest-managed connection in database.module.ts —
 * the CLI runs outside the Nest DI container and needs its own entry point.
 */
export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT ?? '5432', 10),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: process.env.DB_SSL === 'true',
  entities: [__dirname + '/../modules/**/entities/*.entity{.ts,.js}'],
  migrations: [__dirname + '/migrations/*{.ts,.js}'],
  synchronize: false,
  logging: process.env.NODE_ENV === 'development',
});
