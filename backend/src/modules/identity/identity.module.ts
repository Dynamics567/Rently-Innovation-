import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthConfig } from '@config/configuration';

import { User } from './entities/user.entity';
import { ProviderProfile } from './entities/provider-profile.entity';
import { VerificationDocument } from './entities/verification-document.entity';
import { RefreshToken } from './entities/refresh-token.entity';

import { UserRepository } from './repositories/user.repository';
import { ProviderProfileRepository } from './repositories/provider-profile.repository';

import { AuthService } from './services/auth.service';
import { TokenService } from './services/token.service';
import { OtpService } from './services/otp.service';
import { UsersService } from './services/users.service';
import { ProviderProfileService } from './services/provider-profile.service';
import { ConsoleSmsSender, SMS_SENDER } from './services/sms-sender.port';

import { AuthController } from './controllers/auth.controller';
import { UsersController } from './controllers/users.controller';
import { ProvidersController } from './controllers/providers.controller';
import { AdminProvidersController } from './controllers/admin-providers.controller';

import { JwtStrategy } from './strategies/jwt.strategy';
import { IsSelfOrAdminPolicy } from './policies/is-self-or-admin.policy';

/**
 * Everything Identity owns — auth, users, provider verification — is
 * exported only as services (AuthService, UsersService...), never as
 * repositories or entities. Other modules (Catalog needs `providerId`,
 * Booking needs `renterId`) hold a foreign key, not an import of Identity's
 * internals. This is the module-boundary rule from docs/ARCHITECTURE.md §1
 * enforced in code, not just prose.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([User, ProviderProfile, VerificationDocument, RefreshToken]),
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const auth = configService.get<AuthConfig>('auth')!; // guaranteed by validation.schema.ts
        return { secret: auth.accessSecret, signOptions: { expiresIn: auth.accessExpiresIn } };
      },
    }),
  ],
  controllers: [AuthController, UsersController, ProvidersController, AdminProvidersController],
  providers: [
    UserRepository,
    ProviderProfileRepository,
    AuthService,
    TokenService,
    OtpService,
    UsersService,
    ProviderProfileService,
    JwtStrategy,
    IsSelfOrAdminPolicy,
    { provide: SMS_SENDER, useClass: ConsoleSmsSender },
  ],
  exports: [AuthService, UsersService, ProviderProfileService],
})
export class IdentityModule {}
