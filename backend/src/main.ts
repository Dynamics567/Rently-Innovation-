import { ClassSerializerInterceptor, ValidationPipe, VersioningType } from '@nestjs/common';
import { NestFactory, Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Logger } from 'nestjs-pino';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { AppConfig } from '@config/configuration';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  app.useLogger(app.get(Logger));
  app.use(helmet());

  const configService = app.get(ConfigService);
  // Non-null: validation.schema.ts guarantees these at startup (fail-fast, not here).
  const appConfig = configService.get<AppConfig>('app')!;

  app.enableCors({ origin: appConfig.corsOrigins.length ? appConfig.corsOrigins : true, credentials: true });
  app.setGlobalPrefix(appConfig.apiPrefix);
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });

  // Single global validation pipe: strips unknown properties (`whitelist`),
  // rejects requests that included them (`forbidNonWhitelisted`) rather than
  // silently dropping unexpected fields a client might rely on, and
  // auto-transforms payloads into their DTO classes so `class-validator`
  // decorators actually run against typed values.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Strips @Exclude()-marked fields (password hashes, storage keys) from
  // every response — see BaseEntity-derived entities. This is what makes
  // `@Exclude()` on User.passwordHash actually enforced, not just documented.
  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Rently API')
    .setDescription('Rently Innovation Hub — REST API. See docs/API_DESIGN.md for conventions.')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document);

  await app.listen(appConfig.port);
}
bootstrap();
