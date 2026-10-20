import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsIn,
  IsOptional,
  IsPhoneNumber,
  IsString,
  MinLength,
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
 * Phone is compulsory on every signup; email stays optional. Must be E.164
 * (leading `+` and country code) — @IsPhoneNumber() with no region arg.
 */
export class SignupDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty()
  @IsString()
  @IsPhoneNumber()
  phone: string;

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

  /**
   * The one legitimate way admin/super_admin ends up on a *new* account —
   * redeemed in AuthService.signup() against a matching, unexpired
   * AdminInvite row for this exact email. Absent or non-matching, this
   * does nothing; it is never a way to self-grant a role, only to redeem
   * one a super admin already created via UsersService.inviteAdmin().
   */
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  inviteToken?: string;
}
