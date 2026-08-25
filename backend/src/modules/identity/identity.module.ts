import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthConfig, EmailConfig } from '@config/configuration';
import { StorageModule } from '@common/storage/storage.module';
import { AuditLogModule } from '@common/audit/audit-log.module';

import { User } from './entities/user.entity';
import { ProviderProfile } from './entities/provider-profile.entity';
import { VerificationDocument } from './entities/verification-document.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { PasswordResetToken } from './entities/password-reset-token.entity';

import { UserRepository } from './repositories/user.repository';
import { ProviderProfileRepository } from './repositories/provider-profile.repository';
import { VerificationDocumentRepository } from './repositories/verification-document.repository';
import { PasswordResetTokenRepository } from './repositories/password-reset-token.repository';

import { AuthService } from './services/auth.service';
import { TokenService } from './services/token.service';
import { OtpService } from './services/otp.service';
import { UsersService } from './services/users.service';
import { ProviderProfileService } from './services/provider-profile.service';
import { VerificationDocumentsService } from './services/verification-documents.service';
import { ConsoleSmsSender, SMS_SENDER } from './services/sms-sender.port';
import { ConsoleEmailSender, EMAIL_SENDER } from './services/email-sender.port';
import { ResendEmailSender } from './services/resend-email-sender';

import { AuthController } from './controllers/auth.controller';
import { UsersController } from './controllers/users.controller';
import { ProvidersController } from './controllers/providers.controller';
import { AdminProvidersController } from './controllers/admin-providers.controller';
import { AdminUsersController } from './controllers/admin-users.controller';

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
    TypeOrmModule.forFeature([
      User,
      ProviderProfile,
      VerificationDocument,
      RefreshToken,
      PasswordResetToken,
    ]),
    StorageModule,
    AuditLogModule,
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
  controllers: [
    AuthController,
    UsersController,
    ProvidersController,
    AdminProvidersController,
    AdminUsersController,
  ],
  providers: [
    UserRepository,
    ProviderProfileRepository,
    VerificationDocumentRepository,
    PasswordResetTokenRepository,
    AuthService,
    TokenService,
    OtpService,
    UsersService,
    ProviderProfileService,
    VerificationDocumentsService,
    JwtStrategy,
    IsSelfOrAdminPolicy,
    { provide: SMS_SENDER, useClass: ConsoleSmsSender },
    {
      provide: EMAIL_SENDER,
      useFactory: (configService: ConfigService) => {
        const email = configService.get<EmailConfig>('email')!;
        return email.resendApiKey ? new ResendEmailSender(email) : new ConsoleEmailSender();
      },
      inject: [ConfigService],
    },
  ],
  exports: [AuthService, UsersService, ProviderProfileService, EMAIL_SENDER],
})
export class IdentityModule {}
