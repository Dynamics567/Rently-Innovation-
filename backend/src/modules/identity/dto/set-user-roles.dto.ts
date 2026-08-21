import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { UserRole } from '../enums/user-role.enum';

/**
 * Validated against the full UserRole enum, unlike SignupDto's roles field
 * (SELF_SERVICE_ROLES) — this endpoint is SUPER_ADMIN-gated, so the caller
 * is already a trusted actor, not the general public.
 */
export class SetUserRolesDto {
  @ApiProperty({ enum: UserRole, isArray: true })
  @IsEnum(UserRole, { each: true })
  roles: UserRole[];
}
