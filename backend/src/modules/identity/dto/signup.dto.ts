import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsIn,
  IsOptional,
  IsPhoneNumber,
  IsString,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { UserRole } from '../enums/user-role.enum';

/**
 * The only roles a person can grant themselves through public signup.
 * PROVIDER_STAFF is invite-only (by an existing provider, not modeled yet)
 * and ADMIN/SUPER_ADMIN must never be self-assignable — see
 * AuthService.signup()'s matching filter for why this is enforced in two
 * places, not just here.
 */
export const SELF_SERVICE_ROLES = [UserRole.RENTER, UserRole.PROVIDER] as const;

/**
 * Either email or phone is required (FR1.1) — enforced with @ValidateIf
 * rather than making both optional at the type level and hoping the service
 * remembers to check. Validation that can live in the DTO belongs in the
 * DTO; it runs before the request ever reaches a Service.
 */
export class SignupDto {
  @ApiPropertyOptional()
  @ValidateIf((o) => !o.phone)
  @IsEmail()
  email?: string;

  @ApiPropertyOptional()
  @ValidateIf((o) => !o.email)
  @IsPhoneNumber()
  phone?: string;

  @ApiProperty({ minLength: 8 })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty()
  @IsString()
  @MinLength(2)
  fullName: string;

  @ApiProperty({ enum: SELF_SERVICE_ROLES, isArray: true, default: [UserRole.RENTER] })
  @IsOptional()
  @IsIn(SELF_SERVICE_ROLES, { each: true })
  roles?: UserRole[];
}
