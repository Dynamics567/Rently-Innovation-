import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { LoggerModule } from 'nestjs-pino';

import configuration from '@config/configuration';
import { validationSchema } from '@config/validation.schema';
import { DatabaseModule } from '@database/database.module';

import { AllExceptionsFilter } from '@common/filters/all-exceptions.filter';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { PoliciesGuard } from '@common/guards/policies.guard';
import { LoggingInterceptor } from '@common/interceptors/logging.interceptor';
import { TransformInterceptor } from '@common/interceptors/transform.interceptor';
import { IdempotencyInterceptor } from '@common/interceptors/idempotency.interceptor';
import {
  IDEMPOTENCY_STORE,
  InMemoryIdempotencyStore,
} from '@common/interceptors/idempotency-store.interface';
import { RequestIdMiddleware } from '@common/middleware/request-id.middleware';
import { AuditLogModule } from '@common/audit/audit-log.module';

import { IdentityModule } from '@modules/identity/identity.module';
import { CatalogModule } from '@modules/catalog/catalog.module';
import { BookingModule } from '@modules/booking/booking.module';
import { NotificationsModule } from '@modules/notifications/notifications.module';
import { TrustModule } from '@modules/trust/trust.module';
import { HealthModule } from './health/health.module';

/**
 * Guard/filter/interceptor ORDER matters and is easy to get subtly wrong:
 * Nest runs global guards in registration order (JwtAuthGuard establishes
 * `request.user` → RolesGuard reads it → PoliciesGuard runs last since it's
 * the most expensive, resource-fetching check). Interceptors wrap in
 * registration order too — logging outermost so it times the whole request
 * including serialization.
 */
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration], validationSchema }),
    // Global in-process event bus (ARCHITECTURE.md §1's named MVP choice) —
    // Booking/Identity/Catalog emit domain events after their transactions
    // resolve; NotificationsModule listens. Upgrade to Redis Streams/SQS
    // only if a module carrying this actually gets extracted out.
    EventEmitterModule.forRoot(),
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
        autoLogging: false, // LoggingInterceptor owns request logging; avoid duplicate lines
      },
    }),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => [
        {
          ttl: config.get<number>('throttle.ttl')! * 1000,
          limit: config.get<number>('throttle.limit')!,
        },
      ],
    }),
    DatabaseModule,
    HealthModule,
    AuditLogModule,
    IdentityModule,
    CatalogModule,
    BookingModule,
    NotificationsModule,
    TrustModule,
    // PaymentsModule, SearchModule, MessagingModule — registered here as each is built.
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: PoliciesGuard },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
    { provide: APP_INTERCEPTOR, useClass: TransformInterceptor },
    // Registered globally but a no-op unless a route is @Idempotent() — see
    // docs/API_DESIGN.md. Swap InMemoryIdempotencyStore for a Redis-backed
    // one before running more than one API instance (its own doc comment).
    { provide: IDEMPOTENCY_STORE, useClass: InMemoryIdempotencyStore },
    { provide: APP_INTERCEPTOR, useClass: IdempotencyInterceptor },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestIdMiddleware).forRoutes('*');
  }
}
