import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

/**
 * Permission keys, not ids — the client works with the same dotted
 * `module.action` strings the Permissions matrix displays, matching how
 * SetUserRolesDto takes role enum values rather than ids.
 */
export class SetRolePermissionsDto {
  @ApiProperty({ type: [String] })
  @IsString({ each: true })
  permissionKeys: string[];
}
