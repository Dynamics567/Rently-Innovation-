import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DatabaseConfig } from '@config/configuration';

/**
 * `synchronize: false` always — even in development. Schema drift belongs in
 * reviewable migrations (src/database/migrations), not in auto-generated DDL
 * that can silently drop a column in a teammate's local database, or worse,
 * run against production. This is non-negotiable for a fintech-adjacent app.
 */
@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        // Non-null: Joi validation.schema.ts requires every DB_* var at startup,
        // so `database` config is guaranteed populated by the time this runs.
        const db = configService.get<DatabaseConfig>('database')!;
        return {
          type: 'postgres',
          host: db.host,
          port: db.port,
          username: db.username,
          password: db.password,
          database: db.name,
          ssl: db.ssl,
          autoLoadEntities: true,
          synchronize: false,
          logging: configService.get('app.env') === 'development' ? ['error', 'warn'] : ['error'],
          migrations: [__dirname + '/migrations/*{.ts,.js}'],
          migrationsRun: false,
        };
      },
    }),
  ],
})
export class DatabaseModule {}
